"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Uuid } from "@/lib/types";

export function LiveBettors({
  gameId,
  initialNames,
}: {
  gameId: Uuid;
  initialNames: string[];
}) {
  const [count, setCount] = useState(initialNames.length);
  const [names, setNames] = useState<string[]>(initialNames);

  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`bets-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets", filter: `game_id=eq.${gameId}` },
        async () => {
          const { data } = await sb
            .from("bets")
            .select("participants(name)")
            .eq("game_id", gameId);
          type Row = { participants: { name: string } | null };
          const next = ((data as unknown as Row[]) ?? [])
            .map((r) => r.participants?.name ?? "")
            .filter(Boolean);
          setNames(next);
          setCount(next.length);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-widest text-violet-mid">{count} palpite(s)</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {names.map((n, i) => (
          <span key={`${n}-${i}`} className="rounded-xs bg-night px-2 py-1 text-sm">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
