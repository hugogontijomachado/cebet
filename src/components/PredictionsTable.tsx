"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { BetView } from "@/lib/queries";
import type { Uuid } from "@/lib/types";

export function PredictionsTable({
  gameId,
  initial,
}: {
  gameId: Uuid;
  initial: BetView[];
}) {
  const [bets, setBets] = useState<BetView[]>(initial);

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`bets-table-${gameId}`)
      .on(
        "postgres_changes",
        // "*" → catches inserts AND edits (upsert updates).
        { event: "*", schema: "public", table: "bets", filter: `game_id=eq.${gameId}` },
        async () => {
          const { data } = await sb
            .from("bets")
            .select("pred_a, pred_b, participants(name)")
            .eq("game_id", gameId)
            .order("created_at", { ascending: true });
          type Row = { pred_a: number; pred_b: number; participants: { name: string } | null };
          setBets(
            ((data as unknown as Row[]) ?? [])
              .map((r) => ({ name: r.participants?.name ?? "", predA: r.pred_a, predB: r.pred_b }))
              .filter((b) => b.name),
          );
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  return (
    <div className="w-full max-w-sm">
      <p className="mb-2 text-center text-xs uppercase tracking-widest text-violet-mid">
        Palpites · {bets.length}
      </p>
      {bets.length === 0 ? (
        <p className="text-center text-sm text-violet-mid">Ninguém palpitou ainda.</p>
      ) : (
        <table className="w-full border-collapse">
          <tbody>
            {bets.map((b, i) => (
              <tr key={`${b.name}-${i}`} className="border-b border-hairline-violet">
                <td className="py-2 pr-2">{b.name}</td>
                <td className="py-2 text-right font-display text-lg">
                  {b.predA} <span className="text-violet-mid">x</span> {b.predB}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
