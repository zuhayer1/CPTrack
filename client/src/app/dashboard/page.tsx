'use client';

import { useEffect, useState } from 'react';

type TopContest = { contestName: string; rank?: number | string | null };
type DifficultySolved = { easy?: number; medium?: number; hard?: number } | null;

type PlatformData = {
  error?: string;
  platform?: string;
  username?: string;
  title?: string | null;
  currentRating?: number | null;
  maxRating?: number | null;
  globalRank?: number | string | null;
  countryRank?: number | string | null;
  solvedCount?: number | null;
  contestCount?: number | null;
  topContests?: TopContest[] | null;
  difficultySolved?: DifficultySolved;
  profileUrl?: string;
};

type ProfileResponse = {
  codeforces: PlatformData | null;
  leetcode: PlatformData | null;
  codechef: PlatformData | null;
};

function DifficultyList({ diff }: { diff: DifficultySolved }) {
  if (!diff) return <span>—</span>;
  const easy = diff.easy ?? 0;
  const medium = diff.medium ?? 0;
  const hard = diff.hard ?? 0;
  return (
    <ul style={{ color: 'black' }}>
      <li>Easy: {easy}</li>
      <li>Medium: {medium}</li>
      <li>Hard: {hard}</li>
    </ul>
  );
}

function PlatformSection({
  label,
  data,
}: {
  label: 'Codeforces' | 'LeetCode' | 'CodeChef';
  data: PlatformData | null;
}) {
  return (
    <section style={{ background: 'white', color: 'black', marginBottom: '20px', padding: '10px' }}>
      <h2 style={{ color: 'black' }}>{label}</h2>
      {!data || data.error ? (
        <p style={{ color: 'black' }}>
          No profile linked or failed to fetch. You can add/edit your handle on the dashboard.
        </p>
      ) : (
        <table border={1} cellPadding={8} cellSpacing={0} width="100%" style={{ color: 'black' }}>
          <thead>
            <tr>
              <th>Profile</th>
              <th>Stats</th>
              <th>Top 5 Contest Ranks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Profile column */}
              <td valign="top" width="34%">
                <div>
                  <div><strong>Username:</strong> {data.username ?? '—'}</div>
                  <div><strong>Title:</strong> {data.title ?? '—'}</div>
                  <div><strong>Current Rating:</strong> {data.currentRating ?? '—'}</div>
                  <div><strong>Max Rating:</strong> {data.maxRating ?? '—'}</div>
                  <div><strong>Global Rank:</strong> {data.globalRank ?? '—'}</div>
                  <div><strong>India Rank:</strong> {data.countryRank ?? '—'}</div>
                  <div>
                    <strong>Profile Link:</strong>{' '}
                    {data.profileUrl ? (
                      <a href={data.profileUrl} target="_blank" rel="noreferrer" style={{ color: 'blue' }}>
                        {data.profileUrl}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <button
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'blue',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      onClick={() => alert(`Edit ${label} handle`)}
                    >
                      Edit Handle
                    </button>
                  </div>
                </div>
              </td>

              {/* Stats column */}
              <td valign="top" width="33%">
                <div>
                  <div><strong>Problems Solved:</strong> {data.solvedCount ?? '—'}</div>
                  <div><strong>Contests Attended:</strong> {data.contestCount ?? '—'}</div>
                  <div>
                    <strong>Solved by Difficulty:</strong>
                    <DifficultyList diff={data.difficultySolved ?? null} />
                  </div>
                </div>
              </td>

              {/* Top contests column */}
              <td valign="top" width="33%">
                {Array.isArray(data.topContests) && data.topContests.length > 0 ? (
                  <ol style={{ color: 'black' }}>
                    {data.topContests.slice(0, 5).map((c, idx) => (
                      <li key={idx}>
                        Rank {c.rank ?? '—'} — {c.contestName}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}
      <hr />
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('http://localhost:4000/api/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          setError('Failed to load profile data');
          setLoading(false);
          return;
        }
        const json = (await res.json()) as ProfileResponse;
        setData(json);
      } catch {
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p style={{ color: 'black' }}>Loading dashboard…</p>;
  if (error || !data) return <p style={{ color: 'black' }}>{error ?? 'Failed to load dashboard'}</p>;

  return (
    <main style={{ backgroundColor: 'white', color: 'black', padding: '10px' }}>
      <h1 style={{ color: 'black' }}>Dashboard</h1>
      <PlatformSection label="Codeforces" data={data.codeforces} />
      <PlatformSection label="LeetCode" data={data.leetcode} />
      <PlatformSection label="CodeChef" data={data.codechef} />
    </main>
  );
}
