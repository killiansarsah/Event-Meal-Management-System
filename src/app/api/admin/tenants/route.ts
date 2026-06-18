import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"

/**
 * GET /api/admin/tenants
 * Returns all organizer (tenant) accounts on the platform.
 * Super Admin only.
 */
export async function GET(request: NextRequest) {
  // Validate authentication and super_admin role
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (authResult.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 },
    )
  }

  // Query all tenants
  const adminClient = createAdminClient()
  const { data: tenants, error } = await adminClient
    .from("tenants")
    .select("id, name, email, phone, status, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching tenants:", error)
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 },
    )
  }

  return NextResponse.json({ tenants: tenants || [] })
}

/**
 * POST /api/admin/tenants
 * Creates a new organizer (tenant) account and sends an invite email.
 * Super Admin only.
 *
 * Request body: { name: string, email: string, phone?: string }
 * Response: { tenant: TenantObject }
 */
export async function POST(request: NextRequest) {
  // Validate authentication and super_admin role
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (authResult.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 },
    )
  }

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

  const { name, email, phone } = body

  // Validate required fields
  if (!name || !email) {
    return NextResponse.json(
      { error: "Missing required fields: name, email" },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  // Check if email already exists as a tenant
  const { data: existingTenant, error: checkError } = await adminClient
    .from("tenants")
    .select("id")
    .eq("email", email)
    .single()

  if (existingTenant) {
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 409 },
    )
  }

  // Create the tenant record
  const tenantId = uuidv4()
  const { data: newTenant, error: tenantError } = await adminClient
    .from("tenants")
    .insert({
      id: tenantId,
      name,
      email,
      phone: phone || null,
      status: "active",
      created_by: authResult.id,
    })
    .select("id, name, email, phone, status, created_by, created_at, updated_at")
    .single()

  if (tenantError || !newTenant) {
    console.error("[v0] Error creating tenant:", tenantError)
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 },
    )
  }

  // Create an organizer user record in the users table
  const organizerId = uuidv4()
  const { error: userError } = await adminClient.from("users").insert({
    id: organizerId,
    tenant_id: tenantId,
    event_id: null,
    email,
    full_name: name,
    role: "organizer",
    status: "pending", // Will be set to active when they accept the invite
  })

  if (userError) {
    console.error("[v0] Error creating organizer user:", userError)
    // Rollback tenant creation
    await adminClient.from("tenants").delete().eq("id", tenantId)
    return NextResponse.json(
      { error: "Failed to create organizer account" },
      { status: 500 },
    )
  }

  // Generate invite token
  const inviteToken = Buffer.from(`${organizerId}:${Date.now()}`).toString(
    "base64",
  )

  // Send invite email via Supabase Auth
  // Use the admin client to send an invite email
  try {
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${inviteToken}`,
    })
  } catch (err) {
    console.error("[v0] Error sending invite email:", err)
    // Continue anyway — the organizer can still set their password later
  }

  // Write audit log
  const { error: auditError } = await adminClient.from("audit_logs").insert({
    id: uuidv4(),
    user_id: authResult.id,
    tenant_id: tenantId,
    event_id: null,
    action: "organizer_created",
    entity_type: "tenant",
    entity_id: tenantId,
    details: {
      name,
      email,
    },
    ip_address: request.headers.get("x-forwarded-for") || null,
  })

  if (auditError) {
    console.error("[v0] Error writing audit log:", auditError)
  }

  return NextResponse.json({ tenant: newTenant }, { status: 201 })
}
