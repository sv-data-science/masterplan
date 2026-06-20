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

// Short sleeve — shoulder at y=22, sleeve drops to y=42, clean rectangular shape
const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 5,22 L 5,42 L 22,42 L 22,73 Q 40,77 58,73 L 58,42 L 75,42 L 75,22 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 31,12 L 5,22 L 5,42 L 22,42 L 22,73 Q 40,77 58,73 L 58,42 L 75,42 L 75,22 L 49,12 C 46,15 43,16 40,16 C 37,16 33,15 31,12 Z',
  polo:  'M 30,13 L 5,22 L 5,42 L 22,42 L 22,73 Q 40,77 58,73 L 58,42 L 75,42 L 75,22 L 50,13 Z',
};

// Long sleeve — same outer shoulder (5,22), sleeve drops straight to wrist (y=73)
const JERSEY_PATH_LONG: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 5,22 L 5,73 L 22,73 Q 40,77 58,73 L 75,73 L 75,22 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 31,12 L 5,22 L 5,73 L 22,73 Q 40,77 58,73 L 75,73 L 75,22 L 49,12 C 46,15 43,16 40,16 C 37,16 33,15 31,12 Z',
  polo:  'M 30,13 L 5,22 L 5,73 L 22,73 Q 40,77 58,73 L 75,73 L 75,22 L 50,13 Z',
};

// Stripe clip regions (rectangular sleeve panels)
const L_SLEEVE_CLIP_SHORT = '5,22 5,42 22,42 22,22';
const R_SLEEVE_CLIP_SHORT = '75,22 75,42 58,42 58,22';
const L_SLEEVE_CLIP_LONG  = '5,22 5,73 22,73 22,22';
const R_SLEEVE_CLIP_LONG  = '75,22 75,73 58,73 58,22';

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
  const lSlip = isLong ? L_SLEEVE_CLIP_LONG : L_SLEEVE_CLIP_SHORT;
  const rSlip = isLong ? R_SLEEVE_CLIP_LONG : R_SLEEVE_CLIP_SHORT;
  const cuffY = isLong ? 73 : 42;

  return (
    <svg width={width} height={height} viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {jP.defs}
        {sP.defs}
        {kP.defs}
        <clipPath id={`${uid}-lsl`}>
          <polygon points={lSlip} />
        </clipPath>
        <clipPath id={`${uid}-rsl`}>
          <polygon points={rSlip} />
        </clipPath>
      </defs>

      {/* ── Jersey body ── */}
      <path d={jerseyPath} fill={jP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />

      {/* ── Shoulder seam lines ── */}
      <line x1="5"  y1="22" x2="22" y2="22" stroke="rgba(0,0,0,0.22)" strokeWidth="0.75" />
      <line x1="75" y1="22" x2="58" y2="22" stroke="rgba(0,0,0,0.22)" strokeWidth="0.75" />

      {/* ── Shoulder stripes (outer 60 % of sleeve, nearly vertical) ── */}
      {shoulderStripes && (
        <g strokeLinecap="butt">
          <g clipPath={`url(#${uid}-lsl)`}>
            <line x1="8"  y1="22" x2="7"  y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="11" y1="22" x2="10" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="14" y1="22" x2="13" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
          </g>
          <g clipPath={`url(#${uid}-rsl)`}>
            <line x1="72" y1="22" x2="73" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="69" y1="22" x2="70" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="66" y1="22" x2="67" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="2.5" />
          </g>
        </g>
      )}

      {/* ── Sleeve cuff accent ── */}
      <line x1="5"  y1={cuffY} x2="22" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="4" strokeLinecap="butt" />
      <line x1="75" y1={cuffY} x2="58" y2={cuffY} stroke={sleeveAccentColor} strokeWidth="4" strokeLinecap="butt" />

      {/* ── Collar overlays ── */}
      {collarStyle === 'vneck' && (
        <path d="M 30,14 L 40,28 L 50,14 Z" fill={collarColor} />
      )}
      {collarStyle === 'round' && (
        <path
          d="M 31,12 C 33,9 37,7 40,7 C 43,7 47,9 49,12 C 47,15 43,16 40,16 C 37,16 33,15 31,12 Z"
          fill={collarColor}
        />
      )}
      {collarStyle === 'polo' && (
        <>
          {/* Collar stand — stays at neckline, no dome above jersey */}
          <rect x="32" y="12.5" width="16" height="2" rx="0.5" fill={collarColor} />
          {/* Left collar leaf */}
          <path d="M 40,13 L 40,20 L 35,24 L 30,16 L 32,13 Z" fill={collarColor} />
          {/* Right collar leaf */}
          <path d="M 40,13 L 40,20 L 45,24 L 50,16 L 48,13 Z" fill={collarColor} />
          <line x1="35" y1="15" x2="37" y2="21" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          <line x1="45" y1="15" x2="43" y2="21" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          <line x1="40" y1="13" x2="40" y2="22" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
          <circle cx="40" cy="20" r="0.9" fill="rgba(0,0,0,0.3)" />
        </>
      )}

      {/* ── Jersey outline ── */}
      <path d={jerseyPath} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.75" />

      {/* ── Long sleeve: sleeve–body seam lines ── */}
      {isLong && (
        <>
          <line x1="22" y1="22" x2="22" y2="73" stroke="rgba(0,0,0,0.22)" strokeWidth="0.75" />
          <line x1="58" y1="22" x2="58" y2="73" stroke="rgba(0,0,0,0.22)" strokeWidth="0.75" />
        </>
      )}

      {/* ── Shorts: waistband + two separate leg tubes ── */}
      <rect x="21" y="77" width="38" height="5" fill={sP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
      <path d="M 21,82 L 21,103 Q 29,106 37,104 L 37,82 Z" fill={sP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
      <path d="M 43,82 L 43,104 Q 51,106 59,103 L 59,82 Z" fill={sP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />

      {/* ── Socks ── */}
      <rect x="21" y="106" width="14" height="20" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
      <rect x="45" y="106" width="14" height="20" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
    </svg>
  );
}
