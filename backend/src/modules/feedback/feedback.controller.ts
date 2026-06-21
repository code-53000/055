import { Response } from 'express';
import { z } from 'zod';
import { FeedbackStatus } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../utils/error';
import { feedbackService } from './feedback.service';

const createSchema = z.object({
  projectId: z.number().int().positive(),
  milestoneId: z.number().int().positive().optional(),
  assetId: z.number().int().positive().optional(),
  content: z.string().min(1),
});

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  status: z.nativeEnum(FeedbackStatus).optional(),
});

export class FeedbackController {
  listByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(req.params.projectId, 10);
    const items = await feedbackService.listByProject(req.user!.id, projectId);
    res.json(items);
  });

  listByAsset = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assetId = parseInt(req.params.assetId, 10);
    const items = await feedbackService.listByAsset(req.user!.id, assetId);
    res.json(items);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createSchema.parse(req.body);
    const item = await feedbackService.create({
      ...data,
      authorId: req.user!.id,
    });
    res.status(201).json(item);
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const data = updateSchema.parse(req.body);
    const item = await feedbackService.update(req.user!.id, id, data);
    res.json(item);
  });

  resolve = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const item = await feedbackService.resolve(req.user!.id, id);
    res.json(item);
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await feedbackService.delete(req.user!.id, id);
    res.status(204).end();
  });
}

export const feedbackController = new FeedbackController();
