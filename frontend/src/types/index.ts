export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  collector_archetype?: string;
  xp: number;
  level: number;
  is_public: boolean;
  created_at: string;
  stats: UserStats;
}

export interface UserStats {
  total_sets: number;
  total_minifigs: number;
  total_value: number;
  wishlist_count: number;
  collection_complete_pct: number;
  rare_items: number;
  retired_owned: number;
  mocs_count: number;
}

export type CollectionStatus = 'owned' | 'wishlist' | 'previously_owned';
export type AvailabilityStatus = 'available' | 'retiring_soon' | 'retired' | 'out_of_stock';
export type ItemCondition = 'sealed' | 'opened' | 'incomplete' | 'damaged';

export interface LegoSet {
  id: string;
  set_number: string;
  name: string;
  theme: string;
  subtheme?: string;
  year: number;
  pieces: number;
  minifigs: number;
  msrp: number;
  currency: string;
  image_url?: string;
  availability: AvailabilityStatus;
  is_retired: boolean;
  retiring_soon: boolean;
  estimated_value?: number;
  description?: string;
  brickset_url?: string;
}

export interface Minifigure {
  id: string;
  fig_number: string;
  name: string;
  character_name?: string;
  theme: string;
  year: number;
  image_url?: string;
  is_cmf: boolean;
  cmf_series?: string;
  estimated_value?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'ultra_rare';
}

export interface CollectionItem {
  id: string;
  user_id: string;
  set_id?: string;
  minifig_id?: string;
  set?: LegoSet;
  minifig?: Minifigure;
  status: CollectionStatus;
  quantity: number;
  condition?: ItemCondition;
  notes?: string;
  date_acquired?: string;
  purchase_price?: number;
  is_complete: boolean;
  is_sealed?: boolean;
  added_at: string;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp_reward: number;
  unlocked?: boolean;
  unlocked_at?: string;
  progress?: number;
  target?: number;
}

export interface MOC {
  id: string;
  user_id: string;
  user?: User;
  title: string;
  description?: string;
  theme?: string;
  tags: string[];
  images: string[];
  instructions_url?: string;
  piece_count?: number;
  likes: number;
  liked_by_me?: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
  category: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
