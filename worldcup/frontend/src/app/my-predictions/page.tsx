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
  const homeLbl = match.home_team.code !== 'TBD'
    ? `${match.home_team.flag} ${match.home_team.name}`
    : (entry ? slotLabel(entry.home) : 'Home');
  const awayLbl = match.away_team.code !== 'TBD'
    ? `${match.away_team.flag} ${match.away_team.name}`
    : (entry ? slotLabel(entry.away) : 'Away');

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

const STAGE_TABS = [
  { key: 'group', label: 'Group Stage', short: 'Groups' },
  { key: 'r32',   label: 'Round of 32', short: 'R32' },
  { key: 'r16',   label: 'Round of 16', short: 'R16' },
  { key: 'qf',    label: 'Quarter-Finals', short: 'QF' },
  { key: 'sf',    label: 'Semi-Finals', short: 'SF' },
  { key: 'f',     label: 'Final', short: 'Final' },
];

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

  const [activeTab, setActiveTab] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['matches', 'my-preds'] });

  const stagesPresent = new Set(matches.map(m => m.stage ?? 'group'));

  const resolvedTab = activeTab ?? (['qf', 'sf', 'f', 'r16', 'r32', 'group'].find(s => stagesPresent.has(s)) ?? 'group');

  const tabMatches = matches.filter(m => {
    if (resolvedTab === 'group') return !m.stage || m.stage === 'group';
    return m.stage === resolvedTab;
  });

  const isKnockout = resolvedTab === 'r32' || resolvedTab === 'r16' || resolvedTab === 'qf' || resolvedTab === 'sf' || resolvedTab === 'f';

  const predicted = matches.filter(m => m.my_prediction);
  const completed = predicted.filter(m => m.status === 'completed');
  const totalPts = completed.reduce((s, m) => s + (m.my_prediction?.points_earned ?? 0), 0);
  const exact = completed.filter(m => m.my_prediction?.points_earned === 3).length;
  const correct = completed.filter(m => m.my_prediction?.points_earned === 2 || m.my_prediction?.points_earned === 1).length;

  const unpredicted = tabMatches.filter(m => !m.my_prediction && m.status === 'scheduled');
  const scheduled = tabMatches.filter(m => m.status === 'scheduled' && m.my_prediction);
  const tabCompleted = tabMatches.filter(m => m.status === 'completed');

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

      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAGE_TABS.filter(t => stagesPresent.has(t.key)).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap border transition-colors shrink-0 ${
              resolvedTab === t.key
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-[#30363d] text-gray-300 hover:text-white hover:border-gray-500'
            }`}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.short}</span>
          </button>
        ))}
      </div>

      {unpredicted.length > 0 && (
        <section>
          <h2 className="font-semibold text-orange-400 mb-3">Missing predictions ({unpredicted.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {unpredicted
              .sort((a, b) => new Date(a.kickoff_utc ?? 0).getTime() - new Date(b.kickoff_utc ?? 0).getTime())
              .map(m => isKnockout
                ? <R32PredictRow key={m.id} match={m} onSaved={refresh} />
                : <PredictRow key={m.id} match={m} onSaved={refresh} />)}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-300 mb-3">Upcoming ({scheduled.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {scheduled
              .sort((a, b) => new Date(a.kickoff_utc ?? 0).getTime() - new Date(b.kickoff_utc ?? 0).getTime())
              .map(m => isKnockout
                ? <R32PredictRow key={m.id} match={m} onSaved={refresh} />
                : <PredictRow key={m.id} match={m} onSaved={refresh} />)}
          </div>
        </section>
      )}

      {tabCompleted.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-300 mb-3">Completed ({tabCompleted.length})</h2>
          <div className="card divide-y divide-[#30363d]">
            {tabCompleted
              .sort((a, b) => new Date(b.kickoff_utc ?? 0).getTime() - new Date(a.kickoff_utc ?? 0).getTime())
              .map(m => <CompletedRow key={m.id} match={m} />)}
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
