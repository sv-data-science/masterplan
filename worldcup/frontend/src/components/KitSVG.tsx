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
// Body:         x 22–58  (36 px wide)
// Short sleeve: x 11–22 / 58–69  (11 px wide each), cuff y=40
// Long sleeve:  x 9–22  / 58–71  (13 px wide each), wrist y=72 — single T-shape path

// Short sleeve: single combined path (armhole gap creates natural sleeve/body separation)
const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 11,20 L 11,40 L 22,40 L 22,72 Q 40,76 58,72 L 58,40 L 69,40 L 69,20 L 51,13 Z',
};

// Long sleeve: one continuous T-shape path — sleeves go straight down from shoulder
const JERSEY_PATH_LONG: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 9,20 L 9,72 L 22,72 Q 40,76 58,72 L 71,72 L 71,20 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 30,12 L 9,20 L 9,72 L 22,72 Q 40,76 58,72 L 71,72 L 71,20 L 50,12 C 47,15 43,16 40,16 C 37,16 33,15 30,12 Z',
  polo:  'M 29,13 L 9,20 L 9,72 L 22,72 Q 40,76 58,72 L 71,72 L 71,20 L 51,13 Z',
};

// Clip polygons for shoulder stripe lines
const L_CLIP_SHORT = '11,20 11,40 22,40 22,20';
const R_CLIP_SHORT = '69,20 69,40 58,40 58,20';
const L_CLIP_LONG  = '9,20 9,72 22,72 22,20';
const R_CLIP_LONG  = '71,20 71,72 58,72 58,20';

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

  const lClip    = isLong ? L_CLIP_LONG : L_CLIP_SHORT;
  const rClip    = isLong ? R_CLIP_LONG : R_CLIP_SHORT;
  const cuffY    = isLong ? 72 : 40;
  const sleeveXL = isLong ? 9  : 11;
  const sleeveXR = isLong ? 71 : 69;

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
              <>
                <line x1="12" y1="20" x2="12" y2="72" stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="15" y1="20" x2="15" y2="72" stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="18" y1="20" x2="18" y2="72" stroke={sleeveAccentColor} strokeWidth="2" />
              </>
            ) : (
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
                <line x1="68" y1="20" x2="68" y2="72" stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="65" y1="20" x2="65" y2="72" stroke={sleeveAccentColor} strokeWidth="2" />
                <line x1="62" y1="20" x2="62" y2="72" stroke={sleeveAccentColor} strokeWidth="2" />
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
      <line x1={sleeveXL} y1={cuffY} x2="22" y2={cuffY} stroke={sleeveAccentColor} strokeWidth={isLong ? 3 : 3.5} strokeLinecap="butt" />
      <line x1={sleeveXR} y1={cuffY} x2="58" y2={cuffY} stroke={sleeveAccentColor} strokeWidth={isLong ? 3 : 3.5} strokeLinecap="butt" />

      {/* ── Collar overlays ── */}
      {collarStyle === 'vneck' && (
        <path d="M 30,14 L 40,28 L 50,14 Z" fill={collarColor} />
      )}
      {collarStyle === 'round' && (
        <path d="M 30,12 C 32,6 36,4 40,4 C 44,4 48,6 50,12 C 48,18 44,20 40,20 C 36,20 32,18 30,12 Z" fill={collarColor} />
      )}
      {collarStyle === 'polo' && (
        <>
          <rect x="32" y="12.5" width="16" height="2" rx="0.5" fill={collarColor} />
          <path d="M 29,13 L 40,15 L 37,24 L 24,18 Z" fill={collarColor} />
          <path d="M 51,13 L 40,15 L 43,24 L 56,18 Z" fill={collarColor} />
          <line x1="40" y1="14" x2="40" y2="23" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
        </>
      )}

      {/* ── Jersey outline ── */}
      <path d={isLong ? jerseyPathLong : jerseyPath} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
      {isLong ? (
        // Shoulder seam + sleeve-body seam lines
        <>
          <line x1="9"  y1="20" x2="22" y2="20" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
          <line x1="71" y1="20" x2="58" y2="20" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
          <line x1="22" y1="20" x2="22" y2="72" stroke="rgba(0,0,0,0.15)" strokeWidth="0.7" />
          <line x1="58" y1="20" x2="58" y2="72" stroke="rgba(0,0,0,0.15)" strokeWidth="0.7" />
        </>
      ) : (
        <>
          <line x1="11" y1="20" x2="22" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
          <line x1="69" y1="20" x2="58" y2="20" stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
        </>
      )}

      {/* ── Shorts ── */}
      {/* Waistband in secondary color */}
      <rect x="20" y="77" width="40" height="5" rx="1" fill={kit.shorts.color2} stroke="rgba(0,0,0,0.2)" strokeWidth="0.6" />
      {/* Left leg */}
      <path d="M 20,82 L 20,105 Q 28,108 37,106 L 37,82 Z" fill={sP.fill} stroke="rgba(0,0,0,0.2)" strokeWidth="0.6" />
      {/* Right leg — 6px gap between legs */}
      <path d="M 43,82 L 43,106 Q 51,108 60,105 L 60,82 Z" fill={sP.fill} stroke="rgba(0,0,0,0.2)" strokeWidth="0.6" />
      {/* Hem stripe in secondary color */}
      <rect x="20" y="100" width="17" height="5" fill={kit.shorts.color2} />
      <rect x="43" y="100" width="17" height="5" fill={kit.shorts.color2} />

      {/* ── Socks ── */}
      <rect x="19" y="109" width="16" height="17" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="19.4" y1="112"   x2="34.6" y2="112"   stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="19.4" y1="114.2" x2="34.6" y2="114.2" stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="19.4" y1="116.4" x2="34.6" y2="116.4" stroke={kit.socks.color2} strokeWidth="1.4" />
      <rect x="45" y="109" width="16" height="17" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="45.4" y1="112"   x2="60.6" y2="112"   stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="45.4" y1="114.2" x2="60.6" y2="114.2" stroke={kit.socks.color2} strokeWidth="1.4" />
      <line x1="45.4" y1="116.4" x2="60.6" y2="116.4" stroke={kit.socks.color2} strokeWidth="1.4" />
    </svg>
  );
}
