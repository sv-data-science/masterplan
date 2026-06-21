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
// Body:          x 22–58  (36 px wide), shoulder seam y=20/22
// Short sleeve:  x 11/69  →  11 px wide, cuff y=40
// Long sleeve:   x 5/75   →  17 px wide, wrist y=73  (one continuous T-shape path)

// Short sleeve: single combined path
const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 51,13 Z',
};

// Long sleeve: one continuous T-shape path — no separate sleeve pieces, no hourglass
const JERSEY_PATH_LONG: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 8,22 L 5,73 L 22,73 Q 40,77 58,73 L 75,73 L 72,22 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 31,12 L 8,22 L 5,73 L 22,73 Q 40,77 58,73 L 75,73 L 72,22 L 49,12 C 46,15 43,16 40,16 C 37,16 33,15 31,12 Z',
  polo:  'M 30,13 L 8,22 L 5,73 L 22,73 Q 40,77 58,73 L 75,73 L 72,22 L 50,13 Z',
};

// Clip polygons for shoulder stripe lines
const L_CLIP_SHORT = '11,20 11,40 22,40 22,20';
const R_CLIP_SHORT = '69,20 69,40 58,40 58,20';
const L_CLIP_LONG  = '8,22 5,73 22,73 22,22';
const R_CLIP_LONG  = '72,22 75,73 58,73 58,22';

