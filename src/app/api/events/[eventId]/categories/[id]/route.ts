import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * PATCH /api/events/:eventId/categories/:id
 * 
 * Updates a participant category.
 * Access: Super Admin, Organizer only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const { eventId, id } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can update categories
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to update categories" },
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

    // Verify the category exists and belongs to the user's tenant/event
    const { data: category, error: categoryError } = await adminClient
      .from("participant_categories")
      .select("id, event_id, tenant_id")
      .eq("id", id)
      .eq("event_id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Category not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Update the category
    const { data: updated, error } = await adminClient
      .from("participant_categories")
      .update({
        name: name.trim(),
        registration_fee,
      })
      .eq("id", id)
      .select("id, name, registration_fee, created_at")
      .single()

    if (error) {
      console.error("[v0] Error updating category:", error)
      return NextResponse.json(
        { error: "Failed to update category" },
        { status: 500 }
      )
    }

    // Write audit log
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "category_updated",
      entity_type: "participant_category",
      entity_id: id,
      details: { name: updated.name, registration_fee: updated.registration_fee },
      ip_address: ipAddress,
    })

    return NextResponse.json({ category: updated })
  } catch (err) {
    console.error("[v0] PATCH /api/events/[eventId]/categories/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/:eventId/categories/:id
 * 
 * Deletes a participant category.
 * Cannot be deleted if participants are assigned to it (Rule 12).
 * Access: Super Admin, Organizer only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; id: string }> }
) {
  try {
    const { eventId, id } = await params
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const user = authResult

    // Only Super Admin and Organizer can delete categories
    if (!["super_admin", "organizer"].includes(user.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete categories" },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // Verify the category exists and belongs to the user's tenant/event
    const { data: category, error: categoryError } = await adminClient
      .from("participant_categories")
      .select("id, event_id, tenant_id")
      .eq("id", id)
      .eq("event_id", eventId)
      .eq("tenant_id", user.tenant_id || "")
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Category not found or you do not have access to it" },
        { status: 404 }
      )
    }

    // Check if any participants reference this category (Rule 12)
    const { data: participants, error: participantError } = await adminClient
      .from("participants")
      .select("id")
      .eq("category_id", id)
      .limit(1)

    if (participantError) {
      console.error("[v0] Error checking participants:", participantError)
      return NextResponse.json(
        { error: "Failed to verify delete eligibility" },
        { status: 500 }
      )
    }

    if (participants && participants.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category — participants are assigned to it." },
        { status: 409 }
      )
    }

    // Delete the category
    const { error: deleteError } = await adminClient
      .from("participant_categories")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[v0] Error deleting category:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 }
      )
    }

    // Write audit log
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown"
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      tenant_id: user.tenant_id,
      event_id: eventId,
      action: "category_deleted",
      entity_type: "participant_category",
      entity_id: id,
      ip_address: ipAddress,
    })

    return NextResponse.json({ message: "Category deleted successfully" })
  } catch (err) {
    console.error("[v0] DELETE /api/events/[eventId]/categories/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
