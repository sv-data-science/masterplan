'use client';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { triviaApi, leaderboardApi } from '@/lib/api';
import { KitSVG } from '@/components/KitSVG';
import { DEFAULT_KIT, KitConfig, LeaderboardEntry } from '@/types';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuthStore();

  const { data: triviaStats } = useQuery({
    queryKey: ['trivia-my-stats'],
    queryFn: () => triviaApi.myStats().then(r => r.data),
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get().then(r => r.data),
    staleTime: 60_000,
  });

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-10 text-center space-y-4">
          <div className="text-5xl">👤</div>
          <h1 className="text-2xl font-bold text-white">Sign in to view your profile</h1>
          <div className="flex justify-center gap-3">
            <Link href="/login" className="btn-secondary">Log in</Link>
            <Link href="/register" className="btn-primary">Sign up</Link>
          </div>
        </div>
      </div>
    );
  }

  const kit: KitConfig = {
    ...DEFAULT_KIT,
    ...(user.kit as KitConfig),
    jersey: { ...DEFAULT_KIT.jersey, ...((user.kit as KitConfig)?.jersey) },
    shorts: { ...DEFAULT_KIT.shorts, ...((user.kit as KitConfig)?.shorts) },
    socks: { ...DEFAULT_KIT.socks, ...((user.kit as KitConfig)?.socks) },
  };

  const myRank = leaderboard?.find(e => e.user_id === user.id);
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;
  const bestPct = triviaStats?.best_score != null ? pct(triviaStats.best_score, triviaStats.best_total) : null;
  const livePct = triviaStats?.live_total > 0 ? pct(triviaStats.live_score, triviaStats.live_total) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile hero */}
      <div className="card p-6">
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <KitSVG kit={kit} width={80} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{user.display_name}</h1>
            <p className="text-gray-500 text-sm">@{user.username}</p>
            {myRank && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-sm font-bold ${myRank.rank <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                  #{myRank.rank}
                </span>
                <span className="text-gray-500 text-sm">on leaderboard</span>
                <span className="text-white font-bold text-sm">· {myRank.total_points} pts</span>
              </div>
            )}
          </div>
          <Link href="/kit" className="btn-secondary text-xs py-1.5 shrink-0">
            🎽 Edit Uniform
          </Link>
        </div>
      </div>

      {/* Prediction stats */}
      {myRank && (
        <div className="card p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Prediction Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{myRank.total_points}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{myRank.exact_scores}</div>
              <div className="text-xs text-gray-500 mt-0.5">Exact Scores</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{myRank.correct_outcomes}</div>
              <div className="text-xs text-gray-500 mt-0.5">Correct Outcomes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-300">{myRank.predictions_made ?? 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">Predictions</div>
            </div>
          </div>
        </div>
      )}

      {/* Trivia stats */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest">🧠 Trivia Stats</h2>
          <Link href="/trivia" className="text-xs text-green-400 hover:underline">Play →</Link>
        </div>
        {!triviaStats || triviaStats.games_played === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">
            No trivia games yet — <Link href="/trivia" className="text-green-400 hover:underline">take the quiz!</Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${bestPct != null ? (bestPct >= 80 ? 'text-green-400' : bestPct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {bestPct != null ? `${bestPct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Best Score</div>
              {triviaStats.best_score != null && (
                <div className="text-xs text-gray-600">{triviaStats.best_score}/{triviaStats.best_total}</div>
              )}
            </div>
            <div>
              <div className={`text-2xl font-bold ${livePct != null ? (livePct >= 80 ? 'text-green-400' : livePct >= 60 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-500'}`}>
                {livePct != null ? `${livePct}%` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Running %</div>
              {triviaStats.live_total > 0 && (
                <div className="text-xs text-gray-600">{triviaStats.live_score}/{triviaStats.live_total} Q</div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{triviaStats.games_played}</div>
              <div className="text-xs text-gray-500 mt-0.5">Games Played</div>
            </div>
          </div>
        )}
      </div>

      {/* Coming soon */}
      <div className="card p-5 border-dashed border-[#30363d]">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Coming Soon</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2"><span>⭐</span> Favorite World Cup edition</div>
          <div className="flex items-center gap-2"><span>🏆</span> Favorite national team</div>
          <div className="flex items-center gap-2"><span>⚽</span> All-time favorite player</div>
          <div className="flex items-center gap-2"><span>👥</span> Public profile — let others see your stats</div>
        </div>
      </div>
    </div>
  );
}
