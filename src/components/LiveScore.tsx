"use client";

import { useEffect, useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { setLiveScore } from "@/app/actions/admin";
import type { Uuid } from "@/lib/types";

export function LiveScore({
  gameId,
  initialA,
  initialB,
  isAdmin,
}: {
  gameId: Uuid;
  initialA: number | null;
  initialB: number | null;
  isAdmin: boolean;
}) {
  const [a, setA] = useState<number | null>(initialA);
  const [b, setB] = useState<number | null>(initialB);
  const [ea, setEa] = useState(initialA?.toString() ?? "");
  const [eb, setEb] = useState(initialB?.toString() ?? "");
  const [pending, start] = useTransition();

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`live-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          const n = payload.new as { live_a: number | null; live_b: number | null };
          setA(n.live_a);
          setB(n.live_b);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  const hasLive = a !== null && b !== null;

  return (
    <div className="flex flex-col items-center gap-2">
      {hasLive ? (
        <div className="inline-flex items-center gap-2 rounded-full bg-night px-4 py-1 ring-1 ring-hairline-violet">
          <span className="h-2 w-2 animate-pulse rounded-full bg-pink" />
          <span className="text-xs uppercase tracking-widest text-pink">Ao vivo</span>
          <span className="font-display text-xl">
            {a} <span className="text-violet-mid">×</span> {b}
          </span>
        </div>
      ) : (
        <span className="text-xs uppercase tracking-widest text-violet-mid">
          Sem placar parcial
        </span>
      )}

      {isAdmin && (
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            value={ea}
            onChange={(e) => setEa(e.target.value.replace(/\D/g, ""))}
            className="w-12 rounded-sm bg-paper px-2 py-1 text-center text-ink"
            placeholder="A"
          />
          <span className="text-violet-mid">x</span>
          <input
            inputMode="numeric"
            value={eb}
            onChange={(e) => setEb(e.target.value.replace(/\D/g, ""))}
            className="w-12 rounded-sm bg-paper px-2 py-1 text-center text-ink"
            placeholder="B"
          />
          <button
            type="button"
            disabled={pending || ea === "" || eb === ""}
            onClick={() => start(() => setLiveScore(gameId, Number(ea), Number(eb)))}
            className="rounded-md bg-white px-3 py-1 text-xs font-bold uppercase text-ink-deep disabled:opacity-50"
          >
            Atualizar
          </button>
          {hasLive && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEa("");
                setEb("");
                start(() => setLiveScore(gameId, null, null));
              }}
              className="rounded-md bg-night px-3 py-1 text-xs uppercase text-violet-mid ring-1 ring-hairline-violet"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
