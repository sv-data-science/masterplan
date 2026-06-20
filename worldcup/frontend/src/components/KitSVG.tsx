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

// ── Geometry (viewBox 0 0 80 130) ─────────────────────────────────────────────
// Body:       x 22–58  (36 px wide)
// Sleeve out: x 11 / 69  →  each sleeve is 11 px wide
// Shoulder:   y 20
// Short cuff: y 40   Long wrist: y 72
// Body hem:   Q 40,76  (gentle belly curve)

const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 51,13 Z',
};

const JERSEY_PATH_LONG: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 11,20 L 11,72 L 22,72 Q 40,76 58,72 L 69,72 L 69,20 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 11,20 L 11,72 L 22,72 Q 40,76 58,72 L 69,72 L 69,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 11,20 L 11,72 L 22,72 Q 40,76 58,72 L 69,72 L 69,20 L 51,13 Z',
};

const L_CLIP_SHORT = '11,20 11,40 22,40 22,20';
const R_CLIP_SHORT = '69,20 69,40 58,40 58,20';
const L_CLIP_LONG  = '11,20 11,72 22,72 22,20';
const R_CLIP_LONG  = '69,20 69,72 58,72 58,20';

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
  const sleeveH = isLong ? 52 : 20;

  return (
    <svg width={width} height={height} viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {jP.defs}{sP.defs}{kP.defs}
        <clipPath id={`${uid}-lsl`}><polygon points={lClip} /></clipPath>
        <clipPath id={`${uid}-rsl`}><polygon points={rClip} /></clipPath>
      </defs>

      {/* ── Jersey fill ── */}
      <path d={jerseyPath} fill={jP.fill} />

      {/* ── Sleeve panel dimming — long sleeve has no armhole gap so we shade
           the panels to visually separate them from the body ── */}
      {isLong && (
        <>
          <rect x="11" y="20" width="11" height={sleeveH} fill="rgba(0,0,0,0.07)" />
          <rect x="58" y="20" width="11" height={sleeveH} fill="rgba(0,0,0,0.07)" />
        </>
      )}

      {/* ── Shoulder stripes ── */}
      {shoulderStripes && (
        <g strokeLinecap="butt">
          <g clipPath={`url(#${uid}-lsl)`}>
            <line x1="14" y1="20" x2="13" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
            <line x1="17" y1="20" x2="16" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
            <line x1="20" y1="20" x2="19" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
          </g>
          <g clipPath={`url(#${uid}-rsl)`}>
            <line x1="66" y1="20" x2="67" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
            <line x1="63" y1="20" x2="64" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
            <line x1="60" y1="20" x2="61" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
          </g>
        </g>
      )}

      {/* ── Sleeve cuff accent ── */}
      <line x1="11" y1={cuffY} x2="22" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="3.5" strokeLinecap="butt" />
      <line x1="69" y1={cuffY} x2="58" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="3.5" strokeLinecap="butt" />

      {/* ── Collar overlays ── */}
      {collarStyle === 'vneck' && (
        <path d="M 30,14 L 40,28 L 50,14 Z" fill={collarColor} />
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
      <path d={jerseyPath} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />

      {/* ── Shoulder seam (both sleeve styles) ── */}
      <line x1="11" y1="20" x2="22" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
      <line x1="69" y1="20" x2="58" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />

      {/* ── Sleeve–body side seams (long sleeve — prominent so panel separation is clear) ── */}
      {isLong && (
        <>
          <line x1="22" y1="20" x2="22" y2="72" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
          <line x1="58" y1="20" x2="58" y2="72" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
        </>
      )}

      {/* ── Shorts: waistband + two legs with visible gap ── */}
      <rect x="20" y="77" width="40" height="6" rx="1" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <path d="M 20,83 L 20,104 Q 29,107 37,105 L 37,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <path d="M 43,83 L 43,105 Q 51,107 60,104 L 60,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />

      {/* ── Socks ── */}
      {/* Left sock */}
      <rect x="21" y="107" width="14" height="18" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      {/* Adidas-style cuff stripes — 3 horizontal bands near the top */}
      <line x1="21.4" y1="110"   x2="34.6" y2="110"   stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="21.4" y1="112.2" x2="34.6" y2="112.2" stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="21.4" y1="114.4" x2="34.6" y2="114.4" stroke={kit.socks.color2} strokeWidth="1.4" />
      {/* Right sock */}
      <rect x="45" y="107" width="14" height="18" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="45.4" y1="110"   x2="58.6" y2="110"   stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="45.4" y1="112.2" x2="58.6" y2="112.2" stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="45.4" y1="114.4" x2="58.6" y2="114.4" stroke={kit.socks.color2} strokeWidth="1.4" />
    </svg>
  );
}
