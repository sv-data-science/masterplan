export interface R16Entry {
  matchNumber: number;
  r32HomeMatch: number;
  r32AwayMatch: number;
  kickoff_utc: string;
  venue: string;
  city: string;
}

export const R16: R16Entry[] = [
  { matchNumber: 89, r32HomeMatch: 74, r32AwayMatch: 77, kickoff_utc: '2026-07-05T17:00:00Z', venue: 'MetLife Stadium',       city: 'East Rutherford, USA' },
  { matchNumber: 90, r32HomeMatch: 73, r32AwayMatch: 75, kickoff_utc: '2026-07-05T21:00:00Z', venue: 'SoFi Stadium',          city: 'Inglewood, USA' },
  { matchNumber: 91, r32HomeMatch: 76, r32AwayMatch: 78, kickoff_utc: '2026-07-06T17:00:00Z', venue: 'AT&T Stadium',          city: 'Arlington, USA' },
  { matchNumber: 92, r32HomeMatch: 79, r32AwayMatch: 80, kickoff_utc: '2026-07-06T21:00:00Z', venue: 'NRG Stadium',           city: 'Houston, USA' },
  { matchNumber: 93, r32HomeMatch: 82, r32AwayMatch: 81, kickoff_utc: '2026-07-07T17:00:00Z', venue: 'Lumen Field',           city: 'Seattle, USA' },
  { matchNumber: 94, r32HomeMatch: 83, r32AwayMatch: 84, kickoff_utc: '2026-07-07T21:00:00Z', venue: 'Rose Bowl Stadium',     city: 'Pasadena, USA' },
  { matchNumber: 95, r32HomeMatch: 85, r32AwayMatch: 87, kickoff_utc: '2026-07-08T17:00:00Z', venue: 'Hard Rock Stadium',     city: 'Miami Gardens, USA' },
  { matchNumber: 96, r32HomeMatch: 86, r32AwayMatch: 88, kickoff_utc: '2026-07-08T21:00:00Z', venue: 'Mercedes-Benz Stadium', city: 'Atlanta, USA' },
];

export const R16_BY_MATCH_NUMBER = new Map<number, R16Entry>(R16.map(e => [e.matchNumber, e]));

export function r16SlotLabel(matchNum: number): string {
  return `W(M${matchNum})`;
}
