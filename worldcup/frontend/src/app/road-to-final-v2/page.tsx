'use client';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match, Team } from '@/types';

// ── Geometry (identical to road-to-final) ───────────────────────────────────
const CX = 450, CY = 450;
const RADII   = { team: 370, r32: 300, r16: 230, qf: 170, sf: 110 };
const NODE_R  = { team: 13, r32: 16, r16: 18, qf: 21, sf: 25, center: 32 };
const BASE_DEG = -84.375;

const toXY      = (r: number, deg: number) => ({
  x: CX + r * Math.cos((deg * Math.PI) / 180),
  y: CY + r * Math.sin((deg * Math.PI) / 180),
});
const sfAngle   = (s: number) => BASE_DEG + 84.375 + s * 180;  // 0°, 180°
const qfAngle   = (q: number) => BASE_DEG + 39.375 + q * 90;   // -45°, 45°, 135°, 225°
const r16Angle  = (m: number) => BASE_DEG + 11.25  + m * 45;
const r32Angle  = (k: number) => BASE_DEG + k * 22.5;
const teamAngle = (i: number) => BASE_DEG + i * 11.25;

const FINAL_NUM = 104;

// ── Flag ISO mapping ─────────────────────────────────────────────────────────
const TEAM_ISO: Record<string, string> = {
  FRA:'fr', GER:'de', PAR:'py', SWE:'se', RSA:'za', CAN:'ca',
  NED:'nl', MAR:'ma', BRA:'br', JPN:'jp', CIV:'ci', NOR:'no',
  MEX:'mx', ECU:'ec', ENG:'gb-eng', COD:'cd', BEL:'be', SEN:'sn',
  USA:'us', BIH:'ba', POR:'pt', CRO:'hr', ESP:'es', AUT:'at',
  SUI:'ch', ALG:'dz', COL:'co', GHA:'gh', ARG:'ar', CPV:'cv',
  AUS:'au', EGY:'eg',
};
function flagUrl(code: string) {
  const iso = TEAM_ISO[code];
  return iso ? `https://flagcdn.com/40x30/${iso}.png` : null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getWinner(m?: Match | null): Team | null {
  if (!m || m.status !== 'completed') return null;
  if (m.home_score === null || m.away_score === null) return null;
  if (m.home_score > m.away_score) return m.home_team;
  if (m.away_score > m.home_score) return m.away_team;
  if (m.home_score_pens !== null && m.away_score_pens !== null)
    return m.home_score_pens > m.away_score_pens ? m.home_team : m.away_team;
  return null;
}

function getLoser(m?: Match | null): Team | null {
  const w = getWinner(m);
  if (!w || !m) return null;
  return w.id === m.home_team.id ? m.away_team : m.home_team;
}

// Find the match (from a pre-filtered stage array) where this team played
function findTeamMatch(stageMatches: Match[], team: Team | null): Match | null {
  if (!team || team.code === 'TBD') return null;
  return stageMatches.find(m => m.home_team.id === team.id || m.away_team.id === team.id) ?? null;
}

// ── Sub-components (identical to road-to-final) ──────────────────────────────
function FlagCircle({ cx, cy, r, code, dim, winner, clipId }: {
  cx: number; cy: number; r: number; code?: string | null;
  dim?: boolean; winner?: boolean; clipId: string;
}) {
  const url = code ? flagUrl(code) : null;
  const stroke  = winner ? '#FFD700' : dim ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)';
  const strokeW = winner ? 2 : 0.8;
  const bg       = dim ? '#13161b' : '#1c2128';
  const textFill = `rgba(255,255,255,${dim ? 0.22 : 0.7})`;
  const displayCode = code && code !== 'TBD' ? code.slice(0, 3) : '?';
  return (
    <g>
      <defs>
        <clipPath id={clipId}><circle cx={cx} cy={cy} r={r - 0.5} /></clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={bg} stroke={stroke} strokeWidth={strokeW} />
      <text x={cx} y={cy + r * 0.38} textAnchor="middle" fontSize={r * 0.62}
        fontWeight="700" fill={textFill} fontFamily="monospace">
        {displayCode}
      </text>
      {url && (
        <image href={url} x={cx - r} y={cy - r * 0.75} width={r * 2} height={r * 1.5}
          clipPath={`url(#${clipId})`} style={{ opacity: dim ? 0.35 : 1 }} />
      )}
      {winner && (
        <circle cx={cx} cy={cy} r={r + 3} fill="none"
          stroke="#FFD700" strokeWidth="1.5" opacity="0.45" />
      )}
    </g>
  );
}

function TBDCircle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.02)"
      stroke="rgba(255,255,255,0.13)" strokeWidth="0.8" strokeDasharray="3 2" />
  );
}

