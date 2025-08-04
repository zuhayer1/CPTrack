import axios from 'axios';
import cheerio from 'cheerio';

/**
 * Try to scrape CodeChef profile page first.
 * If blocked / structure changed, fall back to cp-rating-api.vercel.app.
 */
export async function fetchCodechefData(handle: string) {
  // --- 1) Try HTML scrape with robust headers ---
  try {
    const res = await axios.get(`https://www.codechef.com/users/${handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.codechef.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      validateStatus: () => true, // we'll handle non-200 below
      timeout: 15000,
    });

    const html = res.data as string;
    const blocked =
      res.status !== 200 ||
      !html ||
      html.length < 5000 || // very small page is often a block/challenge
      /Attention Required|Cloudflare|cf-error/i.test(html);

    if (!blocked) {
      const $ = cheerio.load(html);
      const text = (sel: string) => $(sel).first().text().trim() || null;

      const username =
        text('.h2-style') ||
        text('.user-details h1') ||
        handle;

      const currentRating = Number(text('.rating-number')) || null;
      const stars = text('.rating-star') || null;

      const maxRatingText =
        text('section.rating-data-section .rating-header small') ||
        text('.rating-header small');
      const maxRating = maxRatingText ? Number(maxRatingText.match(/\d+/)?.[0]) : null;

      const globalRank =
        text('section.rating-data-section .rating-ranks ul li:nth-child(1) strong') ||
        text('.rating-ranks li:nth-child(1) strong') ||
        null;

      const countryRank =
        text('section.rating-data-section .rating-ranks ul li:nth-child(2) strong') ||
        text('.rating-ranks li:nth-child(2) strong') ||
        null;

      // Solved count (Fully Solved)
      let solvedCount: number | null = null;
      const solvedHeader = $('section.problems-solved h5, .content h5')
        .filter((_, el) => $(el).text().toLowerCase().includes('fully solved'))
        .first();
      if (solvedHeader.length) {
        const num = solvedHeader.text().match(/\d+/)?.[0];
        solvedCount = num ? Number(num) : null;
      } else {
        // fallback: sum small badges
        let sum = 0;
        $('section.problems-solved .badge, .content .badge').each((_, el) => {
          const n = Number($(el).text().trim());
          if (!Number.isNaN(n)) sum += n;
        });
        solvedCount = sum || null;
      }

      // Contest table → best 5 ranks
      const contests: { contestName: string; rank: number | null; rating: number | null }[] = [];
      $('table.rating-table tbody tr').each((_, row) => {
        const cols = $(row).find('td');
        const contestName = $(cols[0]).text().trim();
        const rankStr = $(cols[1]).text().trim().replace(/[^\d]/g, '');
        const ratingStr = $(cols[3]).text().trim().replace(/[^\d]/g, '');
        contests.push({
          contestName,
          rank: rankStr ? Number(rankStr) : null,
          rating: ratingStr ? Number(ratingStr) : null,
        });
      });

      const topContests = contests
        .filter((c) => typeof c.rank === 'number')
        .sort((a, b) => (a.rank! - b.rank!))
        .slice(0, 5)
        .map((c) => ({
          contestName: c.contestName,
          rank: c.rank!,
          rating: c.rating ?? null,
          time: null,
        }));

      // If we got at least a rating number, assume scrape worked.
      if (currentRating !== null || topContests.length > 0 || solvedCount !== null) {
        return {
          platform: 'CodeChef',
          username,
          currentRating,
          title: stars,
          maxRating,
          globalRank,
          countryRank,
          solvedCount,
          difficultySolved: null,
          contestCount: contests.length,
          topContests,
          ratingGraph: [],
          profileUrl: `https://www.codechef.com/users/${handle}`,
        };
      }
      // otherwise fall through to fallback API
    }
  } catch {
    // ignore and fall back
  }

  // --- 2) Fallback to public API if scraping fails ---
  try {
    const api = await axios.get(`https://cp-rating-api.vercel.app/codechef/${handle}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (api.status === 200 && typeof api.data === 'object') {
      const d = api.data as {
        username?: string;
        rating?: number;
        stars?: string;
        globalRank?: number | string;
        countryRank?: number | string;
        problemsSolved?: number;
        participation?: number;
        contests?: { name?: string; rank?: number }[];
      };

      const topContests =
        (d.contests ?? [])
          .filter((c) => typeof c.rank === 'number')
          .sort((a, b) => (a.rank! - b.rank!))
          .slice(0, 5)
          .map((c) => ({
            contestName: c.name ?? 'Contest',
            rank: c.rank!,
            rating: null,
            time: null,
          }));

      return {
        platform: 'CodeChef',
        username: d.username ?? handle,
        currentRating: d.rating ?? null,
        title: d.stars ?? null,
        maxRating: null,
        globalRank: d.globalRank ?? null,
        countryRank: d.countryRank ?? null,
        solvedCount: d.problemsSolved ?? null,
        difficultySolved: null,
        contestCount: d.participation ?? (d.contests?.length ?? null),
        topContests,
        ratingGraph: [],
        profileUrl: `https://www.codechef.com/users/${handle}`,
      };
    }

    return { error: 'Failed to fetch CodeChef data (fallback API)' };
  } catch {
    return { error: 'Failed to fetch CodeChef data' };
  }
}
