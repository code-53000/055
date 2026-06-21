import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { errorHandler } from './utils/error';
import { ensureUploadDir } from './utils/upload';

import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import assetRoutes from './modules/assets/asset.routes';
import feedbackRoutes from './modules/feedback/feedback.routes';

ensureUploadDir();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(config.uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/feedbacks', feedbackRoutes);

app.use(errorHandler);

export default app;
