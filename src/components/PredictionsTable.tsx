"use client";

import { useEffect, useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { setBetPaid } from "@/app/actions/admin";
import type { BetView } from "@/lib/queries";
import type { Uuid } from "@/lib/types";

export function PredictionsTable({
  gameId,
  initial,
  isAdmin = false,
}: {
  gameId: Uuid;
  initial: BetView[];
  isAdmin?: boolean;
}) {
  const [bets, setBets] = useState<BetView[]>(initial);

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`bets-table-${gameId}`)
      .on(
        "postgres_changes",
        // "*" → catches inserts, edits, and paid toggles.
        { event: "*", schema: "public", table: "bets", filter: `game_id=eq.${gameId}` },
        async () => {
          const { data } = await sb
            .from("bets")
            .select("id, pred_a, pred_b, paid, participants(name)")
            .eq("game_id", gameId)
            .order("created_at", { ascending: true });
          type Row = {
            id: Uuid;
            pred_a: number;
            pred_b: number;
            paid: boolean;
            participants: { name: string } | null;
          };
          setBets(
            ((data as unknown as Row[]) ?? [])
              .map((r) => ({
                id: r.id,
                name: r.participants?.name ?? "",
                predA: r.pred_a,
                predB: r.pred_b,
                paid: r.paid,
              }))
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
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-violet-mid">
              <th className="pb-1">Nome</th>
              <th className="pb-1 text-center">Palpite</th>
              <th className="pb-1 text-right">Pago</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((b) => (
              <tr key={b.id} className="border-b border-hairline-violet">
                <td className="py-2 pr-2">{b.name}</td>
                <td className="py-2 text-center font-display text-lg">
                  {b.predA} <span className="text-violet-mid">x</span> {b.predB}
                </td>
                <td className="py-2 text-right">
                  <PaidCell bet={b} isAdmin={isAdmin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {isAdmin && bets.length > 0 && (
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-violet-mid">
          Toque no ✅/❌ para marcar o pagamento
        </p>
      )}
    </div>
  );
}

function PaidCell({ bet, isAdmin }: { bet: BetView; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  const icon = bet.paid ? "✅" : "❌";

  if (!isAdmin) {
    return (
      <span aria-label={bet.paid ? "pago" : "não pago"} className="text-lg">
        {icon}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setBetPaid(bet.id, !bet.paid))}
      aria-label={bet.paid ? "marcar como não pago" : "marcar como pago"}
      className="text-lg transition active:scale-90 disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
