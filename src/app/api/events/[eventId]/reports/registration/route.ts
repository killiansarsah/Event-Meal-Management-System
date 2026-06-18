import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/reports/registration
 * Returns registration report for an event.
 *
 * Access: Organizer, Finance Team, Super Admin only
 *
 * Returns:
 * - Total registrations
 * - Breakdown by payment status (pending, approved, declined)
 * - Breakdown by registration type (online vs on-site)
 * - Breakdown by category
 * - Participant list with key details
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

  // Get all participants for the event
  const { data: participants, error: participantsError } = await adminClient
    .from("participants")
    .select(
      `
      id,
      full_name,
      address,
      category_id,
      payment_status,
      registered_online,
      registered_by,
      approved_by,
      approved_at,
      created_at
    `,
    )
    .eq("event_id", eventId)
    .eq("tenant_id", user.tenant_id)

  if (participantsError) {
    return NextResponse.json(
      { error: "Failed to retrieve participants" },
      { status: 500 },
    )
  }

  // Count by payment status
  const totalParticipants = (participants || []).length
  const paymentStats = {
    pending: (participants || []).filter((p) => p.payment_status === "pending").length,
    approved: (participants || []).filter((p) => p.payment_status === "approved").length,
    declined: (participants || []).filter((p) => p.payment_status === "declined").length,
  }

  // Count by registration type
  const registrationType = {
    online: (participants || []).filter((p) => p.registered_online).length,
    onsite: (participants || []).filter((p) => !p.registered_online).length,
  }

  return NextResponse.json({
    event: {
      id: eventId,
      name: event.name,
    },
    summary: {
      total_participants: totalParticipants,
      payment_status: paymentStats,
      registration_type: registrationType,
    },
    participants: participants || [],
  })
}
