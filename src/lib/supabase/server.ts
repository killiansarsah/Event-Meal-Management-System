import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * Server-side Supabase client (cookie-bound, anon key).
 *
 * Use this inside Server Components, Route Handlers, and Server Actions.
 * It reads/writes the auth session from cookies so every query runs as the
 * authenticated user and Row Level Security is enforced. This is the default
 * client for tenant-scoped reads and writes.
 *
 * Note: when called from a Server Component, cookie writes are not allowed;
 * the try/catch swallows that case. Session refresh is handled in middleware.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if middleware refreshes the session.
          }
        },
      },
    },
  )
}

/**
 * Privileged server-only Supabase client (service role key).
 *
 * This client BYPASSES Row Level Security and carries no user session, so it
 * must NEVER be imported into client code. Use it only for trusted,
 * server-side operations that legitimately need elevated access, such as
 * Super Admin platform actions, staff invite acceptance, and system tasks.
 *
 * Always scope tenant data manually when using this client, since RLS will
 * not protect you here.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
