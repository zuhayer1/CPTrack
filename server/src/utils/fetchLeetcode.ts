import axios from 'axios';
import cheerio from 'cheerio';

type LCSubmissionNum = { difficulty: 'All' | 'Easy' | 'Medium' | 'Hard'; count: number };
type LCRanking = {
  rating?: number | null;
  topPercentage?: number | null;
  attendedContestsCount?: number | null;
  globalRanking?: number | null;
};
type LCHistory = { contest: string; startTime: number; ranking: number | null; rating: number | null };

type Normalized = {
  platform: 'LeetCode';
  username: string | null;
  currentRating: number | null;
  maxRating: number | null;
  title: null;
  globalRank: number | null;
  countryRank: number | null;
  solvedCount: number | null;
  difficultySolved: { easy: number | null; medium: number | null; hard: number | null } | null;
  contestCount: number | null;
  topContests: { contestName: string; rank: number; rating: number | null; time: Date | null }[];
  ratingGraph: { rating: number; time: Date }[];
  profileUrl: string;
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

/** ----------------------------- Strategy 1: GraphQL ----------------------------- */
async function tryGraphQL(username: string): Promise<Normalized | null> {
  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
      }
      userContestRanking(username: $username) {
        rating
        topPercentage
        attendedContestsCount
        globalRanking
      }
      userContestRankingHistory(username: $username) {
        contest
        startTime
        ranking
        rating
      }
    }
  `;

  const cookieParts: string[] = [];
  if (process.env.LEETCODE_SESSION) cookieParts.push(`LEETCODE_SESSION=${process.env.LEETCODE_SESSION}`);
  if (process.env.LEETCODE_CSRF) cookieParts.push(`csrftoken=${process.env.LEETCODE_CSRF}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://leetcode.com',
    'Referer': 'https://leetcode.com/',
    'User-Agent': UA,
  };
  if (cookieParts.length > 0) headers['Cookie'] = cookieParts.join('; ');
  if (process.env.LEETCODE_CSRF) headers['x-csrftoken'] = process.env.LEETCODE_CSRF!;
  if (process.env.LEETCODE_REGION) headers['LeetCode-Preferred-Region'] = process.env.LEETCODE_REGION!;

  try {
    const resp = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      { headers }
    );

    const d = resp.data?.data;
    const user = d?.matchedUser;
    if (!user) return null;

    const ac = (user.submitStats?.acSubmissionNum ?? []) as LCSubmissionNum[];
    const get = (k: 'All' | 'Easy' | 'Medium' | 'Hard') => ac.find((x) => x.difficulty === k)?.count ?? 0;

    const ranking = (d?.userContestRanking ?? null) as LCRanking | null;
    const history = (d?.userContestRankingHistory ?? []) as LCHistory[];

    const topContests = [...history]
      .filter((h) => typeof h.ranking === 'number')
      .sort((a, b) => (a.ranking! - b.ranking!))
      .slice(0, 5)
      .map((h) => ({
        contestName: h.contest,
        rank: h.ranking!,
        rating: h.rating ?? null,
        time: new Date(h.startTime * 1000),
      }));

    const maxRating = Math.max(...history.map((h) => h.rating ?? 0), 0);

    return {
      platform: 'LeetCode',
      username: user.username ?? username,
      currentRating: ranking?.rating ?? null,
      maxRating: maxRating || null,
      title: null,
      globalRank: ranking?.globalRanking ?? null,
      countryRank: null,
      solvedCount: get('All'),
      difficultySolved: { easy: get('Easy'), medium: get('Medium'), hard: get('Hard') },
      contestCount: ranking?.attendedContestsCount ?? history.length,
      topContests,
      ratingGraph: history.map((h) => ({ rating: h.rating ?? 0, time: new Date(h.startTime * 1000) })),
      profileUrl: `https://leetcode.com/u/${username}/`,
    };
  } catch {
    return null;
  }
}

/** ----------------------- Strategy 2: Scrape profile page JSON ------------------- */
function deepFind<T = any>(root: any, predicate: (v: any) => boolean): T | null {
  const seen = new Set<any>();
  const stack: any[] = [root];
  while (stack.length) {
    const curr = stack.pop();
    if (!curr || typeof curr !== 'object' || seen.has(curr)) continue;
    seen.add(curr);
    if (predicate(curr)) return curr as T;
    for (const k of Object.keys(curr)) {
      try {
        stack.push((curr as any)[k]);
      } catch {}
    }
  }
  return null;
}

