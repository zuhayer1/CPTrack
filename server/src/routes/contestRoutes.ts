import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/upcoming', async (req, res) => {
  try {
    const contests = await prisma.contest.findMany({
      where: {
        startTime: {
          gt: new Date()
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    const grouped: Record<string, typeof contests> = {};

    for (const contest of contests) {
      const dateKey = contest.startTime.toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(contest);
    }

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contests' });
  }
});

export default router;
