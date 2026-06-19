import { createClient } from "@supabase/supabase-js";

/** Anon client for Server Components: public reads only (RLS allows select). */
export function createServerRead() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
