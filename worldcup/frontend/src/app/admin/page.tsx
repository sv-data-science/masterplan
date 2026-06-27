'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchesApi, api, goalsApi } from '@/lib/api';
import { Match, GoalEvent } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

function GoalModal({ match, onClose }: { match: Match; onClose: () => void }) {
  const [goals, setGoals] = useState<GoalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ player_name: '', minute: '', team_side: 'home' as 'home' | 'away', is_own_goal: false, is_penalty: false });
  const [saving, setSaving] = useState(false);

  const fetchGoals = async () => {
    try {
      const r = await goalsApi.list(match.id);
      setGoals(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, [match.id]);

  const addGoal = async () => {
    if (!form.player_name.trim()) { toast.error('Player name required'); return; }
    setSaving(true);
    try {
      const team_id = form.team_side === 'home' ? match.home_team.id : match.away_team.id;
      await goalsApi.add(match.id, {
        team_id,
        player_name: form.player_name.trim(),
        minute: form.minute ? parseInt(form.minute) : undefined,
        is_own_goal: form.is_own_goal,
        is_penalty: form.is_penalty,
      });
      setForm({ player_name: '', minute: '', team_side: 'home', is_own_goal: false, is_penalty: false });
      await fetchGoals();
    } catch { toast.error('Failed to add goal'); }
    finally { setSaving(false); }
  };

  const removeGoal = async (goalId: string) => {
    try {
      await goalsApi.delete(goalId);
      await fetchGoals();
    } catch { toast.error('Failed to remove goal'); }
  };

  const homeGoals = goals.filter(g =>
    (g.team_id === match.home_team.id && !g.is_own_goal) ||
    (g.team_id === match.away_team.id && g.is_own_goal)
  );
  const awayGoals = goals.filter(g =>
    (g.team_id === match.away_team.id && !g.is_own_goal) ||
    (g.team_id === match.home_team.id && g.is_own_goal)
  );
  const fmt = (g: GoalEvent) =>
    `${g.minute ? `${g.minute}' ` : ''}${g.player_name}${g.is_own_goal ? ' (og)' : ''}${g.is_penalty ? ' (p)' : ''}`;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">
            ⚽ {match.home_team.flag} {match.home_team.code} {match.home_score ?? '?'} – {match.away_score ?? '?'} {match.away_team.code} {match.away_team.flag}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        {loading ? <div className="text-center py-4 text-gray-500 text-sm">Loading…</div> : (
          <div className="grid grid-cols-2 gap-4 mb-4 min-h-[60px]">
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">{match.home_team.flag} {match.home_team.name}</p>
              {homeGoals.length === 0
                ? <p className="text-xs text-gray-700">—</p>
                : homeGoals.map(g => (
                  <div key={g.id} className="flex items-center justify-between text-xs py-0.5 gap-2">
                    <span className="text-white">{fmt(g)}</span>
                    <button onClick={() => removeGoal(g.id)} className="text-red-500 hover:text-red-400 shrink-0">×</button>
                  </div>
                ))}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">{match.away_team.flag} {match.away_team.name}</p>
              {awayGoals.length === 0
                ? <p className="text-xs text-gray-700">—</p>
                : awayGoals.map(g => (
                  <div key={g.id} className="flex items-center justify-between text-xs py-0.5 gap-2">
                    <span className="text-white">{fmt(g)}</span>
                    <button onClick={() => removeGoal(g.id)} className="text-red-500 hover:text-red-400 shrink-0">×</button>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="border-t border-[#30363d] pt-4">
          <p className="text-xs text-gray-500 mb-2">Add goal</p>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={form.team_side} onChange={e => setForm(f => ({ ...f, team_side: e.target.value as 'home' | 'away' }))} className="input py-1 text-xs w-20">
              <option value="home">{match.home_team.code}</option>
              <option value="away">{match.away_team.code}</option>
            </select>
            <input type="text" placeholder="Player name" value={form.player_name}
              onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addGoal()}
              className="input py-1 text-xs flex-1 min-w-[120px]" />
            <input type="number" placeholder="Min" min={1} max={120} value={form.minute}
              onChange={e => setForm(f => ({ ...f, minute: e.target.value }))}
              className="input py-1 text-xs w-16" />
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={form.is_own_goal} onChange={e => setForm(f => ({ ...f, is_own_goal: e.target.checked }))} />
              OG
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={form.is_penalty} onChange={e => setForm(f => ({ ...f, is_penalty: e.target.checked }))} />
              Pen
            </label>
            <button onClick={addGoal} disabled={saving} className="btn-primary py-1 text-xs">
              {saving ? '…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ScoreRow({ match, onUpdated }: { match: Match; onUpdated: () => void }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '');
  const [away, setAway] = useState(match.away_score?.toString() ?? '');
  const [status, setStatus] = useState(match.status);
  const [kickoff, setKickoff] = useState(
    match.kickoff_utc ? new Date(match.kickoff_utc).toISOString().slice(0, 16) : ''
  );
  const [city, setCity] = useState(match.city ?? '');
  const [venue, setVenue] = useState(match.venue ?? '');
  const [saving, setSaving] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const save = async () => {
    const h = parseInt(home), a = parseInt(away);
    if (isNaN(h) || isNaN(a)) { toast.error('Enter valid scores'); return; }
    setSaving(true);
    try {
      await matchesApi.updateScore(match.id, h, a, status, kickoff || undefined, venue || undefined, city || undefined);
      toast.success('Saved!');
      onUpdated();
    }
    catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <tr className="border-b border-[#30363d] hover:bg-[#1c2128]">
        <td className="px-3 py-2 text-xs text-gray-500">
          #{match.match_number}<br /><span className="text-gray-600">G{match.group_letter} MD{match.matchday}</span>
        </td>
        <td className="px-3 py-2 text-sm whitespace-nowrap">
          {match.home_team.flag} {match.home_team.code} <span className="text-gray-600">vs</span> {match.away_team.code} {match.away_team.flag}
        </td>
        <td className="px-3 py-2">
          <input type="datetime-local" value={kickoff} onChange={e => setKickoff(e.target.value)}
            className="input py-1 text-xs w-40" />
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-col gap-1">
            <input type="text" value={city} onChange={e => setCity(e.target.value)} className="input py-1 text-xs w-28" placeholder="City" />
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} className="input py-1 text-xs w-28" placeholder="Stadium" />
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)} className="input w-12 py-1 text-sm text-center" placeholder="-" />
            <span className="text-gray-600">–</span>
            <input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)} className="input w-12 py-1 text-sm text-center" placeholder="-" />
          </div>
        </td>
        <td className="px-3 py-2">
          <select value={status} onChange={e => setStatus(e.target.value as Match['status'])} className="input py-1 text-sm">
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={save} disabled={saving} className="btn-primary py-1 text-sm">{saving ? '…' : 'Save'}</button>
            <button onClick={() => setGoalsOpen(true)} className="btn-secondary py-1 text-sm" title="Edit goals">⚽</button>
          </div>
        </td>
      </tr>
      {goalsOpen && <GoalModal match={match} onClose={() => setGoalsOpen(false)} />}
    </>
  );
}

function SeedPanel({ onSeeded }: { onSeeded: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const { data: matchCount } = useQuery({
    queryKey: ['match-count'],
    queryFn: () => matchesApi.list().then(r => r.data.length),
    staleTime: 30_000,
  });

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await api.post('/admin/seed');
      if (r.data.status === 'already_seeded') toast('Already seeded — matches are present');
      else toast.success(`Seeded ${r.data.teams} teams and 72 matches!`);
      onSeeded();
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Seed failed');
    } finally { setSeeding(false); }
  };

  if (matchCount && matchCount > 0) return null;

  return (
    <div className="card p-4 border-orange-800/40 bg-orange-900/10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">⚠️ No match data found</h3>
          <p className="text-xs text-gray-400 mt-0.5">The database is empty. Seed it with all 72 WC 2026 group stage matches.</p>
        </div>
        <button onClick={seed} disabled={seeding} className="btn-primary py-1.5 text-sm">
          {seeding ? '⏳ Seeding…' : '🌱 Seed matches'}
        </button>
      </div>
    </div>
  );
}

