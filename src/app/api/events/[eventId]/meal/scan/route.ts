import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/events/:eventId/meal/scan
 * Scans a participant's QR code and records meal checkin.
 *
 * Access: Catering Staff and Organizer only (verified by event_id match)
 *
 * Request body:
 * {
 *   "qr_code": "string - the QR code value from the participant",
 *   "session_id": "UUID - the meal session being checked into"
 * }
 *
 * Responses:
 * - 200 OK: { eligible: true, participant: { full_name, category }, session: { name } }
 * - 400 Bad Request: { eligible: false, reason: "...", message: "..." }
 * - 404 Not Found: { eligible: false, reason: "...", message: "..." }
 *
 * Business Logic Rules:
 * - Rule 4: Check for duplicate meals — return already_served if exists
 * - Every scan attempt is logged to audit_logs regardless of outcome
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check: Only Catering Staff and Organizer can scan meals
  if (user.role !== "catering_staff" && user.role !== "organizer") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    )
  }

  // For catering staff, verify they are assigned to this event
  if (user.role === "catering_staff" && user.event_id !== eventId) {
    return NextResponse.json(
      { error: "You are not assigned to this event" },
      { status: 403 },
    )
  }

  const body = await request.json()
  const { qr_code, session_id } = body

  if (!qr_code || !session_id) {
    return NextResponse.json(
      { error: "qr_code and session_id are required" },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown"

  // Verify event exists and belongs to user's tenant
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tenant_id")
    .eq("id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (eventError || !event) {
    // Log not found attempt
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "meal_scan_not_found",
      entity_type: "meal_checkin",
      details: { qr_code },
      ip_address: ipAddress,
    })

    return NextResponse.json(
      {
        eligible: false,
        reason: "not_found",
        message: "QR code not recognized.",
      },
      { status: 404 },
    )
  }

  // Look up participant by qr_code
  const { data: participant, error: participantError } = await adminClient
    .from("participants")
    .select("id, full_name, category_id, payment_status")
    .eq("qr_code", qr_code)
    .eq("event_id", eventId)
    .single()

  if (participantError || !participant) {
    // Log not found attempt
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "meal_scan_not_found",
      entity_type: "meal_checkin",
      details: { qr_code },
      ip_address: ipAddress,
    })

    return NextResponse.json(
      {
        eligible: false,
        reason: "not_found",
        message: "QR code not recognized.",
      },
      { status: 404 },
    )
  }

  // Check if payment is approved
  if (participant.payment_status !== "approved") {
    // Log not approved attempt
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "meal_scan_not_approved",
      entity_type: "meal_checkin",
      entity_id: participant.id,
      details: { payment_status: participant.payment_status },
      ip_address: ipAddress,
    })

    return NextResponse.json(
      {
        eligible: false,
        reason: "not_approved",
        message: "This participant's payment has not been approved.",
      },
      { status: 400 },
    )
  }

  // Check for existing checkin (Business Logic Rule 4: prevent duplicate meals)
  const { data: existingCheckin, error: checkError } = await adminClient
    .from("meal_checkins")
    .select("id")
    .eq("participant_id", participant.id)
    .eq("session_id", session_id)
    .single()

  if (existingCheckin) {
    // Log duplicate attempt
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "meal_scan_duplicate",
      entity_type: "meal_checkin",
      entity_id: participant.id,
      details: { session_id },
      ip_address: ipAddress,
    })

    return NextResponse.json(
      {
        eligible: false,
        reason: "already_served",
        message: "This participant has already received their meal for this session.",
      },
      { status: 400 },
    )
  }

  // Get category name if assigned
  let categoryName = null
  if (participant.category_id) {
    const { data: category } = await adminClient
      .from("participant_categories")
      .select("name")
      .eq("id", participant.category_id)
      .single()
    if (category) {
      categoryName = category.name
    }
  }

  // Get session name
  const { data: session, error: sessionError } = await adminClient
    .from("meal_sessions")
    .select("name")
    .eq("id", session_id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 },
    )
  }

  // Create meal checkin record
  const { data: checkin, error: checkinError } = await adminClient
    .from("meal_checkins")
    .insert({
      participant_id: participant.id,
      session_id,
      event_id: eventId,
      tenant_id: user.tenant_id,
      scanned_by: user.id,
      is_override: false,
      override_reason: null,
    })
    .select("id")
    .single()

  if (checkinError || !checkin) {
    return NextResponse.json(
      { error: "Failed to record meal checkin" },
      { status: 500 },
    )
  }

  // Log successful scan
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: eventId,
    action: "meal_scanned",
    entity_type: "meal_checkin",
    entity_id: checkin.id,
    details: { session_id },
    ip_address: ipAddress,
  })

  return NextResponse.json({
    eligible: true,
    participant: {
      full_name: participant.full_name,
      category: categoryName,
    },
    session: {
      name: session.name,
    },
  })
}
