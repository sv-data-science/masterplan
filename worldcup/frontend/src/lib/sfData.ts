export interface SFEntry {
  matchNumber: number;
  qfHomeMatch: number;
  qfAwayMatch: number;
  kickoff_utc: string;
  venue: string;
  city: string;
}

export const SF: SFEntry[] = [
  { matchNumber: 101, qfHomeMatch: 97,  qfAwayMatch: 99,  kickoff_utc: '2026-07-15T00:00:00Z', venue: 'AT&T Stadium',          city: 'Arlington, USA' },
  { matchNumber: 102, qfHomeMatch: 98,  qfAwayMatch: 100, kickoff_utc: '2026-07-16T00:00:00Z', venue: 'Mercedes-Benz Stadium', city: 'Atlanta, USA'   },
];

export const SF_BY_MATCH_NUMBER = new Map<number, SFEntry>(SF.map(e => [e.matchNumber, e]));

export function sfSlotLabel(matchNum: number): string {
  return `W(M${matchNum})`;
}
