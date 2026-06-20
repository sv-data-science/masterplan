'use client';
import { useId } from 'react';
import { KitConfig, KitPattern, CollarStyle } from '@/types';

interface PatternResult {
  defs: React.ReactNode;
  fill: string;
}

function mkPattern(id: string, c1: string, c2: string, pat: KitPattern, cell: number): PatternResult {
  if (pat === 'solid') return { defs: null, fill: c1 };
  let el: React.ReactNode;
  const w = cell, h = cell;
  switch (pat) {
    case 'stripes':
      el = (
        <pattern id={id} x="0" y="0" width={w} height="200" patternUnits="userSpaceOnUse">
          <rect width={w / 2} height="200" fill={c1} />
          <rect x={w / 2} width={w / 2} height="200" fill={c2} />
        </pattern>
      );
      break;
    case 'hoops':
      el = (
        <pattern id={id} x="0" y="0" width="200" height={h} patternUnits="userSpaceOnUse">
          <rect width="200" height={h / 2} fill={c1} />
          <rect y={h / 2} width="200" height={h / 2} fill={c2} />
        </pattern>
      );
      break;
    case 'checkerboard':
      el = (
        <pattern id={id} x="0" y="0" width={w} height={h} patternUnits="userSpaceOnUse">
          <rect width={w} height={h} fill={c1} />
          <rect width={w / 2} height={h / 2} fill={c2} />
          <rect x={w / 2} y={h / 2} width={w / 2} height={h / 2} fill={c2} />
        </pattern>
      );
      break;
    case 'diagonal':
      el = (
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={w} height={h} fill={c1} />
          <rect width={w / 2} height={h} fill={c2} />
        </pattern>
      );
      break;
    default:
      return { defs: null, fill: c1 };
  }
  return { defs: el, fill: `url(#${id})` };
}

// ── Jersey geometry (viewBox 0 0 80 130) ──────────────────────────────────
// Body panel : x 20–60, shoulders at y 20, hem at y 72 (curve to y 76 center)
// Sleeve outer: x 3 (left) / x 77 (right)
// Short sleeve cuff: y 40  |  Long sleeve wrist: y 72

const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 29,14 L 3,20 L 3,40 L 20,40 L 20,72 Q 40,76 60,72 L 60,40 L 77,40 L 77,20 L 51,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 3,20 L 3,40 L 20,40 L 20,72 Q 40,76 60,72 L 60,40 L 77,40 L 77,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 3,20 L 3,40 L 20,40 L 20,72 Q 40,76 60,72 L 60,40 L 77,40 L 77,20 L 51,13 Z',
};

const JERSEY_PATH_LONG: Record<CollarStyle, string> = {
  vneck: 'M 29,14 L 3,20 L 3,72 L 20,72 Q 40,76 60,72 L 77,72 L 77,20 L 51,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 3,20 L 3,72 L 20,72 Q 40,76 60,72 L 77,72 L 77,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 3,20 L 3,72 L 20,72 Q 40,76 60,72 L 77,72 L 77,20 L 51,13 Z',
};

const L_CLIP_SHORT = '3,20 3,40 20,40 20,20';
const R_CLIP_SHORT = '77,20 77,40 60,40 60,20';
const L_CLIP_LONG  = '3,20 3,72 20,72 20,20';
const R_CLIP_LONG  = '77,20 77,72 60,72 60,20';

