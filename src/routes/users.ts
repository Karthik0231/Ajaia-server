import { Router, Request, Response } from 'express';
import User from '../models/User';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load users',
    });
  }
});

export default router;
