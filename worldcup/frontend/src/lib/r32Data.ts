export type FixedSlot = { kind: 'fixed'; pos: 1 | 2; group: string };
export type BestThirdSlot = { kind: 'best3rd' };
export type SlotDef = FixedSlot | BestThirdSlot;

export interface R32Entry {
  matchNumber: number;
  home: SlotDef;
  away: SlotDef;
  kickoff_utc: string;
  venue: string;
  city: string;
}

// Official FIFA WC 2026 Round of 32 bracket
// Actual group standings used to verify slots:
//   A: Mexico(1) South Africa(2)    B: Switzerland(1) Canada(2) Bosnia(b3)
//   C: Brazil(1) Morocco(2)         D: USA(1) Australia(2) Paraguay(b3)
//   E: Germany(1) Ivory Coast(2) Ecuador(b3)  F: Netherlands(1) Japan(2) Sweden(b3)
//   G: Belgium(1) Egypt(2)          H: Spain(1) Cape Verde(2)
//   I: France(1) Norway(2) Senegal(b3)         J: Argentina(1) Austria(2) Algeria(b3)
//   K: Colombia(1) Portugal(2) DR Congo(b3)    L: England(1) Croatia(2) Ghana(b3)
export const R32: R32Entry[] = [
  // Jun 28
  { matchNumber: 73, home: { kind: 'fixed', pos: 2, group: 'A' }, away: { kind: 'fixed', pos: 2, group: 'B' },        kickoff_utc: '2026-06-28T19:00:00Z', venue: 'Rose Bowl Stadium',       city: 'Pasadena, USA' },
  // Jun 29
  { matchNumber: 76, home: { kind: 'fixed', pos: 1, group: 'C' }, away: { kind: 'fixed', pos: 2, group: 'F' },        kickoff_utc: '2026-06-29T17:00:00Z', venue: 'NRG Stadium',             city: 'Houston, USA' },
  { matchNumber: 74, home: { kind: 'fixed', pos: 1, group: 'E' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-06-29T20:30:00Z', venue: 'Gillette Stadium',        city: 'Foxborough, USA' },
  { matchNumber: 75, home: { kind: 'fixed', pos: 1, group: 'F' }, away: { kind: 'fixed', pos: 2, group: 'C' },        kickoff_utc: '2026-06-30T01:00:00Z', venue: 'Estadio BBVA',            city: 'Monterrey, Mexico' },
  // Jun 30
  { matchNumber: 78, home: { kind: 'fixed', pos: 2, group: 'E' }, away: { kind: 'fixed', pos: 2, group: 'I' },        kickoff_utc: '2026-06-30T17:00:00Z', venue: 'AT&T Stadium',            city: 'Arlington, USA' },
  { matchNumber: 77, home: { kind: 'fixed', pos: 1, group: 'I' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-06-30T21:00:00Z', venue: 'MetLife Stadium',         city: 'East Rutherford, USA' },
  { matchNumber: 79, home: { kind: 'fixed', pos: 1, group: 'A' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-06-30T23:00:00Z', venue: 'Estadio Azteca',          city: 'Mexico City, Mexico' },
  // Jul 1
  { matchNumber: 80, home: { kind: 'fixed', pos: 1, group: 'L' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-07-01T16:00:00Z', venue: 'Mercedes-Benz Stadium',   city: 'Atlanta, USA' },
  { matchNumber: 82, home: { kind: 'fixed', pos: 1, group: 'G' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-07-01T20:00:00Z', venue: 'Lumen Field',             city: 'Seattle, USA' },
  // Jul 2
  { matchNumber: 81, home: { kind: 'fixed', pos: 1, group: 'D' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-07-02T00:00:00Z', venue: "Levi's Stadium",          city: 'Santa Clara, USA' },
  { matchNumber: 84, home: { kind: 'fixed', pos: 1, group: 'H' }, away: { kind: 'fixed', pos: 2, group: 'J' },        kickoff_utc: '2026-07-02T19:00:00Z', venue: 'SoFi Stadium',            city: 'Inglewood, USA' },
  { matchNumber: 83, home: { kind: 'fixed', pos: 2, group: 'K' }, away: { kind: 'fixed', pos: 2, group: 'L' },        kickoff_utc: '2026-07-02T23:00:00Z', venue: 'BMO Field',               city: 'Toronto, Canada' },
  // Jul 3
  { matchNumber: 85, home: { kind: 'fixed', pos: 1, group: 'B' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-07-03T03:00:00Z', venue: 'BC Place',                city: 'Vancouver, Canada' },
  { matchNumber: 87, home: { kind: 'fixed', pos: 2, group: 'D' }, away: { kind: 'fixed', pos: 2, group: 'G' },        kickoff_utc: '2026-07-03T18:00:00Z', venue: 'AT&T Stadium',            city: 'Arlington, USA' },
  { matchNumber: 86, home: { kind: 'fixed', pos: 1, group: 'J' }, away: { kind: 'fixed', pos: 2, group: 'H' },        kickoff_utc: '2026-07-03T22:00:00Z', venue: 'Hard Rock Stadium',       city: 'Miami Gardens, USA' },
  // Jul 4
  { matchNumber: 88, home: { kind: 'fixed', pos: 1, group: 'K' }, away: { kind: 'best3rd' },                          kickoff_utc: '2026-07-04T01:30:00Z', venue: 'Arrowhead Stadium',       city: 'Kansas City, USA' },
];

export const R32_BY_MATCH_NUMBER = new Map<number, R32Entry>(R32.map(e => [e.matchNumber, e]));

export function slotLabel(slot: SlotDef): string {
  if (slot.kind === 'best3rd') return 'Best 3rd';
  const ord = slot.pos === 1 ? '1st' : '2nd';
  return `${ord} Grp ${slot.group}`;
}
