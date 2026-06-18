import { type NextRequest, NextResponse } from "next/server"
import { validateAuth, type AuthenticatedUser } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

/**
 * GET /api/events
 * Returns all events belonging to the authenticated user's tenant
 * Access: Organizer, Super Admin
 */
export async function GET(request: NextRequest) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const user = authResult as AuthenticatedUser

  // Only Organizer and Super Admin can access this endpoint
  if (user.role !== "organizer" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 },
    )
  }

  const adminClient = createAdminClient()

  // Get the tenant_id to filter by
  // Super Admin sees all events; Organizer sees only their tenant's events
  const tenantIdFilter = user.role === "super_admin" ? undefined : user.tenant_id

  // Query events
  let query = adminClient
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
    .order("created_at", { ascending: false })

  // Apply tenant filter if not Super Admin
  if (tenantIdFilter) {
    query = query.eq("tenant_id", tenantIdFilter)
  }

  const { data: events, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: events || [] })
}

/**
 * POST /api/events
 * Creates a new event
 * Access: Organizer only
 *
 * Request body:
 * {
 *   name: string,
 *   date_start: string (YYYY-MM-DD),
 *   date_end: string (YYYY-MM-DD),
 *   venue: string,
 *   logo_url?: string,
 *   payment_required: boolean,
 *   payment_rules?: object
 * }
 */
export async function POST(request: NextRequest) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const user = authResult as AuthenticatedUser

  // Only Organizer can create events
  if (user.role !== "organizer") {
    return NextResponse.json(
      { error: "Forbidden: only organizers can create events" },
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

  const { name, date_start, date_end, venue, logo_url, payment_required, payment_rules } = body

  // Validate required fields
  if (!name || !date_start || !date_end || !venue || payment_required === undefined) {
    return NextResponse.json(
      {
        error: "Missing required fields: name, date_start, date_end, venue, payment_required",
      },
      { status: 400 },
    )
  }

  // Generate unique registration_link_token
  const registration_link_token = randomUUID()

  // Create the event
  const adminClient = createAdminClient()
  const { data: event, error: createError } = await adminClient
    .from("events")
    .insert({
      tenant_id: user.tenant_id,
      name,
      date_start,
      date_end,
      venue,
      logo_url: logo_url || null,
      payment_required,
      payment_rules: payment_rules || null,
      status: "draft",
      registration_link_token,
      created_by: user.id,
    })
    .select()
    .single()

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // Write audit log
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  await adminClient.from("audit_logs").insert({
    user_id: user.id,
    tenant_id: user.tenant_id,
    event_id: event.id,
    action: "event_created",
    entity_type: "event",
    entity_id: event.id,
    details: { name, date_start, date_end, venue },
    ip_address: ipAddress,
  })

  return NextResponse.json({ event }, { status: 201 })
}
