import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

/**
 * GET /api/events/:eventId/staff
 * Returns all active staff and pending invitations for an event.
 * Access: Organizer, Super Admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check: Organizer and Super Admin only
  if (user.role !== "organizer" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    )
  }

  const adminClient = createAdminClient()

  // Verify event exists and belongs to the user's tenant
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tenant_id")
    .eq("id", eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Permission check: For organizer, verify event belongs to their tenant
  if (user.role === "organizer" && event.tenant_id !== user.tenant_id) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    )
  }

  // Get all active staff for this event
  const { data: staff, error: staffError } = await adminClient
    .from("users")
    .select("id, email, full_name, role, status")
    .eq("event_id", eventId)
    .neq("role", "organizer")
    .neq("role", "super_admin")

  if (staffError) {
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 },
    )
  }

  // Get all pending invites for this event
  const { data: pendingInvites, error: invitesError } = await adminClient
    .from("staff_invites")
    .select("id, email, full_name, role, status, expires_at, created_at")
    .eq("event_id", eventId)
    .eq("status", "pending")

  if (invitesError) {
    return NextResponse.json(
      { error: "Failed to fetch pending invites" },
      { status: 500 },
    )
  }

  return NextResponse.json({
    staff: staff || [],
    pending_invites: pendingInvites || [],
  })
}

/**
 * POST /api/events/:eventId/staff/invite
 * Creates a staff invite and sends invite email. Token expires in 48 hours.
 * Access: Organizer only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check: Organizer only (not Super Admin)
  if (user.role !== "organizer") {
    return NextResponse.json(
      { error: "Only organizers can invite staff" },
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

  const { email, full_name, role } = body

  // Validate required fields
  if (!email || !full_name || !role) {
    return NextResponse.json(
      { error: "Missing required fields: email, full_name, role" },
      { status: 400 },
    )
  }

  // Validate role
  const validRoles = ["registration_staff", "catering_staff", "finance_team"]
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be one of: registration_staff, catering_staff, finance_team" },
      { status: 400 },
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

  // Generate unique secure token
  const token = randomUUID()

  // Calculate expires_at: 48 hours from now
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  // Create staff_invites record
  const { data: invite, error: inviteError } = await adminClient
    .from("staff_invites")
    .insert({
      event_id: eventId,
      tenant_id: user.tenant_id,
      email,
      full_name,
      role,
      invited_by: user.id,
      token,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select("id, email, full_name, role, status, expires_at, created_at")
    .single()

  if (inviteError) {
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 },
    )
  }

  // Send invite email via Supabase Auth admin API
  try {
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`
    
    const adminAuth = adminClient.auth.admin
    await adminAuth.inviteUserByEmail(email, {
      redirectTo: inviteLink,
    })
  } catch (err) {
    console.error("[v0] Failed to send invite email:", err)
    // Continue anyway - invite record was created successfully
  }

  // Write audit log
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
  await adminClient
    .from("audit_logs")
    .insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "staff_invited",
      entity_type: "staff_invite",
      entity_id: invite.id,
      details: { email, role },
      ip_address: ipAddress,
    })

  return NextResponse.json({ invite }, { status: 201 })
}
