import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.headers['x-user-id'];

  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ success: false, message: 'Missing user identity' });
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({ success: false, message: 'Invalid user identity' });
    return;
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }
    req.userId = userId;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
