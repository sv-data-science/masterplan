'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leagueApi } from '@/lib/api';
import { LeagueMatch, LeagueLeaderboardEntry } from '@/types';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

const COMPETITIONS = [
  { key: 'liga_mx', label: '🇲🇽 Liga MX', color: 'green' },
  { key: 'champions_league', label: '⭐ Champions League', color: 'blue' },
  { key: 'la_liga', label: '🇪🇸 La Liga España', color: 'red' },
  { key: 'premier_league', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', color: 'purple' },
];

function pts(p: number | null | undefined) {
  if (p === null || p === undefined) return null;
  if (p === 3) return <span className="text-green-400 font-bold">+3</span>;
  if (p === 2) return <span className="text-yellow-400 font-bold">+2</span>;
  if (p === 1) return <span className="text-blue-400 font-bold">+1</span>;
  return <span className="text-gray-500">0</span>;
}

function kickoffLabel(utc: string | null) {
  if (!utc) return 'TBD';
  const d = new Date(utc);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function MatchCard({ match, canPredict }: { match: LeagueMatch; canPredict: boolean }) {
  const qc = useQueryClient();
  const [home, setHome] = useState<string>(match.my_prediction?.pred_home?.toString() ?? '');
  const [away, setAway] = useState<string>(match.my_prediction?.pred_away?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const isLocked = match.status !== 'scheduled' || (match.kickoff_utc ? new Date(match.kickoff_utc) <= new Date() : false);
  const hasPred = match.my_prediction !== null;

  const save = async () => {
    const h = parseInt(home), a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { toast.error('Enter valid scores'); return; }
    setSaving(true);
    try {
      await leagueApi.upsertPrediction(match.id, h, a);
      await qc.invalidateQueries({ queryKey: ['league-matches'] });
      toast.success('Prediction saved!');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const scoreDisplay = match.status !== 'scheduled'
    ? `${match.home_score ?? '?'} – ${match.away_score ?? '?'}`
    : null;

  return (
    <div className={`card p-4 flex flex-col gap-3 ${match.status === 'completed' ? 'opacity-90' : ''}`}>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Matchweek {match.matchweek}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
          match.status === 'completed' ? 'bg-gray-700 text-gray-300' :
          match.status === 'live' ? 'bg-red-600 text-white animate-pulse' :
          'bg-[#21262d] text-gray-400'
        }`}>{match.status}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-right">
          <span className="text-2xl">{match.home_flag}</span>
          <p className="text-sm font-semibold text-white mt-1">{match.home_team}</p>
        </div>

        <div className="text-center min-w-[60px]">
          {scoreDisplay
            ? <p className="text-xl font-bold text-white">{scoreDisplay}</p>
            : <p className="text-xs text-gray-500">{kickoffLabel(match.kickoff_utc)}</p>
          }
        </div>

        <div className="flex-1 text-left">
          <span className="text-2xl">{match.away_flag}</span>
          <p className="text-sm font-semibold text-white mt-1">{match.away_team}</p>
        </div>
      </div>

      {/* Prediction row */}
      {canPredict && (
        <div className="border-t border-[#30363d] pt-3">
          {isLocked ? (
            hasPred ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  Your pick: <strong className="text-white">
                    {match.my_prediction!.pred_home} – {match.my_prediction!.pred_away}
                  </strong>
                </span>
                <span>{pts(match.my_prediction!.points_earned)}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center">Locked — no prediction</p>
            )
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number" min={0} max={20} value={home}
                  onChange={e => setHome(e.target.value)}
                  className="w-12 text-center bg-[#0d1117] border border-[#30363d] rounded px-1 py-1 text-white text-sm focus:border-green-500 focus:outline-none"
                  placeholder="0"
                />
                <span className="text-gray-500 text-sm">–</span>
                <input
                  type="number" min={0} max={20} value={away}
                  onChange={e => setAway(e.target.value)}
                  className="w-12 text-center bg-[#0d1117] border border-[#30363d] rounded px-1 py-1 text-white text-sm focus:border-green-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <button
                onClick={save} disabled={saving}
                className="btn-primary text-xs py-1.5 px-3 shrink-0 disabled:opacity-50"
              >
                {saving ? '…' : hasPred ? 'Update' : 'Save'}
              </button>
              {hasPred && (
                <span className="text-xs text-gray-500">
                  {match.my_prediction!.pred_home}–{match.my_prediction!.pred_away}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Leaderboard({ competition }: { competition: string | 'all' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['league-leaderboard', competition],
    queryFn: () => leagueApi.leaderboard(competition === 'all' ? undefined : competition).then(r => r.data as LeagueLeaderboardEntry[]),
  });

  if (isLoading) return <div className="text-center py-8 text-gray-500">Loading…</div>;
  if (!data?.length) return <div className="text-center py-8 text-gray-600">No scores yet</div>;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#30363d] text-xs text-gray-500 uppercase">
            <th className="text-left px-4 py-3">#</th>
            <th className="text-left px-4 py-3">Player</th>
            <th className="text-right px-4 py-3">Pts</th>
            <th className="text-right px-4 py-3 hidden sm:table-cell">Exact</th>
            <th className="text-right px-4 py-3 hidden sm:table-cell">✓ Result</th>
            <th className="text-right px-4 py-3 hidden sm:table-cell">Picks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={e.user_id} className={`border-b border-[#21262d] hover:bg-[#21262d]/50 transition-colors ${i < 3 ? 'font-medium' : ''}`}>
              <td className="px-4 py-3 text-gray-400 w-8">
                {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
              </td>
              <td className="px-4 py-3 text-white">{e.display_name}</td>
              <td className="px-4 py-3 text-right text-green-400 font-bold">{e.total_points}</td>
              <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{e.exact_scores}</td>
              <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{e.correct_outcomes}</td>
              <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{e.predictions_made}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LaLigaPage() {
  const { user } = useAuthStore();
  const [activeComp, setActiveComp] = useState<string>(COMPETITIONS[0].key);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [tab, setTab] = useState<'matches' | 'leaderboard'>('matches');

  const matchesQuery = useQuery({
    queryKey: ['league-matches', activeComp, activeWeek],
    queryFn: () => {
      const params: { competition?: string; matchweek?: number } = { competition: activeComp };
      if (activeWeek !== null) params.matchweek = activeWeek;
      return (user ? leagueApi.matches(params) : leagueApi.matchesPublic(params)).then(r => r.data as LeagueMatch[]);
    },
  });

  const matches = matchesQuery.data ?? [];

  // Derive available matchweeks from loaded matches
  const weeks = Array.from(new Set(matches.map(m => m.matchweek))).sort((a, b) => a - b);

  // Auto-select the nearest upcoming or most recent matchweek
  useEffect(() => {
    if (!weeks.length) return;
    const now = new Date();
    const upcoming = matches.filter(m => m.kickoff_utc && new Date(m.kickoff_utc) >= now).map(m => m.matchweek);
    const nextWeek = upcoming.length ? Math.min(...upcoming) : Math.max(...weeks);
    setActiveWeek(nextWeek);
  }, [activeComp]);

  const filteredMatches = activeWeek !== null
    ? matches.filter(m => m.matchweek === activeWeek)
    : matches;

  const compInfo = COMPETITIONS.find(c => c.key === activeComp)!;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">⚽ La Liga</h1>
        <p className="text-gray-500 text-sm">Weekly football predictions · Liga MX, Champions League, La Liga &amp; Premier League</p>
      </div>

      {/* Scoring legend */}
      <div className="card p-3 mb-6 flex flex-wrap gap-4 text-xs text-gray-400">
        <span><strong className="text-green-400">+3</strong> Exact score</span>
        <span><strong className="text-yellow-400">+2</strong> Correct result + goal diff</span>
        <span><strong className="text-blue-400">+1</strong> Correct result</span>
        <span><strong className="text-gray-500">0</strong> Wrong</span>
      </div>

      {/* Competition tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {COMPETITIONS.map(c => (
          <button
            key={c.key}
            onClick={() => { setActiveComp(c.key); setActiveWeek(null); }}
            className={`whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium transition-colors shrink-0 ${
              activeComp === c.key
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Tabs: Matches / Leaderboard */}
      <div className="flex gap-1 mb-6 border-b border-[#30363d]">
        {(['matches', 'leaderboard'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'matches' ? '📅 Matches' : '🏅 Leaderboard'}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' ? (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">{compInfo.label} Standings</h2>
          <Leaderboard competition={activeComp} />
        </div>
      ) : (
        <>
          {/* Matchweek selector */}
          {weeks.length > 0 && (
            <div className="flex gap-1 mb-6 flex-wrap">
              {weeks.map(w => (
                <button
                  key={w}
                  onClick={() => setActiveWeek(w)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    activeWeek === w
                      ? 'bg-green-600 text-white'
                      : 'bg-[#21262d] text-gray-400 hover:text-white'
                  }`}
                >
                  Week {w}
                </button>
              ))}
            </div>
          )}

          {matchesQuery.isLoading && (
            <div className="text-center py-12 text-gray-500">Loading…</div>
          )}

          {!matchesQuery.isLoading && filteredMatches.length === 0 && (
            <div className="card p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium text-gray-400">No matches scheduled yet</p>
              <p className="text-sm mt-1">Check back soon — the admin will add matches for this competition.</p>
            </div>
          )}

          {!user && filteredMatches.length > 0 && (
            <div className="card p-4 mb-4 text-center border border-yellow-500/20 bg-yellow-500/5">
              <p className="text-sm text-yellow-400">
                <a href="/login" className="underline">Log in</a> to make predictions
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {filteredMatches.map(m => (
              <MatchCard key={m.id} match={m} canPredict={!!user} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
