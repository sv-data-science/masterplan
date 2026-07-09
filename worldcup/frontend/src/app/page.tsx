'use client';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi, matchesApi } from '@/lib/api';
import { Match, LeaderboardEntry, DEFAULT_KIT, KitConfig } from '@/types';
import Link from 'next/link';
import { MatchCard } from '@/components/MatchCard';
import { KitSVG } from '@/components/KitSVG';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const { user } = useAuthStore();
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({ queryKey: ['leaderboard'], queryFn: () => leaderboardApi.get().then(r => r.data), staleTime: 30_000 });
  const { data: matches } = useQuery<Match[]>({ queryKey: ['matches', 'home'], queryFn: () => matchesApi.list().then(r => r.data), staleTime: 60_000 });
const TZ = 'America/New_York';
  const now = Date.now();
  const todayKey    = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const tomorrowKey = new Date(now + 86_400_000).toLocaleDateString('en-CA', { timeZone: TZ });

  // Recent results: most recent completed day, group stage only
  const completedMatches = (matches ?? []).filter(m => m.status !== 'scheduled' && m.kickoff_utc && (!m.stage || m.stage === 'group'));
  const latestCompleted = completedMatches.reduce<Match | null>((acc, m) =>
    !acc || new Date(m.kickoff_utc!) > new Date(acc.kickoff_utc!) ? m : acc, null
  );
  const recentDayKey = latestCompleted
    ? new Date(latestCompleted.kickoff_utc!).toLocaleDateString('en-CA', { timeZone: TZ })
    : null;
  const recent = recentDayKey
    ? completedMatches
        .filter(m => new Date(m.kickoff_utc!).toLocaleDateString('en-CA', { timeZone: TZ }) === recentDayKey)
        .sort((a, b) => new Date(a.kickoff_utc!).getTime() - new Date(b.kickoff_utc!).getTime())
    : [];
  const recentLabel = latestCompleted
    ? new Date(latestCompleted.kickoff_utc!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ })
    : '';

  // Upcoming: today's and tomorrow's scheduled non-R32 future matches
  const scheduledFuture = (matches ?? [])
    .filter(m => m.status === 'scheduled' && m.kickoff_utc && m.stage !== 'r32' && new Date(m.kickoff_utc).getTime() > now)
    .sort((a, b) => new Date(a.kickoff_utc!).getTime() - new Date(b.kickoff_utc!).getTime());
  const todayMatches    = scheduledFuture.filter(m => new Date(m.kickoff_utc!).toLocaleDateString('en-CA', { timeZone: TZ }) === todayKey);
  const tomorrowMatches = scheduledFuture.filter(m => new Date(m.kickoff_utc!).toLocaleDateString('en-CA', { timeZone: TZ }) === tomorrowKey);
  const tomorrowLabel   = tomorrowMatches[0]
    ? new Date(tomorrowMatches[0].kickoff_utc!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ })
    : '';
  const myRank = leaderboard?.find(e => e.user_id === user?.id);

  // Prediction nudge: today or tomorrow non-R32 upcoming matches
  const nudge = (() => {
    if (!user || !matches?.length) return null;
    const todayMs = matches.filter(m => {
      if (!m.kickoff_utc || m.status !== 'scheduled' || m.stage === 'r32') return false;
      const k = new Date(m.kickoff_utc);
      return k.getTime() > now && k.toLocaleDateString('en-CA', { timeZone: TZ }) === todayKey;
    });
    const tomorrowMs = matches.filter(m => {
      if (!m.kickoff_utc || m.status !== 'scheduled' || m.stage === 'r32') return false;
      return new Date(m.kickoff_utc).toLocaleDateString('en-CA', { timeZone: TZ }) === tomorrowKey;
    });

    const target = todayMs.length > 0 ? todayMs : tomorrowMs;
    if (!target.length) return null;
    const label = todayMs.length > 0 ? 'today' : 'tomorrow';
    const predicted = target.filter(m => m.my_prediction !== null).length;
    const total = target.length;
    return { total, predicted, label, allDone: predicted === total };
  })();

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-br from-green-900/30 to-[#161b22] border-green-800/50 text-center">
        <div className="text-5xl mb-2">⚽🏆</div>
        <h1 className="text-3xl font-bold text-white">FIFA World Cup 2026</h1>
        <p className="text-gray-400 mt-1">🇲🇽 Mexico · 🇺🇸 USA · 🇨🇦 Canada · Jun 11 – Jul 19</p>
        {myRank ? (
          <div className="mt-4 inline-flex items-center gap-3 bg-[#0d1117] rounded-lg px-4 py-2">
            <KitSVG kit={{ ...DEFAULT_KIT, ...(user?.kit as KitConfig), jersey: { ...DEFAULT_KIT.jersey, ...((user?.kit as KitConfig)?.jersey) }, shorts: { ...DEFAULT_KIT.shorts, ...((user?.kit as KitConfig)?.shorts) }, socks: { ...DEFAULT_KIT.socks, ...((user?.kit as KitConfig)?.socks) } }} width={32} />
            <span className="text-gray-400 text-sm">Your rank</span>
            <span className="text-2xl font-bold text-green-400">#{myRank.rank}</span>
            <span className="text-gray-400 text-sm">·</span>
            <span className="text-xl font-bold text-white">{myRank.total_points}pts</span>
          </div>
        ) : !user ? (
          <div className="mt-4"><Link href="/register" className="btn-primary mr-2">Get started</Link><Link href="/login" className="btn-secondary">Log in</Link></div>
        ) : null}
      </div>

      {nudge && (
        <Link href="/my-predictions" className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
          nudge.allDone
            ? 'bg-green-900/20 border-green-700/50 text-green-300 hover:bg-green-900/30'
            : nudge.predicted === 0
            ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300 hover:bg-yellow-900/30'
            : 'bg-blue-900/20 border-blue-700/50 text-blue-300 hover:bg-blue-900/30'
        }`}>
          <span className="text-xl shrink-0">{nudge.allDone ? '✅' : '⚡'}</span>
          <span className="flex-1">
            {nudge.allDone
              ? `You've predicted all ${nudge.total} match${nudge.total > 1 ? 'es' : ''} kicking off ${nudge.label} — you're all set!`
              : nudge.predicted === 0
              ? `${nudge.total} match${nudge.total > 1 ? 'es' : ''} kick${nudge.total === 1 ? 's' : ''} off ${nudge.label} — you haven't predicted any yet`
              : `⚡ ${nudge.total} match${nudge.total > 1 ? 'es' : ''} kick${nudge.total === 1 ? 's' : ''} off ${nudge.label} — you've predicted ${nudge.predicted} of them`
            }
          </span>
          <span className="shrink-0 text-xs opacity-70">My Picks →</span>
        </Link>
      )}

      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-white">Results · {recentLabel}</h2>
            <Link href="/results" className="text-sm text-green-400 hover:underline">All results →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{recent.map(m => <MatchCard key={m.id} match={m} queryKey={['matches','home']} />)}</div>
        </section>
      )}

      {todayMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-white">Today's Matches</h2>
            <Link href="/matches" className="text-sm text-green-400 hover:underline">All matches →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{todayMatches.map(m => <MatchCard key={m.id} match={m} queryKey={['matches','home']} />)}</div>
        </section>
      )}

      {tomorrowMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-white">Tomorrow · {tomorrowLabel}</h2>
            <Link href="/matches" className="text-sm text-green-400 hover:underline">All matches →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{tomorrowMatches.map(m => <MatchCard key={m.id} match={m} queryKey={['matches','home']} />)}</div>
        </section>
      )}
    </div>
  );
}
