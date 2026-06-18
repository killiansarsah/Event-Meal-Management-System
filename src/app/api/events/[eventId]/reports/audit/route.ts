import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/reports/audit
 * Returns audit log report for an event with optional filtering.
 *
 * Access: Organizer, Super Admin only (Audit logs are sensitive)
 *
 * Query parameters (all optional):
 * - action: Filter by action type (e.g., "participant_approved", "meal_scanned")
 * - user_id: Filter by user who performed the action
 * - from: Filter logs from this date (ISO format: YYYY-MM-DD)
 * - to: Filter logs to this date (ISO format: YYYY-MM-DD)
 *
 * Returns:
 * - Filtered audit log entries
 * - Total count of matching entries
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check: Only Organizer and Super Admin can view audit logs
  if (user.role !== "organizer" && user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    )
  }

  const adminClient = createAdminClient()

  // Verify event exists and belongs to user's tenant
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, tenant_id, name")
    .eq("id", eventId)
    .eq("tenant_id", user.tenant_id)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 },
    )
  }

  // Extract query parameters
  const url = new URL(request.url)
  const action = url.searchParams.get("action") || undefined
  const userId = url.searchParams.get("user_id") || undefined
  const fromDate = url.searchParams.get("from") || undefined
  const toDate = url.searchParams.get("to") || undefined

  // Start building the query
  let query = adminClient
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("event_id", eventId)

  // Apply filters
  if (action) {
    query = query.eq("action", action)
  }

  if (userId) {
    query = query.eq("user_id", userId)
  }

  if (fromDate) {
    // Filter logs created on or after fromDate
    query = query.gte("created_at", `${fromDate}T00:00:00`)
  }

  if (toDate) {
    // Filter logs created on or before toDate (up to end of day)
    query = query.lte("created_at", `${toDate}T23:59:59`)
  }

  // Execute query with ordering
  const { data: auditLogs, error: auditError, count } = await query
    .order("created_at", { ascending: false })

  if (auditError) {
    return NextResponse.json(
      { error: "Failed to retrieve audit logs" },
      { status: 500 },
    )
  }

  return NextResponse.json({
    event: {
      id: eventId,
      name: event.name,
    },
    filters_applied: {
      action: action || null,
      user_id: userId || null,
      from_date: fromDate || null,
      to_date: toDate || null,
    },
    summary: {
      total_logs: count || 0,
    },
    logs: auditLogs || [],
  })
}