function SyncPanel({ onSynced }: { onSynced: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => api.get('/admin/sync/status').then(r => r.data),
    staleTime: 10_000,
  });

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const r = await api.post('/admin/sync');
      const { updated, error, total_api_matches, goals_synced, matches_with_goals_in_api } = r.data;
      if (error) toast.error(`Sync error: ${error}`);
      else {
        const goalMsg = matches_with_goals_in_api > 0
          ? ` · ${goals_synced} goal${goals_synced !== 1 ? 's' : ''} synced`
          : ' · no scorer data from API yet';
        toast.success(`Sync complete — ${updated} match${updated !== 1 ? 'es' : ''} updated (${total_api_matches} from API)${goalMsg}`);
      }
      refetchStatus();
      onSynced();
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const lastSync = status?.synced_at
    ? new Date(status.synced_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never';

  return (
    <div className="card p-4 border-blue-800/40 bg-blue-900/10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            🔄 Auto-sync from football-data.org
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {status?.api_key_configured
              ? `Auto-syncing every ${status.auto_sync_interval_minutes} min · Last sync: ${lastSync}`
              : 'Set FOOTBALL_DATA_API_KEY env var to enable auto-sync'}
          </p>
          {status?.error && (
            <p className="text-xs text-red-400 mt-1">Last error: {status.error}</p>
          )}
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing || !status?.api_key_configured}
          className="btn-primary py-1.5 text-sm disabled:opacity-40"
          title={!status?.api_key_configured ? 'API key not configured' : ''}
        >
          {syncing ? '⏳ Syncing…' : '🔄 Sync now'}
        </button>
      </div>
    </div>
  );
}

