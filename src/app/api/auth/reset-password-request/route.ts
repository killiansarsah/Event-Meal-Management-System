import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/auth/reset-password-request
 * Sends a password reset email to the user.
 *
 * Always returns success, even if email is not found,
 * to prevent email enumeration attacks.
 *
 * Request body:
 *   {
 *     "email": "user@example.com"
 *   }
 *
 * Response (always):
 *   { "success": true }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email is provided
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      )
    }

    // Always return success to prevent email enumeration
    const supabase = createAdminClient()

    // Attempt to send the reset email
    // Note: Supabase Auth sends reset emails internally
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`,
    })

    // We don't expose whether the email was found or not
    if (error) {
      console.error("[v0] Reset password email error:", error)
      // Still return success to prevent enumeration
    }

    return NextResponse.json(
      { success: true },
      { status: 200 },
    )
  } catch (err) {
    console.error("[v0] Reset password request error:", err)
    // Return success even on error to prevent enumeration
    return NextResponse.json(
      { success: true },
      { status: 200 },
    )
  }
}