export function KitSVG({ kit, width = 80 }: { kit: KitConfig; width?: number }) {
  const uid = useId().replace(/:/g, '');
  const height = Math.round(width * 130 / 80);

  const jP = mkPattern(`${uid}j`, kit.jersey.color1, kit.jersey.color2, kit.jersey.pattern, 14);
  const sP = mkPattern(`${uid}s`, kit.shorts.color1, kit.shorts.color2, kit.shorts.pattern, 12);
  const kP = mkPattern(`${uid}k`, kit.socks.color1, kit.socks.color2, kit.socks.pattern, 9);

  const { collarStyle, collarColor, sleeveAccentColor, shoulderStripes } = kit.jersey;
  const isLong = kit.jersey.sleeveLength === 'long';

  const jerseyPath = isLong
    ? (JERSEY_PATH_LONG[collarStyle] ?? JERSEY_PATH_LONG.vneck)
    : (JERSEY_PATH[collarStyle] ?? JERSEY_PATH.vneck);
  const lClip = isLong ? L_CLIP_LONG : L_CLIP_SHORT;
  const rClip = isLong ? R_CLIP_LONG : R_CLIP_SHORT;
  const cuffY = isLong ? 72 : 40;

  return (
    <svg width={width} height={height} viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {jP.defs}{sP.defs}{kP.defs}
        <clipPath id={`${uid}-lsl`}><polygon points={lClip} /></clipPath>
        <clipPath id={`${uid}-rsl`}><polygon points={rClip} /></clipPath>
      </defs>

      {/* ── Jersey fill ── */}
      <path d={jerseyPath} fill={jP.fill} />

      {/* ── Shoulder stripes (outer ~60 % of sleeve) ── */}
      {shoulderStripes && (
        <g strokeLinecap="butt">
          <g clipPath={`url(#${uid}-lsl)`}>
            <line x1="7"  y1="20" x2="6"  y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="10" y1="20" x2="9"  y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="13" y1="20" x2="12" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
          </g>
          <g clipPath={`url(#${uid}-rsl)`}>
            <line x1="73" y1="20" x2="74" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="70" y1="20" x2="71" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="67" y1="20" x2="68" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
          </g>
        </g>
      )}

      {/* ── Sleeve cuff accent ── */}
      <line x1="3"  y1={cuffY} x2="20" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="4" strokeLinecap="butt" />
      <line x1="77" y1={cuffY} x2="60" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="4" strokeLinecap="butt" />

      {/* ── Collar overlays ── */}
      {collarStyle === 'vneck' && (
        <path d="M 29,14 L 40,28 L 51,14 Z" fill={collarColor} />
      )}
      {collarStyle === 'round' && (
        <path d="M 30,12 C 32,9 36,7 40,7 C 44,7 48,9 50,12 C 48,15 44,16 40,16 C 36,16 32,15 30,12 Z" fill={collarColor} />
      )}
      {collarStyle === 'polo' && (
        <>
          <rect x="33" y="12.5" width="14" height="2" rx="0.5" fill={collarColor} />
          <path d="M 40,13 L 40,20 L 35,24 L 30,16 L 32,13 Z" fill={collarColor} />
          <path d="M 40,13 L 40,20 L 45,24 L 50,16 L 48,13 Z" fill={collarColor} />
          <line x1="35" y1="15" x2="37" y2="21" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          <line x1="45" y1="15" x2="43" y2="21" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          <line x1="40" y1="13" x2="40" y2="22" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          <circle cx="40" cy="20" r="0.9" fill="rgba(0,0,0,0.3)" />
        </>
      )}

      {/* ── Jersey outline ── */}
      <path d={jerseyPath} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />

      {/* ── Shoulder seam (always) ── */}
      <line x1="3"  y1="20" x2="20" y2="20" stroke="rgba(0,0,0,0.3)" strokeWidth="0.9" />
      <line x1="77" y1="20" x2="60" y2="20" stroke="rgba(0,0,0,0.3)" strokeWidth="0.9" />

      {/* ── Sleeve–body side seams (long sleeve only) ── */}
      {isLong && (
        <>
          <line x1="20" y1="20" x2="20" y2="72" stroke="rgba(0,0,0,0.3)" strokeWidth="0.9" />
          <line x1="60" y1="20" x2="60" y2="72" stroke="rgba(0,0,0,0.3)" strokeWidth="0.9" />
        </>
      )}

      {/* ── Shorts: waistband + two legs ── */}
      <rect x="18" y="77" width="44" height="6" rx="1" fill={sP.fill} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      {/* left leg */}
      <path d="M 18,83 L 18,104 Q 28,107 37,105 L 37,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      {/* right leg */}
      <path d="M 43,83 L 43,105 Q 52,107 62,104 L 62,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />

      {/* ── Socks ── */}
      <rect x="20" y="107" width="15" height="18" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <rect x="45" y="107" width="15" height="18" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
    </svg>
  );
}
