import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Server-side Supabase client.
 *
 * IMPORTANT: This uses the SERVICE ROLE key, not the anon key.
 * All database access in this app happens inside Next.js API routes
 * (server-side only), and authorization is enforced by our own
 * JWT session + middleware.ts — not by Supabase Auth or RLS.
 *
 * Never import this file into a "use client" component. It must only
 * ever run on the server, where the service role key is available.
 */

declare global {
  // eslint-disable-next-line no-var
  var __supabaseAdmin: SupabaseClient<Database> | undefined;
}

function createServerClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  });
}

// Reuse a single client across hot-reloads / invocations in dev,
// avoid creating a brand-new client (and connection) on every import.
export const supabaseAdmin: SupabaseClient<Database> =
  globalThis.__supabaseAdmin ?? createServerClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__supabaseAdmin = supabaseAdmin;
}
