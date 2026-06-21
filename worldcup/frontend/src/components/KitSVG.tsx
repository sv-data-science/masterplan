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
// Body:          x 22–58  (36 px wide), shoulder seam y=20
// Short sleeve:  x 11/69  →  11 px wide, cuff y=40 (armhole gap = natural separation)
// Long sleeve:   x 8/72   →  14 px wide, wrist y=72 (body+sleeve SEPARATE paths → seam always visible)

// Short sleeve: single combined path (armhole gap creates natural sleeve/body separation)
const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 51,13 Z',
};

// Long sleeve body only (no sleeves) — drawn as a separate filled path
const JERSEY_BODY_LONG: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 22,20 L 22,72 Q 40,76 58,72 L 58,20 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 22,20 L 22,72 Q 40,76 58,72 L 58,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 22,20 L 22,72 Q 40,76 58,72 L 58,20 L 51,13 Z',
};

// Collar points where sleeve path connects to body
const COLLAR_L: Record<CollarStyle, string> = { vneck: '30,14', round: '30,12', polo: '29,13' };
const COLLAR_R: Record<CollarStyle, string> = { vneck: '50,14', round: '50,12', polo: '51,13' };

// Clip polygons for shoulder stripe lines
const L_CLIP_SHORT = '11,20 11,40 22,40 22,20';
const R_CLIP_SHORT = '69,20 69,40 58,40 58,20';
const L_CLIP_LONG  = '8,20 8,72 22,72 22,20';
const R_CLIP_LONG  = '72,20 72,72 58,72 58,20';

export function KitSVG({ kit, width = 80 }: { kit: KitConfig; width?: number }) {
  const uid = useId().replace(/:/g, '');
  const height = Math.round(width * 130 / 80);

  const jP = mkPattern(`${uid}j`, kit.jersey.color1, kit.jersey.color2, kit.jersey.pattern, 14);
  const sP = mkPattern(`${uid}s`, kit.shorts.color1, kit.shorts.color2, kit.shorts.pattern, 12);
  const kP = mkPattern(`${uid}k`, kit.socks.color1, kit.socks.color2, kit.socks.pattern, 9);

  const { collarStyle, collarColor, sleeveAccentColor, shoulderStripes } = kit.jersey;
  const isLong = kit.jersey.sleeveLength === 'long';

  const jerseyPath = JERSEY_PATH[collarStyle] ?? JERSEY_PATH.vneck;
  const bodyPathLong = JERSEY_BODY_LONG[collarStyle] ?? JERSEY_BODY_LONG.vneck;
  // Long sleeve: each sleeve is a pentagon: collar-point → outer-shoulder → outer-wrist → inner-wrist → inner-shoulder
  const lSleevePath = `M ${COLLAR_L[collarStyle] ?? COLLAR_L.vneck} L 8,20 L 8,72 L 22,72 L 22,20 Z`;
  const rSleevePath = `M ${COLLAR_R[collarStyle] ?? COLLAR_R.vneck} L 72,20 L 72,72 L 58,72 L 58,20 Z`;

  const lClip = isLong ? L_CLIP_LONG : L_CLIP_SHORT;
  const rClip = isLong ? R_CLIP_LONG : R_CLIP_SHORT;
  const cuffY = isLong ? 72 : 40;
  const sleeveXL = isLong ? 8 : 11;
  const sleeveXR = isLong ? 72 : 69;

  return (
    <svg width={width} height={height} viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {jP.defs}{sP.defs}{kP.defs}
        <clipPath id={`${uid}-lsl`}><polygon points={lClip} /></clipPath>
        <clipPath id={`${uid}-rsl`}><polygon points={rClip} /></clipPath>
      </defs>

      {/* ── Jersey fill ── */}
      {isLong ? (
        // Body and sleeves are separate filled shapes — their shared borders are
        // double-stroked, creating clearly visible seam lines regardless of pattern.
        <>
          <path d={bodyPathLong} fill={jP.fill} />
          <path d={lSleevePath} fill={jP.fill} />
          <path d={rSleevePath} fill={jP.fill} />
          {/* Dimming overlay on sleeves so they read as distinct panels (solid jerseys) */}
          <path d={lSleevePath} fill="rgba(0,0,0,0.14)" />
          <path d={rSleevePath} fill="rgba(0,0,0,0.14)" />
        </>
      ) : (
        <path d={jerseyPath} fill={jP.fill} />
      )}

      {/* ── Shoulder stripes ── */}
      {shoulderStripes && (
        <g strokeLinecap="butt">
          <g clipPath={`url(#${uid}-lsl)`}>
            {isLong ? (
              // 14 px sleeve — 3 stripes at 1.5 px each
              <>
                <line x1="11" y1="20" x2="11" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="1.5" />
                <line x1="15" y1="20" x2="15" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="1.5" />
                <line x1="19" y1="20" x2="19" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="1.5" />
              </>
            ) : (
              // 11 px sleeve — 3 stripes with slight angle
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
                <line x1="69" y1="20" x2="69" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="1.5" />
                <line x1="65" y1="20" x2="65" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="1.5" />
                <line x1="61" y1="20" x2="61" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="1.5" />
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
      <line x1={sleeveXL} y1={cuffY} x2="22" y2={cuffY} stroke={sleeveAccentColor} strokeWidth={isLong ? 2 : 3.5} strokeLinecap="butt" />
      <line x1={sleeveXR} y1={cuffY} x2="58" y2={cuffY} stroke={sleeveAccentColor} strokeWidth={isLong ? 2 : 3.5} strokeLinecap="butt" />

      {/* ── Collar overlays ── */}
      {collarStyle === 'vneck' && (
        <path d="M 30,14 L 40,28 L 50,14 Z" fill={collarColor} />
      )}
      {collarStyle === 'round' && (
        <path d="M 30,12 C 32,6 36,4 40,4 C 44,4 48,6 50,12 C 48,18 44,20 40,20 C 36,20 32,18 30,12 Z" fill={collarColor} />
      )}
      {collarStyle === 'polo' && (
        <>
          {/* Collar stand — thin band at neckline */}
          <rect x="32" y="11.5" width="16" height="3" rx="0.5" fill={collarColor} />
          {/* Left collar leaf */}
          <path d="M 29,13 L 40,15 L 37,24 L 24,18 Z" fill={collarColor} />
          {/* Right collar leaf */}
          <path d="M 51,13 L 40,15 L 43,24 L 56,18 Z" fill={collarColor} />
          {/* Centre placket shadow */}
          <line x1="40" y1="14" x2="40" y2="23" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
        </>
      )}

      {/* ── Jersey outline ── */}
      {isLong ? (
        // Separate outlines → double-stroke at seams = clearly visible seam line
        <>
          <path d={bodyPathLong} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
          <path d={lSleevePath} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
          <path d={rSleevePath} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
        </>
      ) : (
        <>
          <path d={jerseyPath} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
          {/* Shoulder seam (short sleeve only — long sleeve seam comes from double-stroke above) */}
          <line x1="11" y1="20" x2="22" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
          <line x1="69" y1="20" x2="58" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
        </>
      )}

      {/* ── Shorts: waistband + two legs with visible gap ── */}
      <rect x="20" y="77" width="40" height="6" rx="1" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      <path d="M 20,83 L 20,104 Q 29,107 37,105 L 37,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      <path d="M 43,83 L 43,105 Q 51,107 60,104 L 60,83 Z" fill={sP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      {/* Hem stripe on each leg */}
      <rect x="20" y="101" width="17" height="3" fill={kit.shorts.color2} />
      <rect x="43" y="101" width="17" height="3" fill={kit.shorts.color2} />

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
