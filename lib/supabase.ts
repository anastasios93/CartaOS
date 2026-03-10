import { createClient } from "@supabase/supabase-js";

// ─── Browser client (uses public anon key, safe for client-side) ────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Admin / server client (uses service-role key, server-side only) ────────

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// ─── Storage bucket name ────────────────────────────────────────────────────

export const STORAGE_BUCKET = "documents";
