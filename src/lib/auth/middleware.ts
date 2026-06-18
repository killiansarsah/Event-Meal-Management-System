import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * User object returned by the authentication middleware.
 * Contains the authenticated user's full record from the users table.
 */
export interface AuthenticatedUser {
  id: string
  tenant_id: string | null
  event_id: string | null
  email: string
  full_name: string
  role: "super_admin" | "organizer" | "registration_staff" | "catering_staff" | "finance_team"
  status: "active" | "inactive" | "pending"
}

/**
 * Verification key for decoding Supabase JWT tokens.
 * Uses the Supabase ANON key's signing secret.
 */
const getJwtSecret = (): Uint8Array => {
  const secret = process.env.SUPABASE_JWT_SECRET || ""
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET environment variable is not set")
  }
  return new TextEncoder().encode(secret)
}

/**
 * Authentication middleware for API routes.
 *
 * This middleware:
 * 1. Extracts and validates the Supabase Auth JWT token from the Authorization header
 * 2. Decodes the JWT to get the user ID
 * 3. Queries the users table to retrieve the authenticated user's full record
 * 4. Returns 401 Unauthorized if the token is missing or invalid
 * 5. Returns 403 Forbidden if the user's status is not 'active'
 * 6. Returns the AuthenticatedUser object on success
 *
 * Usage in an API route:
 *   export async function POST(request: NextRequest) {
 *     const authResult = await validateAuth(request)
 *     if (authResult instanceof NextResponse) return authResult // Error response
 *     const user = authResult as AuthenticatedUser
 *     // ... rest of your endpoint
 *   }
 */
export async function validateAuth(
  request: NextRequest,
): Promise<AuthenticatedUser | NextResponse> {
  // Extract the Authorization header
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 },
    )
  }

  const token = authHeader.substring("Bearer ".length)

  // Decode and verify the JWT
  let payload: any
  try {
    const secret = getJwtSecret()
    const verified = await jwtVerify(token, secret)
    payload = verified.payload
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    )
  }

  // Extract the user ID from the JWT payload
  const userId = payload.sub
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid token: missing user ID" },
      { status: 401 },
    )
  }

  // Query the users table for the authenticated user's full record
  const adminClient = createAdminClient()
  const { data: userRecord, error: userError } = await adminClient
    .from("users")
    .select("id, tenant_id, event_id, email, full_name, role, status")
    .eq("id", userId)
    .single()

  if (userError || !userRecord) {
    return NextResponse.json(
      { error: "User record not found" },
      { status: 401 },
    )
  }

  // Check if user status is active
  if (userRecord.status !== "active") {
    return NextResponse.json(
      { error: "User account is not active" },
      { status: 403 },
    )
  }

  return userRecord as AuthenticatedUser
}
