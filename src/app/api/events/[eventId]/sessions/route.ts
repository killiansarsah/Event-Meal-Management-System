import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/sessions
 * 
 * Retrieves all meal sessions for an event.
 * Access: Super Admin, Organizer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can access sessions
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to view sessions" },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the event exists and belongs to the user's tenant
    const { data: event, error: eventError } = await adminClient
      .from("events")
      .select("id, tenant_id")
      .eq("id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Fetch all sessions for this event
    const { data: sessions, error } = await adminClient
      .from("meal_sessions")
      .select("id, name, date, start_time, end_time, created_at")
      .eq("event_id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching sessions:", error)
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })
  } catch (err) {
    console.error("[v0] GET /api/events/[eventId]/sessions error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events/:eventId/sessions
 * 
 * Creates a new meal session for an event.
 * Access: Super Admin, Organizer only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can create sessions
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create sessions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, date, start_time, end_time } = body

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Session name is required" },
        { status: 400 }
      )
    }

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "Session date is required and must be a string (YYYY-MM-DD format)" },
        { status: 400 }
      )
    }

    if (!start_time || typeof start_time !== "string") {
      return NextResponse.json(
        { error: "Start time is required and must be a string (HH:MM:SS format)" },
        { status: 400 }
      )
    }

    if (!end_time || typeof end_time !== "string") {
      return NextResponse.json(
        { error: "End time is required and must be a string (HH:MM:SS format)" },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the event exists and belongs to the user's tenant
    const { data: event, error: eventError } = await adminClient
      .from("events")
      .select("id, tenant_id")
      .eq("id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Create the session
    const { data: session, error } = await adminClient
      .from("meal_sessions")
      .insert({
        event_id: eventId,
        tenant_id: user.tenant_id || event.tenant_id,
        name: name.trim(),
        date,
        start_time,
        end_time,
      })
      .select("id, name, date, start_time, end_time, created_at")
      .single()

    if (error) {
      console.error("[v0] Error creating session:", error)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    // Write audit log
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "session_created",
      entity_type: "meal_session",
      entity_id: session.id,
      details: { name: session.name, date: session.date, start_time: session.start_time, end_time: session.end_time },
      ip_address: ipAddress,
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (err) {
    console.error("[v0] POST /api/events/[eventId]/sessions error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
