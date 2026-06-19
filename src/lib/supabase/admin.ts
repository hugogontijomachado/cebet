import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client — server only. Bypasses RLS. Never import in a client component. */
export function createAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
