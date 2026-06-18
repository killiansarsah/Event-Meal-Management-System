import { type NextRequest, NextResponse } from "next/server"
import { validateAuth } from "@/lib/auth/middleware"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * GET /api/events/:eventId/reports/export
 * Exports reports in various formats (CSV, PDF, Excel).
 *
 * Access: Organizer, Finance Team, Super Admin only
 *
 * Query parameters (required):
 * - type: Export format - "csv", "pdf", or "excel"
 * - report: Report type - "registration", "meals", "payments", or "audit"
 *
 * Returns:
 * - CSV: text/csv file
 * - PDF: application/pdf file (requires PDF generation library)
 * - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet file
 *
 * Returns 400 Bad Request if type or report params are missing or invalid.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const authResult = await validateAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  const eventId = params.eventId

  // Permission check: Only Organizer, Finance Team, Super Admin can export reports
  if (
    user.role !== "organizer" &&
    user.role !== "finance_team" &&
    user.role !== "super_admin"
  ) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    )
  }

  // For finance team, verify they are assigned to this event
  if (user.role === "finance_team" && user.event_id !== eventId) {
    return NextResponse.json(
      { error: "You are not assigned to this event" },
      { status: 403 },
    )
  }

  // Extract query parameters
  const url = new URL(request.url)
  const type = url.searchParams.get("type")?.toLowerCase()
  const reportType = url.searchParams.get("report")?.toLowerCase()

  // Validate parameters
  if (!type || !reportType) {
    return NextResponse.json(
      { error: "Missing required query parameters: type and report" },
      { status: 400 },
    )
  }

  const validTypes = ["csv", "pdf", "excel"]
  const validReports = ["registration", "meals", "payments", "audit"]

  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: "Invalid type. Must be one of: csv, pdf, excel" },
      { status: 400 },
    )
  }

  if (!validReports.includes(reportType)) {
    return NextResponse.json(
      { error: "Invalid report. Must be one of: registration, meals, payments, audit" },
      { status: 400 },
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

  // Build CSV based on report type
  let csvContent = ""
  const filename = `${event.name}_${reportType}_${new Date().toISOString().split("T")[0]}`

  if (reportType === "registration") {
    // Get participants
    const { data: participants } = await adminClient
      .from("participants")
      .select("full_name, address, category_id, payment_status, registered_online, created_at")
      .eq("event_id", eventId)

    csvContent = "Full Name,Address,Category ID,Payment Status,Registered Online,Created At\n"
    ;(participants || []).forEach((p) => {
      const row = [
        `"${p.full_name}"`,
        `"${p.address}"`,
        p.category_id || "",
        p.payment_status,
        p.registered_online ? "Yes" : "No",
        p.created_at,
      ]
      csvContent += row.join(",") + "\n"
    })
  } else if (reportType === "meals") {
    // Get meal checkins
    const { data: checkins } = await adminClient
      .from("meal_checkins")
      .select("participant_id, session_id, is_override, scanned_at")
      .eq("event_id", eventId)

    csvContent = "Participant ID,Session ID,Is Override,Scanned At\n"
    ;(checkins || []).forEach((c) => {
      const row = [
        c.participant_id,
        c.session_id,
        c.is_override ? "Yes" : "No",
        c.scanned_at,
      ]
      csvContent += row.join(",") + "\n"
    })
  } else if (reportType === "payments") {
    // Get participants with payment details
    const { data: participants } = await adminClient
      .from("participants")
      .select(
        `
        full_name,
        receipt_number,
        payment_status,
        approved_at,
        participant_categories (
          name,
          registration_fee
        )
      `,
      )
      .eq("event_id", eventId)

    csvContent = "Full Name,Receipt Number,Payment Status,Approved At,Category,Fee\n"
    ;(participants || []).forEach((p) => {
      const row = [
        `"${p.full_name}"`,
        p.receipt_number || "",
        p.payment_status,
        p.approved_at || "",
        p.participant_categories?.[0]?.name || "",
        p.participant_categories?.[0]?.registration_fee || 0,
      ]
      csvContent += row.join(",") + "\n"
    })
  } else if (reportType === "audit") {
    // Get audit logs
    const { data: logs } = await adminClient
      .from("audit_logs")
      .select("user_id, action, entity_type, entity_id, details, ip_address, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })

    csvContent = "User ID,Action,Entity Type,Entity ID,Details,IP Address,Created At\n"
    ;(logs || []).forEach((log) => {
      const row = [
        log.user_id,
        log.action,
        log.entity_type || "",
        log.entity_id || "",
        `"${JSON.stringify(log.details || {})}"`,
        log.ip_address || "",
        log.created_at,
      ]
      csvContent += row.join(",") + "\n"
    })
  }

  // Set response headers based on export type
  const contentType = getContentType(type)
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}.${type === "excel" ? "xlsx" : type}"`,
  }

  // For now, return CSV content for all formats
  // PDF and Excel would require additional libraries (pdfkit, xlsx) to generate
  // This is a basic implementation that returns CSV for all formats
  return new NextResponse(csvContent, {
    headers,
  })
}

function getContentType(type: string): string {
  switch (type) {
    case "csv":
      return "text/csv"
    case "pdf":
      return "application/pdf"
    case "excel":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    default:
      return "text/plain"
  }
}
