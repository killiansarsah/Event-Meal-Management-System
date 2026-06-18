import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/reports/meals
 * Returns meal attendance report for an event.
 *
 * Access: Organizer, Finance Team, Super Admin only
 *
 * Returns:
 * - Meal sessions for the event
 * - Checkin counts per session (regular + overrides)
 * - Participant meal checkin details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check: Only Organizer, Finance Team, Super Admin can view reports
  if (
    user.role !== "organizer" &&
    user.role !== "finance_team" &&
    user.role !== "super_admin"
  ) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    )
  }

  // For finance team, verify they are assigned to this event
  if (user.role === "finance_team" && user.event_id !== eventId) {
    return NextResponse.json(
      { error: "You are not assigned to this event" },
      { status: 403 },
    )
  }

  const adminClient = createAdminClient()

  // Verify event exists and belongs to user's tenant
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tenant_id, name")
    .eq("id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Get meal sessions
  const { data: sessions, error: sessionsError } = await adminClient
    .from("meal_sessions")
    .select("id, name, date, start_time, end_time")
    .eq("event_id", eventId)
    .order("date", { ascending: true })

  if (sessionsError) {
    return NextResponse.json(
      { error: "Failed to retrieve meal sessions" },
      { status: 500 },
    )
  }

  // Get all meal checkins for the event
  const { data: checkins, error: checkinsError } = await adminClient
    .from("meal_checkins")
    .select(
      `
      id,
      participant_id,
      session_id,
      scanned_by,
      is_override,
      override_reason,
      scanned_at
    `,
    )
    .eq("event_id", eventId)

  if (checkinsError) {
    return NextResponse.json(
      { error: "Failed to retrieve meal checkins" },
      { status: 500 },
    )
  }

  // Build summary per session
  const sessionSummaries = (sessions || []).map((session) => {
    const sessionCheckins = (checkins || []).filter((c) => c.session_id === session.id)
    return {
      session_id: session.id,
      session_name: session.name,
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      total_checkins: sessionCheckins.length,
      regular_checkins: sessionCheckins.filter((c) => !c.is_override).length,
      overrides: sessionCheckins.filter((c) => c.is_override).length,
    }
  })

  return NextResponse.json({
    event: {
      id: eventId,
      name: event.name,
    },
    sessions: sessionSummaries,
    total_meal_checkins: (checkins || []).length,
    checkins: checkins || [],
  })
}
