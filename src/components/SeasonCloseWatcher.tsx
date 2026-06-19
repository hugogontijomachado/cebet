"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Uuid } from "@/lib/types";

/** When the active season is closed by the admin, refresh so everyone sees the
 * champion screen live. */
export function SeasonCloseWatcher({ seasonId }: { seasonId: Uuid }) {
  const router = useRouter();
  useEffect(() => {
    const sb = createBrowserSupabase();
    const channel = sb
      .channel(`season-${seasonId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "seasons", filter: `id=eq.${seasonId}` },
        (payload) => {
          if ((payload.new as { status: string }).status === "closed") router.refresh();
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [seasonId, router]);
  return null;
}
