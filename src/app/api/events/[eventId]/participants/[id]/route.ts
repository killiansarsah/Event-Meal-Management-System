import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/participants/:id
 * Returns a single participant by ID.
 * Access: Organizer, Registration Staff (for their event), Finance Team (for their event)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; id: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId
  const participantId = params.id

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

  return NextResponse.json({ participant })
}
