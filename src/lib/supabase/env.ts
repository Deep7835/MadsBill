export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True once real credentials are in place. The placeholder values shipped in
 * .env.example are treated as "not configured" so a fresh clone shows setup
 * instructions instead of a network error.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") &&
  !SUPABASE_URL.includes("your-project-ref") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.startsWith("your-");
