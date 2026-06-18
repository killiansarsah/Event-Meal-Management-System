import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/auth/accept-invite
 * Accepts a staff invitation and creates a new user account.
 *
 * This endpoint:
 * 1. Validates the invite token against the staff_invites table
 * 2. Checks that the invite status is 'pending'
 * 3. Checks that the invite has not expired (expires_at > now)
 * 4. Creates a Supabase Auth user account
 * 5. Creates a users table record with role, tenant_id, and event_id from the invite
 * 6. Updates the staff_invites record status to 'accepted'
 * 7. Returns the new session
 *
 * Request body:
 *   {
 *     "token": "invite_token_from_email",
 *     "password": "newpassword123"
 *   }
 *
 * Response (success):
 *   {
 *     "user": {
 *       "id": "user_id",
 *       "email": "user@example.com",
 *       "full_name": "User Name",
 *       "role": "registration_staff",
 *       "tenant_id": "...",
 *       "event_id": "..."
 *     },
 *     "session": {
 *       "access_token": "...",
 *       "refresh_token": "...",
 *       "expires_in": 3600,
 *       "expires_at": 1234567890,
 *       "token_type": "bearer"
 *     }
 *   }
 *
 * Response (error):
 *   { "error": "Invite token is invalid, expired, or already used" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    // Validate required fields
    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      )
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Query the staff_invites table to find the invite
    const { data: invite, error: inviteError } = await supabase
      .from("staff_invites")
      .select("id, email, full_name, role, tenant_id, event_id, status, expires_at, invited_by")
      .eq("token", token)
      .single()

    // Invite not found
    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invite token is invalid, expired, or already used" },
        { status: 400 },
      )
    }

    // Check if invite status is 'pending'
    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Invite token is invalid, expired, or already used" },
        { status: 400 },
      )
    }

    // Check if invite has expired
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)
    if (expiresAt < now) {
      return NextResponse.json(
        { error: "Invite token is invalid, expired, or already used" },
        { status: 400 },
      )
    }

    // Create a Supabase Auth user account
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true, // Mark email as confirmed since they're accepting an invite
    })

    if (authError || !authUser.user) {
      console.error("[v0] Auth user creation error:", authError)
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 },
      )
    }

    const userId = authUser.user.id

    // Create the users table record with status 'active'
    const { error: userRecordError } = await supabase
      .from("users")
      .insert({
        id: userId,
        tenant_id: invite.tenant_id,
        event_id: invite.event_id,
        email: invite.email,
        full_name: invite.full_name,
        role: invite.role,
        status: "active", // Staff members are active upon accepting invite
      })

    if (userRecordError) {
      console.error("[v0] User record creation error:", userRecordError)
      // Attempt to clean up the auth user
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: "Failed to create user record" },
        { status: 500 },
      )
    }

    // Update the staff_invites record status to 'accepted'
    const { error: updateInviteError } = await supabase
      .from("staff_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id)

    if (updateInviteError) {
      console.error("[v0] Invite update error:", updateInviteError)
      // Note: We don't fail here, the invite is already functionally accepted
    }

    // Sign in the new user to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    })

    if (signInError || !signInData.session) {
      console.error("[v0] Sign-in after invite acceptance error:", signInError)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        user: {
          id: userId,
          email: invite.email,
          full_name: invite.full_name,
          role: invite.role,
          tenant_id: invite.tenant_id,
          event_id: invite.event_id,
          status: "active",
        },
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in,
          expires_at: signInData.session.expires_at,
          token_type: signInData.session.token_type,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error("[v0] Accept invite error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
