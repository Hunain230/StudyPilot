import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env';
import fs from 'fs';

// Ensure upload directories exist
const dirs = ['pdfs', 'images', 'temp'].map(d =>
  path.join(ENV.UPLOAD_DIR, d)
);
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');
    const subDir = isPdf ? 'pdfs' : isImage ? 'images' : 'temp';
    cb(null, path.join(ENV.UPLOAD_DIR, subDir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});
