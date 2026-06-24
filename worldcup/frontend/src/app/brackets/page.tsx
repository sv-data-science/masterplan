'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match, Team } from '@/types';
import { MatchCard } from '@/components/MatchCard';

// ── Standings helpers ───────────────────────────────────────────────────────
interface Stats { team: Team; played: number; points: number; gf: number; ga: number; }

function buildStandings(matches: Match[]): Stats[] {
  const s = new Map<string, Stats>();
  const ensure = (t: Team) => { if (!s.has(t.id)) s.set(t.id, { team: t, played: 0, points: 0, gf: 0, ga: 0 }); return s.get(t.id)!; };
  for (const m of matches) {
    if (m.status !== 'completed' || m.home_score === null || m.away_score === null) { ensure(m.home_team); ensure(m.away_team); continue; }
    const h = ensure(m.home_team), a = ensure(m.away_team);
    h.played++; a.played++; h.gf += m.home_score; h.ga += m.away_score; a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.points += 3; } else if (m.home_score < m.away_score) { a.points += 3; } else { h.points++; a.points++; }
  }
  return Array.from(s.values()).sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

// Returns the resolved team for a position, plus whether it's confirmed
function resolveSlot(groupMatches: Match[], pos: 0 | 1): { team: Team | null; confirmed: boolean } {
  if (!groupMatches.length) return { team: null, confirmed: false };
  const standings = buildStandings(groupMatches);
  const completed = groupMatches.filter(m => m.status === 'completed').length;
  // Group of 4 teams has 6 matches (full round-robin)
  if (completed >= 6) return { team: standings[pos]?.team ?? null, confirmed: true };
  // Mathematical clinch: pos=0 team can't be caught
  const t = standings[pos];
  if (pos === 0 && t) {
    const gamesLeft = 3 - t.played;
    const maxChaser = Math.max(0, ...standings.slice(1).map(s => s.points + (3 - s.played) * 3));
    if (maxChaser < t.points) return { team: t.team, confirmed: true };
  }
  // Current leader/2nd but not yet confirmed
  if (standings[pos]) return { team: standings[pos].team, confirmed: false };
  return { team: null, confirmed: false };
}

// ── WC 2026 R32 bracket definition ─────────────────────────────────────────
// 12 winner/runner-up pairings + 4 best-3rd slots (TBD until all groups done)
type FixedSlot = { kind: 'fixed'; pos: 1 | 2; group: string };
type BestThirdSlot = { kind: 'best3rd' };
type SlotDef = FixedSlot | BestThirdSlot;

const R32: Array<{ home: SlotDef; away: SlotDef }> = [
  { home: { kind: 'fixed', pos: 1, group: 'A' }, away: { kind: 'fixed', pos: 2, group: 'B' } },
  { home: { kind: 'fixed', pos: 1, group: 'C' }, away: { kind: 'fixed', pos: 2, group: 'D' } },
  { home: { kind: 'fixed', pos: 1, group: 'E' }, away: { kind: 'fixed', pos: 2, group: 'F' } },
  { home: { kind: 'fixed', pos: 1, group: 'G' }, away: { kind: 'fixed', pos: 2, group: 'H' } },
  { home: { kind: 'fixed', pos: 1, group: 'I' }, away: { kind: 'fixed', pos: 2, group: 'J' } },
  { home: { kind: 'fixed', pos: 1, group: 'K' }, away: { kind: 'fixed', pos: 2, group: 'L' } },
  { home: { kind: 'fixed', pos: 1, group: 'B' }, away: { kind: 'fixed', pos: 2, group: 'A' } },
  { home: { kind: 'fixed', pos: 1, group: 'D' }, away: { kind: 'fixed', pos: 2, group: 'C' } },
  { home: { kind: 'fixed', pos: 1, group: 'F' }, away: { kind: 'fixed', pos: 2, group: 'E' } },
  { home: { kind: 'fixed', pos: 1, group: 'H' }, away: { kind: 'fixed', pos: 2, group: 'G' } },
  { home: { kind: 'fixed', pos: 1, group: 'J' }, away: { kind: 'fixed', pos: 2, group: 'I' } },
  { home: { kind: 'fixed', pos: 1, group: 'L' }, away: { kind: 'fixed', pos: 2, group: 'K' } },
  { home: { kind: 'best3rd' }, away: { kind: 'best3rd' } },
  { home: { kind: 'best3rd' }, away: { kind: 'best3rd' } },
  { home: { kind: 'best3rd' }, away: { kind: 'best3rd' } },
  { home: { kind: 'best3rd' }, away: { kind: 'best3rd' } },
];

