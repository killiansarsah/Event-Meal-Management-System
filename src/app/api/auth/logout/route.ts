import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/auth/logout
 * Invalidates the current user's session.
 *
 * Request headers:
 *   Authorization: Bearer <token>
 *
 * Response (success):
 *   { "success": true }
 *
 * Response (error):
 *   { "error": "User account is not active" } (403)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult
    const authHeader = request.headers.get("authorization")
    const token = authHeader!.substring("Bearer ".length)

    // Sign out the session using the admin client
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.signOut(user.id)

    if (error) {
      console.error("[v0] Logout error:", error)
      return NextResponse.json(
        { error: "Failed to logout" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { success: true },
      { status: 200 },
    )
  } catch (err) {
    console.error("[v0] Logout error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
