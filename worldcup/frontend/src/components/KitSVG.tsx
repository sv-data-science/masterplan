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

// Jersey body paths (viewBox 0 0 80 130).
// Body tapers 2 px inward at the waist (y≈58) then flares back at the hem,
// and the hem is a soft quadratic-bezier curve rather than a flat line.
const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 8,22 L 2,38 L 6,48 L 22,42 L 24,58 L 22,73 Q 40,77 58,73 L 56,58 L 58,42 L 74,48 L 78,38 L 72,22 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 31,12 L 8,22 L 2,38 L 6,48 L 22,42 L 24,58 L 22,73 Q 40,77 58,73 L 56,58 L 58,42 L 74,48 L 78,38 L 72,22 L 49,12 C 46,15 43,16 40,16 C 37,16 33,15 31,12 Z',
  polo:  'M 30,13 L 8,22 L 2,38 L 6,48 L 22,42 L 24,58 L 22,73 Q 40,77 58,73 L 56,58 L 58,42 L 74,48 L 78,38 L 72,22 L 50,13 Z',
};

const L_SLEEVE_CLIP = '8,22 2,38 6,48 22,42 22,26';
const R_SLEEVE_CLIP = '72,22 78,38 74,48 58,42 58,26';

export function KitSVG({ kit, width = 80 }: { kit: KitConfig; width?: number }) {
  const uid = useId().replace(/:/g, '');
  const height = Math.round(width * 130 / 80);

  const jP = mkPattern(`${uid}j`, kit.jersey.color1, kit.jersey.color2, kit.jersey.pattern, 14);
  const sP = mkPattern(`${uid}s`, kit.shorts.color1, kit.shorts.color2, kit.shorts.pattern, 12);
  const kP = mkPattern(`${uid}k`, kit.socks.color1, kit.socks.color2, kit.socks.pattern, 9);

  const { collarStyle, collarColor, sleeveAccentColor, shoulderStripes } = kit.jersey;
  const jerseyPath = JERSEY_PATH[collarStyle] ?? JERSEY_PATH.vneck;

  return (
    <svg width={width} height={height} viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {jP.defs}
        {sP.defs}
        {kP.defs}
        <clipPath id={`${uid}-lsl`}>
          <polygon points={L_SLEEVE_CLIP} />
        </clipPath>
        <clipPath id={`${uid}-rsl`}>
          <polygon points={R_SLEEVE_CLIP} />
        </clipPath>
        <clipPath id={`${uid}-jc`}>
          <path d={jerseyPath} />
        </clipPath>
      </defs>

      {/* ── Jersey body ── */}
      <path d={jerseyPath} fill={jP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />

      {/* ── Shoulder stripes (Adidas-style, clipped to each sleeve) ── */}
      {shoulderStripes && (
        <g strokeLinecap="butt">
          <g clipPath={`url(#${uid}-lsl)`}>
            <line x1="10" y1="13" x2="3" y2="51" stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="14" y1="13" x2="7" y2="51" stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="18" y1="13" x2="11" y2="51" stroke={sleeveAccentColor} strokeWidth="2.5" />
          </g>
          <g clipPath={`url(#${uid}-rsl)`}>
            <line x1="70" y1="13" x2="77" y2="51" stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="66" y1="13" x2="73" y2="51" stroke={sleeveAccentColor} strokeWidth="2.5" />
            <line x1="62" y1="13" x2="69" y2="51" stroke={sleeveAccentColor} strokeWidth="2.5" />
          </g>
        </g>
      )}

      {/* ── Sleeve cuffs ── */}
      <line x1="6" y1="48" x2="22" y2="42" stroke={sleeveAccentColor} strokeWidth="5" strokeLinecap="butt" clipPath={`url(#${uid}-jc)`} />
      <line x1="74" y1="48" x2="58" y2="42" stroke={sleeveAccentColor} strokeWidth="5" strokeLinecap="butt" clipPath={`url(#${uid}-jc)`} />

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
          {/* Left collar leaf — folds out toward left shoulder */}
          <path d="M 40,13 L 40,20 L 35,24 L 30,16 L 32,13 Z" fill={collarColor} />
          {/* Right collar leaf — folds out toward right shoulder */}
          <path d="M 40,13 L 40,20 L 45,24 L 50,16 L 48,13 Z" fill={collarColor} />
          {/* Collar band — the rolled stand around the neck opening */}
          <path
            d="M 32,13 C 34,10 37,9 40,9 C 43,9 46,10 48,13 L 47,15 C 45,13 42,12 40,12 C 38,12 35,13 33,15 Z"
            fill={collarColor}
          />
          {/* Subtle fold shadow on each leaf */}
          <line x1="35" y1="15" x2="37" y2="21" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          <line x1="45" y1="15" x2="43" y2="21" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          {/* Center placket */}
          <line x1="40" y1="13" x2="40" y2="22" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" />
          {/* Button */}
          <circle cx="40" cy="20" r="0.9" fill="rgba(0,0,0,0.3)" />
        </>
      )}

      {/* ── Jersey outline on top ── */}
      <path d={jerseyPath} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.75" />

      {/* ── Shorts — curved leg openings instead of flat rect ── */}
      <path
        d="M 19,76 L 19,97 C 25,101 33,102 40,102 C 47,102 55,101 61,97 L 61,76 Z"
        fill={sP.fill}
        stroke="rgba(0,0,0,0.12)"
        strokeWidth="0.75"
      />
      <line x1="40" y1="76" x2="40" y2="101" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

      {/* ── Socks ── */}
      <rect x="21" y="103" width="15" height="22" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
      <rect x="44" y="103" width="15" height="22" rx="2" fill={kP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
    </svg>
  );
}