type ConnectorProps = { x1: number; y1: number; x2: number; y2: number; gold?: boolean; active?: boolean };
function Connector({ x1, y1, x2, y2, gold, active }: ConnectorProps) {
  if (gold)   return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="1.5" opacity="0.65" />;
  if (active) return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.16)" strokeWidth="0.9" />;
  return       <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" strokeDasharray="3 3" />;
}

const QUERY_OPTS = { refetchInterval: 30_000, staleTime: 20_000 };

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RoadToFinalV2Page() {
  const { data: allMatches = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['rtfv2-all'],
    queryFn: () => matchesApi.list({}).then(r => r.data as Match[]),
    ...QUERY_OPTS,
  });

  // ── Reverse bracket building ─────────────────────────────────────────────
  // Partition matches by stage for fast lookups
  const sfMatches  = allMatches.filter(m => m.stage === 'sf');
  const qfMatches  = allMatches.filter(m => m.stage === 'qf');
  const r16Matches = allMatches.filter(m => m.stage === 'r16');
  const r32Matches = allMatches.filter(m => m.stage === 'r32');

  const finalMatch = allMatches.find(m => m.match_number === FINAL_NUM) ?? null;
  const champion   = getWinner(finalMatch);

  // Determine left/right SF matches.
  // Default: M102 = RIGHT (0°), M101 = LEFT (180°).
  // If Final exists with real teams, re-derive from their SF matches.
  let sfR: Match | null = allMatches.find(m => m.match_number === 102) ?? null;
  let sfL: Match | null = allMatches.find(m => m.match_number === 101) ?? null;
  if (finalMatch && finalMatch.home_team.code !== 'TBD' && finalMatch.away_team.code !== 'TBD') {
    const homeSF = sfMatches.find(m =>
      m.home_team.id === finalMatch.home_team.id || m.away_team.id === finalMatch.home_team.id
    ) ?? null;
    const awaySF = sfMatches.find(m =>
      m.home_team.id === finalMatch.away_team.id || m.away_team.id === finalMatch.away_team.id
    ) ?? null;
    sfR = homeSF; sfL = awaySF;
  }
  const sf: (Match | null)[] = [sfR, sfL];

  const sfRW = getWinner(sfR); // RIGHT finalist (sf[0] winner)
  const sfRL = getLoser(sfR);  // sf[0] loser
  const sfLW = getWinner(sfL); // LEFT finalist (sf[1] winner)
  const sfLL = getLoser(sfL);  // sf[1] loser

  // QF slots:
  //   qf[0] at -45°/upper-right  ← sf[0] loser's QF match
  //   qf[1] at  45°/lower-right  ← sf[0] winner's QF match
  //   qf[2] at 135°/lower-left   ← sf[1] winner's QF match
  //   qf[3] at 225°/upper-left   ← sf[1] loser's QF match
  const qf: (Match | null)[] = [
    findTeamMatch(qfMatches, sfRL),
    findTeamMatch(qfMatches, sfRW),
    findTeamMatch(qfMatches, sfLW),
    findTeamMatch(qfMatches, sfLL),
  ];

  // R16 slots (8): for each qf[q], r16[q*2] = winner's R16, r16[q*2+1] = loser's R16
  const r16: (Match | null)[] = Array.from({ length: 8 }, (_, i) => {
    const q     = Math.floor(i / 2);
    const loser = i % 2 === 1;
    return findTeamMatch(r16Matches, loser ? getLoser(qf[q]) : getWinner(qf[q]));
  });

  // R32 slots (16): for each r16[m], r32[m*2] = winner's R32, r32[m*2+1] = loser's R32
  const r32: (Match | null)[] = Array.from({ length: 16 }, (_, k) => {
    const m     = Math.floor(k / 2);
    const loser = k % 2 === 1;
    return findTeamMatch(r32Matches, loser ? getLoser(r16[m]) : getWinner(r16[m]));
  });

  const r32Loaded = r32.filter(Boolean).length;
  const r16Loaded = r16.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-5xl mx-auto px-2 py-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white">Road to the Final</h1>
          <p className="text-gray-400 text-sm mt-1">FIFA World Cup 2026 — paths traced from the Final</p>
          {!isLoading && (
            <p className="text-gray-600 text-xs mt-0.5">
              {allMatches.length} total · {r32Loaded} R32 · {r16Loaded} R16
              {dataUpdatedAt > 0 && (
                <> · updated {new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>
              )}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20 text-gray-500">Loading bracket…</div>
        ) : (
          <>
            <div className="flex justify-center">
              <svg viewBox="0 0 900 900" className="w-full max-w-[min(96vw,720px)] aspect-square">
                <defs>
                  <radialGradient id="v2bgGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#FFD700" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#0d1117" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="v2centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#FFD700" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width={900} height={900} fill="#0d1117" />
                <circle cx={CX} cy={CY} r={420} fill="url(#v2bgGlow)" />
                {Object.values(RADII).map(r => (
                  <circle key={r} cx={CX} cy={CY} r={r}
                    fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                ))}

                {/* ── CONNECTORS (back-to-front so gold lines are on top) ── */}

                {/* Ring 1 → Ring 2 (outer teams → R32 winner node) */}
                {r32.map((r32m, k) => {
                  const r2t = getWinner(r32m);
                  const mp  = toXY(RADII.r32, r32Angle(k));
                  return [0, 1].map(side => {
                    const outerTeam = side === 0 ? r32m?.home_team : r32m?.away_team;
                    const tp = toXY(RADII.team, teamAngle(k * 2 + side));
                    const isAdv  = !!(r2t && outerTeam && r2t.id === outerTeam.id);
                    const isElim = !!(r2t && outerTeam && r2t.id !== outerTeam.id);
                    return (
                      <Connector key={`rc-${k}-${side}`}
                        x1={tp.x} y1={tp.y} x2={mp.x} y2={mp.y}
                        gold={isAdv} active={!isElim} />
                    );
                  });
                })}

                {/* Ring 2 → Ring 3 (R32 winner → R16) */}
                {r16.map((r16m, m) => {
                  const r16w = getWinner(r16m);
                  const mp   = toXY(RADII.r16, r16Angle(m));
                  return [0, 1].map(side => {
                    const r32w = getWinner(r32[m * 2 + side]);
                    const p    = toXY(RADII.r32, r32Angle(m * 2 + side));
                    const isWin  = !!(r16w && r32w && r16w.id === r32w.id);
                    const isElim = !!(r16w && r32w && r16w.id !== r32w.id);
                    return (
                      <Connector key={`r16c-${m}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!r32w} />
                    );
                  });
                })}

                {/* Ring 3 → Ring 4 (R16 winner → QF) */}
                {qf.map((qfm, q) => {
                  const qfw = getWinner(qfm);
                  const mp  = toXY(RADII.qf, qfAngle(q));
                  return [0, 1].map(side => {
                    const r16w = getWinner(r16[q * 2 + side]);
                    const p    = toXY(RADII.r16, r16Angle(q * 2 + side));
                    const isWin  = !!(qfw && r16w && qfw.id === r16w.id);
                    const isElim = !!(qfw && r16w && qfw.id !== r16w.id);
                    return (
                      <Connector key={`qfc-${q}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!r16w} />
                    );
                  });
                })}

                {/* Ring 4 → Ring 5 (QF winner → SF) */}
                {([0, 1] as const).map(s => {
                  const sfw = getWinner(sf[s]);
                  const mp  = toXY(RADII.sf, sfAngle(s));
                  return ([0, 1] as const).map(side => {
                    const qIdx = s * 2 + side;
                    const qfw  = getWinner(qf[qIdx]);
                    const p    = toXY(RADII.qf, qfAngle(qIdx));
                    const isWin  = !!(sfw && qfw && sfw.id === qfw.id);
                    const isElim = !!(sfw && qfw && sfw.id !== qfw.id);
                    return (
                      <Connector key={`sfc-${s}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!qfw} />
                    );
                  });
                })}

                {/* Ring 5 → Center (SF finalist → Final) */}
                {([0, 1] as const).map(s => {
                  const sfw    = getWinner(sf[s]);
                  const isWin  = !!(champion && sfw && champion.id === sfw.id);
                  const isElim = !!(champion && sfw && champion.id !== sfw.id);
                  const p = toXY(RADII.sf, sfAngle(s));
                  return (
                    <Connector key={`finc-${s}`}
                      x1={p.x} y1={p.y} x2={CX} y2={CY}
                      gold={isWin} active={!isElim && !!sfw} />
                  );
                })}

                {/* ── NODES ── */}

                {/* Ring 1 — Outer team flags */}
                {r32.map((r32m, k) => {
                  const r2t = getWinner(r32m);
                  return [0, 1].map(side => {
                    const team = side === 0 ? r32m?.home_team : r32m?.away_team;
                    const pos  = toXY(RADII.team, teamAngle(k * 2 + side));
                    if (!team || team.code === 'TBD')
                      return <TBDCircle key={`t-${k}-${side}`} cx={pos.x} cy={pos.y} r={NODE_R.team} />;
                    const isAdv  = !!(r2t && r2t.id === team.id);
                    const isElim = !!(r2t && r2t.id !== team.id);
                    return (
                      <g key={`t-${k}-${side}`}>
                        <title>{team.name}</title>
                        <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.team}
                          code={team.code} dim={isElim} winner={isAdv}
                          clipId={`v2-clip-team-${k}-${side}`} />
                      </g>
                    );
                  });
                })}

                {/* Team code labels (outer ring) */}
                {r32.map((r32m, k) =>
                  [0, 1].map(side => {
                    const r2t  = getWinner(r32m);
                    const team = side === 0 ? r32m?.home_team : r32m?.away_team;
                    if (!team || team.code === 'TBD') return null;
                    const isElim = !!(r2t && r2t.id !== team.id);
                    const deg     = teamAngle(k * 2 + side);
                    const normDeg = ((deg % 360) + 360) % 360;
                    const labelR  = RADII.team + NODE_R.team + 10;
                    const pos     = toXY(labelR, deg);
                    const textRot = normDeg > 90 && normDeg < 270 ? deg + 90 : deg - 90;
                    return (
                      <text key={`lbl-${k}-${side}`}
                        x={pos.x} y={pos.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="7.5" fontWeight="700" letterSpacing="0.5"
                        fill={isElim ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)'}
                        transform={`rotate(${textRot}, ${pos.x}, ${pos.y})`}
                      >
                        {team.code}
                      </text>
                    );
                  })
                )}

                {/* Ring 2 — R32 winners */}
                {r32.map((r32m, k) => {
                  const t    = getWinner(r32m);
                  const r16w = getWinner(r16[Math.floor(k / 2)]);
                  const pos  = toXY(RADII.r32, r32Angle(k));
                  if (!t) return <TBDCircle key={`r2-${k}`} cx={pos.x} cy={pos.y} r={NODE_R.r32} />;
                  const isWin  = !!(r16w && r16w.id === t.id);
                  const isElim = !!(r16w && r16w.id !== t.id);
                  return (
                    <g key={`r2-${k}`}>
                      <title>{t.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.r32}
                        code={t.code} dim={isElim} winner={isWin}
                        clipId={`v2-clip-r32w-${k}`} />
                    </g>
                  );
                })}

                {/* Ring 3 — R16 winners */}
                {r16.map((r16m, m) => {
                  const winner = getWinner(r16m);
                  const pos    = toXY(RADII.r16, r16Angle(m));
                  if (!winner) return <TBDCircle key={`r3-${m}`} cx={pos.x} cy={pos.y} r={NODE_R.r16} />;
                  return (
                    <g key={`r3-${m}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.r16}
                        code={winner.code} winner clipId={`v2-clip-r16w-${m}`} />
                    </g>
                  );
                })}

                {/* Ring 4 — QF winners */}
                {qf.map((qfm, q) => {
                  const winner = getWinner(qfm);
                  const pos    = toXY(RADII.qf, qfAngle(q));
                  if (!winner) return <TBDCircle key={`r4-${q}`} cx={pos.x} cy={pos.y} r={NODE_R.qf} />;
                  return (
                    <g key={`r4-${q}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.qf}
                        code={winner.code} winner clipId={`v2-clip-qfw-${q}`} />
                    </g>
                  );
                })}

                {/* Ring 5 — SF finalists */}
                {([0, 1] as const).map(s => {
                  const winner = getWinner(sf[s]);
                  const pos    = toXY(RADII.sf, sfAngle(s));
                  if (!winner) return <TBDCircle key={`r5-${s}`} cx={pos.x} cy={pos.y} r={NODE_R.sf} />;
                  return (
                    <g key={`r5-${s}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.sf}
                        code={winner.code} winner clipId={`v2-clip-sfw-${s}`} />
                    </g>
                  );
                })}

                {/* Center — Champion or Trophy */}
                {champion ? (
                  <g>
                    <circle cx={CX} cy={CY} r={NODE_R.center + 8} fill="url(#v2centerGlow)" />
                    <FlagCircle cx={CX} cy={CY} r={NODE_R.center}
                      code={champion.code} winner clipId="v2-clip-champion" />
                    <text x={CX} y={CY + NODE_R.center + 15}
                      textAnchor="middle" fontSize="10" fill="#FFD700" fontWeight="700">
                      {champion.name}
                    </text>
                  </g>
                ) : (
                  <g>
                    <circle cx={CX} cy={CY} r={NODE_R.center + 8} fill="url(#v2centerGlow)" />
                    <circle cx={CX} cy={CY} r={NODE_R.center + 5}
                      fill="#1c2128" stroke="#FFD700" strokeWidth="1.5" opacity="0.5" />
                    <text x={CX} y={CY + 8} textAnchor="middle" fontSize="24">🏆</text>
                  </g>
                )}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 flex justify-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-px bg-yellow-400 opacity-65" />
                Advancing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-px bg-white/20" />
                Assigned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 border-t border-dashed border-white/20" />
                TBD
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
