import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/auth/reset-password
 * Sets a new password using a valid Supabase password reset session.
 *
 * The reset session is obtained from the email reset link sent via
 * /api/auth/reset-password-request. The session token comes in the URL
 * and is managed by Supabase automatically.
 *
 * Request body:
 *   {
 *     "new_password": "newsecurepassword123"
 *   }
 *
 * Response (success):
 *   { "success": true }
 *
 * Response (error):
 *   { "error": "Invalid or expired reset session" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { new_password } = body

    // Validate password is provided
    if (!new_password) {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 },
      )
    }

    // Create the server client (this reads the session from cookies)
    const supabase = await createClient()

    // Update the user's password (this only works during a reset session)
    const { error } = await supabase.auth.updateUser({
      password: new_password,
    })

    if (error) {
      console.error("[v0] Password reset error:", error)
      return NextResponse.json(
        { error: "Invalid or expired reset session" },
        { status: 401 },
      )
    }

    return NextResponse.json(
      { success: true },
      { status: 200 },
    )
  } catch (err) {
    console.error("[v0] Reset password error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
