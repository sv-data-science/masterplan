'use client';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match, Team } from '@/types';

// ── Geometry constants ─────────────────────────────────────────────────────
const CX = 450, CY = 450;
const BASE_DEG = -84.375;
const DEG2RAD = Math.PI / 180;

const RADII = { team: 382, r32: 308, r16: 230, qf: 155, sf: 86 };
const NODE_R = { team: 16, r32: 15, r16: 16, qf: 18, sf: 22, center: 28 };

const toXY = (r: number, deg: number) => ({
  x: CX + r * Math.cos(deg * DEG2RAD),
  y: CY + r * Math.sin(deg * DEG2RAD),
});

const teamAngle = (j: number) => BASE_DEG + j * 11.25;
const r32Angle  = (k: number) => BASE_DEG + 5.625 + k * 22.5;
const r16Angle  = (m: number) => BASE_DEG + 16.875 + m * 45;
const qfAngle   = (q: number) => BASE_DEG + 39.375 + q * 90;
const sfAngle   = (s: number) => BASE_DEG + 84.375 + s * 180;

// ── Bracket structure ──────────────────────────────────────────────────────
// R32 match slots (0..15): angular order around the circle
// Slot order derived from actual 2026 WC bracket chains:
//   RIGHT half (0°): England (M80→M92→M98→SF M102) + Argentina (M86→M96→M100→SF M102)
//   LEFT  half (180°): France (M77→M89→M97→SF M101) + Spain (M84→M94→M99→SF M101)
const R32_SLOTS = [76, 78, 79, 80, 85, 88, 86, 87, 82, 81, 83, 84, 74, 77, 73, 75];
// Fallback team codes per R32 slot [home, away] when API data unavailable
const R32_TEAMS: [string, string][] = [
  ['BRA','JPN'],['CIV','NOR'],['MEX','ECU'],['ENG','COD'],
  ['SUI','ALG'],['COL','GHA'],['ARG','CPV'],['AUS','EGY'],
  ['BEL','SEN'],['USA','BIH'],['POR','CRO'],['ESP','AUT'],
  ['GER','PAR'],['FRA','SWE'],['RSA','CAN'],['NED','MAR'],
];

// R16 match slots (0..7): paired with R32 slots (slot m pairs with R32 slots m*2 and m*2+1)
// Ring 2 position k = R16 match floor(k/2), home team if k even, away if k odd
const R16_SLOTS = [91, 92, 95, 96, 93, 94, 89, 90];
const QF_SLOTS  = [98, 100, 99, 97];
const SF_SLOTS  = [102, 101];
const FINAL_NUM = 103;

// ── Flag ISO mapping ───────────────────────────────────────────────────────
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

// ── Match helpers ──────────────────────────────────────────────────────────
function getWinner(m?: Match | null): Team | null {
  if (!m || m.status !== 'completed') return null;
  if (m.home_score === null || m.away_score === null) return null;
  if (m.home_score > m.away_score) return m.home_team;
  if (m.away_score > m.home_score) return m.away_team;
  if (m.home_score_pens !== null && m.away_score_pens !== null)
    return m.home_score_pens > m.away_score_pens ? m.home_team : m.away_team;
  return null;
}

// Ring 2: R16 assigned participant, falling back to R32 match winner.
// Returns null when neither is known (match pending) → split circle is shown instead.
function ring2Team(k: number, r16: (Match | null)[], r32: (Match | null)[]): Team | null {
  // Primary: R16 assigned team (as soon as admin assigns R16 participants)
  const r16m = r16[Math.floor(k / 2)];
  if (r16m) {
    const t = k % 2 === 0 ? r16m.home_team : r16m.away_team;
    if (t && t.code !== 'TBD') return t;
  }
  // Fallback: R32 match winner (if R32 is completed but R16 not yet assigned)
  return getWinner(r32[k]);
}

