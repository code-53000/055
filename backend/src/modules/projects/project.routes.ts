import { Router } from 'express';
import { authMiddleware, requireRoles } from '../../middleware/auth';
import { UserRole } from '@prisma/client';
import { projectController } from './project.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', projectController.list);
router.get('/:id', projectController.get);
router.post('/', requireRoles(UserRole.ACCOUNT_MANAGER), projectController.create);
router.patch('/:id', requireRoles(UserRole.ACCOUNT_MANAGER), projectController.update);

router.post('/:id/milestones', requireRoles(UserRole.ACCOUNT_MANAGER), projectController.addMilestone);
router.patch('/milestones/:milestoneId', projectController.updateMilestone);
router.delete('/milestones/:milestoneId', requireRoles(UserRole.ACCOUNT_MANAGER), projectController.deleteMilestone);

export default router;
