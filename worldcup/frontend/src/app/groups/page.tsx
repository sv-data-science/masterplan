'use client';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match, Team } from '@/types';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

interface Stats {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

function buildTable(matches: Match[]): Stats[] {
  const s = new Map<string, Stats>();
  const ensure = (team: Team) => {
    if (!s.has(team.id)) s.set(team.id, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
    return s.get(team.id)!;
  };
  for (const m of matches) {
    if (m.status !== 'completed' || m.home_score === null || m.away_score === null) {
      ensure(m.home_team);
      ensure(m.away_team);
      continue;
    }
    const h = ensure(m.home_team), a = ensure(m.away_team);
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.won++; h.points += 3; a.lost++; }
    else if (m.home_score < m.away_score) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; h.points++; a.drawn++; a.points++; }
  }
  return Array.from(s.values()).sort(
    (a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  );
}

function formatKickoff(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' });
  return `${date} · ${time}`;
}

function MatchRow({ m }: { m: Match }) {
  const isLive = m.status === 'live';
  const isDone = m.status === 'completed';
  const hScore = m.home_score;
  const aScore = m.away_score;

  const hWin = isDone && hScore !== null && aScore !== null && hScore > aScore;
  const aWin = isDone && hScore !== null && aScore !== null && aScore > hScore;

  return (
    <div className="flex items-center gap-2 py-2 px-4 text-sm hover:bg-[#1c2128] border-b border-[#30363d] last:border-0">
      <span className="w-5 text-xs text-gray-600 text-center">{m.matchday}</span>
      <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
        <span className="truncate text-right font-medium" style={{ color: hWin ? 'white' : '#9ca3af' }}>
          {m.home_team.flag} {m.home_team.name}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0 w-16 justify-center">
        {isDone ? (
          <span className="font-bold tabular-nums text-white">{hScore} – {aScore}</span>
        ) : isLive ? (
          <span className="text-red-400 text-xs font-medium">🔴 Live</span>
        ) : (
          <span className="text-gray-600 text-xs">vs</span>
        )}
      </div>
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        <span className="truncate font-medium" style={{ color: aWin ? 'white' : '#9ca3af' }}>
          {m.away_team.name} {m.away_team.flag}
        </span>
      </div>
      {!isDone && !isLive && (
        <span className="text-xs text-gray-600 shrink-0 hidden sm:block">{formatKickoff(m.kickoff_utc)}</span>
      )}
    </div>
  );
}

function GroupTable({ g, matches }: { g: string; matches: Match[] }) {
  const rows = buildTable(matches);
  const sorted = [...matches].sort((a, b) => a.matchday - b.matchday || (a.kickoff_utc ?? '').localeCompare(b.kickoff_utc ?? ''));

  return (
    <div className="card overflow-hidden">
      <div className="bg-green-900/30 px-4 py-2 border-b border-[#30363d]">
        <h2 className="font-bold text-white">Group {g}</h2>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-[#30363d]">
            <th className="text-left px-4 py-2 font-medium">Team</th>
            <th className="text-center px-2 py-2">P</th>
            <th className="text-center px-2 py-2">W</th>
            <th className="text-center px-2 py-2">D</th>
            <th className="text-center px-2 py-2">L</th>
            <th className="text-center px-2 py-2 hidden sm:table-cell">GF</th>
            <th className="text-center px-2 py-2 hidden sm:table-cell">GA</th>
            <th className="text-center px-2 py-2">GD</th>
            <th className="text-center px-2 py-2 text-white font-bold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#30363d]">
          {rows.map((row, i) => (
            <tr key={row.team.id} className={`${i < 2 ? 'border-l-2 border-l-green-600' : ''} hover:bg-[#1c2128]`}>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span>{row.team.flag}</span>
                  <span className="font-medium">{row.team.name}</span>
                  <span className="text-xs text-gray-500">{row.team.code}</span>
                </div>
              </td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.played}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.won}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.drawn}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.lost}</td>
              <td className="text-center px-2 py-2.5 text-gray-400 hidden sm:table-cell">{row.gf}</td>
              <td className="text-center px-2 py-2.5 text-gray-400 hidden sm:table-cell">{row.ga}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.gf - row.ga >= 0 ? '+' : ''}{row.gf - row.ga}</td>
              <td className="text-center px-2 py-2.5 font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sorted.length > 0 && (
        <div className="border-t border-[#30363d]">
          <div className="px-4 py-1.5 text-xs text-gray-500 uppercase font-medium bg-[#1c2128]">Results / Fixtures</div>
          {sorted.map(m => <MatchRow key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}

export default function GroupsPage() {
  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches', 'all'],
    queryFn: () => matchesApi.list().then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (isLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold text-white">Group Stage</h1>
        <p className="text-xs text-gray-500">Top 2 per group + 8 best 3rd-place advance</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {GROUPS.map(g => (
          <GroupTable key={g} g={g} matches={matches.filter(m => m.group_letter === g)} />
        ))}
      </div>
    </div>
  );
}
