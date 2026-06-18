import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * POST /api/events/:eventId/meal/scan/override
 * Manually override a meal checkin for a participant who couldn't be scanned normally.
 *
 * Access: Catering Staff and Organizer only (verified by event_id match)
 *
 * Request body:
 * {
 *   "qr_code": "string - the participant's QR code",
 *   "session_id": "UUID - the meal session",
 *   "override_reason": "string - required, non-empty reason for the override"
 * }
 *
 * Response:
 * - 200 OK: { success: true, message: "...", checkin_id: "..." }
 * - 400 Bad Request: { error: "..." } if override_reason is missing/empty (Business Logic Rule 5)
 * - 404 Not Found: { error: "..." }
 *
 * Business Logic Rules:
 * - Rule 5: override_reason is REQUIRED and must be non-empty/non-whitespace
 * - Creates meal_checkins record with is_override=TRUE and override_reason populated
 * - Full audit_logs entry includes override_reason and staff user ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check: Only Catering Staff and Organizer can perform overrides
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
  const { qr_code, session_id, override_reason } = body

  if (!qr_code || !session_id) {
    return NextResponse.json(
      { error: "qr_code and session_id are required" },
      { status: 400 },
    )
  }

  // Business Logic Rule 5: override_reason is REQUIRED and must be non-empty/non-whitespace
  if (!override_reason || typeof override_reason !== "string" || override_reason.trim() === "") {
    return NextResponse.json(
      { error: "override_reason is required and must not be empty" },
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
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Look up participant by qr_code
  const { data: participant, error: participantError } = await adminClient
    .from("participants")
    .select("id")
    .eq("qr_code", qr_code)
    .eq("event_id", eventId)
    .single()

  if (participantError || !participant) {
    return NextResponse.json(
      { error: "Participant not found for the given QR code" },
      { status: 404 },
    )
  }

  // Create override meal checkin record
  const { data: checkin, error: checkinError } = await adminClient
    .from("meal_checkins")
    .insert({
      participant_id: participant.id,
      session_id,
      event_id: eventId,
      tenant_id: user.tenant_id,
      scanned_by: user.id,
      is_override: true,
      override_reason: override_reason.trim(),
    })
    .select("id")
    .single()

  if (checkinError || !checkin) {
    return NextResponse.json(
      { error: "Failed to record meal override" },
      { status: 500 },
    )
  }

  // Log the override with full details
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: eventId,
    action: "meal_override",
    entity_type: "meal_checkin",
    entity_id: checkin.id,
    details: {
      session_id,
      participant_id: participant.id,
      override_reason: override_reason.trim(),
      scanned_by_user_id: user.id,
    },
    ip_address: ipAddress,
  })

  return NextResponse.json({
    success: true,
    message: "Meal override recorded successfully",
    checkin_id: checkin.id,
  })
}
