import { AssetStatus, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../utils/error';
import { ensureProjectAccess } from '../../middleware/auth';
import path from 'path';
import fs from 'fs';
import { config } from '../../config';

export interface UploadAssetInput {
  projectId: number;
  milestoneId?: number;
  uploaderId: number;
  name: string;
  changeLog?: string;
  file: {
    originalname: string;
    filename: string;
    path: string;
    mimetype: string;
    size: number;
  };
}

export interface UpdateAssetInput {
  name?: string;
  status?: AssetStatus;
  changeLog?: string;
  isFinal?: boolean;
}

export class AssetService {
  async listByProject(userId: number, projectId: number) {
    await ensureProjectAccess(userId, projectId);
    return prisma.asset.findMany({
      where: { projectId },
      include: {
        uploader: { select: { id: true, name: true, role: true } },
        milestone: { select: { id: true, name: true } },
        _count: { select: { feedbacks: true } },
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(userId: number, id: number) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        uploader: { select: { id: true, name: true, role: true } },
        milestone: true,
        project: true,
      },
    });
    if (!asset) throw new AppError('素材不存在', 404);
    await ensureProjectAccess(userId, asset.projectId);
    return asset;
  }

  async download(userId: number, id: number) {
    const asset = await this.get(userId, id);
    const filePath = asset.filePath;
    if (!fs.existsSync(filePath)) {
      throw new AppError('文件不存在', 404);
    }
    return { filePath, fileName: asset.fileName, originalName: asset.name };
  }

  async upload(input: UploadAssetInput) {
    await ensureProjectAccess(input.uploaderId, input.projectId);

    const existingCount = await prisma.asset.count({
      where: { projectId: input.projectId, name: input.name },
    });
    const version = existingCount + 1;

    const asset = await prisma.asset.create({
      data: {
        projectId: input.projectId,
        milestoneId: input.milestoneId,
        uploaderId: input.uploaderId,
        version,
        name: input.name,
        fileName: input.file.originalname,
        filePath: input.file.path,
        mimeType: input.file.mimetype,
        size: input.file.size,
        changeLog: input.changeLog || `版本 v${version} 初始上传`,
        status: AssetStatus.REVIEW,
      },
      include: {
        uploader: { select: { id: true, name: true, role: true } },
        milestone: { select: { id: true, name: true } },
      },
    });

    return asset;
  }

  async update(userId: number, id: number, input: UpdateAssetInput, role: UserRole) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('素材不存在', 404);
    await ensureProjectAccess(userId, asset.projectId);

    const data: any = { ...input };

    if (input.isFinal === true && role !== UserRole.CLIENT) {
      throw new AppError('只有客户可以标记最终版本', 403);
    }

    if (input.isFinal === true) {
      await prisma.asset.updateMany({
        where: { projectId: asset.projectId, name: asset.name, NOT: { id } },
        data: { isFinal: false },
      });
    }

    return prisma.asset.update({ where: { id }, data });
  }

  async compare(userId: number, projectId: number, assetName: string) {
    await ensureProjectAccess(userId, projectId);
    return prisma.asset.findMany({
      where: { projectId, name: assetName },
      include: {
        uploader: { select: { id: true, name: true, role: true } },
        _count: { select: { feedbacks: true } },
      },
      orderBy: { version: 'asc' },
    });
  }

  async listNames(userId: number, projectId: number) {
    await ensureProjectAccess(userId, projectId);
    const assets = await prisma.asset.findMany({
      where: { projectId },
      select: { name: true },
      distinct: ['name'],
    });
    return assets.map((a) => a.name);
  }

  async markFinal(userId: number, id: number) {
    const asset = await prisma.asset.findUnique({ where: { id }, include: { project: true } });
    if (!asset) throw new AppError('素材不存在', 404);
    if (asset.project.clientId !== userId) {
      throw new AppError('只有客户可以标记最终版本', 403);
    }
    await prisma.asset.updateMany({
      where: { projectId: asset.projectId, name: asset.name, NOT: { id } },
      data: { isFinal: false },
    });
    return prisma.asset.update({
      where: { id },
      data: { isFinal: true, status: AssetStatus.FINAL },
    });
  }
}

export const assetService = new AssetService();