// ── Slot display component ──────────────────────────────────────────────────
function SlotDisplay({ slot, groupMatchMap }: {
  slot: SlotDef;
  groupMatchMap: Map<string, Match[]>;
}) {
  if (slot.kind === 'best3rd') {
    return (
      <div className="flex-1 text-center px-1">
        <div className="text-lg">🏳️</div>
        <div className="text-xs text-gray-500 leading-tight">Best 3rd</div>
        <div className="text-[10px] text-gray-600">(TBD)</div>
      </div>
    );
  }
  const gMatches = groupMatchMap.get(slot.group) ?? [];
  const { team, confirmed } = resolveSlot(gMatches, (slot.pos - 1) as 0 | 1);
  const ordinal = slot.pos === 1 ? '1st' : '2nd';

  if (team) {
    return (
      <div className={`flex-1 text-center px-1 ${confirmed ? '' : 'opacity-70'}`}>
        <div className="text-lg">{team.flag}</div>
        <div className="text-xs font-semibold text-white leading-tight truncate">{team.name}</div>
        <div className={`text-[10px] ${confirmed ? 'text-green-500' : 'text-yellow-500'}`}>
          {confirmed ? `✓ ${ordinal} Grp ${slot.group}` : `~ ${ordinal} Grp ${slot.group}`}
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 text-center px-1">
      <div className="text-lg text-gray-600">🏳️</div>
      <div className="text-xs text-gray-500 leading-tight">{ordinal} Group {slot.group}</div>
      <div className="text-[10px] text-gray-600">TBD</div>
    </div>
  );
}

function R32Card({ idx, home, away, groupMatchMap }: {
  idx: number;
  home: SlotDef;
  away: SlotDef;
  groupMatchMap: Map<string, Match[]>;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 font-medium mb-3">R32 · Match {idx + 1}</div>
      <div className="flex items-center gap-3">
        <SlotDisplay slot={home} groupMatchMap={groupMatchMap} />
        <div className="text-gray-600 font-bold shrink-0">vs</div>
        <SlotDisplay slot={away} groupMatchMap={groupMatchMap} />
      </div>
    </div>
  );
}

// ── Round definitions ───────────────────────────────────────────────────────
const ROUNDS = [
  { key: 'r32',   label: 'Round of 32',    short: 'R32',   count: 16 },
  { key: 'r16',   label: 'Round of 16',    short: 'R16',   count: 8  },
  { key: 'qf',    label: 'Quarter-finals', short: 'QF',    count: 4  },
  { key: 'sf',    label: 'Semi-finals',    short: 'SF',    count: 2  },
  { key: '3rd',   label: '3rd Place',      short: '3rd',   count: 1  },
  { key: 'final', label: 'Final',          short: 'Final', count: 1  },
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function BracketsPage() {
  const [activeRound, setActiveRound] = useState('r32');
  const active = ROUNDS.find(r => r.key === activeRound)!;

  // Group stage matches (for standings computation)
  const { data: allMatches = [] } = useQuery<Match[]>({
    queryKey: ['matches', 'all'],
    queryFn: () => matchesApi.list().then(r => r.data),
    staleTime: 60_000,
  });

  // Knockout stage matches (once they exist in DB)
  const { data: knockoutMatches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['brackets', activeRound],
    queryFn: () => matchesApi.list({ stage: activeRound }).then(r => r.data),
    staleTime: 30_000,
  });

  // Build group → matches map for bracket slot resolution
  const groupMatchMap = new Map<string, Match[]>();
  for (const m of allMatches) {
    if (!m.group_letter) continue;
    if (!groupMatchMap.has(m.group_letter)) groupMatchMap.set(m.group_letter, []);
    groupMatchMap.get(m.group_letter)!.push(m);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <h1 className="text-2xl font-bold text-white">🏆 Knockout Bracket</h1>
        <span className="text-xs text-gray-500 sm:ml-2">WC 2026 · same scoring: 3/2/1/0 pts</span>
      </div>

      {/* Round tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROUNDS.map(r => (
          <button
            key={r.key}
            onClick={() => setActiveRound(r.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors border shrink-0 ${
              activeRound === r.key
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-[#30363d] text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            <span className="hidden sm:inline">{r.label}</span>
            <span className="sm:hidden">{r.short}</span>
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-12 text-gray-500">Loading…</div>}

      {/* R32: always show the bracket structure with resolved slots */}
      {!isLoading && activeRound === 'r32' && knockoutMatches.length === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs text-gray-500 px-1">
            <span className="text-green-500 font-medium">✓ Confirmed</span>
            <span className="text-yellow-500 font-medium">~ Current leader (not yet final)</span>
            <span className="text-gray-600">TBD</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {R32.map((pair, i) => (
              <R32Card key={i} idx={i} home={pair.home} away={pair.away} groupMatchMap={groupMatchMap} />
            ))}
          </div>
        </div>
      )}

      {/* Other rounds: show placeholder until knockout matches exist */}
      {!isLoading && activeRound !== 'r32' && knockoutMatches.length === 0 && (
        <div className="text-center py-12 bg-[#161b22] rounded-xl border border-[#30363d]">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-white font-semibold">Not yet determined</p>
          <p className="text-gray-400 text-sm mt-1">
            The {active.label} bracket will fill in as earlier rounds are played.
          </p>
          <p className="text-gray-600 text-xs mt-1">
            {active.count} match{active.count > 1 ? 'es' : ''} · predictions open before each kick-off
          </p>
        </div>
      )}

      {/* Live knockout matches (when they exist in DB) */}
      {knockoutMatches.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {knockoutMatches
            .sort((a, b) => a.match_number - b.match_number)
            .map(m => (
              <MatchCard
                key={m.id}
                match={m}
                queryKey={['brackets', activeRound]}
                label={`${active.short} · Match ${m.match_number}`}
              />
            ))}
        </div>
      )}
    </div>
  );
}
