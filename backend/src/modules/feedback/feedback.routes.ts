import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { feedbackController } from './feedback.controller';

const router = Router();

router.use(authMiddleware);

router.get('/project/:projectId', feedbackController.listByProject);
router.get('/asset/:assetId', feedbackController.listByAsset);
router.post('/', feedbackController.create);
router.patch('/:id', feedbackController.update);
router.post('/:id/resolve', feedbackController.resolve);
router.delete('/:id', feedbackController.delete);

export default router;
