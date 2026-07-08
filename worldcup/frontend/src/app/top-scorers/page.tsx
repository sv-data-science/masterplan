'use client';
import { useQuery } from '@tanstack/react-query';
import { goalsApi } from '@/lib/api';
import { TopScorerEntry } from '@/types';

function computeRanks(scorers: TopScorerEntry[]): number[] {
  const first = scorers.map((s, i, arr) => {
    if (i === 0) return 1;
    return s.goals === arr[i - 1].goals ? -1 : i + 1;
  });
  return first.map((r, i) => {
    if (r !== -1) return r;
    for (let j = i - 1; j >= 0; j--) if (first[j] !== -1) return first[j];
    return 1;
  });
}

export default function TopScorersPage() {
  const { data: scorers = [], isLoading, isError } = useQuery<TopScorerEntry[]>({
    queryKey: ['top-scorers'],
    queryFn: () => goalsApi.topScorers().then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const ranks = computeRanks(scorers);
  const icon = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Top Scorers</h1>
        {scorers.length > 0 && <div className="text-sm text-gray-500">{scorers.length} players</div>}
      </div>

      {isLoading && <div className="text-center py-12 text-gray-500">Loading…</div>}

      {isError && (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-sm">Could not load top scorers — the backend may need to be redeployed.</p>
          <p className="text-xs text-gray-600 mt-1">Make sure the latest backend is deployed on Railway.</p>
        </div>
      )}

      {!isLoading && !isError && scorers.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">⚽</div>
          <p>No goals scored yet.</p>
          <p className="text-xs text-gray-600 mt-1">Add goals via the ⚽ button in the Admin panel after updating match scores.</p>
        </div>
      )}

      {scorers.length > 0 && (
        <div className="card divide-y divide-[#30363d]">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 font-medium uppercase">
            <div className="col-span-1">#</div>
            <div className="col-span-9">Player</div>
            <div className="col-span-2 text-center">Goals</div>
          </div>
          {scorers.map((s, i) => {
            const rank = ranks[i];
            return (
              <div key={`${s.player_name}-${s.team_id}`} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#1c2128]">
                <div className={`col-span-1 font-bold text-sm ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
                  {icon(rank)}
                </div>
                <div className="col-span-9">
                  <p className="font-semibold text-sm text-white">{s.player_name}</p>
                  <p className="text-xs text-gray-500">{s.team_flag} {s.team_name}</p>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xl font-bold text-white">{s.goals}</span>
                  <span className="text-xs text-gray-500 ml-1">⚽</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
