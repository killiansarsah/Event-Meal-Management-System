import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/participants/search
 * Searches participants by full_name or receipt_number.
 * Query parameters: q (search query)
 * Access: Organizer, Registration Staff (for their event), Finance Team (for their event)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId
  const searchUrl = new URL(request.url)
  const query = searchUrl.searchParams.get("q") || ""

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

  if (!query.trim()) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 },
    )
  }

  // Search by full_name or receipt_number (case-insensitive)
  const searchPattern = `%${query}%`

  const { data: participants, error: participantsError } = await adminClient
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
    .eq("event_id", eventId)
    .eq("tenant_id", user.tenant_id)
    .or(
      `full_name.ilike.${searchPattern},receipt_number.ilike.${searchPattern}`,
    )
    .order("created_at", { ascending: false })

  if (participantsError) {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({ participants })
}
