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

// Jersey body paths per collar style (viewBox 0 0 80 130)
const JERSEY_PATH: Record<CollarStyle, string> = {
  vneck: 'M 30,14 L 8,22 L 2,38 L 6,48 L 22,42 L 22,74 L 58,74 L 58,42 L 74,48 L 78,38 L 72,22 L 50,14 L 46,22 L 40,28 L 34,22 Z',
  round: 'M 31,12 L 8,22 L 2,38 L 6,48 L 22,42 L 22,74 L 58,74 L 58,42 L 74,48 L 78,38 L 72,22 L 49,12 C 46,15 43,16 40,16 C 37,16 34,15 31,12 Z',
  polo:  'M 30,13 L 8,22 L 2,38 L 6,48 L 22,42 L 22,74 L 58,74 L 58,42 L 74,48 L 78,38 L 72,22 L 50,13 Z',
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

      {/* ── Sleeve cuffs (accent band at bottom of each sleeve) ── */}
      <line x1="6" y1="48" x2="22" y2="42" stroke={sleeveAccentColor} strokeWidth="5" strokeLinecap="butt" clipPath={`url(#${uid}-jc)`} />
      <line x1="74" y1="48" x2="58" y2="42" stroke={sleeveAccentColor} strokeWidth="5" strokeLinecap="butt" clipPath={`url(#${uid}-jc)`} />

      {/* ── Collar overlay per style ── */}
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
          {/* Left lapel */}
          <polygon points="30,13 10,22 36,27 40,19" fill={collarColor} />
          {/* Right lapel */}
          <polygon points="50,13 70,22 44,27 40,19" fill={collarColor} />
          {/* Center placket slit */}
          <line x1="40" y1="19" x2="40" y2="27" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        </>
      )}

      {/* ── Jersey outline on top ── */}
      <path d={jerseyPath} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.75" />

      {/* ── Shorts ── */}
      <rect x="19" y="75" width="42" height="25" rx="1.5" fill={sP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
      <line x1="40" y1="75" x2="40" y2="100" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

      {/* ── Socks ── */}
      <rect x="21" y="102" width="15" height="22" rx="1.5" fill={kP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
      <rect x="44" y="102" width="15" height="22" rx="1.5" fill={kP.fill} stroke="rgba(0,0,0,0.12)" strokeWidth="0.75" />
    </svg>
  );
}
