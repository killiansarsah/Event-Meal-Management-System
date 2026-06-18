import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

/**
 * POST /api/events/:eventId/staff/invite/:inviteId/resend
 * Resends invite email and resets the 48-hour expiry window.
 * Access: Organizer only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; inviteId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId
  const inviteId = params.inviteId

  // Permission check: Organizer only
  if (user.role !== "organizer") {
    return NextResponse.json(
      { error: "Only organizers can resend invites" },
      { status: 403 },
    )
  }

  const adminClient = createAdminClient()

  // Verify event exists and belongs to the organizer's tenant
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tenant_id")
    .eq("id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Fetch the invite record
  const { data: invite, error: inviteError } = await adminClient
    .from("staff_invites")
    .select("id, email, full_name, role, event_id, tenant_id, status")
    .eq("id", inviteId)
    .eq("event_id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "Invite not found" },
      { status: 404 },
    )
  }

  // Generate new secure token
  const newToken = randomUUID()

  // Calculate new expires_at: 48 hours from now
  const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  // Update the invite record: new token, reset expires_at, set status back to pending
  const { data: updatedInvite, error: updateError } = await adminClient
    .from("staff_invites")
    .update({
      token: newToken,
      expires_at: newExpiresAt.toISOString(),
      status: "pending",
    })
    .eq("id", inviteId)
    .select("id, email, full_name, role, status, expires_at, created_at")
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to resend invite" },
      { status: 500 },
    )
  }

  // Resend invite email via Supabase Auth admin API
  try {
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${newToken}`
    
    const adminAuth = adminClient.auth.admin
    await adminAuth.inviteUserByEmail(invite.email, {
      redirectTo: inviteLink,
    })
  } catch (err) {
    console.error("[v0] Failed to resend invite email:", err)
    // Continue anyway - invite record was updated successfully
  }

  // Write audit log for resend (no separate action type, use staff_invited again or track as resend)
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
  await adminClient
    .from("audit_logs")
    .insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "staff_invited",
      entity_type: "staff_invite",
      entity_id: inviteId,
      details: { email: invite.email, role: invite.role, resent: true },
      ip_address: ipAddress,
    })

  return NextResponse.json({ invite: updatedInvite })
}
