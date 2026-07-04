'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match, Team } from '@/types';
import { MatchCard } from '@/components/MatchCard';
import { R32, R32Entry, R32_BY_MATCH_NUMBER, SlotDef, slotLabel } from '@/lib/r32Data';
import { R16, R16Entry, R16_BY_MATCH_NUMBER, r16SlotLabel } from '@/lib/r16Data';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}
function fmtEST(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' });
}
function fmtCDT(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City', timeZoneName: 'short' });
}

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

function resolveSlot(groupMatches: Match[], pos: 0 | 1): { team: Team | null; confirmed: boolean } {
  if (!groupMatches.length) return { team: null, confirmed: false };
  const standings = buildStandings(groupMatches);
  const completed = groupMatches.filter(m => m.status === 'completed').length;
  if (completed >= 6) return { team: standings[pos]?.team ?? null, confirmed: true };
  const t = standings[pos];
  if (pos === 0 && t) {
    const maxChaser = Math.max(0, ...standings.slice(1).map(s => s.points + (3 - s.played) * 3));
    if (maxChaser < t.points) return { team: t.team, confirmed: true };
  }
  if (standings[pos]) return { team: standings[pos].team, confirmed: false };
  return { team: null, confirmed: false };
}

// ── WC 2026 R32 bracket definition ─────────────────────────────────────────
// Types and data imported from @/lib/r32Data

// ── Bracket tree order ──────────────────────────────────────────────────────
// Pairs of R32 match numbers whose winners meet in each R16 match
const R32_PAIRS: [number, number][] = [
  [74, 77],   // Germany/Paraguay + France/Sweden
  [73, 75],   // S.Africa/Canada + Netherlands/Morocco
  [76, 78],   // Brazil/Japan + Ivory Coast/Norway
  [79, 80],   // 1A + 1L
  [82, 81],   // Belgium/Senegal + USA/Bosnia
  [83, 84],   // Portugal/Croatia + Spain/Austria
  [85, 88],   // Switzerland + Colombia
  [86, 87],   // Argentina + Egypt
];

// ── Bracket tree geometry ───────────────────────────────────────────────────
const BK = {
  cardH:    82,
  pairGap:   3,
  groupGap: 14,
  connW:    36,
  r32W:    196,
  r16W:    168,
  qfW:     148,
  sfW:     136,
  finW:    136,
} as const;

const PAIR_H  = BK.cardH * 2 + BK.pairGap;       // height of one R32 pair
const SLOT_H  = PAIR_H + BK.groupGap;             // one slot unit (pair + gap)
const TOTAL_H = 8 * PAIR_H + 7 * BK.groupGap;    // total bracket height

// y-center of a span covering `n` consecutive pairs starting at pair index `start`
function spanCenter(start: number, n: number): number {
  const top    = start * SLOT_H;
  const bottom = (start + n - 1) * SLOT_H + PAIR_H;
  return (top + bottom) / 2;
}

// ── Slot info resolution ────────────────────────────────────────────────────
interface SlotInfo { flag: string; name: string; sub: string; confirmed: boolean }

function slotInfo(slot: SlotDef, groupMatchMap: Map<string, Match[]>): SlotInfo {
  if (slot.kind === 'best3rd') return { flag: '🏳️', name: 'Best 3rd', sub: 'TBD', confirmed: false };
  const gMatches = groupMatchMap.get(slot.group) ?? [];
  const { team, confirmed } = resolveSlot(gMatches, (slot.pos - 1) as 0 | 1);
  const ord = slot.pos === 1 ? '1st' : '2nd';
  if (team) return { flag: team.flag, name: team.name, sub: `${ord} Grp ${slot.group}`, confirmed };
  return { flag: '', name: `${ord} Group ${slot.group}`, sub: 'TBD', confirmed: false };
}

