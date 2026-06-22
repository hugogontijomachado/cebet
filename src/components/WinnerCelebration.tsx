"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { playFanfare } from "@/lib/sound";
import { formatBRL } from "@/lib/money";
import type { GameStatus, Uuid } from "@/lib/types";

interface Props {
  gameId: Uuid;
  initialStatus: GameStatus;
  winners: string[];
  resultA: number | null;
  resultB: number | null;
  potAmount: number | null;
  teamAName: string;
  teamBName: string;
}

export function WinnerCelebration({
  gameId,
  initialStatus,
  winners: initialWinners,
  resultA,
  resultB,
  potAmount,
  teamAName,
  teamBName,
}: Props) {
  const [resolved, setResolved] = useState(initialStatus === "resolved");
  const [winners, setWinners] = useState<string[]>(initialWinners);
  const [result, setResult] = useState<{ a: number; b: number } | null>(
    resultA != null && resultB != null ? { a: resultA, b: resultB } : null,
  );
  const [pot, setPot] = useState<number | null>(potAmount);
  const [overlay, setOverlay] = useState(false);
  const fired = useRef(false);

  // Celebrate once per device: if this device hasn't seen this game's party yet, play it.
  useEffect(() => {
    if (initialStatus !== "resolved" || initialWinners.length === 0 || fired.current) return;
    const key = `bolao_party_${gameId}`;
    if (typeof window !== "undefined" && localStorage.getItem(key)) return; // já viu neste aparelho
    fired.current = true;
    if (typeof window !== "undefined") localStorage.setItem(key, "1");
    setOverlay(true);
    celebrate();
  }, [initialStatus, initialWinners, gameId]);

  // Live: celebrate the exact moment the game resolves.
  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        async (payload) => {
          const n = payload.new as {
            status: GameStatus;
            had_exact_winner: boolean;
            result_a: number;
            result_b: number;
            pot_amount: number;
          };
          if (n.status === "resolved" && !fired.current) {
            fired.current = true;
            setResolved(true);
            setResult({ a: n.result_a, b: n.result_b });
            setPot(n.pot_amount);
            let w: string[] = [];
            if (n.had_exact_winner) {
              const { data } = await sb
                .from("bets")
                .select("pred_a, pred_b, participants(name)")
                .eq("game_id", gameId)
                .eq("excluded", false);
              type R = { pred_a: number; pred_b: number; participants: { name: string } | null };
              w = ((data as unknown as R[]) ?? [])
                .filter((b) => b.pred_a === n.result_a && b.pred_b === n.result_b)
                .map((b) => b.participants?.name ?? "")
                .filter(Boolean);
            }
            setWinners(w);
            if (w.length > 0) {
              if (typeof window !== "undefined") localStorage.setItem(`bolao_party_${gameId}`, "1");
              setOverlay(true);
              celebrate();
            }
          }
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  if (!resolved) return null;

  const hasWinner = winners.length > 0;
  const prizeLabel =
    pot != null
      ? `${winners.length > 1 ? "dividem" : "leva"} ${formatBRL(Number(pot))}`
      : null;

  return (
    <>
      {!hasWinner && (
        <div className="rounded-xxl bg-night px-6 py-5 text-center ring-1 ring-hairline-violet">
          <p className="font-display text-2xl font-bold text-pink">Acumulou! 💰</p>
          <p className="mt-1 text-sm text-violet-mid">
            Ninguém cravou — o bolão segue acumulando.
          </p>
        </div>
      )}

      {overlay && hasWinner && (
        <div
          onClick={() => setOverlay(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-night/90 px-6 text-center backdrop-blur"
        >
          <p className="font-display text-xl uppercase tracking-widest text-lime">
            Cravou o placar! 🎉
          </p>
          {result && (
            <p className="font-display text-2xl text-white">
              {teamAName} {result.a} × {result.b} {teamBName}
            </p>
          )}
          <p className="font-display text-5xl font-bold text-lime drop-shadow">
            {winners.join(" · ")}
          </p>
          {prizeLabel && <p className="font-display text-2xl text-white">{prizeLabel} 💰</p>}
          <button
            type="button"
            className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-bold uppercase text-ink-deep"
          >
            Fechar
          </button>
        </div>
      )}
    </>
  );
}

function celebrate() {
  playFanfare();
  const colors = ["#c2ef4e", "#fa7faa", "#ffffff", "#6a5fc1"];
  const end = Date.now() + 2500;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 75, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 75, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 140, spread: 110, origin: { y: 0.4 }, colors });
}
