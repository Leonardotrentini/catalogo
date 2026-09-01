import { createSupabaseBrowserClient } from "./browser";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabase(): SupabaseClient {
  return createSupabaseBrowserClient();
}
