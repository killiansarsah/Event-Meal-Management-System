import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/admin/tenants/:id
 * Returns organizer (tenant) details and all their events.
 * Super Admin only.
 *
 * Response: { tenant: TenantObject, events: EventObject[] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Validate authentication and super_admin role
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (authResult.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 },
    )
  }

  const tenantId = params.id

  const adminClient = createAdminClient()

  // Fetch the tenant
  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .select("id, name, email, phone, status, created_by, created_at, updated_at")
    .eq("id", tenantId)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: "Tenant not found" },
      { status: 404 },
    )
  }

  // Fetch all events for this tenant
  const { data: events, error: eventsError } = await adminClient
    .from("events")
    .select(
      "id, tenant_id, name, date_start, date_end, venue, logo_url, payment_required, payment_rules, status, registration_link_token, created_by, created_at, updated_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (eventsError) {
    console.error("[v0] Error fetching events:", eventsError)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    )
  }

  return NextResponse.json({
    tenant,
    events: events || [],
  })
}

/**
 * PATCH /api/admin/tenants/:id
 * Updates organizer (tenant) details or suspends/activates their account.
 * Super Admin only.
 *
 * Request body: { name?: string, phone?: string, status?: 'active' | 'suspended' }
 * Response: { tenant: TenantObject }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Validate authentication and super_admin role
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (authResult.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 },
    )
  }

  const tenantId = params.id

  // Parse request body
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    )
  }

  const { name, phone, status } = body

  // Validate status if provided
  if (status && !["active", "suspended"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be 'active' or 'suspended'" },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  // Build update object with only provided fields
  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone
  if (status !== undefined) updateData.status = status

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No fields provided to update" },
      { status: 400 },
    )
  }

  // Fetch the tenant before updating to check if it exists
  const { data: existingTenant, error: checkError } = await adminClient
    .from("tenants")
    .select("id, status")
    .eq("id", tenantId)
    .single()

  if (checkError || !existingTenant) {
    return NextResponse.json(
      { error: "Tenant not found" },
      { status: 404 },
    )
  }

  // Update the tenant
  const { data: updatedTenant, error: updateError } = await adminClient
    .from("tenants")
    .update(updateData)
    .eq("id", tenantId)
    .select("id, name, email, phone, status, created_by, created_at, updated_at")
    .single()

  if (updateError || !updatedTenant) {
    console.error("[v0] Error updating tenant:", updateError)
    return NextResponse.json(
      { error: "Failed to update tenant" },
      { status: 500 },
    )
  }

  // Write audit log
  const { v4: uuidv4 } = await import("uuid")
  const { error: auditError } = await adminClient.from("audit_logs").insert({
    id: uuidv4(),
    user_id: authResult.id,
    tenant_id: tenantId,
    event_id: null,
    action: "organizer_updated",
    entity_type: "tenant",
    entity_id: tenantId,
    details: updateData,
    ip_address: request.headers.get("x-forwarded-for") || null,
  })

  if (auditError) {
    console.error("[v0] Error writing audit log:", auditError)
  }

  return NextResponse.json({ tenant: updatedTenant })
}