export function KitSVG({ kit, width = 80 }: { kit: KitConfig; width?: number }) {
  const uid = useId().replace(/:/g, '');
  const height = Math.round(width * 130 / 80);

  const jP = mkPattern(`${uid}j`, kit.jersey.color1, kit.jersey.color2, kit.jersey.pattern, 14);
  const sP = mkPattern(`${uid}s`, kit.shorts.color1, kit.shorts.color2, kit.shorts.pattern, 12);
  const kP = mkPattern(`${uid}k`, kit.socks.color1, kit.socks.color2, kit.socks.pattern, 9);

  const { collarStyle, collarColor, sleeveAccentColor, shoulderStripes } = kit.jersey;
  const isLong = kit.jersey.sleeveLength === 'long';

  const jerseyPath     = JERSEY_PATH[collarStyle]      ?? JERSEY_PATH.vneck;
  const jerseyPathLong = JERSEY_PATH_LONG[collarStyle] ?? JERSEY_PATH_LONG.vneck;

  const lClip   = isLong ? L_CLIP_LONG : L_CLIP_SHORT;
  const rClip   = isLong ? R_CLIP_LONG : R_CLIP_SHORT;
  const cuffY   = isLong ? 73 : 40;
  const sleeveXL = isLong ? 5  : 11;
  const sleeveXR = isLong ? 75 : 69;

  return (
    <svg width={width} height={height} viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {jP.defs}{sP.defs}{kP.defs}
        <clipPath id={`${uid}-lsl`}><polygon points={lClip} /></clipPath>
        <clipPath id={`${uid}-rsl`}><polygon points={rClip} /></clipPath>
      </defs>

      {/* ── Jersey fill ── */}
      <path d={isLong ? jerseyPathLong : jerseyPath} fill={jP.fill} />

      {/* ── Shoulder stripes ── */}
      {shoulderStripes && (
        <g strokeLinecap="butt">
          <g clipPath={`url(#${uid}-lsl)`}>
            {isLong ? (
              // Long sleeve — 3 stripes running outer-to-inner across the sleeve width
              <>
                <line x1="10" y1="22" x2="7"  y2="73" stroke={sleeveAccentColor} strokeWidth="2.5" />
                <line x1="13" y1="22" x2="10" y2="73" stroke={sleeveAccentColor} strokeWidth="2.5" />
                <line x1="16" y1="22" x2="13" y2="73" stroke={sleeveAccentColor} strokeWidth="2.5" />
              </>
            ) : (
              // Short sleeve — 3 stripes with slight angle
              <>
                <line x1="14" y1="20" x2="13" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="17" y1="20" x2="16" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="20" y1="20" x2="19" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
              </>
            )}
          </g>
          <g clipPath={`url(#${uid}-rsl)`}>
            {isLong ? (
              <>
                <line x1="70" y1="22" x2="73" y2="73" stroke={sleeveAccentColor} strokeWidth="2.5" />
                <line x1="67" y1="22" x2="70" y2="73" stroke={sleeveAccentColor} strokeWidth="2.5" />
                <line x1="64" y1="22" x2="67" y2="73" stroke={sleeveAccentColor} strokeWidth="2.5" />
              </>
            ) : (
              <>
                <line x1="66" y1="20" x2="67" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="63" y1="20" x2="64" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="60" y1="20" x2="61" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2" />
              </>
            )}
          </g>
        </g>
      )}

      {/* ── Sleeve cuff accent ── */}
      <line x1={sleeveXL} y1={cuffY} x2="22" y2={cuffY} stroke={sleeveAccentColor} strokeWidth={isLong ? 4 : 3.5} strokeLinecap="butt" />
      <line x1={sleeveXR} y1={cuffY} x2="58" y2={cuffY} stroke={sleeveAccentColor} strokeWidth={isLong ? 4 : 3.5} strokeLinecap="butt" />

      {/* ── Collar overlays ── */}
      {collarStyle === 'vneck' && (
        <path d="M 30,14 L 40,28 L 50,14 Z" fill={collarColor} />
      )}
      {collarStyle === 'round' && (
        <path d="M 30,12 C 32,6 36,4 40,4 C 44,4 48,6 50,12 C 48,18 44,20 40,20 C 36,20 32,18 30,12 Z" fill={collarColor} />
      )}
      {collarStyle === 'polo' && (
        <>
          {/* Collar stand — flat strip at neckline (no element goes above y=12.5) */}
          <rect x="32" y="12.5" width="16" height="2" rx="0.5" fill={collarColor} />
          {/* Left collar leaf */}
          <path d="M 29,13 L 40,15 L 37,24 L 24,18 Z" fill={collarColor} />
          {/* Right collar leaf */}
          <path d="M 51,13 L 40,15 L 43,24 L 56,18 Z" fill={collarColor} />
          {/* Centre placket shadow */}
          <line x1="40" y1="14" x2="40" y2="23" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
        </>
      )}

      {/* ── Jersey outline ── */}
      <path d={isLong ? jerseyPathLong : jerseyPath} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      {isLong ? (
        // Sleeve-body seam lines + outer sleeve detail stroke
        <>
          <path d="M 8,22 L 5,73 L 22,73" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.75" />
          <path d="M 72,22 L 75,73 L 58,73" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.75" />
          <line x1="22" y1="22" x2="22" y2="73" stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
          <line x1="58" y1="22" x2="58" y2="73" stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
        </>
      ) : (
        // Shoulder seam lines for short sleeve
        <>
          <line x1="11" y1="20" x2="22" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
          <line x1="69" y1="20" x2="58" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
        </>
      )}

      {/* ── Shorts: waistband + two legs with visible gap ── */}
      {/* Waistband secondary color stripe at top */}
      <rect x="20" y="77" width="40" height="6" rx="1" fill={kit.shorts.color2} />
      <rect x="20" y="79" width="40" height="4" fill={sP.fill} />
      <rect x="20" y="77" width="40" height="6" rx="1" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      <path d="M 20,83 L 20,104 Q 29,107 37,105 L 37,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      <path d="M 43,83 L 43,105 Q 51,107 60,104 L 60,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      {/* Hem stripe on each leg — tall enough to show at small sizes */}
      <rect x="20" y="98" width="17" height="6" fill={kit.shorts.color2} />
      <rect x="43" y="98" width="17" height="6" fill={kit.shorts.color2} />

      {/* ── Socks (centered under each leg, start just below shorts hem) ── */}
      {/* Left sock — under left leg (x≈18–36) */}
      <rect x="19" y="108" width="16" height="17" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="19.4" y1="111"   x2="34.6" y2="111"   stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="19.4" y1="113.2" x2="34.6" y2="113.2" stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="19.4" y1="115.4" x2="34.6" y2="115.4" stroke={kit.socks.color2} strokeWidth="1.4" />
      {/* Right sock — under right leg (x≈44–62) */}
      <rect x="45" y="108" width="16" height="17" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="45.4" y1="111"   x2="60.6" y2="111"   stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="45.4" y1="113.2" x2="60.6" y2="113.2" stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="45.4" y1="115.4" x2="60.6" y2="115.4" stroke={kit.socks.color2} strokeWidth="1.4" />
    </svg>
  );
}