function EspnGoalSyncPanel({ onSynced }: { onSynced: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [debugResult, setDebugResult] = useState<string | null>(null);
  const [debugging, setDebugging] = useState(false);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await api.post('/admin/sync-goals');
      const { goals_synced, matches_updated, skipped_teams, failed_dates, error, message } = r.data;
      if (error) {
        toast.error(error, { duration: 8000 });
      } else if (message) {
        toast(message);
      } else {
        const skipMsg = skipped_teams?.length ? ` · ${skipped_teams.length} unmatched` : '';
        const failMsg = failed_dates?.length ? ` · ${failed_dates.length} dates failed` : '';
        toast.success(`ESPN sync — ${goals_synced} goal${goals_synced !== 1 ? 's' : ''} from ${matches_updated} match${matches_updated !== 1 ? 'es' : ''}${skipMsg}${failMsg}`);
        onSynced();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'ESPN sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const debug = async () => {
    setDebugging(true);
    setDebugResult(null);
    try {
      const r = await api.get('/admin/debug-espn');
      setDebugResult(JSON.stringify(r.data, null, 2));
    } catch (e: any) {
      setDebugResult(`Error: ${e.response?.data?.detail ?? e.message}`);
    } finally { setDebugging(false); }
  };

  return (
    <div className="card p-4 border-green-800/40 bg-green-900/10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">⚽ Sync goal scorers (ESPN)</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Fetches goal scorer data from ESPN's public API — no API key needed.
            Replaces existing goal events for all completed matches.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={debug} disabled={debugging} className="btn-secondary py-1.5 text-xs">
            {debugging ? '…' : '🔍 Test ESPN'}
          </button>
          <button onClick={sync} disabled={syncing} className="btn-primary py-1.5 text-sm">
            {syncing ? '⏳ Syncing…' : '⚽ Sync goals'}
          </button>
        </div>
      </div>
      {debugResult && (
        <pre className="mt-3 text-xs text-gray-300 bg-[#0d1117] rounded p-3 overflow-auto max-h-48 border border-[#30363d]">
          {debugResult}
        </pre>
      )}
    </div>
  );
}

function PatchSchedulePanel({ onPatched }: { onPatched: () => void }) {
  const [patching, setPatching] = useState(false);

  const patch = async () => {
    setPatching(true);
    try {
      const r = await api.post('/admin/patch-schedule');
      const { updated, swapped, created } = r.data;
      toast.success(`Schedule updated — ${updated} matches fixed (${swapped} swapped), ${created} new`);
      onPatched();
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Patch failed');
    } finally { setPatching(false); }
  };

  return (
    <div className="card p-4 border-blue-800/40 bg-blue-900/10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">📅 Fix schedule (safe)</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Updates kickoff times, venues, matchday numbers, and group from the official FIFA calendar.
            <strong className="text-white"> Existing scores and predictions are preserved.</strong>
          </p>
        </div>
        <button onClick={patch} disabled={patching} className="btn-primary py-1.5 text-sm">
          {patching ? '⏳ Patching…' : '📅 Fix schedule'}
        </button>
      </div>
    </div>
  );
}

const RESEED_PASSPHRASE = 'delete all';

function ReseedModal({ onConfirm, onCancel, reseeding }: { onConfirm: () => void; onCancel: () => void; reseeding: boolean }) {
  const [input, setInput] = useState('');
  const matches = input.trim().toLowerCase() === RESEED_PASSPHRASE;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="card w-full max-w-md p-6 border-red-800/60 bg-[#1a0f0f]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">💣</span>
          <div>
            <h3 className="font-bold text-white text-lg">Nuclear Reseed</h3>
            <p className="text-xs text-red-400">This action cannot be undone</p>
          </div>
        </div>

        <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-5 space-y-1 text-sm text-red-300">
          <p>⚠️ <strong>ALL match predictions</strong> will be permanently deleted</p>
          <p>⚠️ <strong>ALL match scores and goals</strong> will be wiped</p>
          <p>⚠️ 72 matches will be recreated from scratch</p>
          <p className="text-gray-400 text-xs mt-2">Teams and user accounts are preserved.</p>
        </div>

        <p className="text-sm text-gray-400 mb-2">
          Type <span className="font-mono text-white bg-[#30363d] px-1.5 py-0.5 rounded">delete all</span> to confirm:
        </p>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="delete all"
          autoFocus
          className="input w-full py-2 text-sm mb-4"
          onKeyDown={e => e.key === 'Enter' && matches && !reseeding && onConfirm()}
        />

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary py-1.5 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!matches || reseeding}
            className="py-1.5 text-sm px-4 rounded font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {reseeding ? '⏳ Reseeding…' : '💣 Wipe & reseed'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReseedPanel({ onReseeded }: { onReseeded: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [reseeding, setReseeding] = useState(false);

  const reseed = async () => {
    setReseeding(true);
    try {
      const r = await api.post('/admin/reseed');
      toast.success(`Schedule fixed — ${r.data.matches} matches recreated`);
      setShowModal(false);
      onReseeded();
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Reseed failed');
    } finally {
      setReseeding(false);
    }
  };

  return (
    <>
      <div className="card p-4 border-red-800/40 bg-red-900/10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">💣 Nuclear reseed (last resort)</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Wipes <strong className="text-red-400">ALL matches and predictions</strong>, recreates 72 matches from scratch.
              Use only if the safe patch above fails. Teams stay.
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-secondary py-1.5 text-sm">
            💣 Nuclear reseed
          </button>
        </div>
      </div>
      {showModal && (
        <ReseedModal
          onConfirm={reseed}
          onCancel={() => setShowModal(false)}
          reseeding={reseeding}
        />
      )}
    </>
  );
}

