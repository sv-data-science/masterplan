'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchesApi, api } from '@/lib/api';
import { Match } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

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
        <button onClick={save} disabled={saving} className="btn-primary py-1 text-sm">{saving ? '…' : 'Save'}</button>
      </td>
    </tr>
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
      const { updated, error, total_api_matches } = r.data;
      if (error) toast.error(`Sync error: ${error}`);
      else toast.success(`Sync complete — ${updated} match${updated !== 1 ? 'es' : ''} updated (${total_api_matches} from API)`);
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

function ReseedPanel({ onReseeded }: { onReseeded: () => void }) {
  const [reseeding, setReseeding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const reseed = async () => {
    if (!confirmed) { setConfirmed(true); return; }
    setReseeding(true);
    try {
      const r = await api.post('/admin/reseed');
      toast.success(`Schedule fixed — ${r.data.matches} matches recreated`);
      setConfirmed(false);
      onReseeded();
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Reseed failed');
    } finally {
      setReseeding(false); }
  };

  return (
    <div className="card p-4 border-red-800/40 bg-red-900/10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">🔁 Fix schedule (reseed matches)</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Wipes all matches & predictions, recreates 72 matches with correct official dates, times, and venues.
            Teams stay. Use this to fix wrong pairings or kickoff times.
          </p>
        </div>
        <button onClick={reseed} disabled={reseeding} className={`py-1.5 text-sm ${confirmed ? 'btn-primary bg-red-600 hover:bg-red-700' : 'btn-secondary'}`}>
          {reseeding ? '⏳ Reseeding…' : confirmed ? '⚠️ Confirm — wipe & reseed' : '🔁 Fix schedule'}
        </button>
      </div>
    </div>
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

function UsersPanel() {
  const { data: users = [], refetch } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    staleTime: 30_000,
  });

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

      <ReseedPanel onReseeded={invalidate} />

      <SyncPanel onSynced={invalidate} />

      <CreateUserPanel onCreated={invalidateUsers} />

      <UsersPanel />

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
