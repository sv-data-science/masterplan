export interface QFEntry {
  matchNumber: number;
  r16HomeMatch: number;
  r16AwayMatch: number;
  kickoff_utc: string;
  venue: string;
  city: string;
}

export const QF: QFEntry[] = [
  { matchNumber: 97,  r16HomeMatch: 89, r16AwayMatch: 90, kickoff_utc: '2026-07-10T00:00:00Z', venue: 'Gillette Stadium',  city: 'Foxborough, USA'    },
  { matchNumber: 98,  r16HomeMatch: 93, r16AwayMatch: 94, kickoff_utc: '2026-07-11T00:00:00Z', venue: 'SoFi Stadium',      city: 'Inglewood, USA'     },
  { matchNumber: 99,  r16HomeMatch: 91, r16AwayMatch: 92, kickoff_utc: '2026-07-11T20:00:00Z', venue: 'Hard Rock Stadium', city: 'Miami Gardens, USA' },
  { matchNumber: 100, r16HomeMatch: 95, r16AwayMatch: 96, kickoff_utc: '2026-07-12T00:00:00Z', venue: 'Arrowhead Stadium', city: 'Kansas City, USA'   },
];

export const QF_BY_MATCH_NUMBER = new Map<number, QFEntry>(QF.map(e => [e.matchNumber, e]));

export function qfSlotLabel(matchNum: number): string {
  return `W(M${matchNum})`;
}
