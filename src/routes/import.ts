import { Router, Response } from 'express';
import multer from 'multer';
import Document from '../models/Document';
import { requireUser, AuthRequest } from '../middleware/requireUser';
import { txtToTiptap, mdToTiptap, extractMdTitle, fileNameToTitle } from '../lib/importParser';

const router = Router();

// Configure multer for memory storage (files up to 2MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max
  },
});

router.post('/', requireUser, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    if (file.size === 0) {
      res.status(400).json({ success: false, message: 'This file is empty. Please choose a file with content.' });
      return;
    }

    const originalName = file.originalname || 'document.txt';
    const isMd = originalName.toLowerCase().endsWith('.md');
    const isTxt = originalName.toLowerCase().endsWith('.txt');

    if (!isMd && !isTxt) {
      res.status(400).json({ success: false, message: 'Unsupported file type. Please upload a .txt or .md file.' });
      return;
    }

    const textContent = file.buffer.toString('utf-8');

    let tiptapJson;
    let title = '';

    if (isMd) {
      tiptapJson = mdToTiptap(textContent);
      title = extractMdTitle(textContent) || fileNameToTitle(originalName);
    } else {
      tiptapJson = txtToTiptap(textContent);
      title = fileNameToTitle(originalName);
    }

    const doc = await Document.create({
      title,
      content: tiptapJson,
      ownerId: req.userId,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error: any) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, message: 'This file is larger than 2 MB.' });
      return;
    }
    console.error('Error importing document:', error);
    res.status(500).json({ success: false, message: 'Failed to import document.' });
  }
});

export default router;
