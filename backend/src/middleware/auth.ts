import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config';
import prisma from '../prisma';
import { AppError } from '../utils/error';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
    name: string;
  };
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('未提供认证令牌', 401);
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
    next();
  } catch {
    throw new AppError('令牌无效或已过期', 401);
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('权限不足', 403);
    }
    next();
  };
}

export async function ensureProjectAccess(
  userId: number,
  projectId: number
): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('项目不存在', 404);
  if (project.managerId !== userId && project.clientId !== userId) {
    throw new AppError('无权访问该项目', 403);
  }
}
