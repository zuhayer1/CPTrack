'use client';

import { useEffect, useState } from 'react';

type Contest = {
  id: string;
  name: string;
  platform: string;
  startTime: string;
  endTime: string;
  duration: number;
  link: string;
};

type ContestMap = Record<string, Contest[]>;

function getDayHeaderLabel(dateString: string): string {
  const today = new Date();
  const target = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';

  const dayName = target.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return `In ${diffDays} days (${dayName}, ${fullDate})`;
}

function getTimeLeft(startTime: string) {
  const now = new Date();
  const start = new Date(startTime);
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) return 'Started';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return `${days > 0 ? `${days} day${days !== 1 ? 's' : ''} ` : ''}${hours} hour${hours !== 1 ? 's' : ''}`;
}

export default function UpcomingContests() {
  const [contestData, setContestData] = useState<ContestMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('http://localhost:4000/api/contests/upcoming');
        const data: ContestMap = await res.json();
        setContestData(data);
      } catch (err) {
        console.error('Failed to fetch contests:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading contests...</p>;

  return (
      <div className="min-h-screen bg-white text-gray-900">
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Upcoming Contests</h1>
      {Object.entries(contestData).map(([date, contests]) => {
        if (!Array.isArray(contests) || contests.length === 0) return null;

        return (
          <div key={date} className="mb-10">
            <h2 className="text-xl font-semibold mb-4 border-b pb-1">
              {getDayHeaderLabel(date)}
            </h2>
            <ul className="space-y-3">
              {contests.map((c) => (
                <li
                  key={c.id}
                  className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-md transition"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                    {/* Contest Name + Platform */}
                    <div>
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold text-lg hover:underline"
                      >
                        {c.name}
                      </a>
                      <p className="text-m font-bold text-gray-600">{c.platform}</p>
                    </div>

                    {/* Start Time */}
                    <div className="text-sm">
                      <p className="font-medium text-gray-700">Start Time</p>
                      <p className ="text-lg">{new Date(c.startTime).toLocaleString()}</p>
                    </div>

                    {/* Time Left */}
                    <div className="text-lg text-green-700 font-semibold">
                      ⏱ {getTimeLeft(c.startTime)}
                    </div>

                    {/* Button */}
                    <div className="sm:justify-end flex">
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      >
                        Visit Contest
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
    </div>

  );
}
