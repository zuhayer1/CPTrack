import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { fetchCodeforcesData } from '../utils/fetchCodeforces';
import { fetchLeetcodeData } from '../utils/fetchLeetcode';
import { fetchCodechefData } from '../utils/fetchCodechef';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [codeforces, leetcode, codechef] = await Promise.all([
      user.codeforcesHandle ? fetchCodeforcesData(user.codeforcesHandle) : null,
      user.leetcodeHandle ? fetchLeetcodeData(user.leetcodeHandle) : null,
      user.codechefHandle ? fetchCodechefData(user.codechefHandle) : null,
    ]);

    res.json({ codeforces, leetcode, codechef });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load profile data' });
  }
});

export default router;
