import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { AppError } from './error';

export function ensureUploadDir(projectDir?: string) {
  const baseDir = config.uploadDir;
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  if (projectDir) {
    const fullPath = path.join(baseDir, projectDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    ensureUploadDir();
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}_${safeName}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|psd|ai|zip|rar|mp4|mov|doc|docx|xls|xlsx|ppt|pptx|svg|webp)$/i)) {
      return cb(new AppError('不支持的文件类型', 400) as any, false);
    }
    cb(null, true);
  },
});
