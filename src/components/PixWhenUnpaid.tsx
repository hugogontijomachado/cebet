"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { PixInfo } from "./PixInfo";
import type { Uuid } from "@/lib/types";

/** Bottom PIX panel that disappears once everyone has been marked as paid. */
export function PixWhenUnpaid({
  gameId,
  betValue,
  name,
  pixKey,
  initialAllPaid,
}: {
  gameId: Uuid | null;
  betValue: number;
  name: string;
  pixKey: string;
  initialAllPaid: boolean;
}) {
  const [allPaid, setAllPaid] = useState(initialAllPaid);

  useEffect(() => {
    if (!gameId) return;
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`pix-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets", filter: `game_id=eq.${gameId}` },
        async () => {
          const { data } = await sb.from("bets").select("paid, excluded").eq("game_id", gameId);
          const rows = (data ?? []) as { paid: boolean; excluded: boolean }[];
          setAllPaid(rows.some((r) => !r.excluded) && rows.every((r) => r.excluded || r.paid));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId]);

  if (allPaid) return null;
  return <PixInfo betValue={betValue} name={name} pixKey={pixKey} />;
}
