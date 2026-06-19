"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { GameStatus, Uuid } from "@/lib/types";

export function WinnerCelebration({
  gameId,
  initialStatus,
  winners,
}: {
  gameId: Uuid;
  initialStatus: GameStatus;
  winners: string[];
}) {
  const [show, setShow] = useState(false);
  const [resolvedWinners, setResolvedWinners] = useState<string[]>(winners);
  const fired = useRef(false);

  useEffect(() => {
    if (initialStatus === "resolved") setShow(true);
  }, [initialStatus]);

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        async (payload) => {
          const next = payload.new as {
            status: GameStatus;
            had_exact_winner: boolean;
            result_a: number;
            result_b: number;
          };
          if (next.status === "resolved" && !fired.current) {
            fired.current = true;
            if (next.had_exact_winner) {
              const { data } = await sb
                .from("bets")
                .select("pred_a, pred_b, participants(name)")
                .eq("game_id", gameId);
              type Row = { pred_a: number; pred_b: number; participants: { name: string } | null };
              setResolvedWinners(
                ((data as unknown as Row[]) ?? [])
                  .filter((b) => b.pred_a === next.result_a && b.pred_b === next.result_b)
                  .map((b) => b.participants?.name ?? "")
                  .filter(Boolean),
              );
            } else {
              setResolvedWinners([]);
            }
            setShow(true);
            burst();
          }
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  if (!show) return null;

  return (
    <div className="rounded-xxl bg-night px-6 py-5 text-center ring-1 ring-hairline-violet">
      {resolvedWinners.length > 0 ? (
        <>
          <p className="text-xs uppercase tracking-widest text-violet-mid">Cravou o placar! 🎉</p>
          <p className="mt-1 font-display text-3xl font-bold text-lime">
            {resolvedWinners.join(" · ")}
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-2xl font-bold text-pink">Acumulou! 💰</p>
          <p className="mt-1 text-sm text-violet-mid">
            Ninguém cravou — o bolão segue acumulando.
          </p>
        </>
      )}
    </div>
  );
}

function burst() {
  const end = Date.now() + 1500;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 } });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
