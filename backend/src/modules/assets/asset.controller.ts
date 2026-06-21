import { Response } from 'express';
import { z } from 'zod';
import { AssetStatus, UserRole } from '@prisma/client';
import { AuthRequest, requireRoles } from '../../middleware/auth';
import { asyncHandler } from '../../utils/error';
import { assetService } from './asset.service';
import { upload } from '../../utils/upload';

const uploadSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  milestoneId: z.coerce.number().int().positive().optional(),
  name: z.string().min(1),
  changeLog: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  changeLog: z.string().optional(),
  isFinal: z.boolean().optional(),
});

export class AssetController {
  listByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(req.params.projectId, 10);
    const assets = await assetService.listByProject(req.user!.id, projectId);
    res.json(assets);
  });

  get = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const asset = await assetService.get(req.user!.id, id);
    res.json(asset);
  });

  download = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const result = await assetService.download(req.user!.id, id);
    res.download(result.filePath, result.fileName);
  });

  upload = [
    upload.single('file'),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!req.file) return res.status(400).json({ error: '请上传文件' });
      const data = uploadSchema.parse({ ...req.body });
      const asset = await assetService.upload({
        ...data,
        uploaderId: req.user!.id,
        file: {
          originalname: req.file.originalname,
          filename: req.file.filename,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
      res.status(201).json(asset);
    }),
  ] as any;

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const data = updateSchema.parse(req.body);
    const asset = await assetService.update(req.user!.id, id, data, req.user!.role);
    res.json(asset);
  });

  compare = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(req.params.projectId, 10);
    const assetName = decodeURIComponent(req.params.name);
    const versions = await assetService.compare(req.user!.id, projectId, assetName);
    res.json(versions);
  });

  listNames = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(req.params.projectId, 10);
    const names = await assetService.listNames(req.user!.id, projectId);
    res.json(names);
  });

  markFinal = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const asset = await assetService.markFinal(req.user!.id, id);
    res.json(asset);
  });
}

export const assetController = new AssetController();
