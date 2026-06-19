'use client';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi, matchesApi, triviaApi } from '@/lib/api';
import { Match, LeaderboardEntry, DEFAULT_KIT, KitConfig } from '@/types';
import Link from 'next/link';
import { MatchCard } from '@/components/MatchCard';
import { KitSVG } from '@/components/KitSVG';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const { user } = useAuthStore();
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({ queryKey: ['leaderboard'], queryFn: () => leaderboardApi.get().then(r => r.data), staleTime: 30_000 });
  const { data: matches } = useQuery<Match[]>({ queryKey: ['matches', 'home'], queryFn: () => matchesApi.list().then(r => r.data), staleTime: 60_000 });
  const { data: triviaStats } = useQuery({ queryKey: ['trivia-my-stats'], queryFn: () => triviaApi.myStats().then(r => r.data), enabled: !!user, staleTime: 60_000 });

  const upcoming = matches?.filter(m => m.status === 'scheduled').sort((a,b) => new Date(a.kickoff_utc??0).getTime()-new Date(b.kickoff_utc??0).getTime()).slice(0,4)??[];
  const recent = matches?.filter(m => m.status !== 'scheduled').sort((a,b) => new Date(b.kickoff_utc??0).getTime()-new Date(a.kickoff_utc??0).getTime()).slice(0,4)??[];
  const top5 = leaderboard?.slice(0,5)??[];
  const myRank = leaderboard?.find(e => e.user_id === user?.id);

  return (
    <div className="space-y-8">
      <div className="card p-6 bg-gradient-to-br from-green-900/30 to-[#161b22] border-green-800/50 text-center">
        <div className="text-5xl mb-2">⚽🏆</div>
        <h1 className="text-3xl font-bold text-white">FIFA World Cup 2026</h1>
        <p className="text-gray-400 mt-1">🇲🇽 Mexico · 🇺🇸 USA · 🇨🇦 Canada · Jun 11 – Jul 19</p>
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
                <span className={`font-bold w-6 text-center text-sm shrink-0 ${e.rank===1?'text-yellow-400':e.rank===2?'text-gray-300':e.rank===3?'text-orange-400':'text-gray-500'}`}>{e.rank===1?'🥇':e.rank===2?'🥈':e.rank===3?'🥉':`#${e.rank}`}</span>
                <div className="shrink-0">
                  <KitSVG kit={{ ...DEFAULT_KIT, ...(e.kit as KitConfig), jersey: { ...DEFAULT_KIT.jersey, ...((e.kit as KitConfig)?.jersey) }, shorts: { ...DEFAULT_KIT.shorts, ...((e.kit as KitConfig)?.shorts) }, socks: { ...DEFAULT_KIT.socks, ...((e.kit as KitConfig)?.socks) } }} width={24} />
                </div>
                <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{e.display_name}</p><p className="text-xs text-gray-500">{(e as any).predictions ?? e.predictions_made ?? 0} predictions</p></div>
                <div className="text-right"><p className="font-bold text-green-400">{e.total_points}</p><p className="text-xs text-gray-500">pts</p></div>
              </div>
            ))}
          </div>
          {user && triviaStats && (
            <div className="card mt-4 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">🧠 Trivia</h3>
                <Link href="/trivia" className="text-xs text-green-400 hover:underline">Play →</Link>
              </div>
              {triviaStats.games_played === 0 ? (
                <p className="text-xs text-gray-500 text-center py-1">No games yet — <Link href="/trivia" className="text-green-400 hover:underline">take the quiz!</Link></p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className={`text-lg font-bold ${triviaStats.best_score != null ? (Math.round(triviaStats.best_score/triviaStats.best_total*100) >= 80 ? 'text-green-400' : Math.round(triviaStats.best_score/triviaStats.best_total*100) >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                        {triviaStats.best_score != null ? `${Math.round(triviaStats.best_score/triviaStats.best_total*100)}%` : '—'}
                      </div>
                      <div className="text-xs text-gray-500">Best</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${triviaStats.live_total > 0 ? (Math.round(triviaStats.live_score/triviaStats.live_total*100) >= 80 ? 'text-green-400' : Math.round(triviaStats.live_score/triviaStats.live_total*100) >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                        {triviaStats.live_total > 0 ? `${Math.round(triviaStats.live_score/triviaStats.live_total*100)}%` : '—'}
                      </div>
                      <div className="text-xs text-gray-500">Live</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{triviaStats.games_played}</div>
                      <div className="text-xs text-gray-500">Games</div>
                    </div>
                  </div>
                  {triviaStats.live_total > 0 && (
                    <div className="w-full bg-[#30363d] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${Math.round(triviaStats.live_score/triviaStats.live_total*100) >= 80 ? 'bg-green-500' : Math.round(triviaStats.live_score/triviaStats.live_total*100) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.round(triviaStats.live_score/triviaStats.live_total*100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="card mt-4 p-4">
            <h3 className="font-semibold text-sm mb-3">Scoring Rules</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-yellow-400">⭐ Exact score</span><span className="font-bold">3 pts</span></div>
              <div className="flex justify-between"><span className="text-blue-400">◎ Right result + goal diff</span><span className="font-bold">2 pts</span></div>
              <div className="flex justify-between"><span className="text-cyan-400">✓ Right result</span><span className="font-bold">1 pt</span></div>
              <div className="flex justify-between"><span className="text-red-400">✗ Wrong result</span><span className="font-bold">0 pts</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
