"use client";

import { useEffect, useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { setBetPaid, updateBetScore, deleteBet } from "@/app/actions/admin";
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
        // "*" → catches inserts, edits, paid toggles, and deletes.
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
              <th className="pb-1 text-center">Pago</th>
              {isAdmin && <th className="pb-1 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {bets.map((b) => (
              <BetRow key={b.id} bet={b} isAdmin={isAdmin} />
            ))}
          </tbody>
        </table>
      )}
      {isAdmin && bets.length > 0 && (
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-violet-mid">
          ✅/❌ pagamento · ✏️ editar placar · 🗑️ excluir
        </p>
      )}
    </div>
  );
}

function BetRow({ bet, isAdmin }: { bet: BetView; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState(String(bet.predA));
  const [b, setB] = useState(String(bet.predB));
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await updateBetScore(bet.id, Number(a), Number(b));
      setEditing(false);
    });
  }
  function cancel() {
    setA(String(bet.predA));
    setB(String(bet.predB));
    setEditing(false);
  }
  function remove() {
    if (confirm(`Excluir o palpite de ${bet.name}?`)) start(() => deleteBet(bet.id));
  }

  return (
    <tr className="border-b border-hairline-violet">
      <td className="py-2 pr-2">{bet.name}</td>
      <td className="py-2 text-center font-display text-lg">
        {editing ? (
          <span className="inline-flex items-center gap-1">
            <input
              inputMode="numeric"
              value={a}
              onChange={(e) => setA(e.target.value.replace(/\D/g, ""))}
              className="w-9 rounded-sm bg-paper px-1 py-1 text-center text-base text-ink"
            />
            <span className="text-violet-mid">x</span>
            <input
              inputMode="numeric"
              value={b}
              onChange={(e) => setB(e.target.value.replace(/\D/g, ""))}
              className="w-9 rounded-sm bg-paper px-1 py-1 text-center text-base text-ink"
            />
          </span>
        ) : (
          <>
            {bet.predA} <span className="text-violet-mid">x</span> {bet.predB}
          </>
        )}
      </td>
      <td className="py-2 text-center">
        <PaidCell bet={bet} isAdmin={isAdmin} />
      </td>
      {isAdmin && (
        <td className="whitespace-nowrap py-2 text-right">
          {editing ? (
            <>
              <button
                type="button"
                onClick={save}
                disabled={pending || a === "" || b === ""}
                aria-label="salvar placar"
                className="px-1 text-lime disabled:opacity-50"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={cancel}
                aria-label="cancelar"
                className="px-1 text-violet-mid"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="editar placar"
                className="px-1 transition active:scale-90"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                aria-label="excluir palpite"
                className="px-1 transition active:scale-90 disabled:opacity-50"
              >
                🗑️
              </button>
            </>
          )}
        </td>
      )}
    </tr>
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
