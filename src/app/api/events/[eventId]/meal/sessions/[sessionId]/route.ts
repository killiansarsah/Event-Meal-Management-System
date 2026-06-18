import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/meal/sessions/:sessionId/count
 * Returns the count of participants who have checked into a meal session.
 *
 * Access: Catering Staff, Organizer, Finance Team (verified by event_id match for staff)
 *
 * Response:
 * - 200 OK: { session_id, session_name, event_id, total_checkins, regular_checkins, overrides }
 * - 404 Not Found: { error: "..." }
 *
 * Returns breakdown of:
 * - total_checkins: total number of meal checkins for this session
 * - regular_checkins: normal scanned checkins (is_override = FALSE)
 * - overrides: manual override checkins (is_override = TRUE)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; sessionId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId
  const sessionId = params.sessionId

  // Permission check: Catering Staff, Organizer, Finance Team can view counts
  if (
    user.role !== "catering_staff" &&
    user.role !== "organizer" &&
    user.role !== "finance_team"
  ) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    )
  }

  // For staff roles, verify they are assigned to this event
  if (user.role !== "organizer" && user.event_id !== eventId) {
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

  // Verify session exists and belongs to this event
  const { data: session, error: sessionError } = await adminClient
    .from("meal_sessions")
    .select("id, name")
    .eq("id", sessionId)
    .eq("event_id", eventId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 },
    )
  }

  // Get all checkins for this session
  const { data: checkins, error: checkinsError } = await adminClient
    .from("meal_checkins")
    .select("id, is_override")
    .eq("session_id", sessionId)
    .eq("event_id", eventId)

  if (checkinsError) {
    return NextResponse.json(
      { error: "Failed to retrieve checkin data" },
      { status: 500 },
    )
  }

  // Count regular and override checkins
  const regularCheckins = (checkins || []).filter((c) => !c.is_override).length
  const overrideCheckins = (checkins || []).filter((c) => c.is_override).length
  const totalCheckins = (checkins || []).length

  return NextResponse.json({
    session_id: sessionId,
    session_name: session.name,
    event_id: eventId,
    total_checkins: totalCheckins,
    regular_checkins: regularCheckins,
    overrides: overrideCheckins,
  })
}