// ── Bracket card components ─────────────────────────────────────────────────
function TeamRow({ info, border }: { info: SlotInfo; border?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 min-w-0 ${border ? 'border-t border-[#21262d]' : ''}`}>
      {info.flag
        ? <span className="text-sm leading-none shrink-0 w-5 text-center">{info.flag}</span>
        : <span className="w-5 h-5 rounded shrink-0 bg-[#30363d] flex items-center justify-center text-[9px] text-gray-600">?</span>
      }
      <div className={`flex-1 min-w-0 ${info.confirmed ? '' : 'opacity-60'}`}>
        <div className="text-xs font-semibold text-white truncate leading-tight">{info.name}</div>
        {!info.confirmed && <div className="text-[9px] text-gray-600 leading-tight truncate">{info.sub}</div>}
      </div>
    </div>
  );
}

function BracketMatchCard({ entry, groupMatchMap, dbMatch, w, h }: {
  entry: R32Entry; groupMatchMap: Map<string, Match[]>; dbMatch?: Match; w: number; h: number;
}) {
  const home = dbMatch && dbMatch.home_team.code !== 'TBD'
    ? { flag: dbMatch.home_team.flag, name: dbMatch.home_team.name, sub: '', confirmed: true }
    : slotInfo(entry.home, groupMatchMap);
  const away = dbMatch && dbMatch.away_team.code !== 'TBD'
    ? { flag: dbMatch.away_team.flag, name: dbMatch.away_team.name, sub: '', confirmed: true }
    : slotInfo(entry.away, groupMatchMap);
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden flex flex-col" style={{ width: w, height: h }}>
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        <span className="text-[9px] text-gray-600 font-medium">M{entry.matchNumber}</span>
        <span className="text-[9px] text-gray-600">{fmtDate(entry.kickoff_utc)}</span>
      </div>
      <div className="flex-1 flex flex-col justify-around">
        <TeamRow info={home} />
        <div className="border-t border-[#21262d] mx-1.5" />
        <TeamRow info={away} border={false} />
      </div>
      <div className="px-2 pb-1 text-[9px] text-gray-700 truncate">📍 {entry.city}</div>
    </div>
  );
}

function R16BracketMatchCard({ entry, dbMatch, r32MatchByNum, w, h }: {
  entry: R16Entry;
  dbMatch?: Match;
  r32MatchByNum: Map<number, Match>;
  w: number;
  h: number;
}) {
  function slotFor(r32Num: number, dbTeam?: { code: string; flag: string; name: string } | null): SlotInfo {
    if (dbTeam && dbTeam.code !== 'TBD') {
      return { flag: dbTeam.flag, name: dbTeam.name, sub: '', confirmed: true };
    }
    const r32m = r32MatchByNum.get(r32Num);
    const pending = r32m?.status === 'completed';
    return { flag: '', name: r16SlotLabel(r32Num), sub: pending ? 'Pending assign' : 'TBD', confirmed: false };
  }
  const home = slotFor(entry.r32HomeMatch, dbMatch?.home_team);
  const away = slotFor(entry.r32AwayMatch, dbMatch?.away_team);
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden flex flex-col" style={{ width: w, height: h }}>
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        <span className="text-[9px] text-gray-600 font-medium">M{entry.matchNumber}</span>
        <span className="text-[9px] text-gray-600">{fmtDate(entry.kickoff_utc)}</span>
      </div>
      <div className="flex-1 flex flex-col justify-around">
        <TeamRow info={home} />
        <div className="border-t border-[#21262d] mx-1.5" />
        <TeamRow info={away} border={false} />
      </div>
      <div className="px-2 pb-1 text-[9px] text-gray-700 truncate">📍 {entry.city}</div>
    </div>
  );
}

function TBDCard({ label, w, h }: { label: string; w: number; h: number }) {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg flex flex-col items-center justify-center gap-0.5" style={{ width: w, height: h }}>
      <span className="text-[9px] text-gray-600 font-medium">{label}</span>
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#21262d]" />
          <span className="text-[10px] text-gray-700">TBD</span>
        </div>
        <div className="border-t border-[#1a1f27] w-full mx-2" />
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#21262d]" />
          <span className="text-[10px] text-gray-700">TBD</span>
        </div>
      </div>
    </div>
  );
}

// ── Connector SVG lines ─────────────────────────────────────────────────────
function Connectors({ fromCenters, toCenters, w, h }: {
  fromCenters: number[]; toCenters: number[]; w: number; h: number;
}) {
  const mid = w / 2;
  const color = '#30363d';
  const sw = 1.5;
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}>
      {toCenters.map((toY, i) => {
        const y1 = fromCenters[i * 2];
        const y2 = fromCenters[i * 2 + 1];
        const midY = (y1 + y2) / 2;
        return (
          <g key={i}>
            <line x1={0} y1={y1}  x2={mid} y2={y1}  stroke={color} strokeWidth={sw} />
            <line x1={0} y1={y2}  x2={mid} y2={y2}  stroke={color} strokeWidth={sw} />
            <line x1={mid} y1={y1} x2={mid} y2={y2} stroke={color} strokeWidth={sw} />
            <line x1={mid} y1={midY} x2={w} y2={toY} stroke={color} strokeWidth={sw} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Full bracket tree ───────────────────────────────────────────────────────
function BracketTreeView({ groupMatchMap, r32DbMatchByNumber, r16DbMatchByNumber }: {
  groupMatchMap: Map<string, Match[]>;
  r32DbMatchByNumber: Map<number, Match>;
  r16DbMatchByNumber: Map<number, Match>;
}) {
  const r32Map = new Map(R32.map(e => [e.matchNumber, e]));

  // Pre-compute y-centers for each round
  const r32Centers = R32_PAIRS.flatMap((_, i) => [
    i * SLOT_H + BK.cardH / 2,
    i * SLOT_H + BK.cardH + BK.pairGap + BK.cardH / 2,
  ]); // 16 values

  const r16Centers = R32_PAIRS.map((_, i) => spanCenter(i, 1));      // 8 values
  const qfCenters  = [0, 1, 2, 3].map(i => spanCenter(i * 2, 2));   // 4 values
  const sfCenters  = [0, 1].map(i => spanCenter(i * 4, 4));         // 2 values
  const finCenter  = spanCenter(0, 8);                               // 1 value

  const colH = TOTAL_H;

  const LABELS = ['Round of 32', '', 'Round of 16', '', 'Quarterfinals', '', 'Semifinals', '', 'Final'];
  const WIDTHS  = [BK.r32W, BK.connW, BK.r16W, BK.connW, BK.qfW, BK.connW, BK.sfW, BK.connW, BK.finW];
  const totalW  = WIDTHS.reduce((a, b) => a + b, 0);

  return (
    <div className="overflow-x-auto pb-4">
      {/* Round header labels */}
      <div className="flex mb-2" style={{ width: totalW }}>
        {LABELS.map((lbl, i) => (
          <div key={i} className="text-center shrink-0" style={{ width: WIDTHS[i] }}>
            {lbl && <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{lbl}</span>}
          </div>
        ))}
      </div>

      {/* Bracket body */}
      <div className="relative" style={{ width: totalW, height: colH }}>

        {/* R32 cards */}
        {R32_PAIRS.flatMap((pair, gi) =>
          pair.map((matchNum, ci) => {
            const entry = r32Map.get(matchNum);
            if (!entry) return null;
            const top = gi * SLOT_H + ci * (BK.cardH + BK.pairGap);
            return (
              <div key={matchNum} className="absolute" style={{ top, left: 0, width: BK.r32W, height: BK.cardH }}>
                <BracketMatchCard entry={entry} groupMatchMap={groupMatchMap} dbMatch={r32DbMatchByNumber.get(matchNum)} w={BK.r32W} h={BK.cardH} />
              </div>
            );
          })
        )}

        {/* R32 → R16 connector */}
        <div className="absolute" style={{ top: 0, left: BK.r32W, height: colH }}>
          <Connectors fromCenters={r32Centers} toCenters={r16Centers} w={BK.connW} h={colH} />
        </div>

        {/* R16 cards */}
        {R16.map((entry, i) => (
          <div key={entry.matchNumber} className="absolute" style={{ top: r16Centers[i] - BK.cardH / 2, left: BK.r32W + BK.connW, width: BK.r16W, height: BK.cardH }}>
            <R16BracketMatchCard
              entry={entry}
              dbMatch={r16DbMatchByNumber.get(entry.matchNumber)}
              r32MatchByNum={r32DbMatchByNumber}
              w={BK.r16W}
              h={BK.cardH}
            />
          </div>
        ))}

        {/* R16 → QF connector */}
        <div className="absolute" style={{ top: 0, left: BK.r32W + BK.connW + BK.r16W, height: colH }}>
          <Connectors fromCenters={r16Centers} toCenters={qfCenters} w={BK.connW} h={colH} />
        </div>

        {/* QF cards */}
        {qfCenters.map((cy, i) => (
          <div key={i} className="absolute" style={{ top: cy - BK.cardH / 2, left: BK.r32W + BK.connW + BK.r16W + BK.connW, width: BK.qfW, height: BK.cardH }}>
            <TBDCard label={`QF · #${i + 1}`} w={BK.qfW} h={BK.cardH} />
          </div>
        ))}

        {/* QF → SF connector */}
        <div className="absolute" style={{ top: 0, left: BK.r32W + BK.connW + BK.r16W + BK.connW + BK.qfW, height: colH }}>
          <Connectors fromCenters={qfCenters} toCenters={sfCenters} w={BK.connW} h={colH} />
        </div>

        {/* SF cards */}
        {sfCenters.map((cy, i) => (
          <div key={i} className="absolute" style={{ top: cy - BK.cardH / 2, left: BK.r32W + BK.connW + BK.r16W + BK.connW + BK.qfW + BK.connW, width: BK.sfW, height: BK.cardH }}>
            <TBDCard label={`Semifinal · #${i + 1}`} w={BK.sfW} h={BK.cardH} />
          </div>
        ))}

        {/* SF → Final connector */}
        <div className="absolute" style={{ top: 0, left: BK.r32W + BK.connW + BK.r16W + BK.connW + BK.qfW + BK.connW + BK.sfW, height: colH }}>
          <Connectors fromCenters={sfCenters} toCenters={[finCenter]} w={BK.connW} h={colH} />
        </div>

        {/* Final card */}
        <div className="absolute" style={{ top: finCenter - BK.cardH / 2, left: BK.r32W + BK.connW + BK.r16W + BK.connW + BK.qfW + BK.connW + BK.sfW + BK.connW, width: BK.finW, height: BK.cardH }}>
          <TBDCard label="Final" w={BK.finW} h={BK.cardH} />
        </div>

      </div>
    </div>
  );
}

