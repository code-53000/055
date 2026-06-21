import { Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { AuthRequest, authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../utils/error';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  login = asyncHandler(async (req, res: Response) => {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json(result);
  });

  me = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: '未登录' });
    const user = await authService.me(req.user.id);
    res.json(user);
  });
}

export const authController = new AuthController();
