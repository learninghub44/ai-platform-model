import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — safe to ignore when
            // middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

// Service-role client for privileged server-only operations
// (webhooks, admin actions). NEVER expose this to the client.
//
// This deployment runs on Cloudflare Workers (via OpenNext), a single
// bundled ESM environment. A require() call inside a function body isn't
// guaranteed to resolve there even with the nodejs_compat flag on — it
// depends entirely on how the bundler happens to transform that specific
// call, which is fragile enough to break silently between builds. A
// static top-level import is bundled deterministically instead.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
