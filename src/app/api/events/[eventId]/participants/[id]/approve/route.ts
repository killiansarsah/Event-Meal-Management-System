import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"
import QRCode from "qrcode"

/**
 * PATCH /api/events/:eventId/participants/:id/approve
 * Approves a participant's payment and generates a QR code.
 * If event.payment_required is TRUE, receipt_number must be provided in the request body.
 * If event.payment_required is FALSE, receipt_number is optional.
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
      { error: "Only organizers and registration staff can approve payments" },
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

  const body = await request.json()
  const { receipt_number } = body

  const adminClient = createAdminClient()

  // Verify event exists and get payment_required setting
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tenant_id, payment_required")
    .eq("id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Business Logic Rule 9: If payment_required is TRUE, receipt_number must be provided
  if (event.payment_required && (!receipt_number || receipt_number.trim() === "")) {
    return NextResponse.json(
      { error: "receipt_number is required for events with payment" },
      { status: 400 },
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

  // Generate QR code (Business Logic Rule 1)
  let qrCodeValue: string
  try {
    qrCodeValue = await QRCode.toDataURL(`participant:${participantId}:${Date.now()}`)
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 },
    )
  }

  // Update participant with approval
  const { data: updatedParticipant, error: updateError } = await adminClient
    .from("participants")
    .update({
      payment_status: "approved",
      qr_code: qrCodeValue,
      receipt_number: receipt_number || participant.receipt_number,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
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
      { error: "Failed to approve participant" },
      { status: 500 },
    )
  }

  // Write audit logs (Business Logic Rule 14)
  // Log participant_approved
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: eventId,
    action: "participant_approved",
    entity_type: "participant",
    entity_id: participantId,
    details: { receipt_number: receipt_number || participant.receipt_number },
    ip_address: ipAddress,
  })

  // Log qr_code_generated
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: eventId,
    action: "qr_code_generated",
    entity_type: "participant",
    entity_id: participantId,
    details: { qr_code_generated_at: new Date().toISOString() },
    ip_address: ipAddress,
  })

  return NextResponse.json({ participant: updatedParticipant })
}
