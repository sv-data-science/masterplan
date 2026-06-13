'use client';
import { Match, MatchPredictionEntry } from '@/types';
import { useState, useEffect } from 'react';
import { predictionsApi, matchesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { useQueryClient, useQuery } from '@tanstack/react-query';

function formatKickoff(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function useCountdown(kickoffIso: string | null) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!kickoffIso) return;
    const update = () => {
      const diff = new Date(kickoffIso).getTime() - Date.now();
      if (diff <= 0) { setText(''); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setText(h > 0 ? `closes in ${h}h ${m}m` : `closes in ${m}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [kickoffIso]);
  return text;
}

function isKickoffPassed(kickoffIso: string | null) {
  if (!kickoffIso) return false;
  return new Date(kickoffIso).getTime() <= Date.now();
}

function outcomeLabel(points: number | null) {
  if (points === null) return null;
  if (points === 3) return <span className="badge-exact">⭐ Exact!</span>;
  if (points === 1) return <span className="badge-correct">✓ Correct</span>;
  return <span className="badge-wrong">✗ Wrong</span>;
}

function PredictionsReveal({ matchId, matchStatus }: { matchId: string; matchStatus: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const { data: entries = [], isLoading } = useQuery<MatchPredictionEntry[]>({
    queryKey: ['match-predictions', matchId],
    queryFn: () => matchesApi.predictions(matchId).then(r => r.data),
    enabled: open && matchStatus !== 'scheduled' && !!user,
    staleTime: 60_000,
  });

  if (!user || matchStatus === 'scheduled') return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-gray-500 hover:text-green-400 transition-colors w-full text-center py-1"
      >
        {open ? '▲ Hide' : '▼ See all predictions'}
      </button>
      {open && (
        <div className="mt-1 space-y-1 border-t border-[#30363d] pt-2">
          {isLoading && <p className="text-xs text-gray-600 text-center py-1">Loading…</p>}
          {!isLoading && entries.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-1">No predictions made</p>
          )}
          {entries.map(e => (
            <div key={e.user_id} className="flex items-center justify-between text-xs">
              <span className={`font-medium ${e.points_earned === 3 ? 'text-yellow-400' : e.points_earned === 1 ? 'text-blue-400' : 'text-gray-400'}`}>
                {e.display_name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-white">{e.pred_home}–{e.pred_away}</span>
                {e.points_earned !== null && (
                  <span className={`font-bold ${e.points_earned === 3 ? 'text-yellow-400' : e.points_earned === 1 ? 'text-blue-400' : 'text-gray-600'}`}>
                    +{e.points_earned}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchCard({ match, queryKey }: { match: Match; queryKey: string[] }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [home, setHome] = useState<string | number>(match.my_prediction?.pred_home ?? '');
  const [away, setAway] = useState<string | number>(match.my_prediction?.pred_away ?? '');
  const [saving, setSaving] = useState(false);
  const countdown = useCountdown(match.kickoff_utc);
  const kicked = isKickoffPassed(match.kickoff_utc);
  const canPredict = !!user && match.status === 'scheduled' && !kicked;

  const save = async () => {
    const h = Number(home), a = Number(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { toast.error('Enter valid scores (0 or more)'); return; }
    setSaving(true);
    try {
      await predictionsApi.upsert(match.id, h, a);
      toast.success('Prediction saved!');
      qc.invalidateQueries({ queryKey });
    } catch { toast.error('Failed to save prediction'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium">Group {match.group_letter} · MD{match.matchday}</span>
        {match.status === 'live' ? (
          <span className="flex items-center gap-1 text-xs text-red-400">🔴 Live</span>
        ) : match.status === 'completed' ? (
          <span className="text-xs text-gray-500">FT</span>
        ) : kicked ? (
          <span className="text-xs text-orange-400">⏳ Starting</span>
        ) : countdown ? (
          <span className="text-xs text-green-600">{countdown}</span>
        ) : (
          <span className="text-xs text-gray-500">{formatKickoff(match.kickoff_utc)}</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <p className="text-lg">{match.home_team.flag}</p>
          <p className="font-semibold text-sm">{match.home_team.name}</p>
          <p className="text-xs text-gray-500">{match.home_team.code}</p>
        </div>
        <div className="flex items-center gap-2">
          {match.status !== 'scheduled' ? (
            <div className="text-2xl font-bold tabular-nums">{match.home_score ?? '-'} – {match.away_score ?? '-'}</div>
          ) : (
            <div className="text-gray-600 font-bold text-xl">vs</div>
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-lg">{match.away_team.flag}</p>
          <p className="font-semibold text-sm">{match.away_team.name}</p>
          <p className="text-xs text-gray-500">{match.away_team.code}</p>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[#30363d]">
        {match.status === 'completed' && match.my_prediction ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Your pick: <span className="text-white font-mono">{match.my_prediction.pred_home}–{match.my_prediction.pred_away}</span></span>
            <div className="flex items-center gap-2">{outcomeLabel(match.my_prediction.points_earned)}<span className="font-bold text-green-400">+{match.my_prediction.points_earned ?? 0}pts</span></div>
          </div>
        ) : match.status === 'completed' ? (
          <p className="text-xs text-gray-600 text-center">No prediction made</p>
        ) : canPredict ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">Your pick:</span>
            <input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)} className="input text-center w-14 py-1 text-sm" placeholder="0" />
            <span className="text-gray-600">–</span>
            <input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)} className="input text-center w-14 py-1 text-sm" placeholder="0" />
            <button onClick={save} disabled={saving} className="btn-primary py-1 text-sm flex-1">{saving ? '…' : match.my_prediction ? 'Update' : 'Save'}</button>
          </div>
        ) : match.status === 'live' || kicked ? (
          match.my_prediction ? (
            <div className="text-sm text-center text-gray-500">
              Your pick: <span className="text-white font-mono">{match.my_prediction.pred_home}–{match.my_prediction.pred_away}</span>
            </div>
          ) : (
            <p className="text-xs text-red-400/70 text-center">🔒 Predictions locked</p>
          )
        ) : (
          <p className="text-xs text-gray-600 text-center"><a href="/login" className="underline hover:text-green-400">Log in</a> to predict</p>
        )}
      </div>
      <PredictionsReveal matchId={match.id} matchStatus={match.status} />
    </div>
  );
}
