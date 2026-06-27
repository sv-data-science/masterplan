'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchesApi, predictionsApi } from '@/lib/api';
import { Match } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { R32_BY_MATCH_NUMBER, slotLabel } from '@/lib/r32Data';

function formatKickoff(iso: string | null) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}

function pts(p: number | null) {
  if (p === 3) return <span className="badge-exact">⭐ +3</span>;
  if (p === 2) return <span className="badge-correct">◎ +2</span>;
  if (p === 1) return <span className="badge-correct">✓ +1</span>;
  if (p === 0) return <span className="badge-wrong">✗ 0</span>;
  return <span className="text-gray-600 text-xs">pending</span>;
}

function CompletedRow({ match }: { match: Match }) {
  const pred = match.my_prediction;
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm flex-wrap">
      <span className="text-gray-500 text-xs w-14 shrink-0">{formatKickoff(match.kickoff_utc)}</span>
      <span className="flex-1 min-w-0 text-white truncate">
        {match.home_team.flag} {match.home_team.code} <span className="text-gray-600">vs</span> {match.away_team.code} {match.away_team.flag}
        <span className="ml-2 text-gray-500 text-xs font-mono">({match.home_score}–{match.away_score})</span>
      </span>
      {pred ? (
        <>
          <span className="text-gray-400 text-xs font-mono">
            pred: {pred.pred_home}–{pred.pred_away}
          </span>
          <div className="shrink-0">{pts(pred.points_earned)}</div>
        </>
      ) : (
        <span className="text-gray-600 text-xs">no prediction</span>
      )}
    </div>
  );
}

function PredictRow({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [home, setHome] = useState<string>(match.my_prediction?.pred_home?.toString() ?? '');
  const [away, setAway] = useState<string>(match.my_prediction?.pred_away?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const h = Number(home), a = Number(away);
    if (isNaN(h) || isNaN(a) || home === '' || away === '') { toast.error('Enter both scores'); return; }
    setSaving(true);
    try {
      await predictionsApi.upsert(match.id, h, a);
      toast.success('Saved!');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const hasPred = match.my_prediction !== null;

  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm flex-wrap">
      <span className="text-gray-500 text-xs w-14 shrink-0">{formatKickoff(match.kickoff_utc)}</span>
      <span className="flex-1 min-w-0 text-white truncate">
        {match.home_team.flag} {match.home_team.code} <span className="text-gray-600">vs</span> {match.away_team.code} {match.away_team.flag}
        {match.status === 'completed' && <span className="ml-2 text-gray-500 text-xs font-mono">({match.home_score}–{match.away_score})</span>}
        {match.status === 'live' && <span className="ml-2 text-xs text-red-400">🔴</span>}
      </span>
      <input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)}
        className="input text-center w-12 py-1 text-sm" placeholder="0" />
      <span className="text-gray-600">–</span>
      <input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)}
        className="input text-center w-12 py-1 text-sm" placeholder="0" />
      <button onClick={save} disabled={saving} className="btn-primary py-1 text-sm px-3">
        {saving ? '…' : hasPred ? 'Update' : 'Save'}
      </button>
      {hasPred && match.status === 'completed' && <div className="shrink-0">{pts(match.my_prediction!.points_earned)}</div>}
    </div>
  );
}

