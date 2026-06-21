import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../utils/error';
import { config } from '../../config';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
  };
}

export class AuthService {
  async login({ email, password }: LoginPayload): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('邮箱或密码错误', 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('邮箱或密码错误', 401);

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    return { token, user: payload };
  }

  async me(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('用户不存在', 404);
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}

export const authService = new AuthService();
