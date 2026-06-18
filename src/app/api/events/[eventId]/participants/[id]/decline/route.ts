import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * PATCH /api/events/:eventId/participants/:id/decline
 * Declines a participant's payment.
 * Access: Organizer, Registration Staff (for their event)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; id: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId
  const participantId = params.id

  // Permission check
  if (user.role !== "organizer" && user.role !== "registration_staff") {
    return NextResponse.json(
      { error: "Only organizers and registration staff can decline payments" },
      { status: 403 },
    )
  }

  // For staff, verify they are assigned to this event
  if (user.role === "registration_staff" && user.event_id !== eventId) {
    return NextResponse.json(
      { error: "You are not assigned to this event" },
      { status: 403 },
    )
  }

  const adminClient = createAdminClient()

  // Verify event exists and belongs to user's tenant
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

  // Retrieve participant
  const { data: participant, error: participantError } = await adminClient
    .from("participants")
    .select(
      `
      id,
      full_name,
      address,
      category_id,
      receipt_number,
      payment_status,
      qr_code,
      registered_online,
      registered_by,
      approved_by,
      approved_at,
      created_at,
      updated_at
    `,
    )
    .eq("id", participantId)
    .eq("event_id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (participantError || !participant) {
    return NextResponse.json(
      { error: "Participant not found" },
      { status: 404 },
    )
  }

  const ipAddress = request.headers.get("x-forwarded-for") || "unknown"

  // Update participant payment_status to declined
  const { data: updatedParticipant, error: updateError } = await adminClient
    .from("participants")
    .update({
      payment_status: "declined",
    })
    .eq("id", participantId)
    .select(
      `
      id,
      full_name,
      address,
      category_id,
      receipt_number,
      payment_status,
      qr_code,
      registered_online,
      registered_by,
      approved_by,
      approved_at,
      created_at,
      updated_at
    `,
    )
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to decline participant" },
      { status: 500 },
    )
  }

  // Write audit log (Business Logic Rule 14)
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: eventId,
    action: "participant_declined",
    entity_type: "participant",
    entity_id: participantId,
    details: { declined_at: new Date().toISOString() },
    ip_address: ipAddress,
  })

  return NextResponse.json({ participant: updatedParticipant })
}
