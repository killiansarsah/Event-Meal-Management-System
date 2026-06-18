import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"
import QRCode from "qrcode"

/**
 * GET /api/events/:eventId/participants
 * Returns all participants for an event.
 * Access: Organizer, Registration Staff (for their event), Finance Team (for their event)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check
  if (
    user.role !== "organizer" &&
    user.role !== "registration_staff" &&
    user.role !== "finance_team"
  ) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
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

  // For staff roles, verify they are assigned to this event
  if (user.role !== "organizer" && user.event_id !== eventId) {
    return NextResponse.json(
      { error: "You are not assigned to this event" },
      { status: 403 },
    )
  }

  // Retrieve all participants for the event
  const { data: participants, error: participantsError } = await adminClient
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
    .eq("event_id", eventId)
    .eq("tenant_id", user.tenant_id)
    .order("created_at", { ascending: false })

  if (participantsError) {
    return NextResponse.json(
      { error: "Failed to retrieve participants" },
      { status: 500 },
    )
  }

  return NextResponse.json({ participants })
}

/**
 * POST /api/events/:eventId/participants
 * Registers a new participant for an event.
 * If payment_required is FALSE, participant is auto-approved with QR code.
 * If payment_required is TRUE, participant is created with pending status.
 * Access: Organizer, Registration Staff (for their event)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check
  if (user.role !== "organizer" && user.role !== "registration_staff") {
    return NextResponse.json(
      { error: "Only organizers and registration staff can register participants" },
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
  const { full_name, address, category_id, receipt_number, registered_online } =
    body

  // Validate required fields
  if (!full_name || !address) {
    return NextResponse.json(
      { error: "full_name and address are required" },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  // Verify event exists and belongs to user's tenant
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

  const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
  let qrCodeValue = null
  let paymentStatus = "pending"

  // If payment is not required, auto-approve and generate QR code
  if (!event.payment_required) {
    // Generate QR code
    try {
      qrCodeValue = await QRCode.toDataURL(`participant:${Date.now()}:${Math.random()}`)
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to generate QR code" },
        { status: 500 },
      )
    }
    paymentStatus = "approved"
  }

  // Create participant record
  const { data: participant, error: participantError } = await adminClient
    .from("participants")
    .insert({
      event_id: eventId,
      tenant_id: user.tenant_id,
      full_name,
      address,
      category_id: category_id || null,
      receipt_number: receipt_number || null,
      payment_status: paymentStatus,
      qr_code: qrCodeValue,
      registered_online: registered_online || false,
      registered_by: registered_online ? null : user.id,
      approved_by: !event.payment_required ? user.id : null,
      approved_at: !event.payment_required ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (participantError) {
    return NextResponse.json(
      { error: "Failed to register participant" },
      { status: 500 },
    )
  }

  // Write audit logs
  // Log participant_registered
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: eventId,
    action: "participant_registered",
    entity_type: "participant",
    entity_id: participant.id,
    details: {
      full_name,
      address,
      category_id: category_id || null,
      registered_online: registered_online || false,
    },
    ip_address: ipAddress,
  })

  // If auto-approved, log those actions too
  if (!event.payment_required) {
    // Log participant_approved
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "participant_approved",
      entity_type: "participant",
      entity_id: participant.id,
      details: { auto_approved: true },
      ip_address: ipAddress,
    })

    // Log qr_code_generated
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "qr_code_generated",
      entity_type: "participant",
      entity_id: participant.id,
      details: { auto_generated: true },
      ip_address: ipAddress,
    })
  }

  return NextResponse.json({ participant }, { status: 201 })
}
