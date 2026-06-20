"use client";

import { useEffect, useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { setBetPaid, updateBetScore, deleteBet } from "@/app/actions/admin";
import { computePoints } from "@/lib/scoring";
import { PointsLegend } from "./PointsLegend";
import type { BetView } from "@/lib/queries";
import type { Uuid } from "@/lib/types";

export function PredictionsTable({
  gameId,
  initial,
  isAdmin = false,
  liveA = null,
  liveB = null,
  resolved = false,
}: {
  gameId: Uuid;
  initial: BetView[];
  isAdmin?: boolean;
  liveA?: number | null;
  liveB?: number | null;
  resolved?: boolean;
}) {
  const [bets, setBets] = useState<BetView[]>(initial);
  const [live, setLive] = useState<{ a: number; b: number } | null>(
    liveA != null && liveB != null ? { a: liveA, b: liveB } : null,
  );

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`bets-table-${gameId}`)
      .on(
        "postgres_changes",
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          const n = payload.new as { live_a: number | null; live_b: number | null };
          setLive(n.live_a != null && n.live_b != null ? { a: n.live_a, b: n.live_b } : null);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  const liveActive = live != null && !resolved;

  // When a live score is set, rank by "points if the game ended now".
  const rows = bets.map((b) => ({
    bet: b,
    pts: liveActive ? computePoints({ a: b.predA, b: b.predB }, live!) : null,
  }));
  if (liveActive) {
    rows.sort((x, y) => (y.pts ?? 0) - (x.pts ?? 0) || x.bet.name.localeCompare(y.bet.name));
  }
  const cravandoCount = liveActive ? rows.filter((r) => r.pts === 5).length : 0;

  return (
    <div
      className={
        liveActive
          ? "w-full max-w-sm rounded-xl bg-night/40 p-3 ring-1 ring-pink/50"
          : "w-full max-w-sm"
      }
    >
      <p className="mb-2 text-center text-xs uppercase tracking-widest text-violet-mid">
        Palpites · {bets.length}
      </p>
      {liveActive && (
        <>
          <p className="text-center text-[10px] uppercase tracking-widest text-pink">
            Classificação parcial · placar {live!.a} × {live!.b}
          </p>
          <p className="mb-2 text-center font-display text-base font-bold text-lime">
            {cravandoCount > 0
              ? `🎯 ${cravandoCount} ${cravandoCount === 1 ? "pessoa cravando" : "pessoas cravando"} o placar`
              : "Ninguém cravando o placar ainda"}
          </p>
        </>
      )}
      {bets.length === 0 ? (
        <p className="text-center text-sm text-violet-mid">Ninguém palpitou ainda.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-violet-mid">
              <th className="pb-1">Nome</th>
              <th className="pb-1 text-center">Palpite</th>
              {liveActive && <th className="pb-1 text-center">Pontos</th>}
              <th className="pb-1 text-center">Pago</th>
              {isAdmin && <th className="pb-1 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ bet, pts }) => (
              <BetRow
                key={bet.id}
                bet={bet}
                isAdmin={isAdmin}
                showLive={liveActive}
                livePts={pts}
              />
            ))}
          </tbody>
        </table>
      )}
      {liveActive && (
        <div className="mt-3 flex justify-center">
          <PointsLegend />
        </div>
      )}
      {isAdmin && bets.length > 0 && (
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-violet-mid">
          ✅/❌ pagamento · ✏️ editar placar · 🗑️ excluir
        </p>
      )}
    </div>
  );
}

function LivePts({ pts }: { pts: number | null }) {
  if (pts == null) return null;
  if (pts === 5) return <span title="cravando">🎯</span>;
  const color = pts >= 2 ? "text-lime" : pts === 1 ? "text-white" : "text-violet-mid";
  return <span className={`font-display ${color}`}>{pts}</span>;
}

function BetRow({
  bet,
  isAdmin,
  showLive,
  livePts,
}: {
  bet: BetView;
  isAdmin: boolean;
  showLive: boolean;
  livePts: number | null;
}) {
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

  const exact = livePts === 5;

  return (
    <tr className={`border-b border-hairline-violet ${exact ? "bg-lime/10" : ""}`}>
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
      {showLive && (
        <td className="py-2 text-center">
          <LivePts pts={livePts} />
        </td>
      )}
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
