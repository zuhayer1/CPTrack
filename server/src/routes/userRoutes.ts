import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get current user info
router.get('/me', authenticate, async (req, res) => {
  const { id } = (req as any).user;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      codeforcesHandle: true,
      leetcodeHandle: true,
      codechefHandle: true,
    },
  });

  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
});

// Update profile handles
router.post('/update-handles', authenticate, async (req, res) => {
  const { id } = (req as any).user;
  const { codeforcesHandle, leetcodeHandle, codechefHandle } = req.body;

  await prisma.user.update({
    where: { id },
    data: {
      codeforcesHandle,
      leetcodeHandle,
      codechefHandle,
    },
  });

  return res.json({ message: 'Handles updated' });
});

export default router;
