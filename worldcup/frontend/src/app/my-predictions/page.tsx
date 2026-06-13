'use client';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

function formatKickoff(iso: string | null) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function pts(p: number | null) {
  if (p === 3) return <span className="badge-exact">⭐ +3</span>;
  if (p === 2) return <span className="badge-correct">◎ +2</span>;
  if (p === 1) return <span className="badge-correct">✓ +1</span>;
  if (p === 0) return <span className="badge-wrong">✗ 0</span>;
  return <span className="text-gray-600 text-xs">pending</span>;
}

export default function MyPredictionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (user === null) router.push('/login'); }, [user]);

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches', 'my-preds'],
    queryFn: () => matchesApi.list().then(r => r.data),
    staleTime: 30_000,
    enabled: !!user,
  });

  const predicted = matches.filter(m => m.my_prediction);
  const completed = predicted.filter(m => m.status === 'completed');
  const totalPts = completed.reduce((s, m) => s + (m.my_prediction?.points_earned ?? 0), 0);
  const exact = completed.filter(m => m.my_prediction?.points_earned === 3).length;
  const correct = completed.filter(m => m.my_prediction?.points_earned === 1).length;
  const pending = predicted.filter(m => m.status !== 'completed');
  const unpredicted = matches.filter(m => !m.my_prediction && m.status === 'scheduled');

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Predictions</h1>
        <Link href="/matches" className="btn-secondary text-sm py-1.5">+ Predict matches</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total pts', value: totalPts, color: 'text-green-400' },
          { label: 'Exact', value: exact, color: 'text-yellow-400' },
          { label: 'Correct', value: correct, color: 'text-blue-400' },
          { label: 'Predicted', value: predicted.length, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-300 mb-3">Upcoming ({pending.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {pending.sort((a, b) => new Date(a.kickoff_utc ?? 0).getTime() - new Date(b.kickoff_utc ?? 0).getTime()).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-gray-500 text-xs w-14 shrink-0">{formatKickoff(m.kickoff_utc)}</span>
                <span className="flex-1 text-white">{m.home_team.flag} {m.home_team.code} <span className="text-gray-600">vs</span> {m.away_team.code} {m.away_team.flag}</span>
                <span className="font-mono text-green-400 font-semibold">{m.my_prediction!.pred_home}–{m.my_prediction!.pred_away}</span>
                {m.status === 'live' && <span className="text-xs text-red-400">🔴 Live</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-300 mb-3">Completed ({completed.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {completed.sort((a, b) => new Date(b.kickoff_utc ?? 0).getTime() - new Date(a.kickoff_utc ?? 0).getTime()).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-gray-500 text-xs w-14 shrink-0">{formatKickoff(m.kickoff_utc)}</span>
                <span className="flex-1 text-white">{m.home_team.flag} {m.home_team.code} <span className="text-gray-600">vs</span> {m.away_team.code} {m.away_team.flag}</span>
                <span className="text-gray-400 font-mono text-xs">{m.home_score}–{m.away_score}</span>
                <span className="font-mono text-xs text-gray-500">({m.my_prediction!.pred_home}–{m.my_prediction!.pred_away})</span>
                <div>{pts(m.my_prediction!.points_earned)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {unpredicted.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-500 mb-3">Not yet predicted ({unpredicted.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {unpredicted.slice(0, 8).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-gray-500 text-xs w-14 shrink-0">{formatKickoff(m.kickoff_utc)}</span>
                <span className="flex-1 text-gray-500">{m.home_team.flag} {m.home_team.code} vs {m.away_team.code} {m.away_team.flag}</span>
                <Link href="/matches" className="text-xs text-green-400 hover:underline">Predict →</Link>
              </div>
            ))}
            {unpredicted.length > 8 && (
              <div className="px-4 py-3 text-center"><Link href="/matches" className="text-sm text-green-400 hover:underline">See all {unpredicted.length} remaining →</Link></div>
            )}
          </div>
        </section>
      )}

      {predicted.length === 0 && !isLoading && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">⚽</div>
          <p className="text-gray-400">No predictions yet</p>
          <Link href="/matches" className="btn-primary mt-4 inline-block">Start predicting</Link>
        </div>
      )}
    </div>
  );
}
