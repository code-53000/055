import { FeedbackStatus, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../utils/error';
import { ensureProjectAccess } from '../../middleware/auth';

export interface CreateFeedbackInput {
  projectId: number;
  milestoneId?: number;
  assetId?: number;
  authorId: number;
  content: string;
}

export interface UpdateFeedbackInput {
  content?: string;
  status?: FeedbackStatus;
}

export class FeedbackService {
  async listByProject(userId: number, projectId: number) {
    await ensureProjectAccess(userId, projectId);
    return prisma.feedback.findMany({
      where: { projectId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        asset: { select: { id: true, name: true, version: true } },
        milestone: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByAsset(userId: number, assetId: number) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppError('素材不存在', 404);
    await ensureProjectAccess(userId, asset.projectId);

    return prisma.feedback.findMany({
      where: { assetId },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: CreateFeedbackInput) {
    await ensureProjectAccess(input.authorId, input.projectId);

    if (input.assetId) {
      const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
      if (!asset || asset.projectId !== input.projectId) {
        throw new AppError('素材与项目不匹配', 400);
      }
    }
    if (input.milestoneId) {
      const milestone = await prisma.milestone.findUnique({ where: { id: input.milestoneId } });
      if (!milestone || milestone.projectId !== input.projectId) {
        throw new AppError('节点与项目不匹配', 400);
      }
    }

    return prisma.feedback.create({
      data: {
        projectId: input.projectId,
        milestoneId: input.milestoneId,
        assetId: input.assetId,
        authorId: input.authorId,
        content: input.content,
        status: FeedbackStatus.OPEN,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async update(userId: number, id: number, input: UpdateFeedbackInput) {
    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new AppError('反馈不存在', 404);
    await ensureProjectAccess(userId, feedback.projectId);

    if (feedback.authorId !== userId) {
      throw new AppError('只能修改自己的反馈', 403);
    }

    return prisma.feedback.update({ where: { id }, data: input });
  }

  async resolve(userId: number, id: number) {
    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new AppError('反馈不存在', 404);
    await ensureProjectAccess(userId, feedback.projectId);

    return prisma.feedback.update({
      where: { id },
      data: { status: FeedbackStatus.RESOLVED },
    });
  }

  async delete(userId: number, id: number) {
    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new AppError('反馈不存在', 404);
    if (feedback.authorId !== userId) {
      throw new AppError('只能删除自己的反馈', 403);
    }
    return prisma.feedback.delete({ where: { id } });
  }
}

export const feedbackService = new FeedbackService();
