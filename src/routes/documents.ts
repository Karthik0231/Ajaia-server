import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Document from '../models/Document';
import Share from '../models/Share';
import User from '../models/User';
import { requireUser, AuthRequest } from '../middleware/requireUser';

const router = Router();

const DEFAULT_CONTENT = { type: 'doc', content: [] };

function isValidId(id: string | string[]): id is string {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

// POST /api/documents — create
router.post('/', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const title = (req.body.title?.toString().trim()) || 'Untitled document';
    const content = req.body.content ?? DEFAULT_CONTENT;

    if (title.length > 255) {
      res.status(400).json({ success: false, message: 'Title is too long (max 255 characters)' });
      return;
    }

    const doc = await Document.create({
      title,
      content,
      ownerId: req.userId,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ success: false, message: 'Failed to create document' });
  }
});

// GET /api/documents/shared — list documents shared with current user
router.get('/shared', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shares = await Share.find({ userId: req.userId })
      .populate('documentId')
      .sort({ updatedAt: -1 });

    const results = [];
    for (const share of shares) {
      if (!share.documentId) continue;
      
      const doc = share.documentId as any;
      const owner = await User.findById(doc.ownerId).select('name email');
      
      if (owner) {
        results.push({
          document: doc,
          owner: {
            name: owner.name,
            email: owner.email,
          },
          permission: share.permission,
          updatedAt: share.updatedAt,
        });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching shared documents:', error);
    res.status(500).json({ success: false, message: 'Failed to load shared documents' });
  }
});

// GET /api/documents — list owned documents
router.get('/', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const docs = await Document.find({ ownerId: req.userId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: docs });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ success: false, message: 'Failed to load documents' });
  }
});

// GET /api/documents/:id — get single document
router.get('/:id', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isValidId(id)) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    const doc = await Document.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    let permission = '';

    if (doc.ownerId.toString() === req.userId) {
      permission = 'owner';
    } else {
      const share = await Share.findOne({ documentId: doc._id, userId: req.userId });
      if (share) {
        permission = share.permission;
      } else {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
    }

    const docObj = doc.toObject();
    res.json({ success: true, data: { ...docObj, permission } });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ success: false, message: 'Failed to load document' });
  }
});

// PATCH /api/documents/:id — update title and/or content
router.patch('/:id', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isValidId(id)) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    const doc = await Document.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    let hasPermission = false;
    if (doc.ownerId.toString() === req.userId) {
      hasPermission = true;
    } else {
      const share = await Share.findOne({ documentId: doc._id, userId: req.userId });
      if (share && share.permission === 'editor') {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const updates: { title?: string; content?: unknown } = {};

    if (req.body.title !== undefined) {
      const title = req.body.title.toString().trim();
      if (title.length === 0) {
        res.status(400).json({ success: false, message: 'Title cannot be empty' });
        return;
      }
      if (title.length > 255) {
        res.status(400).json({ success: false, message: 'Title is too long (max 255 characters)' });
        return;
      }
      updates.title = title;
    }

    if (req.body.content !== undefined) {
      updates.content = req.body.content;
    }

    const updated = await Document.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ success: false, message: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id — delete
router.delete('/:id', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isValidId(id)) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    const doc = await Document.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    if (doc.ownerId.toString() !== req.userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    await doc.deleteOne();
    await Share.deleteMany({ documentId: doc._id }); // clean up shares
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

// POST /api/documents/:id/share — Share a document
router.post('/:id/share', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { userId, permission } = req.body;

    if (!isValidId(id)) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    if (!isValidId(userId) || (permission !== 'viewer' && permission !== 'editor')) {
      res.status(400).json({ success: false, message: 'Invalid user ID or permission' });
      return;
    }

    const doc = await Document.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    if (doc.ownerId.toString() !== req.userId) {
      res.status(403).json({ success: false, message: 'Access denied. Only the owner can share this document.' });
      return;
    }

    if (doc.ownerId.toString() === userId) {
      res.status(400).json({ success: false, message: 'Cannot share document with its owner.' });
      return;
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Target user not found' });
      return;
    }

    const share = await Share.findOneAndUpdate(
      { documentId: doc._id, userId: targetUser._id },
      { permission },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ success: true, data: share });
  } catch (error) {
    console.error('Error sharing document:', error);
    res.status(500).json({ success: false, message: 'Failed to share document' });
  }
});

// GET /api/documents/:id/shares — List shares for a document
router.get('/:id/shares', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isValidId(id)) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    const doc = await Document.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    if (doc.ownerId.toString() !== req.userId) {
      res.status(403).json({ success: false, message: 'Access denied. Only the owner can view shares.' });
      return;
    }

    const shares = await Share.find({ documentId: doc._id }).populate('userId', 'name email');
    
    const results = shares.map(share => ({
      user: {
        id: (share.userId as any)._id,
        name: (share.userId as any).name,
        email: (share.userId as any).email,
      },
      permission: share.permission,
    }));

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error listing shares:', error);
    res.status(500).json({ success: false, message: 'Failed to load shares' });
  }
});

// DELETE /api/documents/:id/share/:userId — Remove share
router.delete('/:id/share/:userId', requireUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const targetUserId = req.params.userId;

    if (!isValidId(id) || !isValidId(targetUserId)) {
      res.status(404).json({ success: false, message: 'Invalid IDs' });
      return;
    }

    const doc = await Document.findById(id);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    if (doc.ownerId.toString() !== req.userId) {
      res.status(403).json({ success: false, message: 'Access denied. Only the owner can remove shares.' });
      return;
    }

    await Share.deleteOne({ documentId: doc._id, userId: targetUserId });
    res.json({ success: true, message: 'Share removed' });
  } catch (error) {
    console.error('Error removing share:', error);
    res.status(500).json({ success: false, message: 'Failed to remove share' });
  }
});

export default router;
