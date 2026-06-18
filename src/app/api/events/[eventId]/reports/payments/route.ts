import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/reports/payments
 * Returns payment reconciliation report for an event.
 *
 * Access: Organizer, Finance Team, Super Admin only
 *
 * Returns:
 * - Payment status breakdown
 * - Receipt number tracking
 * - Participant payment details
 * - Category-based fee analysis
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
    .select("id, tenant_id, name, payment_required")
    .eq("id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Get all participants with category info
  const { data: participantsData, error: participantsError } = await adminClient
    .from("participants")
    .select(
      `
      id,
      full_name,
      category_id,
      receipt_number,
      payment_status,
      approved_at,
      participant_categories (
        name,
        registration_fee
      )
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

  const participants = participantsData || []

  // Calculate payment statistics
  const totalParticipants = participants.length
  const paymentStats = {
    pending: participants.filter((p) => p.payment_status === "pending").length,
    approved: participants.filter((p) => p.payment_status === "approved").length,
    declined: participants.filter((p) => p.payment_status === "declined").length,
  }

  // Calculate potential revenue
  let totalPotentialRevenue = 0
  let totalApprovedRevenue = 0

  participants.forEach((p) => {
    const fee = p.participant_categories?.[0]?.registration_fee || 0
    totalPotentialRevenue += fee

    if (p.payment_status === "approved") {
      totalApprovedRevenue += fee
    }
  })

  // Prepare participant payment details
  const paymentDetails = participants.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    category: p.participant_categories?.[0]?.name || null,
    fee: p.participant_categories?.[0]?.registration_fee || 0,
    receipt_number: p.receipt_number,
    payment_status: p.payment_status,
    approved_at: p.approved_at,
  }))

  return NextResponse.json({
    event: {
      id: eventId,
      name: event.name,
      payment_required: event.payment_required,
    },
    summary: {
      total_participants: totalParticipants,
      payment_status: paymentStats,
      total_potential_revenue: totalPotentialRevenue,
      total_approved_revenue: totalApprovedRevenue,
    },
    participants: paymentDetails,
  })
}