async function tryScrape(username: string): Promise<Normalized | null> {
  try {
    const url = `https://leetcode.com/u/${encodeURIComponent(username)}/`;
    const html = await axios.get(url, { headers: { 'User-Agent': UA, 'Referer': 'https://leetcode.com/' } }).then(r => r.data);

    const $ = cheerio.load(html);
    const nextDataText = $('#__NEXT_DATA__').first().html();

    if (!nextDataText) return null;

    const next = JSON.parse(nextDataText);

    // Find nodes by shape rather than brittle paths
    const submitStats = deepFind<{ acSubmissionNum: LCSubmissionNum[] }>(
      next,
      (v) => Array.isArray(v?.acSubmissionNum) && v.acSubmissionNum[0]?.difficulty
    );

    const userNode = deepFind<{ username?: string }>(next, (v) => typeof v?.username === 'string');

    const contestRanking = deepFind<LCRanking>(
      next,
      (v) => v && (('rating' in v) || ('globalRanking' in v)) && (typeof v === 'object')
    );

    const contestHistoryArr = deepFind<LCHistory[]>(
      next,
      (v) => Array.isArray(v) && v.length > 0 && v[0]?.contest && ('startTime' in v[0]) && ('ranking' in v[0])
    ) || [];

    // Build solved stats
    const ac = (submitStats?.acSubmissionNum ?? []) as LCSubmissionNum[];
    const get = (k: 'All' | 'Easy' | 'Medium' | 'Hard') => ac.find((x) => x.difficulty === k)?.count ?? 0;

    const topContests = [...contestHistoryArr]
      .filter((h) => typeof h.ranking === 'number')
      .sort((a, b) => (a.ranking! - b.ranking!))
      .slice(0, 5)
      .map((h) => ({
        contestName: h.contest,
        rank: h.ranking!,
        rating: h.rating ?? null,
        time: new Date(h.startTime * 1000),
      }));

    const maxRating = Math.max(...contestHistoryArr.map((h) => h.rating ?? 0), 0);

    return {
      platform: 'LeetCode',
      username: userNode?.username ?? username,
      currentRating: contestRanking?.rating ?? null,
      maxRating: maxRating || null,
      title: null,
      globalRank: contestRanking?.globalRanking ?? null,
      countryRank: null,
      solvedCount: get('All') || null,
      difficultySolved: { easy: get('Easy') || null, medium: get('Medium') || null, hard: get('Hard') || null },
      contestCount: contestRanking?.attendedContestsCount ?? (contestHistoryArr?.length ?? null),
      topContests,
      ratingGraph: (contestHistoryArr ?? []).map((h) => ({ rating: h.rating ?? 0, time: new Date(h.startTime * 1000) })),
      profileUrl: `https://leetcode.com/u/${username}/`,
    };
  } catch {
    return null;
  }
}

/** --------------------------- Strategy 3: Public fallback ------------------------ */
/* Solved-only fallback so the card isn't blank */
async function tryPublicStats(username: string): Promise<Normalized | null> {
  try {
    const stats = await axios.get(
      `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}`,
      { headers: { 'User-Agent': UA } }
    );
    const s = stats.data || {};
    const solved = s.totalSolved ?? s.totalSolvedCount ?? null;

    return {
      platform: 'LeetCode',
      username,
      currentRating: null,
      maxRating: null,
      title: null,
      globalRank: null,
      countryRank: null,
      solvedCount: solved,
      difficultySolved: {
        easy: s.easySolved ?? null,
        medium: s.mediumSolved ?? null,
        hard: s.hardSolved ?? null,
      },
      contestCount: null,
      topContests: [],
      ratingGraph: [],
      profileUrl: `https://leetcode.com/u/${username}/`,
    };
  } catch {
    return null;
  }
}

/** ------------------------------ Public API ------------------------------------- */
export async function fetchLeetcodeData(handle: string) {
  const username = handle.trim();

  // 1) GraphQL (best quality)
  const gql = await tryGraphQL(username);
  if (gql) return gql;

  // 2) Scrape profile page JSON (__NEXT_DATA__) when GraphQL blocked
  const scraped = await tryScrape(username);
  if (scraped) return scraped;

  // 3) Fallback public API for solved stats
  const fallback = await tryPublicStats(username);
  if (fallback) return fallback;

  return { error: 'Failed to fetch LeetCode data' } as any;
}
