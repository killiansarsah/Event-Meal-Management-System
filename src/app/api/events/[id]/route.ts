import { type NextRequest, NextResponse } from "next/server"
import { validateAuth, type AuthenticatedUser } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:id
 * Returns full event details
 * Access: Organizer, Registration Staff, Catering Staff, Finance Team, Super Admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const user = authResult as AuthenticatedUser
  const { id } = await params

  // All non-super-admin roles must have permission
  const allowedRoles = ["organizer", "registration_staff", "catering_staff", "finance_team", "super_admin"]
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 },
    )
  }

  const adminClient = createAdminClient()

  // Fetch the event
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select(
      `
      id,
      tenant_id,
      name,
      date_start,
      date_end,
      venue,
      logo_url,
      payment_required,
      payment_rules,
      status,
      registration_link_token,
      created_by,
      created_at,
      updated_at
    `,
    )
    .eq("id", id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  // Validate access
  // Super Admin can access any event
  if (user.role !== "super_admin") {
    // For organizer: must match tenant_id
    if (user.role === "organizer" && event.tenant_id !== user.tenant_id) {
      return NextResponse.json({ error: "Forbidden: access denied" }, { status: 403 })
    }
    // For staff (registration_staff, catering_staff, finance_team): must match event_id
    if (
      (user.role === "registration_staff" ||
        user.role === "catering_staff" ||
        user.role === "finance_team") &&
      event.id !== user.event_id
    ) {
      return NextResponse.json({ error: "Forbidden: access denied" }, { status: 403 })
    }
  }

  return NextResponse.json({ event })
}

/**
 * PATCH /api/events/:id
 * Updates event details
 * Access: Organizer only
 *
 * Request body (all optional):
 * {
 *   name?: string,
 *   date_start?: string (YYYY-MM-DD),
 *   date_end?: string (YYYY-MM-DD),
 *   venue?: string,
 *   logo_url?: string,
 *   payment_required?: boolean,
 *   payment_rules?: object,
 *   status?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const user = authResult as AuthenticatedUser
  const { id } = await params

  // Only Organizer can update events
  if (user.role !== "organizer") {
    return NextResponse.json(
      { error: "Forbidden: only organizers can update events" },
      { status: 403 },
    )
  }

  // Parse request body
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Fetch the current event to verify access and get original data
  const { data: currentEvent, error: eventError } = await adminClient
    .from("events")
    .select("*")
    .eq("id", id)
    .single()

  if (eventError || !currentEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  // Verify ownership: organizer can only update their own tenant's events
  if (currentEvent.tenant_id !== user.tenant_id) {
    return NextResponse.json({ error: "Forbidden: access denied" }, { status: 403 })
  }

  // Build update object - only include provided fields
  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.date_start !== undefined) updateData.date_start = body.date_start
  if (body.date_end !== undefined) updateData.date_end = body.date_end
  if (body.venue !== undefined) updateData.venue = body.venue
  if (body.logo_url !== undefined) updateData.logo_url = body.logo_url
  if (body.payment_required !== undefined) updateData.payment_required = body.payment_required
  if (body.payment_rules !== undefined) updateData.payment_rules = body.payment_rules
  if (body.status !== undefined) updateData.status = body.status

  // If nothing to update, return the current event
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ event: currentEvent })
  }

  // Update the event
  const { data: updatedEvent, error: updateError } = await adminClient
    .from("events")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Write audit log
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: id,
    action: "event_updated",
    entity_type: "event",
    entity_id: id,
    details: { changes: updateData },
    ip_address: ipAddress,
  })

  return NextResponse.json({ event: updatedEvent })
}
