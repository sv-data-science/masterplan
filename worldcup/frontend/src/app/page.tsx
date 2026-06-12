'use client';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi, matchesApi } from '@/lib/api';
import { Match, LeaderboardEntry } from '@/types';
import Link from 'next/link';
import { MatchCard } from '@/components/MatchCard';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const { user } = useAuthStore();
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({ queryKey: ['leaderboard'], queryFn: () => leaderboardApi.get().then(r => r.data), staleTime: 30_000 });
  const { data: matches } = useQuery<Match[]>({ queryKey: ['matches', 'home'], queryFn: () => matchesApi.list().then(r => r.data), staleTime: 60_000 });

  const upcoming = matches?.filter(m => m.status === 'scheduled').sort((a,b) => new Date(a.kickoff_utc??0).getTime()-new Date(b.kickoff_utc??0).getTime()).slice(0,4)??[];
  const recent = matches?.filter(m => m.status !== 'scheduled').sort((a,b) => new Date(b.kickoff_utc??0).getTime()-new Date(a.kickoff_utc??0).getTime()).slice(0,4)??[];
  const top5 = leaderboard?.slice(0,5)??[];
  const myRank = leaderboard?.find(e => e.user_id === user?.id);

  return (
    <div className="space-y-8">
      <div className="card p-6 bg-gradient-to-br from-green-900/30 to-[#161b22] border-green-800/50 text-center">
        <div className="text-5xl mb-2">⚽🏆</div>
        <h1 className="text-3xl font-bold text-white">FIFA World Cup 2026</h1>
        <p className="text-gray-400 mt-1">USA · Canada · Mexico · Jun 11 – Jul 19</p>
        {myRank ? (
          <div className="mt-4 inline-flex items-center gap-3 bg-[#0d1117] rounded-lg px-4 py-2">
            <span className="text-gray-400 text-sm">Your rank</span>
            <span className="text-2xl font-bold text-green-400">#{myRank.rank}</span>
            <span className="text-gray-400 text-sm">·</span>
            <span className="text-xl font-bold text-white">{myRank.total_points}pts</span>
          </div>
        ) : !user ? (
          <div className="mt-4"><Link href="/register" className="btn-primary mr-2">Get started</Link><Link href="/login" className="btn-secondary">Log in</Link></div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-lg text-white">Recent Results</h2><Link href="/matches" className="text-sm text-green-400 hover:underline">All matches →</Link></div>
              <div className="grid sm:grid-cols-2 gap-3">{recent.map(m => <MatchCard key={m.id} match={m} queryKey={['matches','home']} />)}</div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-lg text-white">Upcoming Matches</h2><Link href="/matches" className="text-sm text-green-400 hover:underline">All matches →</Link></div>
              <div className="grid sm:grid-cols-2 gap-3">{upcoming.map(m => <MatchCard key={m.id} match={m} queryKey={['matches','home']} />)}</div>
            </section>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-lg text-white">Leaderboard</h2><Link href="/leaderboard" className="text-sm text-green-400 hover:underline">Full →</Link></div>
          <div className="card divide-y divide-[#30363d]">
            {top5.length === 0 && <p className="p-4 text-sm text-gray-500 text-center">No scores yet</p>}
            {top5.map(e => (
              <div key={e.user_id} className={`flex items-center gap-3 px-4 py-3 ${e.user_id===user?.id?'bg-green-900/10':''}`}>
                <span className={`font-bold w-6 text-center text-sm ${e.rank===1?'text-yellow-400':e.rank===2?'text-gray-300':e.rank===3?'text-orange-400':'text-gray-500'}`}>{e.rank===1?'🥇':e.rank===2?'🥈':e.rank===3?'🥉':`#${e.rank}`}</span>
                <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{e.display_name}</p><p className="text-xs text-gray-500">{e.predictions_made} predictions</p></div>
                <div className="text-right"><p className="font-bold text-green-400">{e.total_points}</p><p className="text-xs text-gray-500">pts</p></div>
              </div>
            ))}
          </div>
          <div className="card mt-4 p-4">
            <h3 className="font-semibold text-sm mb-3">Scoring Rules</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-yellow-400">⭐ Exact score</span><span className="font-bold">3 pts</span></div>
              <div className="flex justify-between"><span className="text-blue-400">✓ Correct outcome</span><span className="font-bold">1 pt</span></div>
              <div className="flex justify-between"><span className="text-red-400">✗ Wrong</span><span className="font-bold">0 pts</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
