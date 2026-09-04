import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const DOCUMENTS_DIR = join(UPLOADS_ROOT, 'documents');

export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function ensureDocumentsDir() {
  if (!existsSync(DOCUMENTS_DIR)) mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

export const documentUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureDocumentsDir();
      cb(null, DOCUMENTS_DIR);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_DOCUMENT_SIZE },
  fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException('Formato de ficheiro não suportado. Envie uma imagem (JPG, PNG, WEBP) ou PDF.'), false);
      return;
    }
    cb(null, true);
  },
};

/** Garante que um caminho de documento gerado por nós continua dentro da pasta de uploads. */
export function resolveDocumentPath(relativePath: string): string {
  const resolved = join(UPLOADS_ROOT, relativePath);
  if (!resolved.startsWith(UPLOADS_ROOT)) {
    throw new BadRequestException('Caminho de documento inválido.');
  }
  return resolved;
}