function R32PredictRow({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [home, setHome] = useState<string>(match.my_prediction?.pred_home?.toString() ?? '');
  const [away, setAway] = useState<string>(match.my_prediction?.pred_away?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const entry = R32_BY_MATCH_NUMBER.get(match.match_number);
  const homeLbl = entry ? slotLabel(entry.home) : 'Home';
  const awayLbl = entry ? slotLabel(entry.away) : 'Away';

  const save = async () => {
    const h = Number(home), a = Number(away);
    if (isNaN(h) || isNaN(a) || home === '' || away === '') { toast.error('Enter both scores'); return; }
    setSaving(true);
    try {
      await predictionsApi.upsert(match.id, h, a);
      toast.success('Saved!');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const locked = match.status !== 'scheduled' || new Date(match.kickoff_utc ?? 0).getTime() <= Date.now();
  const hasPred = match.my_prediction !== null;

  if (locked && !hasPred) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-sm flex-wrap opacity-50">
        <span className="text-gray-500 text-xs w-14 shrink-0">{formatKickoff(match.kickoff_utc)}</span>
        <span className="flex-1 min-w-0 text-gray-500 truncate">
          {homeLbl} <span className="text-gray-600">vs</span> {awayLbl}
        </span>
        <span className="text-gray-600 text-xs">🔒 closed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm flex-wrap">
      <span className="text-gray-500 text-xs w-14 shrink-0">{formatKickoff(match.kickoff_utc)}</span>
      <span className="flex-1 min-w-0 text-white truncate">
        <span className="text-gray-400">{homeLbl}</span>
        <span className="text-gray-600 mx-1">vs</span>
        <span className="text-gray-400">{awayLbl}</span>
        {match.status === 'live' && <span className="ml-2 text-xs text-red-400">🔴</span>}
      </span>
      {locked && hasPred ? (
        <>
          <span className="text-gray-400 text-xs font-mono">pred: {hasPred && match.my_prediction?.pred_home}–{hasPred && match.my_prediction?.pred_away}</span>
          <span className="text-gray-600 text-xs">🔒</span>
        </>
      ) : (
        <>
          <input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)}
            className="input text-center w-12 py-1 text-sm" placeholder="0" />
          <span className="text-gray-600">–</span>
          <input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)}
            className="input text-center w-12 py-1 text-sm" placeholder="0" />
          <button onClick={save} disabled={saving} className="btn-primary py-1 text-sm px-3">
            {saving ? '…' : hasPred ? 'Update' : 'Save'}
          </button>
        </>
      )}
    </div>
  );
}

export default function MyPredictionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => { if (user === null) router.push('/login'); }, [user]);

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches', 'my-preds'],
    queryFn: () => matchesApi.list().then(r => r.data),
    staleTime: 30_000,
    enabled: !!user,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['matches', 'my-preds'] });

  const groupMatches = matches.filter(m => m.stage !== 'r32');
  const r32Matches = matches.filter(m => m.stage === 'r32').sort((a, b) => a.match_number - b.match_number);

  const predicted = matches.filter(m => m.my_prediction);
  const completed = predicted.filter(m => m.status === 'completed');
  const totalPts = completed.reduce((s, m) => s + (m.my_prediction?.points_earned ?? 0), 0);
  const exact = completed.filter(m => m.my_prediction?.points_earned === 3).length;
  const correct = completed.filter(m => m.my_prediction?.points_earned === 2 || m.my_prediction?.points_earned === 1).length;
  const unpredicted = groupMatches.filter(m => !m.my_prediction);
  const scheduled = groupMatches.filter(m => m.status === 'scheduled' && m.my_prediction);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">My Predictions</h1>

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

      {unpredicted.length > 0 && (
        <section>
          <h2 className="font-semibold text-orange-400 mb-3">Missing predictions ({unpredicted.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {unpredicted
              .sort((a, b) => new Date(a.kickoff_utc ?? 0).getTime() - new Date(b.kickoff_utc ?? 0).getTime())
              .map(m => <PredictRow key={m.id} match={m} onSaved={refresh} />)}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-300 mb-3">Upcoming ({scheduled.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {scheduled
              .sort((a, b) => new Date(a.kickoff_utc ?? 0).getTime() - new Date(b.kickoff_utc ?? 0).getTime())
              .map(m => <PredictRow key={m.id} match={m} onSaved={refresh} />)}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-300 mb-3">Completed ({completed.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {completed
              .sort((a, b) => new Date(b.kickoff_utc ?? 0).getTime() - new Date(a.kickoff_utc ?? 0).getTime())
              .map(m => <CompletedRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {r32Matches.length > 0 && (
        <section>
          <h2 className="font-semibold text-white mb-1">🏆 Round of 32 ({r32Matches.filter(m => m.my_prediction).length}/{r32Matches.length} predicted)</h2>
          <p className="text-xs text-gray-500 mb-3">Predictions use 90-min / extra-time score. Same scoring: 3/2/1/0 pts.</p>
          <div className="card divide-y divide-[#30363d]">
            {r32Matches.map(m => <R32PredictRow key={m.id} match={m} onSaved={refresh} />)}
          </div>
        </section>
      )}

      {matches.length === 0 && !isLoading && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">⚽</div>
          <p className="text-gray-400">No matches found</p>
        </div>
      )}
    </div>
  );
}
