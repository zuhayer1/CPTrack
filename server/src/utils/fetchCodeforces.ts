import axios from 'axios';

type RatingChange = {
  contestName: string;
  rank: number;
  newRating: number;
  oldRating: number;
  ratingUpdateTimeSeconds: number;
};

type UserInfo = {
  handle: string;
  rank?: string;
  rating?: number;
  maxRating?: number;
};

type UserSubmission = {
  verdict?: string;
  problem?: {
    contestId?: number;
    index?: string;
  };
};

type CFProblem = {
  contestId?: number;
  index?: string;
  rating?: number;
};

export async function fetchCodeforcesData(handle: string) {
  try {
    const [userInfoRes, ratingRes, statusRes, problemsRes] = await Promise.all([
      axios.get(`https://codeforces.com/api/user.info?handles=${handle}`),
      axios.get(`https://codeforces.com/api/user.rating?handle=${handle}`),
      axios.get(`https://codeforces.com/api/user.status?handle=${handle}`),
      axios.get(`https://codeforces.com/api/problemset.problems`),
    ]);

    const info = (userInfoRes.data.result?.[0] ?? {}) as UserInfo;
    const ratingChanges = (ratingRes.data.result ?? []) as RatingChange[];
    const submissions = (statusRes.data.result ?? []) as UserSubmission[];
    const problems = (problemsRes.data.result?.problems ?? []) as CFProblem[];

    // Unique solved problems (AC verdict)
    const solvedSet = new Set<string>();
    for (const s of submissions) {
      if (s.verdict === 'OK' && s.problem?.contestId && s.problem?.index) {
        solvedSet.add(`${s.problem.contestId}-${s.problem.index}`);
      }
    }
    const solvedCount = solvedSet.size;

    // Map problem key -> rating to bucket difficulties
    const ratingMap = new Map<string, number>();
    for (const p of problems) {
      if (p.contestId && p.index && typeof p.rating === 'number') {
        ratingMap.set(`${p.contestId}-${p.index}`, p.rating);
      }
    }

    let easy = 0, medium = 0, hard = 0;
    solvedSet.forEach((key) => {
      const r = ratingMap.get(key);
      if (typeof r === 'number') {
        if (r <= 1200) easy++;
        else if (r >= 1800) hard++;
        else medium++;
      }
    });

    // Top 5 best ranks (smallest numbers)
    const topContests = [...ratingChanges]
      .filter((c) => typeof c.rank === 'number')
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map((c) => ({
        contestName: c.contestName,
        rank: c.rank,
        rating: c.newRating,
        time: new Date(c.ratingUpdateTimeSeconds * 1000),
      }));

    return {
      platform: 'Codeforces',
      username: info.handle,
      title: info.rank ?? null,
      currentRating: info.rating ?? null,
      maxRating: info.maxRating ?? null,
      globalRank: null,
      countryRank: null,
      solvedCount,
      difficultySolved: { easy, medium, hard },
      contestCount: ratingChanges.length,
      topContests,
      ratingGraph: ratingChanges.map((c) => ({
        rating: c.newRating,
        time: new Date(c.ratingUpdateTimeSeconds * 1000),
      })),
      profileUrl: `https://codeforces.com/profile/${handle}`,
    };
  } catch {
    return { error: 'Failed to fetch Codeforces data' };
  }
}