// ── Sub-components ─────────────────────────────────────────────────────────
function FlagCircle({
  cx, cy, r, code, dim, winner, clipId,
}: {
  cx: number; cy: number; r: number; code?: string | null;
  dim?: boolean; winner?: boolean; clipId: string;
}) {
  const url = code ? flagUrl(code) : null;
  const stroke = winner ? '#FFD700' : dim ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)';
  const strokeW = winner ? 2 : 0.8;
  const bg = dim ? '#13161b' : '#1c2128';
  const textFill = `rgba(255,255,255,${dim ? 0.22 : 0.7})`;
  const displayCode = code && code !== 'TBD' ? code.slice(0, 3) : '?';
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r - 0.5} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={bg} stroke={stroke} strokeWidth={strokeW} />
      {/* Team code always visible as fallback */}
      <text x={cx} y={cy + r * 0.38} textAnchor="middle" fontSize={r * 0.62}
        fontWeight="700" fill={textFill} fontFamily="monospace">
        {displayCode}
      </text>
      {/* Flag image layered on top — covers the text when it loads */}
      {url && (
        <image
          href={url}
          x={cx - r} y={cy - r * 0.75}
          width={r * 2} height={r * 1.5}
          clipPath={`url(#${clipId})`}
          style={{ opacity: dim ? 0.35 : 1 }}
        />
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
  if (gold) return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="#FFD700" strokeWidth="1.5" opacity="0.65" />
  );
  if (active) return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="rgba(255,255,255,0.16)" strokeWidth="0.9" />
  );
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" strokeDasharray="3 3" />
  );
}

const QUERY_OPTS = { refetchInterval: 30_000, staleTime: 20_000 };

