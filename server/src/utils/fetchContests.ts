import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Upc {
  site: string;
  title: string;
  startTime: number; // milliseconds
  duration: number;
  endTime: number;
  url: string;
}

export async function fetchAndStoreContests() {
  try {
    const resp = await axios.get<Upc[]>(
      'https://competeapi.vercel.app/contests/upcoming/'
    );
    const contests = resp.data;

    for (const c of contests) {
      const existing = await prisma.contest.findFirst({
        where: {
          name: c.title,
          platform: c.site
        }
      });
      if (!existing) {
        await prisma.contest.create({
          data: {
            name: c.title,
            platform: c.site,
            startTime: new Date(c.startTime),
            endTime: new Date(c.endTime),
            duration: Math.floor(c.duration / 60000), // minutes
            link: c.url
          }
        });
      }
    }
    console.log('Fetched and stored multiple platforms.');
  } catch (err) {
    console.error('Error fetching contests:', err);
  }
}
