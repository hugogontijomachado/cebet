export type Uuid = string;
export type GameStatus = "open" | "closed" | "resolved";

export interface Season {
  id: Uuid;
  name: string;
  bet_value: number;
  status: "active" | "closed";
  champion_participant_id: Uuid | null;
  created_at: string;
}

export interface Participant {
  id: Uuid;
  season_id: Uuid;
  name: string;
  created_at: string;
}

export interface Game {
  id: Uuid;
  season_id: Uuid;
  game_order: number;
  team_a_name: string;
  team_a_flag: string;
  team_b_name: string;
  team_b_flag: string;
  status: GameStatus;
  result_a: number | null;
  result_b: number | null;
  had_exact_winner: boolean;
  pot_amount: number | null;
  created_at: string;
}

export interface Bet {
  id: Uuid;
  game_id: Uuid;
  participant_id: Uuid;
  pred_a: number;
  pred_b: number;
  points: number | null;
  paid: boolean;
  created_at: string;
}
