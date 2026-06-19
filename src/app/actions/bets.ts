"use server";

import { revalidatePath } from "next/cache";
import { createAdmin } from "@/lib/supabase/admin";
import type { Uuid } from "@/lib/types";

interface PlaceBetInput {
  seasonId: Uuid;
  gameId: Uuid;
  participantId?: Uuid;
  newName?: string;
  predA: number;
  predB: number;
}

type Result = { ok: true } | { ok: false; error: string };

export async function placeBet(input: PlaceBetInput): Promise<Result> {
  const { seasonId, gameId, participantId, newName, predA, predB } = input;

  if (!Number.isInteger(predA) || !Number.isInteger(predB) || predA < 0 || predB < 0) {
    return { ok: false, error: "Placar inválido." };
  }

  const sb = createAdmin();

  const { data: game } = await sb.from("games").select("status").eq("id", gameId).maybeSingle();
  if (!game) return { ok: false, error: "Jogo não encontrado." };
  if (game.status !== "open")
    return { ok: false, error: "Os palpites deste jogo já foram encerrados." };

  let pid = participantId ?? null;
  if (!pid) {
    const name = (newName ?? "").trim();
    if (!name) return { ok: false, error: "Informe seu nome." };
    const { data: existing } = await sb
      .from("participants")
      .select("id")
      .eq("season_id", seasonId)
      .ilike("name", name)
      .maybeSingle();
    if (existing) {
      pid = existing.id as Uuid;
    } else {
      const { data: created, error } = await sb
        .from("participants")
        .insert({ season_id: seasonId, name })
        .select("id")
        .single();
      if (error || !created) return { ok: false, error: "Não foi possível cadastrar o nome." };
      pid = created.id as Uuid;
    }
  }

  const { error } = await sb
    .from("bets")
    .upsert(
      { game_id: gameId, participant_id: pid, pred_a: predA, pred_b: predB, points: null },
      { onConflict: "game_id,participant_id" },
    );
  if (error) return { ok: false, error: "Não foi possível salvar o palpite." };

  revalidatePath("/");
  return { ok: true };
}