// ── Main page ──────────────────────────────────────────────────────────────
export default function RoadToFinalPage() {
  const { data: allMatches = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['rtf-all'],
    queryFn: () => matchesApi.list({}).then(r => r.data as Match[]),
    ...QUERY_OPTS,
  });

  const r32 = R32_SLOTS.map(n => allMatches.find(m => m.match_number === n) ?? null);
  const r16 = R16_SLOTS.map(n => allMatches.find(m => m.match_number === n) ?? null);
  const qf  = QF_SLOTS.map( n => allMatches.find(m => m.match_number === n) ?? null);
  const sf  = SF_SLOTS.map( n => allMatches.find(m => m.match_number === n) ?? null);
  const final = allMatches.find(m => m.match_number === FINAL_NUM) ?? null;

  const champion = getWinner(final);

  const r32Loaded = r32.filter(Boolean).length;
  const r16Loaded = r16.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-5xl mx-auto px-2 py-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white">Road to the Final</h1>
          <p className="text-gray-400 text-sm mt-1">FIFA World Cup 2026 — knockout stage</p>
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
                  <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1a2030" />
                    <stop offset="100%" stopColor="#0d1117" />
                  </radialGradient>
                  <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFD700" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="900" height="900" fill="url(#bg-grad)" />
                <circle cx={CX} cy={CY} r={70} fill="url(#center-glow)" />

                {/* Ring guides */}
                {[RADII.team + 24, RADII.r32 + NODE_R.r32, RADII.r16 + NODE_R.r16,
                  RADII.qf + NODE_R.qf, RADII.sf + NODE_R.sf].map((r, i) => (
                  <circle key={i} cx={CX} cy={CY} r={r}
                    fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.8" />
                ))}

                {/* Round labels */}
                {[
                  { r: RADII.team + 13, label: 'R32' },
                  { r: RADII.r32 - 22, label: 'R16' },
                  { r: RADII.r16 - 24, label: 'QF' },
                  { r: RADII.qf - 24, label: 'SF' },
                  { r: RADII.sf - 28, label: 'Final' },
                ].flatMap(({ r, label }) => [
                  <text key={`${label}-r`} x={CX + r} y={CY + 4} textAnchor="middle"
                    fontSize="8.5" fill="rgba(255,255,255,0.16)" fontWeight="600">{label}</text>,
                  <text key={`${label}-l`} x={CX - r} y={CY + 4} textAnchor="middle"
                    fontSize="8.5" fill="rgba(255,255,255,0.16)" fontWeight="600">{label}</text>,
                ])}

                {/* ══ Connection lines ══════════════════════════════════════ */}

                {/* Ring 1 → Ring 2 */}
                {R32_SLOTS.map((_, k) => {
                  const match = r32[k];
                  const r2t = ring2Team(k, r16, r32);
                  const mp  = toXY(RADII.r32, r32Angle(k));
                  return [0, 1].map(side => {
                    const outerTeam = side === 0 ? match?.home_team : match?.away_team;
                    const tp = toXY(RADII.team, teamAngle(k * 2 + side));
                    const isAdvancing = !!(r2t && outerTeam && r2t.id === outerTeam.id);
                    const isElim      = !!(r2t && outerTeam && r2t.id !== outerTeam.id);
                    return (
                      <Connector key={`rc-${k}-${side}`}
                        x1={tp.x} y1={tp.y} x2={mp.x} y2={mp.y}
                        gold={isAdvancing} active={!isElim} />
                    );
                  });
                })}

                {/* Ring 2 → Ring 3 */}
                {R16_SLOTS.map((_, m) => {
                  const r16w = getWinner(r16[m]);
                  const mp   = toXY(RADII.r16, r16Angle(m));
                  return [0, 1].map(side => {
                    const r2t = ring2Team(m * 2 + side, r16, r32);
                    const p   = toXY(RADII.r32, r32Angle(m * 2 + side));
                    const isWin  = !!(r16w && r2t && r16w.id === r2t.id);
                    const isElim = !!(r16w && r2t && r16w.id !== r2t.id);
                    return (
                      <Connector key={`r16c-${m}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim} />
                    );
                  });
                })}

                {/* Ring 3 → Ring 4 (R16 winner → QF slot) */}
                {QF_SLOTS.map((_, q) => {
                  const qfw = getWinner(qf[q]);
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

                {/* Ring 4 → Ring 5 (QF winner → SF slot) */}
                {SF_SLOTS.map((_, s) => {
                  const sfw = getWinner(sf[s]);
                  const mp  = toXY(RADII.sf, sfAngle(s));
                  return [0, 1].map(side => {
                    const qfw = getWinner(qf[s * 2 + side]);
                    const p   = toXY(RADII.qf, qfAngle(s * 2 + side));
                    const isWin  = !!(sfw && qfw && sfw.id === qfw.id);
                    const isElim = !!(sfw && qfw && sfw.id !== qfw.id);
                    return (
                      <Connector key={`sfc-${s}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!qfw} />
                    );
                  });
                })}

                {/* Ring 5 → Center (SF winner → Final) */}
                {SF_SLOTS.map((_, s) => {
                  const sfw = getWinner(sf[s]);
                  const isWin  = !!(champion && sfw && champion.id === sfw.id);
                  const isElim = !!(champion && sfw && champion.id !== sfw.id);
                  const p = toXY(RADII.sf, sfAngle(s));
                  return (
                    <Connector key={`finc-${s}`}
                      x1={p.x} y1={p.y} x2={CX} y2={CY}
                      gold={isWin} active={!isElim && !!sfw} />
                  );
                })}

                {/* ══ Ring 1 — R32 teams (outer) ═══════════════════════════ */}
                {R32_SLOTS.map((_, k) => {
                  const match = r32[k];
                  const r2t   = ring2Team(k, r16, r32);
                  return [0, 1].map(side => {
                    const team = side === 0 ? match?.home_team : match?.away_team;
                    const code = team?.code ?? R32_TEAMS[k][side];
                    const pos  = toXY(RADII.team, teamAngle(k * 2 + side));
                    const isAdvancing = !!(r2t && team && r2t.id === team.id);
                    const isElim      = !!(r2t && team && r2t.id !== team.id);
                    return (
                      <g key={`t-${k}-${side}`}>
                        <title>{team?.name ?? code}</title>
                        <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.team}
                          code={code} dim={isElim} winner={isAdvancing}
                          clipId={`clip-team-${k}-${side}`} />
                      </g>
                    );
                  });
                })}

                {/* ══ Team code labels (outside outer ring) ════════════════ */}
                {R32_SLOTS.map((_, k) =>
                  [0, 1].map(side => {
                    const match = r32[k];
                    const r2t   = ring2Team(k, r16, r32);
                    const team  = side === 0 ? match?.home_team : match?.away_team;
                    const code  = team?.code ?? R32_TEAMS[k][side];
                    const isElim = !!(r2t && team && r2t.id !== team.id);
                    const deg  = teamAngle(k * 2 + side);
                    const normDeg = ((deg % 360) + 360) % 360;
                    const labelR = RADII.team + NODE_R.team + 10;
                    const pos = toXY(labelR, deg);
                    const textRot = normDeg > 90 && normDeg < 270 ? deg + 90 : deg - 90;
                    return (
                      <text key={`lbl-${k}-${side}`}
                        x={pos.x} y={pos.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="7.5" fontWeight="700" letterSpacing="0.5"
                        fill={isElim ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)'}
                        transform={`rotate(${textRot}, ${pos.x}, ${pos.y})`}
                      >
                        {code}
                      </text>
                    );
                  })
                )}

                {/* ══ Ring 2 — R32 winner / R16 participant ════════════════ */}
                {R32_SLOTS.map((_, k) => {
                  const t    = ring2Team(k, r16, r32);
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
                        clipId={`clip-r32w-${k}`} />
                    </g>
                  );
                })}

                {/* ══ Ring 3 — R16 winners ═════════════════════════════════ */}
                {R16_SLOTS.map((_, m) => {
                  const winner = getWinner(r16[m]);
                  const pos    = toXY(RADII.r16, r16Angle(m));
                  if (!winner) return <TBDCircle key={`r3-${m}`} cx={pos.x} cy={pos.y} r={NODE_R.r16} />;
                  return (
                    <g key={`r3-${m}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.r16}
                        code={winner.code} winner clipId={`clip-r16w-${m}`} />
                    </g>
                  );
                })}

                {/* ══ Ring 4 — QF winners ══════════════════════════════════ */}
                {QF_SLOTS.map((_, q) => {
                  const winner = getWinner(qf[q]);
                  const pos    = toXY(RADII.qf, qfAngle(q));
                  if (!winner) return <TBDCircle key={`r4-${q}`} cx={pos.x} cy={pos.y} r={NODE_R.qf} />;
                  return (
                    <g key={`r4-${q}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.qf}
                        code={winner.code} winner clipId={`clip-qfw-${q}`} />
                    </g>
                  );
                })}

                {/* ══ Ring 5 — SF winners / Finalists ═════════════════════ */}
                {SF_SLOTS.map((_, s) => {
                  const winner = getWinner(sf[s]);
                  const pos    = toXY(RADII.sf, sfAngle(s));
                  if (!winner) return <TBDCircle key={`r5-${s}`} cx={pos.x} cy={pos.y} r={NODE_R.sf} />;
                  return (
                    <g key={`r5-${s}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.sf}
                        code={winner.code} winner clipId={`clip-sfw-${s}`} />
                    </g>
                  );
                })}

                {/* ══ Center — Champion / Trophy ═══════════════════════════ */}
                {champion ? (
                  <g>
                    <FlagCircle cx={CX} cy={CY} r={NODE_R.center}
                      code={champion.code} winner clipId="clip-champion" />
                    <text x={CX} y={CY + NODE_R.center + 15}
                      textAnchor="middle" fontSize="10" fill="#FFD700" fontWeight="700">
                      {champion.name}
                    </text>
                  </g>
                ) : (
                  <g>
                    <circle cx={CX} cy={CY} r={NODE_R.center + 5}
                      fill="#1c2128" stroke="#FFD700" strokeWidth="1.5" opacity="0.5" />
                    <text x={CX} y={CY + 8} textAnchor="middle" fontSize="24">🏆</text>
                  </g>
                )}
              </svg>
            </div>

            <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-px bg-yellow-400 opacity-65" /> Advancing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-px bg-white opacity-16" /> Assigned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-px border-t border-dashed border-white opacity-13" /> TBD
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
