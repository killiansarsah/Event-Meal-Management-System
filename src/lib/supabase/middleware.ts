import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Refreshes the Supabase auth session on every request.
 *
 * The session token is read from the incoming request cookies and, if it was
 * refreshed, written back onto both the request and the outgoing response so
 * that Server Components and the browser stay in sync.
 *
 * IMPORTANT: do not run code between creating the client and calling
 * `supabase.auth.getUser()`, and always return the `supabaseResponse` object
 * as-is to avoid desynchronizing the session cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session. This must run for every request so expired tokens
  // are rotated and downstream Server Components receive a valid session.
  await supabase.auth.getUser()

  return supabaseResponse
}
