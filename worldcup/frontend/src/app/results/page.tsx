'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match } from '@/types';
import { MatchCard } from '@/components/MatchCard';
import { R32_BY_MATCH_NUMBER, slotLabel } from '@/lib/r32Data';
import { R16_BY_MATCH_NUMBER, r16SlotLabel } from '@/lib/r16Data';

const TZ = 'America/New_York';

const STAGES = [
  { key: 'group', label: 'Group Stage', short: 'Groups' },
  { key: 'r32',   label: 'Round of 32', short: 'R32' },
  { key: 'r16',   label: 'Round of 16', short: 'R16' },
  { key: 'qf',    label: 'Quarter-Finals', short: 'QF' },
  { key: 'sf',    label: 'Semi-Finals', short: 'SF' },
  { key: 'f',     label: 'Final', short: 'Final' },
];

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ,
  });
}

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

export default function ResultsPage() {
  const { data: allMatches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['results-all'],
    queryFn: () => matchesApi.list().then(r => r.data),
    staleTime: 30_000,
  });

  // Stages that have at least one non-scheduled match
  const stagesWithResults = useMemo(() => new Set(
    allMatches
      .filter(m => m.status !== 'scheduled')
      .map(m => m.stage ?? 'group')
  ), [allMatches]);

  // Auto-pick most recent stage; null = auto
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const resolvedStage = activeStage
    ?? ['f', 'sf', 'qf', 'r16', 'r32', 'group'].find(s => stagesWithResults.has(s))
    ?? 'group';

  const stageMatches = useMemo(() =>
    allMatches
      .filter(m => {
        if (m.status === 'scheduled') return false;
        if (resolvedStage === 'group') return !m.stage || m.stage === 'group';
        return m.stage === resolvedStage;
      })
      .sort((a, b) => new Date(a.kickoff_utc ?? 0).getTime() - new Date(b.kickoff_utc ?? 0).getTime()),
    [allMatches, resolvedStage]
  );

  // Group stage: bucket by day
  const groupedByDay = useMemo(() => {
    if (resolvedStage !== 'group') return null;
    const map = new Map<string, Match[]>();
    for (const m of stageMatches) {
      const k = m.kickoff_utc ? dayKey(m.kickoff_utc) : 'unknown';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a)); // newest first
  }, [stageMatches, resolvedStage]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">📋 Results</h1>
        <p className="text-xs text-gray-500 mt-0.5">All completed match results</p>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAGES.map(s => {
          const hasResults = stagesWithResults.has(s.key);
          const isActive = resolvedStage === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveStage(s.key)}
              disabled={!hasResults}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap border transition-colors shrink-0 ${
                isActive
                  ? 'bg-green-600 border-green-600 text-white'
                  : hasResults
                  ? 'border-[#30363d] text-gray-300 hover:text-white hover:border-gray-500'
                  : 'border-[#21262d] text-gray-700 cursor-default'
              }`}
            >
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.short}</span>
            </button>
          );
        })}
      </div>

      {isLoading && <div className="text-center py-12 text-gray-500">Loading…</div>}

      {!isLoading && stageMatches.length === 0 && (
        <div className="text-center py-12 bg-[#161b22] rounded-xl border border-[#30363d]">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-400">No results yet for this stage.</p>
        </div>
      )}

      {/* Group stage: grouped by day (newest first) */}
      {groupedByDay && groupedByDay.map(([, dayMatches]: [string, Match[]]) => (
        <div key={dayMatches[0].kickoff_utc}>
          <p className="text-sm font-semibold text-gray-400 mb-2">
            {dayMatches[0].kickoff_utc ? dayLabel(dayMatches[0].kickoff_utc) : ''}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {dayMatches.map(m => (
              <MatchCard key={m.id} match={m} queryKey={['results-all']} />
            ))}
          </div>
        </div>
      ))}

      {/* Knockout stages: flat grid */}
      {!groupedByDay && stageMatches.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {stageMatches.map(m => {
            const r32Entry = resolvedStage === 'r32' ? R32_BY_MATCH_NUMBER.get(m.match_number) : undefined;
            const r16Entry = resolvedStage === 'r16' ? R16_BY_MATCH_NUMBER.get(m.match_number) : undefined;
            return (
              <MatchCard
                key={m.id}
                match={m}
                queryKey={['results-all']}
                homeLabel={
                  (r32Entry && m.home_team.code === 'TBD' ? slotLabel(r32Entry.home) : undefined) ??
                  (r16Entry && m.home_team.code === 'TBD' ? r16SlotLabel(r16Entry.r32HomeMatch) : undefined)
                }
                awayLabel={
                  (r32Entry && m.away_team.code === 'TBD' ? slotLabel(r32Entry.away) : undefined) ??
                  (r16Entry && m.away_team.code === 'TBD' ? r16SlotLabel(r16Entry.r32AwayMatch) : undefined)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
