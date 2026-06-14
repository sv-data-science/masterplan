export interface User {
  id: string;
  username: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
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
  status: MatchStatus;
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
}
