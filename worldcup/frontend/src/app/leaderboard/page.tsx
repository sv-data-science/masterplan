'use client';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi, goalsApi } from '@/lib/api';
import { LeaderboardEntry, TopScorerEntry } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';

function LeaderboardTab() {
  const { user } = useAuthStore();
  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get().then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const icon = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;
  if (entries.length === 0) return (
    <div className="card p-8 text-center text-gray-500">
      <div className="text-4xl mb-2">🏆</div>
      <p>No predictions yet. Be the first!</p>
    </div>
  );

  return (
    <div className="card divide-y divide-[#30363d]">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 font-medium uppercase">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Player</div>
        <div className="col-span-2 text-center">Points</div>
        <div className="col-span-2 text-center">Exact ⭐</div>
        <div className="col-span-2 text-center">Correct ✓</div>
      </div>
      {entries.map(e => {
        const isMe = e.user_id === user?.id;
        return (
          <div key={e.user_id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${isMe ? 'bg-green-900/10' : 'hover:bg-[#1c2128]'}`}>
            <div className={`col-span-1 font-bold text-sm ${e.rank === 1 ? 'text-yellow-400' : e.rank === 2 ? 'text-gray-300' : e.rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>
              {icon(e.rank)}
            </div>
            <div className="col-span-5">
              <p className={`font-semibold text-sm ${isMe ? 'text-green-400' : 'text-white'}`}>
                {e.display_name}{isMe && <span className="ml-1 text-xs text-green-600">(you)</span>}
              </p>
              <p className="text-xs text-gray-500">@{e.username}</p>
            </div>
            <div className="col-span-2 text-center"><span className="text-xl font-bold">{e.total_points}</span></div>
            <div className="col-span-2 text-center"><span className="badge-exact">{e.exact_scores}</span></div>
            <div className="col-span-2 text-center"><span className="badge-correct">{e.correct_outcomes}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function TopScorersTab() {
  const { data: scorers = [], isLoading } = useQuery<TopScorerEntry[]>({
    queryKey: ['top-scorers'],
    queryFn: () => goalsApi.topScorers().then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;
  if (scorers.length === 0) return (
    <div className="card p-8 text-center text-gray-500">
      <div className="text-4xl mb-2">⚽</div>
      <p>No goals scored yet.</p>
    </div>
  );

  return (
    <div className="card divide-y divide-[#30363d]">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 font-medium uppercase">
        <div className="col-span-1">#</div>
        <div className="col-span-7">Player</div>
        <div className="col-span-2 text-center">Group</div>
        <div className="col-span-2 text-center">Goals</div>
      </div>
      {scorers.map((s, i) => (
        <div key={`${s.player_name}-${s.team_id}`} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#1c2128]">
          <div className={`col-span-1 font-bold text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
            #{i + 1}
          </div>
          <div className="col-span-7">
            <p className="font-semibold text-sm text-white">{s.player_name}</p>
            <p className="text-xs text-gray-500">{s.team_flag} {s.team_name}</p>
          </div>
          <div className="col-span-2 text-center text-xs text-gray-400">Grp {s.group_letter}</div>
          <div className="col-span-2 text-center">
            <span className="text-xl font-bold text-white">{s.goals}</span>
            <span className="text-xs text-gray-500 ml-1">⚽</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'leaderboard' | 'scorers'>('leaderboard');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'leaderboard' ? 'bg-[#21262d] text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => setTab('scorers')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'scorers' ? 'bg-[#21262d] text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            ⚽ Top Scorers
          </button>
        </div>
      </div>

      {tab === 'leaderboard' ? <LeaderboardTab /> : <TopScorersTab />}
    </div>
  );
}
