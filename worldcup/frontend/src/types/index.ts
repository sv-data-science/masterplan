export type KitPattern = 'solid' | 'stripes' | 'hoops' | 'checkerboard' | 'diagonal';
export type CollarStyle = 'vneck' | 'round' | 'polo';
export type SleeveLength = 'short' | 'long';

export interface KitJersey {
  color1: string;
  color2: string;
  pattern: KitPattern;
  collarStyle: CollarStyle;
  collarColor: string;
  sleeveAccentColor: string;
  shoulderStripes: boolean;
  sleeveLength?: SleeveLength;
}

export interface KitPiece {
  color1: string;
  color2: string;
  pattern: KitPattern;
}

export interface KitConfig {
  jersey: KitJersey;
  shorts: KitPiece;
  socks: KitPiece;
}

export const DEFAULT_KIT: KitConfig = {
  jersey: {
    color1: '#1a56db',
    color2: '#ffffff',
    pattern: 'solid',
    collarStyle: 'vneck',
    collarColor: '#ffffff',
    sleeveAccentColor: '#e3a008',
    shoulderStripes: false,
    sleeveLength: 'short',
  },
  shorts: { color1: '#1e3a5f', color2: '#ffffff', pattern: 'solid' },
  socks: { color1: '#1e3a5f', color2: '#1a56db', pattern: 'solid' },
};

export interface User {
  id: string;
  username: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
  kit?: KitConfig | null;
  fav_wc_year?: number | null;
  fav_national_team?: string | null;
  fav_player?: string | null;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  group_letter: string;
  flag: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'completed';

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  pred_home: number;
  pred_away: number;
  points_earned: number | null;
}

export interface Match {
  id: string;
  match_number: number;
  group_letter: string;
  matchday: number;
  home_team: Team;
  away_team: Team;
  kickoff_utc: string | null;
  venue: string | null;
  city: string | null;
  home_score: number | null;
  away_score: number | null;
  home_score_pens: number | null;
  away_score_pens: number | null;
  status: MatchStatus;
  stage?: string | null;
  my_prediction: Prediction | null;
  goals: GoalEvent[];
}

export interface GoalEvent {
  id: string;
  match_id: string;
  team_id: string;
  player_name: string;
  minute: number | null;
  is_own_goal: boolean;
  is_penalty: boolean;
}

export interface TopScorerEntry {
  player_name: string;
  team_id: string;
  team_code: string;
  team_flag: string;
  team_name: string;
  group_letter: string;
  goals: number;
}

export interface MatchPredictionEntry {
  user_id: string;
  username: string;
  display_name: string;
  pred_home: number;
  pred_away: number;
  points_earned: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  total_points: number;
  exact_scores: number;
  correct_outcomes: number;
  predictions_made: number;
  kit?: KitConfig | null;
}

export interface LeaguePrediction {
  id: string;
  user_id: string;
  match_id: string;
  pred_home: number;
  pred_away: number;
  points_earned: number | null;
}

export interface LeagueMatch {
  id: string;
  competition: string;
  matchweek: number;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  kickoff_utc: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  my_prediction: LeaguePrediction | null;
}

export interface LeagueLeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  total_points: number;
  exact_scores: number;
  correct_outcomes: number;
  predictions_made: number;
}
