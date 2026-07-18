export interface FinalEntry {
  matchNumber: number;
  sfHomeMatch: number;
  sfAwayMatch: number;
  kickoff_utc: string;
  venue: string;
  city: string;
}

// 3rd place: losers of M101 and M102
export const THIRD_PLACE: FinalEntry = {
  matchNumber: 103,
  sfHomeMatch: 101,
  sfAwayMatch: 102,
  kickoff_utc: '2026-07-18T19:00:00Z',
  venue: 'SoFi Stadium',
  city: 'Inglewood, USA',
};

// Final: winners of M101 and M102
export const FINAL_MATCH: FinalEntry = {
  matchNumber: 104,
  sfHomeMatch: 101,
  sfAwayMatch: 102,
  kickoff_utc: '2026-07-19T19:00:00Z',
  venue: 'MetLife Stadium',
  city: 'East Rutherford, USA',
};

export function finalSlotLabel(matchNum: number): string {
  return `W(M${matchNum})`;
}

export function thirdSlotLabel(matchNum: number): string {
  return `L(M${matchNum})`;
}
