import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/public/register/:registrationLinkToken
 * Public endpoint - NO AUTHENTICATION REQUIRED
 *
 * Retrieves public event information for pre-registration.
 * Returns event name, dates, venue, logo, and participant categories with fees.
 * Returns 404 if registration token does not match any event.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { registrationLinkToken: string } },
) {
  const registrationLinkToken = params.registrationLinkToken

  if (!registrationLinkToken) {
    return NextResponse.json(
      { error: "Registration link token is required" },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  // Look up event by registration_link_token
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select(
      `
      id,
      name,
      date_start,
      date_end,
      venue,
      logo_url,
      participant_categories (
        id,
        name,
        registration_fee
      )
    `,
    )
    .eq("registration_link_token", registrationLinkToken)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Return only public-safe fields
  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      date_start: event.date_start,
      date_end: event.date_end,
      venue: event.venue,
      logo_url: event.logo_url,
      categories: event.participant_categories,
    },
  })
}

/**
 * POST /api/public/register/:registrationLinkToken
 * Public endpoint - NO AUTHENTICATION REQUIRED
 *
 * Registers a new participant for an event via public pre-registration link.
 * Creates participant with:
 * - payment_status: 'pending'
 * - registered_online: TRUE
 * - qr_code: NULL (will be generated only after payment approval)
 *
 * Business Logic Rule 11: Never collect or store payment information.
 * No receipt_number is requested or stored.
 *
 * Returns 404 if registration token does not match any event.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { registrationLinkToken: string } },
) {
  const registrationLinkToken = params.registrationLinkToken

  if (!registrationLinkToken) {
    return NextResponse.json(
      { error: "Registration link token is required" },
      { status: 400 },
    )
  }

  const body = await request.json()
  const { full_name, address, category_id } = body

  // Validate required fields
  if (!full_name || !address) {
    return NextResponse.json(
      { error: "full_name and address are required" },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  // Look up event by registration_link_token
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tenant_id")
    .eq("registration_link_token", registrationLinkToken)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  const ipAddress = request.headers.get("x-forwarded-for") || "unknown"

  // Create participant record
  // Business Logic Rule 11: Never collect or store payment info or receipt number
  const { data: participant, error: participantError } = await adminClient
    .from("participants")
    .insert({
      event_id: event.id,
      tenant_id: event.tenant_id,
      full_name,
      address,
      category_id: category_id || null,
      payment_status: "pending",
      registered_online: true,
      qr_code: null,
      receipt_number: null,
      registered_by: null,
      approved_by: null,
      approved_at: null,
    })
    .select("id")
    .single()

  if (participantError || !participant) {
    return NextResponse.json(
      { error: "Failed to register participant" },
      { status: 500 },
    )
  }

  // Audit log: participant registered via public link
  await adminClient
    .from("audit_logs")
    .insert({
      user_id: "00000000-0000-0000-0000-000000000000", // System user for public registrations
      tenant_id: event.tenant_id,
      event_id: event.id,
      action: "participant_registered",
      entity_type: "participant",
      entity_id: participant.id,
      details: {
        registered_via: "public_pre_registration_link",
        registration_link_token: registrationLinkToken,
      },
      ip_address: ipAddress,
    })

  // Return success message - exactly as specified
  return NextResponse.json({
    success: true,
    message:
      "Thank you for registering! Please come to the event and complete your payment on arrival to receive your name tag.",
  })
}
