export interface NationalTeam {
  name: string;
  flag: string;
}

// Format: "Name Flag" — stored as a single string for simplicity
export const NATIONAL_TEAMS: NationalTeam[] = [
  // South America
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Uruguay', flag: '🇺🇾' },
  { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Chile', flag: '🇨🇱' },
  { name: 'Ecuador', flag: '🇪🇨' },
  { name: 'Peru', flag: '🇵🇪' },
  { name: 'Paraguay', flag: '🇵🇾' },
  { name: 'Venezuela', flag: '🇻🇪' },
  { name: 'Bolivia', flag: '🇧🇴' },
  // CONCACAF
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'USA', flag: '🇺🇸' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Costa Rica', flag: '🇨🇷' },
  { name: 'Honduras', flag: '🇭🇳' },
  { name: 'Panama', flag: '🇵🇦' },
  { name: 'Jamaica', flag: '🇯🇲' },
  { name: 'El Salvador', flag: '🇸🇻' },
  { name: 'Guatemala', flag: '🇬🇹' },
  // Europe
  { name: 'France', flag: '🇫🇷' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'England', flag: '🇬🇧' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'Italy', flag: '🇮🇹' },
  { name: 'Belgium', flag: '🇧🇪' },
  { name: 'Croatia', flag: '🇭🇷' },
  { name: 'Denmark', flag: '🇩🇰' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Poland', flag: '🇵🇱' },
  { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Norway', flag: '🇳🇴' },
  { name: 'Austria', flag: '🇦🇹' },
  { name: 'Hungary', flag: '🇭🇺' },
  { name: 'Czech Republic', flag: '🇨🇿' },
  { name: 'Slovakia', flag: '🇸🇰' },
  { name: 'Serbia', flag: '🇷🇸' },
  { name: 'Romania', flag: '🇷🇴' },
  { name: 'Turkey', flag: '🇹🇷' },
  { name: 'Ukraine', flag: '🇺🇦' },
  { name: 'Greece', flag: '🇬🇷' },
  { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { name: 'Ireland', flag: '🇮🇪' },
  { name: 'Russia', flag: '🇷🇺' },
  { name: 'Slovenia', flag: '🇸🇮' },
  { name: 'Albania', flag: '🇦🇱' },
  { name: 'Bosnia-Herzegovina', flag: '🇧🇦' },
  { name: 'North Macedonia', flag: '🇲🇰' },
  { name: 'Finland', flag: '🇫🇮' },
  { name: 'Iceland', flag: '🇮🇸' },
  // Africa
  { name: 'Morocco', flag: '🇲🇦' },
  { name: 'Senegal', flag: '🇸🇳' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Cameroon', flag: '🇨🇲' },
  { name: 'Egypt', flag: '🇪🇬' },
  { name: 'Ivory Coast', flag: '🇨🇮' },
  { name: 'Algeria', flag: '🇩🇿' },
  { name: 'South Africa', flag: '🇿🇦' },
  { name: 'Tunisia', flag: '🇹🇳' },
  { name: 'Mali', flag: '🇲🇱' },
  { name: 'DR Congo', flag: '🇨🇩' },
  { name: 'Guinea', flag: '🇬🇳' },
  { name: 'Kenya', flag: '🇰🇪' },
  // Asia / Oceania
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Iran', flag: '🇮🇷' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Qatar', flag: '🇶🇦' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'Iraq', flag: '🇮🇶' },
  { name: 'UAE', flag: '🇦🇪' },
  { name: 'New Zealand', flag: '🇳🇿' },
];

export function formatTeam(t: NationalTeam): string {
  return `${t.name} ${t.flag}`;
}

export function findTeam(value: string): NationalTeam | undefined {
  const lower = value.toLowerCase();
  return NATIONAL_TEAMS.find(t =>
    t.name.toLowerCase() === lower || formatTeam(t).toLowerCase() === lower
  );
}
