import { MilestoneStatus, UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../utils/error';
import { ensureProjectAccess } from '../../middleware/auth';

export interface CreateProjectInput {
  name: string;
  description?: string;
  code: string;
  clientId: number;
  managerId: number;
  milestones?: Array<{
    name: string;
    description?: string;
    orderIndex: number;
    dueDate?: string;
  }>;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  status?: MilestoneStatus;
  dueDate?: string;
  orderIndex?: number;
}

export class ProjectService {
  async list(userId: number, role: UserRole) {
    const where =
      role === UserRole.CLIENT
        ? { clientId: userId }
        : role === UserRole.ACCOUNT_MANAGER
        ? { managerId: userId }
        : {};
    return prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        milestones: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { assets: true, feedbacks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: number, id: number) {
    await ensureProjectAccess(userId, id);
    return prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        milestones: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async create(input: CreateProjectInput) {
    const existing = await prisma.project.findUnique({ where: { code: input.code } });
    if (existing) throw new AppError('项目编号已存在', 400);

    return prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        code: input.code,
        managerId: input.managerId,
        clientId: input.clientId,
        milestones: input.milestones
          ? { create: input.milestones.map((m) => ({
              name: m.name,
              description: m.description,
              orderIndex: m.orderIndex,
              dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
            })) }
          : undefined,
      },
      include: { milestones: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async update(userId: number, id: number, input: UpdateProjectInput) {
    await ensureProjectAccess(userId, id);
    return prisma.project.update({ where: { id }, data: input });
  }

  async addMilestone(userId: number, projectId: number, input: UpdateMilestoneInput & { name: string }) {
    await ensureProjectAccess(userId, projectId);
    return prisma.milestone.create({
      data: {
        projectId,
        name: input.name,
        description: input.description,
        orderIndex: input.orderIndex ?? 0,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        status: input.status,
      },
    });
  }

  async updateMilestone(userId: number, milestoneId: number, input: UpdateMilestoneInput) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });
    if (!milestone) throw new AppError('节点不存在', 404);
    await ensureProjectAccess(userId, milestone.projectId);

    const data: any = { ...input };
    if (input.dueDate) data.dueDate = new Date(input.dueDate);
    if (input.status === MilestoneStatus.COMPLETED) data.completedAt = new Date();

    return prisma.milestone.update({ where: { id: milestoneId }, data });
  }

  async deleteMilestone(userId: number, milestoneId: number) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone) throw new AppError('节点不存在', 404);
    await ensureProjectAccess(userId, milestone.projectId);
    return prisma.milestone.delete({ where: { id: milestoneId } });
  }
}

export const projectService = new ProjectService();
