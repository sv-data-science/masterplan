'use client';
import { Match } from '@/types';
import { useState } from 'react';
import { predictionsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';

function formatKickoff(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function outcomeLabel(points: number | null) {
  if (points === null) return null;
  if (points === 3) return <span className="badge-exact">⭐ Exact!</span>;
  if (points === 1) return <span className="badge-correct">✓ Correct</span>;
  return <span className="badge-wrong">✗ Wrong</span>;
}

export function MatchCard({ match, queryKey }: { match: Match; queryKey: string[] }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [home, setHome] = useState<string | number>(match.my_prediction?.pred_home ?? '');
  const [away, setAway] = useState<string | number>(match.my_prediction?.pred_away ?? '');
  const [saving, setSaving] = useState(false);
  const canPredict = !!user && match.status === 'scheduled';

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
        ) : match.status === 'live' ? (
          <p className="text-xs text-red-400 text-center">🔴 Predictions locked</p>
        ) : (
          <p className="text-xs text-gray-600 text-center"><a href="/login" className="underline hover:text-green-400">Log in</a> to predict</p>
        )}
      </div>
    </div>
  );
}
