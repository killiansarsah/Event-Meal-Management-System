import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/categories
 * 
 * Retrieves all participant categories for an event.
 * Access: Super Admin, Organizer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can access categories
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to view categories" },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the event exists and belongs to the user's tenant
    const { data: event, error: eventError } = await adminClient
      .from("events")
      .select("id, tenant_id")
      .eq("id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Fetch all categories for this event
    const { data: categories, error } = await adminClient
      .from("participant_categories")
      .select("id, name, registration_fee, created_at")
      .eq("event_id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching categories:", error)
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      )
    }

    return NextResponse.json({ categories })
  } catch (err) {
    console.error("[v0] GET /api/events/[eventId]/categories error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events/:eventId/categories
 * 
 * Creates a new participant category for an event.
 * Access: Super Admin, Organizer only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can create categories
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create categories" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, registration_fee } = body

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      )
    }

    if (registration_fee === undefined || typeof registration_fee !== "number" || registration_fee < 0) {
      return NextResponse.json(
        { error: "Registration fee must be a non-negative number" },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the event exists and belongs to the user's tenant
    const { data: event, error: eventError } = await adminClient
      .from("events")
      .select("id, tenant_id")
      .eq("id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Create the category
    const { data: category, error } = await adminClient
      .from("participant_categories")
      .insert({
        event_id: eventId,
        tenant_id: user.tenant_id || event.tenant_id,
        name: name.trim(),
        registration_fee,
      })
      .select("id, name, registration_fee, created_at")
      .single()

    if (error) {
      console.error("[v0] Error creating category:", error)
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      )
    }

    // Write audit log
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "category_created",
      entity_type: "participant_category",
      entity_id: category.id,
      details: { name: category.name, registration_fee: category.registration_fee },
      ip_address: ipAddress,
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (err) {
    console.error("[v0] POST /api/events/[eventId]/categories error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
