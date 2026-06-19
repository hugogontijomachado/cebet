import { createServerRead } from "./supabase/server-read";
import { carriedBetCount, computePot, type GameBetSummary } from "./pot";
import { isExact } from "./scoring";
import type { Season, Game, Participant, Bet, Uuid } from "./types";

export async function getActiveSeason(): Promise<Season | null> {
  const sb = createServerRead();
  const { data } = await sb.from("seasons").select("*").eq("status", "active").maybeSingle();
  return (data as Season) ?? null;
}

export async function getCurrentGame(seasonId: Uuid): Promise<Game | null> {
  const sb = createServerRead();
  const { data } = await sb
    .from("games")
    .select("*")
    .eq("season_id", seasonId)
    .order("game_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Game) ?? null;
}

export async function getParticipants(seasonId: Uuid): Promise<Participant[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("participants")
    .select("*")
    .eq("season_id", seasonId)
    .order("name");
  return (data as Participant[]) ?? [];
}

export async function getBettorNames(gameId: Uuid): Promise<string[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("bets")
    .select("participant_id, participants(name)")
    .eq("game_id", gameId);
  type Row = { participants: { name: string } | null };
  return ((data as unknown as Row[]) ?? []).map((r) => r.participants?.name ?? "").filter(Boolean);
}

export async function getBetsForGame(gameId: Uuid): Promise<Bet[]> {
  const sb = createServerRead();
  const { data } = await sb.from("bets").select("*").eq("game_id", gameId);
  return (data as Bet[]) ?? [];
}

export async function getResolvedSummaries(seasonId: Uuid): Promise<GameBetSummary[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("games")
    .select("had_exact_winner, bets(count)")
    .eq("season_id", seasonId)
    .eq("status", "resolved")
    .order("game_order", { ascending: true });
  type Row = { had_exact_winner: boolean; bets: { count: number }[] };
  return ((data as Row[]) ?? []).map((g) => ({
    betCount: g.bets?.[0]?.count ?? 0,
    hadExactWinner: g.had_exact_winner,
  }));
}

export async function getCurrentPot(season: Season, currentGame: Game | null): Promise<number> {
  const summaries = await getResolvedSummaries(season.id);
  let currentBetCount = 0;
  if (currentGame && currentGame.status !== "resolved") {
    const sb = createServerRead();
    const { count } = await sb
      .from("bets")
      .select("*", { count: "exact", head: true })
      .eq("game_id", currentGame.id);
    currentBetCount = count ?? 0;
  }
  return computePot(Number(season.bet_value), carriedBetCount(summaries), currentBetCount);
}

export interface LeaderRow {
  participant: Participant;
  points: number;
  exactWins: number;
}

export async function getLeaderboard(seasonId: Uuid): Promise<LeaderRow[]> {
  const sb = createServerRead();
  const participants = await getParticipants(seasonId);
  const { data } = await sb
    .from("bets")
    .select(
      "participant_id, pred_a, pred_b, points, games!inner(season_id, status, result_a, result_b)",
    )
    .eq("games.season_id", seasonId)
    .eq("games.status", "resolved");
  type Row = {
    participant_id: Uuid;
    pred_a: number;
    pred_b: number;
    points: number | null;
    games: { result_a: number | null; result_b: number | null };
  };
  const rows = (data as unknown as Row[]) ?? [];
  const byId = new Map<Uuid, LeaderRow>();
  for (const p of participants) byId.set(p.id, { participant: p, points: 0, exactWins: 0 });
  for (const r of rows) {
    const entry = byId.get(r.participant_id);
    if (!entry) continue;
    entry.points += r.points ?? 0;
    if (
      r.games.result_a != null &&
      r.games.result_b != null &&
      isExact({ a: r.pred_a, b: r.pred_b }, { a: r.games.result_a, b: r.games.result_b })
    ) {
      entry.exactWins += 1;
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.points - a.points || a.participant.name.localeCompare(b.participant.name),
  );
}

export async function getResolvedGamesWithWinners(
  seasonId: Uuid,
): Promise<{ game: Game; winners: string[] }[]> {
  const sb = createServerRead();
  const { data } = await sb
    .from("games")
    .select("*")
    .eq("season_id", seasonId)
    .eq("status", "resolved")
    .order("game_order", { ascending: false });
  const games = (data as Game[]) ?? [];
  const out: { game: Game; winners: string[] }[] = [];
  for (const g of games) {
    let winners: string[] = [];
    if (g.had_exact_winner && g.result_a != null && g.result_b != null) {
      const { data: bd } = await sb
        .from("bets")
        .select("pred_a, pred_b, participants(name)")
        .eq("game_id", g.id);
      type BRow = { pred_a: number; pred_b: number; participants: { name: string } | null };
      winners = ((bd as unknown as BRow[]) ?? [])
        .filter((b) => b.pred_a === g.result_a && b.pred_b === g.result_b)
        .map((b) => b.participants?.name ?? "")
        .filter(Boolean);
    }
    out.push({ game: g, winners });
  }
  return out;
}
