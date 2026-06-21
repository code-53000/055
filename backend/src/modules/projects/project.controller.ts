import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, requireRoles } from '../../middleware/auth';
import { UserRole, MilestoneStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/error';
import { projectService } from './project.service';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  code: z.string().min(1),
  clientId: z.number().int().positive(),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        orderIndex: z.number().int(),
        dueDate: z.string().optional(),
      })
    )
    .optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const milestoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(MilestoneStatus).optional(),
  orderIndex: z.number().int().optional(),
  dueDate: z.string().optional(),
});

export class ProjectController {
  list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projects = await projectService.list(req.user!.id, req.user!.role);
    res.json(projects);
  });

  get = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const project = await projectService.get(req.user!.id, id);
    res.json(project);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createProjectSchema.parse({
      ...req.body,
      managerId: req.user!.id,
    });
    const project = await projectService.create(data);
    res.status(201).json(project);
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const data = updateProjectSchema.parse(req.body);
    const project = await projectService.update(req.user!.id, id, data);
    res.json(project);
  });

  addMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = parseInt(req.params.id, 10);
    const data = milestoneSchema.parse(req.body);
    const milestone = await projectService.addMilestone(req.user!.id, projectId, data as any);
    res.status(201).json(milestone);
  });

  updateMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const milestoneId = parseInt(req.params.milestoneId, 10);
    const data = milestoneSchema.partial().parse(req.body);
    const milestone = await projectService.updateMilestone(req.user!.id, milestoneId, data);
    res.json(milestone);
  });

  deleteMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
    const milestoneId = parseInt(req.params.milestoneId, 10);
    await projectService.deleteMilestone(req.user!.id, milestoneId);
    res.status(204).end();
  });
}

export const projectController = new ProjectController();
