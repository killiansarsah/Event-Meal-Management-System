import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * DELETE /api/events/:eventId/staff/:userId
 * Removes a staff member from the event and deactivates their account.
 * Access: Organizer only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; userId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId
  const userId = params.userId

  // Permission check: Organizer only
  if (user.role !== "organizer") {
    return NextResponse.json(
      { error: "Only organizers can remove staff" },
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

  // Verify the user being removed is a staff member for this event
  const { data: staffMember, error: staffError } = await adminClient
    .from("users")
    .select("id, email, event_id, role, status")
    .eq("id", userId)
    .eq("event_id", eventId)
    .neq("role", "organizer")
    .neq("role", "super_admin")
    .single()

  if (staffError || !staffMember) {
    return NextResponse.json(
      { error: "Staff member not found for this event" },
      { status: 404 },
    )
  }

  // Deactivate the user's account
  const { error: updateError } = await adminClient
    .from("users")
    .update({ status: "inactive" })
    .eq("id", userId)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to remove staff member" },
      { status: 500 },
    )
  }

  // Write audit log
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
  await adminClient
    .from("audit_logs")
    .insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "staff_removed",
      entity_type: "user",
      entity_id: userId,
      details: { email: staffMember.email, role: staffMember.role },
      ip_address: ipAddress,
    })

  return NextResponse.json({ success: true })
}