function CreateUserPanel({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ display_name: '', username: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name || !form.username || !form.email || !form.password) {
      toast.error('All fields required'); return;
    }
    setSaving(true);
    try {
      await api.post('/admin/users', form);
      toast.success(`Account created for ${form.display_name}`);
      setForm({ display_name: '', username: '', email: '', password: '' });
      onCreated();
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 border-green-800/40 bg-green-900/10">
      <h3 className="font-semibold text-white mb-3">👤 Create account for a friend</h3>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className="input text-sm py-1.5"
          placeholder="Display name (e.g. João)"
          value={form.display_name}
          onChange={set('display_name')}
        />
        <input
          className="input text-sm py-1.5"
          placeholder="Username (letters, numbers)"
          value={form.username}
          onChange={set('username')}
        />
        <input
          className="input text-sm py-1.5"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
        />
        <input
          className="input text-sm py-1.5"
          placeholder="Password"
          type="text"
          value={form.password}
          onChange={set('password')}
        />
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary py-1.5 text-sm">
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
}

function RetroactivePredictionPanel({ matches, users }: { matches: Match[]; users: any[] }) {
  const completedMatches = matches.filter(m => m.status === 'completed' || m.status === 'live');
  const [form, setForm] = useState({ username: '', match_id: '', pred_home: '', pred_away: '' });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(form.pred_home), a = parseInt(form.pred_away);
    if (!form.username || !form.match_id || isNaN(h) || isNaN(a)) {
      toast.error('All fields required'); return;
    }
    setSaving(true);
    try {
      const r = await api.post('/admin/predictions', {
        username: form.username,
        match_id: form.match_id,
        pred_home: h,
        pred_away: a,
      });
      const pts = r.data.points_earned;
      const match = completedMatches.find(m => m.id === form.match_id);
      const matchLabel = match ? `${match.home_team.code} vs ${match.away_team.code}` : 'match';
      toast.success(`Prediction saved for @${form.username} on ${matchLabel} — ${pts ?? '?'} pts`);
      setForm(f => ({ ...f, pred_home: '', pred_away: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to save prediction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 border-yellow-800/40 bg-yellow-900/10">
      <h3 className="font-semibold text-white mb-1">📝 Retroactive prediction</h3>
      <p className="text-xs text-gray-400 mb-3">Assign a missed prediction for any user on any live or completed match. Points are calculated automatically once the match is completed.</p>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={form.username} onChange={set('username')} className="input py-1.5 text-sm">
          <option value="">Select user…</option>
          {users.map(u => (
            <option key={u.id} value={u.username}>{u.display_name} (@{u.username})</option>
          ))}
        </select>
        <select value={form.match_id} onChange={set('match_id')} className="input py-1.5 text-sm">
          <option value="">Select live or completed match…</option>
          {completedMatches
            .sort((a, b) => a.match_number - b.match_number)
            .map(m => (
              <option key={m.id} value={m.id}>
                {m.status === 'live' ? '🔴 ' : ''}#{m.match_number} {m.home_team.flag}{m.home_team.code} {m.home_score ?? '?'}–{m.away_score ?? '?'} {m.away_team.code}{m.away_team.flag}
              </option>
            ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">
            {form.match_id ? completedMatches.find(m => m.id === form.match_id)?.home_team.code ?? 'Home' : 'Home'}
          </span>
          <input type="number" min={0} max={20} placeholder="0" value={form.pred_home}
            onChange={set('pred_home')} className="input py-1.5 text-sm w-16 text-center" />
          <span className="text-gray-600">–</span>
          <input type="number" min={0} max={20} placeholder="0" value={form.pred_away}
            onChange={set('pred_away')} className="input py-1.5 text-sm w-16 text-center" />
          <span className="text-xs text-gray-400 shrink-0">
            {form.match_id ? completedMatches.find(m => m.id === form.match_id)?.away_team.code ?? 'Away' : 'Away'}
          </span>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary py-1.5 text-sm">
            {saving ? 'Saving…' : 'Save prediction'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AuditLogPanel() {
  const { data: log = [], isLoading } = useQuery<any[]>({
    queryKey: ['score-audit'],
    queryFn: () => api.get('/admin/score-audit').then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const fmtScore = (h: number | null, a: number | null, hp: number | null, ap: number | null) => {
    if (h === null || a === null) return '—';
    const pens = hp !== null && ap !== null ? ` (${hp}–${ap} pens)` : '';
    return `${h}–${a}${pens}`;
  };

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-white mb-3">🔍 Score change audit log</h3>
      {isLoading && <p className="text-sm text-gray-500 text-center py-4">Loading…</p>}
      {!isLoading && log.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-4">No score changes recorded yet</p>
      )}
      {log.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="border-b border-[#30363d] text-gray-500 uppercase">
              <tr>
                <th className="text-left px-2 py-1.5">When</th>
                <th className="text-left px-2 py-1.5">Who</th>
                <th className="text-left px-2 py-1.5">Match</th>
                <th className="text-left px-2 py-1.5">Before</th>
                <th className="text-left px-2 py-1.5">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {log.map((r: any) => {
                const before = fmtScore(r.old_home_score, r.old_away_score, r.old_home_score_pens, r.old_away_score_pens);
                const after  = fmtScore(r.new_home_score, r.new_away_score, r.new_home_score_pens, r.new_away_score_pens);
                const statusChanged = r.old_status !== r.new_status;
                const when = r.changed_at
                  ? new Date(r.changed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—';
                return (
                  <tr key={r.id} className="hover:bg-[#1c2128]">
                    <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">{when}</td>
                    <td className="px-2 py-1.5">
                      <span className="text-white font-medium">{r.changed_by}</span>
                      <span className="text-gray-600 ml-1">@{r.changed_by_username}</span>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <span className="text-gray-300">#{r.match_number} {r.home_team_flag}{r.home_team_code} vs {r.away_team_code}{r.away_team_flag}</span>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-gray-500">
                      {before}
                      {r.old_status && <span className="text-gray-700 ml-1">({r.old_status})</span>}
                    </td>
                    <td className="px-2 py-1.5 font-mono">
                      <span className={after !== before ? 'text-green-400' : 'text-gray-400'}>{after}</span>
                      {statusChanged && (
                        <span className={`ml-1 ${r.new_status === 'completed' ? 'text-green-500' : r.new_status === 'live' ? 'text-red-400' : 'text-gray-500'}`}>
                          ({r.new_status})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsersPanel({ users }: { users: any[] }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-white mb-3">👥 Participants ({users.length})</h3>
      <div className="space-y-1">
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between text-sm py-1 border-b border-[#30363d] last:border-0">
            <span className="text-white">{u.display_name} <span className="text-gray-500">@{u.username}</span></span>
            {u.is_admin && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">admin</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => { if (user && !user.is_admin) router.push('/'); }, [user]);

  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches', 'admin'],
    queryFn: () => matchesApi.list().then(r => r.data),
    staleTime: 10_000,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    staleTime: 30_000,
  });

  const filtered = matches.filter(m =>
    (!filterGroup || m.group_letter === filterGroup) &&
    (!filterStatus || m.status === filterStatus)
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['matches'] });
  const invalidateUsers = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  if (!user) return <div className="text-center py-12 text-gray-500">Loading…</div>;
  if (!user.is_admin) return <div className="text-center py-12 text-gray-500">Access denied</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">Admin</span>
      </div>

      <SeedPanel onSeeded={invalidate} />

      <EspnGoalSyncPanel onSynced={invalidate} />

      <SyncPanel onSynced={invalidate} />

      <PatchSchedulePanel onPatched={invalidate} />

      <ReseedPanel onReseeded={invalidate} />

      <RetroactivePredictionPanel matches={matches} users={users} />

      <CreateUserPanel onCreated={invalidateUsers} />

      <AuditLogPanel />

      <UsersPanel users={users} />

      <p className="text-sm text-gray-400">
        Update scores manually below. Points auto-recalculate when status is set to <strong>Completed</strong>.
      </p>

      <div className="flex flex-wrap gap-3">
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="input py-1.5 text-sm w-auto">
          <option value="">All Groups</option>
          {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input py-1.5 text-sm w-auto">
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </select>
        <div className="text-sm text-gray-500 self-center">{filtered.length} matches</div>
      </div>

      {isLoading && <div className="text-center py-8 text-gray-500">Loading…</div>}

      {!isLoading && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="border-b border-[#30363d]">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left px-3 py-2">Match</th>
                <th className="text-left px-3 py-2">Teams</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Location</th>
                <th className="text-left px-3 py-2">Score</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a, b) => a.match_number - b.match_number)
                .map(m => <ScoreRow key={m.id} match={m} onUpdated={invalidate} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
