import { Router } from 'express';
import { authMiddleware, requireRoles } from '../../middleware/auth';
import { UserRole } from '@prisma/client';
import { assetController } from './asset.controller';

const router = Router();

router.use(authMiddleware);

router.get('/project/:projectId', assetController.listByProject);
router.get('/project/:projectId/names', assetController.listNames);
router.get('/project/:projectId/compare/:name', assetController.compare);
router.get('/:id', assetController.get);
router.get('/:id/download', assetController.download);

router.post('/', requireRoles(UserRole.DESIGNER, UserRole.ACCOUNT_MANAGER), assetController.upload);
router.patch('/:id', assetController.update);
router.post('/:id/final', requireRoles(UserRole.CLIENT), assetController.markFinal);

export default router;
