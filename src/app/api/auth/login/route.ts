import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/auth/login
 * Authenticates a user with email and password.
 *
 * Request body:
 *   {
 *     "email": "user@example.com",
 *     "password": "securepassword123"
 *   }
 *
 * Response (success):
 *   {
 *     "user": { "id": "...", "email": "...", "role": "...", "tenant_id": "...", "event_id": "..." },
 *     "session": {
 *       "access_token": "...",
 *       "refresh_token": "...",
 *       "expires_in": 3600,
 *       "expires_at": 1234567890,
 *       "token_type": "bearer"
 *     },
 *     "role": "organizer"
 *   }
 *
 * Response (error):
 *   { "error": "Invalid email or password" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      )
    }

    // Sign in with Supabase Auth
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      )
    }

    // Fetch user details from the users table
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id, email, role, tenant_id, event_id, full_name, status")
      .eq("id", data.user.id)
      .single()

    if (userError || !userRecord) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 401 },
      )
    }

    // Return session and user info
    return NextResponse.json(
      {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          full_name: userRecord.full_name,
          role: userRecord.role,
          tenant_id: userRecord.tenant_id,
          event_id: userRecord.event_id,
          status: userRecord.status,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          expires_at: data.session.expires_at,
          token_type: data.session.token_type,
        },
        role: userRecord.role,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error("[v0] Login error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
