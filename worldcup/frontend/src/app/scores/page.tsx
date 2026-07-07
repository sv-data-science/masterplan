'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// M1-M4 are pre-tournament friendlies excluded from scoring
const UNSCORED = new Set([1, 2, 3, 4]);

interface MatrixUser  { id: string; username: string; display_name: string }
interface MatrixMatch {
  id: string; num: number; stage: string | null; group: string | null;
  status: string; home_code: string; away_code: string;
  home_score: number | null; away_score: number | null;
  kickoff_utc: string | null; scored: boolean;
}
interface Cell { pts: number | null; h: number | null; a: number | null }
interface MatrixData {
  users: MatrixUser[];
  matches: MatrixMatch[];
  cells: Record<string, Record<string, Cell>>;
}

const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'f'] as const;
const STAGE_LABEL: Record<string, string> = {
  group: 'Group Stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-Finals', sf: 'Semi-Finals', f: 'Final',
};

function ptsBg(pts: number | null, scored: boolean): string {
  if (!scored) return 'text-gray-700 bg-transparent';
  if (pts === null || pts === undefined) return 'text-gray-600';
  if (pts === 3) return 'bg-green-800/60 text-green-300 font-bold';
  if (pts === 2) return 'bg-yellow-800/50 text-yellow-300 font-semibold';
  if (pts === 1) return 'bg-orange-900/40 text-orange-300';
  return 'text-gray-600';
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ScoresPage() {
  const { token } = useAuthStore();

  const { data, isLoading } = useQuery<MatrixData>({
    queryKey: ['score-matrix'],
    queryFn: () => api.get('/scores/matrix').then(r => r.data),
    staleTime: 60_000,
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-400">
        Please log in to view the score matrix.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-gray-500">
        Loading scores…
      </div>
    );
  }

  // Compute totals per user (only scored matches)
  const totals: Record<string, number> = {};
  for (const u of data.users) {
    totals[u.id] = 0;
    for (const m of data.matches) {
      if (!m.scored) continue;
      const pts = data.cells[m.id]?.[u.id]?.pts;
      if (pts != null) totals[u.id] += pts;
    }
  }

  // Sort users by total descending
  const users = [...data.users].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));

  // Group matches by stage
  const grouped: Record<string, MatrixMatch[]> = {};
  for (const m of data.matches) {
    const s = m.stage ?? 'group';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(m);
  }

  // Stage subtotals per user
  const stageTotals: Record<string, Record<string, number>> = {};
  for (const stage of STAGE_ORDER) {
    stageTotals[stage] = {};
    for (const u of users) {
      let sum = 0;
      for (const m of (grouped[stage] ?? [])) {
        if (!m.scored) continue;
        sum += data.cells[m.id]?.[u.id]?.pts ?? 0;
      }
      stageTotals[stage][u.id] = sum;
    }
  }

  const stages = STAGE_ORDER.filter(s => (grouped[s]?.length ?? 0) > 0);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-full px-2 py-6">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-white">📊 Score Matrix</h1>
          <p className="text-gray-400 text-sm mt-1">Points per match · M1–M4 excluded from totals</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#30363d]">
          <table className="border-collapse text-xs" style={{ minWidth: `${200 + users.length * 72}px` }}>
            <thead>
              {/* Username row */}
              <tr className="bg-[#161b22]">
                <th className="sticky left-0 z-20 bg-[#161b22] border-b border-r border-[#30363d] px-3 py-2 text-left font-semibold text-gray-400 min-w-[160px]">
                  Match
                </th>
                {users.map(u => (
                  <th key={u.id}
                    className="border-b border-r border-[#30363d] px-2 py-2 text-center font-semibold text-gray-300 whitespace-nowrap min-w-[68px]"
                    title={u.username}
                  >
                    {u.display_name}
                  </th>
                ))}
              </tr>

              {/* Grand total row */}
              <tr className="bg-[#1c2128] sticky top-0 z-10">
                <td className="sticky left-0 z-20 bg-[#1c2128] border-b-2 border-r border-[#30363d] px-3 py-2.5 font-bold text-white text-sm">
                  🏆 Total
                </td>
                {users.map(u => (
                  <td key={u.id}
                    className="border-b-2 border-r border-[#30363d] px-2 py-2.5 text-center font-bold text-lg text-green-300"
                  >
                    {totals[u.id] ?? 0}
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {stages.map(stage => {
                const stageMatches = grouped[stage] ?? [];
                return (
                  <>
                    {/* Stage header */}
                    <tr key={`hdr-${stage}`} className="bg-[#161b22]">
                      <td
                        colSpan={users.length + 1}
                        className="sticky left-0 px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest border-t border-[#30363d]"
                      >
                        {STAGE_LABEL[stage] ?? stage}
                        {stage === 'group' && (
                          <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal">
                            (M1–M4 excluded)
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Match rows */}
                    {stageMatches.map(m => {
                      const isUnscored = !m.scored;
                      const isCompleted = m.status === 'completed';
                      return (
                        <tr key={m.id}
                          className={`border-t border-[#21262d] hover:bg-[#161b22]/60 transition-colors ${isUnscored ? 'opacity-50' : ''}`}
                        >
                          <td className="sticky left-0 z-10 bg-[#0d1117] border-r border-[#21262d] px-3 py-1.5 whitespace-nowrap">
                            <span className="text-gray-600 mr-1.5">M{m.num}</span>
                            <span className={isCompleted ? 'text-white' : 'text-gray-400'}>
                              {m.home_code}
                            </span>
                            {isCompleted ? (
                              <span className="mx-1 text-gray-500">{m.home_score}–{m.away_score}</span>
                            ) : (
                              <span className="mx-1 text-gray-600">vs</span>
                            )}
                            <span className={isCompleted ? 'text-white' : 'text-gray-400'}>
                              {m.away_code}
                            </span>
                            {!isCompleted && m.kickoff_utc && (
                              <span className="ml-2 text-gray-600">{formatDate(m.kickoff_utc)}</span>
                            )}
                          </td>
                          {users.map(u => {
                            const cell = data.cells[m.id]?.[u.id];
                            const pts = cell?.pts ?? null;
                            return (
                              <td key={u.id}
                                className={`border-r border-[#21262d] px-2 py-1.5 text-center transition-colors ${ptsBg(pts, m.scored)}`}
                                title={cell ? `Pred: ${cell.h}–${cell.a}` : 'No prediction'}
                              >
                                {m.scored && pts !== null ? pts : (
                                  <span className="text-gray-700">–</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Stage subtotal row */}
                    <tr key={`sub-${stage}`} className="bg-[#161b22] border-t border-[#30363d]">
                      <td className="sticky left-0 z-10 bg-[#161b22] border-r border-[#30363d] px-3 py-2 font-semibold text-gray-400">
                        {STAGE_LABEL[stage] ?? stage} subtotal
                      </td>
                      {users.map(u => (
                        <td key={u.id}
                          className="border-r border-[#30363d] px-2 py-2 text-center font-bold text-white"
                        >
                          {stageTotals[stage]?.[u.id] ?? 0}
                        </td>
                      ))}
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-green-800/60" /> 3 pts — exact score
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-yellow-800/50" /> 2 pts — correct result
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-orange-900/40" /> 1 pt
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-[#1c2128]" /> 0 pts
          </span>
        </div>
      </div>
    </div>
  );
}
