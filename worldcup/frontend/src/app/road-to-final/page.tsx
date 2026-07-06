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
const R32_SLOTS = [74, 77, 73, 75, 76, 78, 79, 80, 82, 81, 83, 84, 85, 88, 86, 87];
// Fallback team codes per slot when match data unavailable [home, away]
const R32_TEAMS: [string, string][] = [
  ['GER','PAR'],['FRA','SWE'],['RSA','CAN'],['NED','MAR'],
  ['BRA','JPN'],['CIV','NOR'],['MEX','ECU'],['ENG','COD'],
  ['BEL','SEN'],['USA','BIH'],['POR','CRO'],['ESP','AUT'],
  ['SUI','ALG'],['COL','GHA'],['ARG','CPV'],['AUS','EGY'],
];
const R16_SLOTS = [89, 90, 91, 92, 93, 94, 95, 96];
const QF_SLOTS  = [97, 98, 99, 100];
const SF_SLOTS  = [101, 102];
const FINAL_NUM = 103;

// ── Clip ID scheme (deterministic, no mutable counter) ─────────────────────
// R32 teams:    clip_team_{k}_{side}   (k=0..15, side=0|1)
// R32 winners:  clip_r32w_{k}          (k=0..15)
// R16 winners:  clip_r16w_{m}          (m=0..7)
// QF winners:   clip_qfw_{q}           (q=0..3)
// SF winners:   clip_sfw_{s}           (s=0..1)
// Champion:     clip_champion

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

// ── Sub-components ─────────────────────────────────────────────────────────
function FlagCircle({
  cx, cy, r, code, flag, dim, winner, clipId,
}: {
  cx: number; cy: number; r: number; code?: string | null; flag?: string | null;
  dim?: boolean; winner?: boolean; clipId: string;
}) {
  const url = code ? flagUrl(code) : null;
  const stroke = winner ? '#FFD700' : dim ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)';
  const strokeW = winner ? 2 : 0.8;
  const bg = dim ? '#13161b' : '#1c2128';
  const textOpacity = dim ? 0.22 : 0.7;
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
        fontWeight="700" fill={`rgba(255,255,255,${textOpacity})`}
        fontFamily="monospace">
        {displayCode}
      </text>
      {/* Flag image layered on top — if it loads it replaces the text */}
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

