"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdmin } from "@/lib/supabase/admin";
import { requireAdmin, verifyPinAndSetCookie } from "@/lib/admin-auth";
import { computePoints } from "@/lib/scoring";
import { carriedBetCount, computePot } from "@/lib/pot";
import { getResolvedSummaries, getLeaderboard } from "@/lib/queries";
import type { Uuid } from "@/lib/types";

export async function loginAdmin(formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  const ok = await verifyPinAndSetCookie(pin);
  if (!ok) redirect("/admin?erro=1");
  redirect("/admin");
}

export async function createSeason(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const betValue = Number(formData.get("betValue") ?? 5);
  if (!name) return;
  const sb = createAdmin();
  await sb.from("seasons").insert({ name, bet_value: betValue, status: "active" });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createGame(formData: FormData) {
  await requireAdmin();
  const sb = createAdmin();
  const seasonId = String(formData.get("seasonId"));
  const { data: last } = await sb
    .from("games")
    .select("game_order")
    .eq("season_id", seasonId)
    .order("game_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.game_order ?? 0) + 1;
  await sb.from("games").insert({
    season_id: seasonId,
    game_order: nextOrder,
    team_a_name: String(formData.get("teamAName") ?? "").trim(),
    team_a_flag: String(formData.get("teamAFlag") ?? ""),
    team_b_name: String(formData.get("teamBName") ?? "").trim(),
    team_b_flag: String(formData.get("teamBFlag") ?? ""),
    status: "open",
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setBetPaid(betId: Uuid, paid: boolean) {
  await requireAdmin();
  const sb = createAdmin();
  await sb.from("bets").update({ paid }).eq("id", betId);
  revalidatePath("/");
}

export async function updateBetScore(betId: Uuid, predA: number, predB: number) {
  await requireAdmin();
  if (!Number.isInteger(predA) || !Number.isInteger(predB) || predA < 0 || predB < 0) return;
  const sb = createAdmin();
  await sb.from("bets").update({ pred_a: predA, pred_b: predB }).eq("id", betId);
  revalidatePath("/");
}

export async function deleteBet(betId: Uuid) {
  await requireAdmin();
  const sb = createAdmin();
  await sb.from("bets").delete().eq("id", betId);
  revalidatePath("/");
}

export async function closeBetting(gameId: Uuid) {
  await requireAdmin();
  const sb = createAdmin();
  await sb.from("games").update({ status: "closed" }).eq("id", gameId).eq("status", "open");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function resolveGame(gameId: Uuid, resultA: number, resultB: number) {
  await requireAdmin();
  if (!Number.isInteger(resultA) || !Number.isInteger(resultB) || resultA < 0 || resultB < 0)
    return;
  const sb = createAdmin();

  const { data: game } = await sb.from("games").select("*").eq("id", gameId).maybeSingle();
  if (!game || game.status !== "closed") return;

  const { data: bets } = await sb.from("bets").select("id, pred_a, pred_b").eq("game_id", gameId);
  const rows = (bets as { id: string; pred_a: number; pred_b: number }[]) ?? [];

  let hadExact = false;
  for (const b of rows) {
    const pts = computePoints({ a: b.pred_a, b: b.pred_b }, { a: resultA, b: resultB });
    if (pts === 5) hadExact = true;
    await sb.from("bets").update({ points: pts }).eq("id", b.id);
  }

  const priorSummaries = await getResolvedSummaries(game.season_id);
  const { data: season } = await sb
    .from("seasons")
    .select("bet_value")
    .eq("id", game.season_id)
    .single();
  const pot = computePot(Number(season!.bet_value), carriedBetCount(priorSummaries), rows.length);

  await sb
    .from("games")
    .update({
      status: "resolved",
      result_a: resultA,
      result_b: resultB,
      had_exact_winner: hadExact,
      pot_amount: pot,
    })
    .eq("id", gameId);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/temporada");
}

export async function closeSeason(seasonId: Uuid) {
  await requireAdmin();
  const sb = createAdmin();
  const board = await getLeaderboard(seasonId);
  const champion = board[0]?.participant.id ?? null;
  await sb
    .from("seasons")
    .update({ status: "closed", champion_participant_id: champion })
    .eq("id", seasonId);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/temporada");
}