// ── List view: existing R32 card grid ───────────────────────────────────────
function SlotDisplay({ slot, groupMatchMap }: { slot: SlotDef; groupMatchMap: Map<string, Match[]> }) {
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

function R32Card({ matchNumber, home, away, kickoff_utc, venue, city, groupMatchMap }: {
  matchNumber: number; home: SlotDef; away: SlotDef; kickoff_utc: string; venue: string; city: string;
  groupMatchMap: Map<string, Match[]>;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 font-medium mb-3">R32 · Match {matchNumber}</div>
      <div className="flex items-center gap-3">
        <SlotDisplay slot={home} groupMatchMap={groupMatchMap} />
        <div className="text-gray-600 font-bold shrink-0">vs</div>
        <SlotDisplay slot={away} groupMatchMap={groupMatchMap} />
      </div>
      <div className="text-center mt-2 space-y-0.5">
        <p className="text-xs text-gray-400">
          {fmtDate(kickoff_utc)} · {fmtEST(kickoff_utc)} / {fmtCDT(kickoff_utc)}
        </p>
        <p className="text-xs text-gray-500">📍 {city} · {venue}</p>
      </div>
    </div>
  );
}

// ── Round definitions (for list view tabs) ──────────────────────────────────
const ROUNDS = [
  { key: 'r32',   label: 'Round of 32',    short: 'R32',   count: 16 },
  { key: 'r16',   label: 'Round of 16',    short: 'R16',   count: 8  },
  { key: 'qf',    label: 'Quarter-finals', short: 'QF',    count: 4  },
  { key: 'sf',    label: 'Semi-finals',    short: 'SF',    count: 2  },
  { key: '3rd',   label: '3rd Place',      short: '3rd',   count: 1  },
  { key: 'final', label: 'Final',          short: 'Final', count: 1  },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BracketsPage() {
  const [view, setView] = useState<'bracket' | 'list'>('bracket');
  const [activeRound, setActiveRound] = useState('r32');
  const active = ROUNDS.find(r => r.key === activeRound)!;

  const { data: allMatches = [] } = useQuery<Match[]>({
    queryKey: ['matches', 'all'],
    queryFn: () => matchesApi.list().then(r => r.data),
    staleTime: 0,
  });

  const { data: knockoutMatches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['brackets', activeRound],
    queryFn: () => matchesApi.list({ stage: activeRound }).then(r => r.data),
    staleTime: 30_000,
    enabled: view === 'list',
  });

  const groupMatchMap = new Map<string, Match[]>();
  const r32DbMatchByNumber = new Map<number, Match>();
  const r16DbMatchByNumber = new Map<number, Match>();
  for (const m of allMatches) {
    if (m.stage === 'r32') { r32DbMatchByNumber.set(m.match_number, m); continue; }
    if (m.stage === 'r16') { r16DbMatchByNumber.set(m.match_number, m); continue; }
    if (!m.group_letter) continue;
    if (!groupMatchMap.has(m.group_letter)) groupMatchMap.set(m.group_letter, []);
    groupMatchMap.get(m.group_letter)!.push(m);
  }

  return (
    <div className="space-y-4">
      {/* Header + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">🏆 Knockout Bracket</h1>
          <p className="text-xs text-gray-500 mt-0.5">WC 2026 · same scoring: 3/2/1/0 pts</p>
        </div>
        <div className="flex gap-1.5 sm:ml-auto">
          <button
            onClick={() => setView('bracket')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              view === 'bracket' ? 'bg-green-600 border-green-600 text-white' : 'border-[#30363d] text-gray-400 hover:text-white'
            }`}
          >
            🌲 Bracket
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              view === 'list' ? 'bg-green-600 border-green-600 text-white' : 'border-[#30363d] text-gray-400 hover:text-white'
            }`}
          >
            📋 List
          </button>
        </div>
      </div>

      {/* Legend (bracket view) */}
      {view === 'bracket' && (
        <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
          <span className="text-gray-400 font-medium">Scroll right →</span>
          <span className="text-green-500">✓ Confirmed</span>
          <span className="text-yellow-500 opacity-60">~ Current leader</span>
        </div>
      )}

      {/* ── Bracket view ── */}
      {view === 'bracket' && (
        <BracketTreeView groupMatchMap={groupMatchMap} r32DbMatchByNumber={r32DbMatchByNumber} r16DbMatchByNumber={r16DbMatchByNumber} />
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <>
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

          {!isLoading && activeRound === 'r32' && knockoutMatches.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs text-gray-500 px-1">
                <span className="text-green-500 font-medium">✓ Confirmed</span>
                <span className="text-yellow-500 font-medium">~ Current leader</span>
                <span className="text-gray-600">TBD</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {R32.map(pair => (
                  <R32Card key={pair.matchNumber} matchNumber={pair.matchNumber}
                    home={pair.home} away={pair.away}
                    kickoff_utc={pair.kickoff_utc} venue={pair.venue} city={pair.city}
                    groupMatchMap={groupMatchMap} />
                ))}
              </div>
            </div>
          )}

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

          {knockoutMatches.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {knockoutMatches
                .sort((a, b) => a.match_number - b.match_number)
                .map(m => {
                  const r32Entry = activeRound === 'r32' ? R32_BY_MATCH_NUMBER.get(m.match_number) : undefined;
                  const r16Entry = activeRound === 'r16' ? R16_BY_MATCH_NUMBER.get(m.match_number) : undefined;
                  return (
                    <MatchCard key={m.id} match={m} queryKey={['brackets', activeRound]}
                      label={`${active.short} · Match ${m.match_number}`}
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
        </>
      )}
    </div>
  );
}