// ── Main page ──────────────────────────────────────────────────────────────
export default function RoadToFinalPage() {
  const { data: allMatches = [], isLoading } = useQuery({
    queryKey: ['all-matches-rtf'],
    queryFn: () => matchesApi.list().then(r => r.data as Match[]),
  });

  const byNum = new Map(allMatches.map(m => [m.match_number, m]));
  const r32 = R32_SLOTS.map(n => byNum.get(n) ?? null);
  const r16 = R16_SLOTS.map(n => byNum.get(n) ?? null);
  const qf  = QF_SLOTS.map(n => byNum.get(n) ?? null);
  const sf  = SF_SLOTS.map(n => byNum.get(n) ?? null);
  const final = byNum.get(FINAL_NUM) ?? null;

  const champion = getWinner(final);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-5xl mx-auto px-2 py-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white">Road to the Final</h1>
          <p className="text-gray-400 text-sm mt-1">FIFA World Cup 2026 — knockout stage</p>
          {!isLoading && (
            <p className="text-gray-600 text-xs mt-0.5">
              {allMatches.filter(m => m.stage === 'r32').length} R32 · {allMatches.filter(m => m.stage === 'r16').length} R16 matches loaded
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

                {/* Background */}
                <rect width="900" height="900" fill="url(#bg-grad)" />
                <circle cx={CX} cy={CY} r={70} fill="url(#center-glow)" />

                {/* Ring guides */}
                {[RADII.team + 24, RADII.r32 + NODE_R.r32, RADII.r16 + NODE_R.r16,
                  RADII.qf + NODE_R.qf, RADII.sf + NODE_R.sf].map((r, i) => (
                  <circle key={i} cx={CX} cy={CY} r={r}
                    fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.8" />
                ))}

                {/* Round labels (top and bottom of each ring) */}
                {[
                  { r: RADII.team + 13, label: 'R32' },
                  { r: RADII.r32 - 22, label: 'R16' },
                  { r: RADII.r16 - 22, label: 'QF' },
                  { r: RADII.qf - 22, label: 'SF' },
                  { r: RADII.sf - 26, label: 'Final' },
                ].flatMap(({ r, label }) => [
                  <text key={`${label}-r`} x={CX + r} y={CY + 4} textAnchor="middle"
                    fontSize="8.5" fill="rgba(255,255,255,0.16)" fontWeight="600">{label}</text>,
                  <text key={`${label}-l`} x={CX - r} y={CY + 4} textAnchor="middle"
                    fontSize="8.5" fill="rgba(255,255,255,0.16)" fontWeight="600">{label}</text>,
                ])}

                {/* ── Connection lines ──────────────────────────────────── */}

                {/* R32 team → R32 winner position */}
                {R32_SLOTS.map((_, k) => {
                  const match = r32[k];
                  const winner = getWinner(match);
                  const mp = toXY(RADII.r32, r32Angle(k));
                  return [0, 1].map(side => {
                    const team = side === 0 ? match?.home_team : match?.away_team;
                    const tp = toXY(RADII.team, teamAngle(k * 2 + side));
                    const isWin = !!(winner && team && winner.id === team.id);
                    const isElim = !!(winner && team && winner.id !== team.id);
                    return (
                      <Connector key={`rc-${k}-${side}`}
                        x1={tp.x} y1={tp.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!match} />
                    );
                  });
                })}

                {/* R32 winner → R16 winner position */}
                {R16_SLOTS.map((_, m) => {
                  const r16m = r16[m];
                  const r16w = getWinner(r16m);
                  const mp = toXY(RADII.r16, r16Angle(m));
                  return [0, 1].map(side => {
                    const r32w = getWinner(r32[m * 2 + side]);
                    const p = toXY(RADII.r32, r32Angle(m * 2 + side));
                    const isWin = !!(r16w && r32w && r16w.id === r32w.id);
                    const isElim = !!(r16w && r32w && r16w.id !== r32w.id);
                    return (
                      <Connector key={`r16c-${m}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!r32w} />
                    );
                  });
                })}

                {/* R16 winner → QF position */}
                {QF_SLOTS.map((_, q) => {
                  const qfm = qf[q];
                  const qfw = getWinner(qfm);
                  const mp = toXY(RADII.qf, qfAngle(q));
                  return [0, 1].map(side => {
                    const r16w = getWinner(r16[q * 2 + side]);
                    const p = toXY(RADII.r16, r16Angle(q * 2 + side));
                    const isWin = !!(qfw && r16w && qfw.id === r16w.id);
                    const isElim = !!(qfw && r16w && qfw.id !== r16w.id);
                    return (
                      <Connector key={`qfc-${q}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!r16w} />
                    );
                  });
                })}

                {/* QF winner → SF position */}
                {SF_SLOTS.map((_, s) => {
                  const sfm = sf[s];
                  const sfw = getWinner(sfm);
                  const mp = toXY(RADII.sf, sfAngle(s));
                  return [0, 1].map(side => {
                    const qfw = getWinner(qf[s * 2 + side]);
                    const p = toXY(RADII.qf, qfAngle(s * 2 + side));
                    const isWin = !!(sfw && qfw && sfw.id === qfw.id);
                    const isElim = !!(sfw && qfw && sfw.id !== qfw.id);
                    return (
                      <Connector key={`sfc-${s}-${side}`}
                        x1={p.x} y1={p.y} x2={mp.x} y2={mp.y}
                        gold={isWin} active={!isElim && !!qfw} />
                    );
                  });
                })}

                {/* SF winner → Center */}
                {SF_SLOTS.map((_, s) => {
                  const sfw = getWinner(sf[s]);
                  const isWin = !!(champion && sfw && champion.id === sfw.id);
                  const isElim = !!(champion && sfw && champion.id !== sfw.id);
                  const p = toXY(RADII.sf, sfAngle(s));
                  return (
                    <Connector key={`finc-${s}`}
                      x1={p.x} y1={p.y} x2={CX} y2={CY}
                      gold={isWin} active={!isElim && !!sfw} />
                  );
                })}

                {/* ── R32 team nodes ────────────────────────────────────── */}
                {R32_SLOTS.map((_, k) => {
                  const match = r32[k];
                  const winner = getWinner(match);
                  return [0, 1].map(side => {
                    const team = side === 0 ? match?.home_team : match?.away_team;
                    const code = team?.code ?? R32_TEAMS[k][side];
                    const pos = toXY(RADII.team, teamAngle(k * 2 + side));
                    const isWin = !!(winner && team && winner.id === team.id);
                    const isElim = !!(winner && team && winner.id !== team.id);
                    return (
                      <g key={`t-${k}-${side}`}>
                        <title>{team?.name ?? code}</title>
                        <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.team}
                          code={code} dim={isElim} winner={isWin}
                          clipId={`clip-team-${k}-${side}`} />
                      </g>
                    );
                  });
                })}

                {/* ── Team name labels (outside each team circle) ──────── */}
                {R32_SLOTS.map((_, k) =>
                  [0, 1].map(side => {
                    const match = r32[k];
                    const winner = getWinner(match);
                    const team = side === 0 ? match?.home_team : match?.away_team;
                    const code = team?.code ?? R32_TEAMS[k][side];
                    const isElim = !!(winner && team && winner.id !== team.id);
                    const deg = teamAngle(k * 2 + side);
                    const normDeg = ((deg % 360) + 360) % 360;
                    const labelR = RADII.team + NODE_R.team + 10;
                    const pos = toXY(labelR, deg);
                    // Rotate text so it's tangential and always readable
                    const textRot = normDeg > 90 && normDeg < 270
                      ? deg + 90   // left half: flip so text reads outward
                      : deg - 90;  // right half: normal outward reading
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

                {/* ── R32 winner nodes ──────────────────────────────────── */}
                {R32_SLOTS.map((_, k) => {
                  const winner = getWinner(r32[k]);
                  const pos = toXY(RADII.r32, r32Angle(k));
                  if (!winner) return <TBDCircle key={`r32w-${k}`} cx={pos.x} cy={pos.y} r={NODE_R.r32} />;
                  return (
                    <g key={`r32w-${k}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.r32}
                        code={winner.code} winner clipId={`clip-r32w-${k}`} />
                    </g>
                  );
                })}

                {/* ── R16 winner nodes ──────────────────────────────────── */}
                {R16_SLOTS.map((_, m) => {
                  const winner = getWinner(r16[m]);
                  const pos = toXY(RADII.r16, r16Angle(m));
                  if (!winner) return <TBDCircle key={`r16w-${m}`} cx={pos.x} cy={pos.y} r={NODE_R.r16} />;
                  return (
                    <g key={`r16w-${m}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.r16}
                        code={winner.code} winner clipId={`clip-r16w-${m}`} />
                    </g>
                  );
                })}

                {/* ── QF winner nodes ───────────────────────────────────── */}
                {QF_SLOTS.map((_, q) => {
                  const winner = getWinner(qf[q]);
                  const pos = toXY(RADII.qf, qfAngle(q));
                  if (!winner) return <TBDCircle key={`qfw-${q}`} cx={pos.x} cy={pos.y} r={NODE_R.qf} />;
                  return (
                    <g key={`qfw-${q}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.qf}
                        code={winner.code} winner clipId={`clip-qfw-${q}`} />
                    </g>
                  );
                })}

                {/* ── SF (finalist) nodes ───────────────────────────────── */}
                {SF_SLOTS.map((_, s) => {
                  const winner = getWinner(sf[s]);
                  const pos = toXY(RADII.sf, sfAngle(s));
                  if (!winner) return <TBDCircle key={`sfw-${s}`} cx={pos.x} cy={pos.y} r={NODE_R.sf} />;
                  return (
                    <g key={`sfw-${s}`}>
                      <title>{winner.name}</title>
                      <FlagCircle cx={pos.x} cy={pos.y} r={NODE_R.sf}
                        code={winner.code} winner clipId={`clip-sfw-${s}`} />
                    </g>
                  );
                })}

                {/* ── Champion / Trophy at center ───────────────────────── */}
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

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-px bg-yellow-400 opacity-65" /> Winner
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-px bg-white opacity-16" /> Played
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
