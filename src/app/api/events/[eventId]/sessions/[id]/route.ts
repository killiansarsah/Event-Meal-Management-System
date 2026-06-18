import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * PATCH /api/events/:eventId/sessions/:id
 * 
 * Updates a meal session.
 * Access: Super Admin, Organizer only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const { eventId, id } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can update sessions
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update sessions" },
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

    // Verify the session exists and belongs to the user's tenant/event
    const { data: session, error: sessionError } = await adminClient
      .from("meal_sessions")
      .select("id, event_id, tenant_id")
      .eq("id", id)
      .eq("event_id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Update the session
    const { data: updated, error } = await adminClient
      .from("meal_sessions")
      .update({
        name: name.trim(),
        date,
        start_time,
        end_time,
      })
      .eq("id", id)
      .select("id, name, date, start_time, end_time, created_at")
      .single()

    if (error) {
      console.error("[v0] Error updating session:", error)
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      )
    }

    // Write audit log
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "session_updated",
      entity_type: "meal_session",
      entity_id: id,
      details: { name: updated.name, date: updated.date, start_time: updated.start_time, end_time: updated.end_time },
      ip_address: ipAddress,
    })

    return NextResponse.json({ session: updated })
  } catch (err) {
    console.error("[v0] PATCH /api/events/[eventId]/sessions/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/:eventId/sessions/:id
 * 
 * Deletes a meal session.
 * Cannot be deleted if meal checkins have been recorded for it (Rule 13).
 * Access: Super Admin, Organizer only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const { eventId, id } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can delete sessions
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete sessions" },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the session exists and belongs to the user's tenant/event
    const { data: session, error: sessionError } = await adminClient
      .from("meal_sessions")
      .select("id, event_id, tenant_id")
      .eq("id", id)
      .eq("event_id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Check if any meal checkins reference this session (Rule 13)
    const { data: checkins, error: checkinsError } = await adminClient
      .from("meal_checkins")
      .select("id")
      .eq("session_id", id)
      .limit(1)

    if (checkinsError) {
      console.error("[v0] Error checking meal checkins:", checkinsError)
      return NextResponse.json(
        { error: "Failed to verify delete eligibility" },
        { status: 500 }
      )
    }

    if (checkins && checkins.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete session — meal checkins have been recorded for it." },
        { status: 409 }
      )
    }

    // Delete the session
    const { error: deleteError } = await adminClient
      .from("meal_sessions")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[v0] Error deleting session:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      )
    }

    // Write audit log
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "session_deleted",
      entity_type: "meal_session",
      entity_id: id,
      ip_address: ipAddress,
    })

    return NextResponse.json({ message: "Session deleted successfully" })
  } catch (err) {
    console.error("[v0] DELETE /api/events/[eventId]/sessions/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
