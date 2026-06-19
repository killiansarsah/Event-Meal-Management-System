# Elira Event Platform — Complete Build Guide

## Step-by-Step Prompts for Every AI Session

---

## THE BUILD ORDER — NEVER SKIP AHEAD

```
Step 0  → Project Setup
Step 1  → Database (Tables, then RLS)
Step 2  → Backend API (one module at a time)
Step 3  → Offline Mode / PWA
Step 4  → Frontend (one role at a time)
```

**Golden Rule:** Before every single prompt — paste the full MD specification file first, then paste all previously generated code below it. Never start a new session without both.

---

---

# STEP 0 — PROJECT SETUP

**Tool:** Your terminal or let Cursor / Bolt scaffold it for you
**Do this before anything else**

---

### STEP 0.1 — Create the Next.js Project

Copy and paste this prompt:

---

> Create a new Next.js 14 project using the App Router. Name the project "elira-event-platform". Set it up with:
>
> - TypeScript enabled
> - Tailwind CSS enabled
> - ESLint enabled
> - The /src directory structure
>
> After creating the project, install the following npm packages:
>
> - @supabase/supabase-js
> - @supabase/ssr
> - qrcode
> - @types/qrcode
> - idb (for IndexedDB access)
>
> Do not write any application code yet. Just scaffold the project and install the packages.

---

### STEP 0.2 — Set Up Environment Variables

After the project is created, create a `.env.local` file in the root of the project with the following variables. You will fill in the actual values from your Supabase project dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Where to find these values:**

- Log into Supabase at supabase.com
- Open your project
- Go to Settings → API
- Copy the Project URL and the anon/public key and service_role key

---

### STEP 0.3 — Set Up Supabase Client

Copy and paste this prompt:

---

> The Next.js project has been created and the environment variables are set up.
>
> Your job now is to create the Supabase client configuration only. Create:
>
> 1. A browser-side Supabase client at /src/lib/supabase/client.ts
> 2. A server-side Supabase client at /src/lib/supabase/server.ts
> 3. A Supabase middleware client at /src/lib/supabase/middleware.ts
> 4. A Next.js middleware file at /src/middleware.ts that uses Supabase SSR to refresh auth sessions on every request
>
> Use the @supabase/ssr package. Use the environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the browser client, and SUPABASE_SERVICE_ROLE_KEY for the server client.
>
> Do not write any API routes or frontend pages yet.

---

---

# STEP 1 — BUILD THE DATABASE

**Tool:** Supabase SQL Editor
(Go to your Supabase project → SQL Editor → New Query)

---

### STEP 1.1 — Create All Tables

Copy and paste this prompt, then paste the full MD file after it:

---

> I am building a multi-tenant SaaS event management platform called Elira. Here is the full technical specification document.
>
> Your job is to write the SQL to create ALL database tables. Create every table, column, data type, primary key, foreign key, unique constraint, check constraint, enum type, and default value exactly as defined in Section 5 (Database Schema) of this document.
>
> The tables to create are:
>
> - tenants
> - users
> - events
> - participant_categories
> - meal_sessions
> - participants
> - meal_checkins (include the UNIQUE constraint on participant_id + session_id)
> - staff_invites
> - audit_logs
>
> Important rules:
>
> - Use UUID primary keys with gen_random_uuid() as default for all tables
> - Create all ENUM types before the tables that use them
> - The audit_logs table must have NO UPDATE and NO DELETE permissions — it is INSERT ONLY
> - Do not create RLS policies yet — only the tables
>
> [PASTE FULL MD FILE HERE]

---

### STEP 1.2 — Create Row Level Security Policies

Copy and paste this prompt, then paste the full MD file and the SQL from Step 1.1 after it:

---

> The database tables for the Elira platform have already been created. The SQL schema is included below.
>
> Your job now is to write the SQL to set up Row Level Security (RLS). Do the following:
>
> 1. Enable RLS on ALL tables
> 2. Create all RLS policies exactly as defined in Section 6.5 (Row Level Security Policies) of the specification document
> 3. For the audit_logs table — create a policy that allows INSERT for authenticated users but completely blocks UPDATE and DELETE for all users including super admin
> 4. Ensure organizers can only access rows where tenant_id matches their own tenant_id
> 5. Ensure staff can only access rows where both tenant_id and event_id match their assigned values
> 6. Ensure super_admin role bypasses tenant isolation and can read all rows across all tables
>
> Do not modify any table structures. Write only RLS enable statements and policy creation SQL.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE SQL FROM STEP 1.1 HERE]

---

---

# STEP 2 — BUILD THE BACKEND API

**Tool:** Cursor or Bolt
**Important:** Every prompt in this section must include the full MD file AND all previously generated code at the bottom.

---

### STEP 2.1 — Auth Middleware + Authentication Endpoints

This step does two things in one — creates the shared auth middleware first, then builds the auth endpoints that use it.

Copy and paste this prompt, then paste the full MD file after it:

---

> I am building a multi-tenant SaaS event management platform called Elira using Next.js 14 App Router API Routes and Supabase. The database has already been built and the Supabase client is configured.
>
> Your job in this step is to do TWO things:
>
> PART A — Create a shared authentication middleware utility at /src/lib/auth/middleware.ts that:
>
> - Validates the Supabase Auth JWT token from the request Authorization header
> - Reads the authenticated user's full record from the users table (id, role, tenant_id, event_id, status)
> - Returns the user object to the calling route
> - Returns a 401 Unauthorized response if the token is missing or invalid
> - Returns a 403 Forbidden response if the user's status is not 'active'
> - This middleware must be reusable — every API route in Steps 2.2 through 2.9 will import and use it
>
> PART B — Build the authentication API endpoints exactly as defined in Section 7.1 (Authentication) of the specification:
>
> - POST /api/auth/login
> - POST /api/auth/logout
> - POST /api/auth/reset-password-request
> - POST /api/auth/reset-password
> - POST /api/auth/accept-invite
>
> The accept-invite endpoint must:
>
> - Validate the invite token against the staff_invites table
> - Check that the invite has not expired (expires_at > now)
> - Check that the invite status is 'pending'
> - Create the Supabase Auth user account
> - Create the users table record with the correct role, tenant_id, and event_id from the invite
> - Update the staff_invites record status to 'accepted'
> - Return an error if the token is expired or already used
>
> Follow the full auth flows described in Section 6 and Section 8.3. Do not build any other endpoints or any frontend code.
>
> [PASTE FULL MD FILE HERE]

---

### STEP 2.2 — Super Admin Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The authentication middleware and auth endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the Super Admin organizer management endpoints exactly as defined in Section 7.2 (Super Admin — Organizer Management):
>
> - GET /api/admin/tenants
> - POST /api/admin/tenants
> - GET /api/admin/tenants/:id
> - PATCH /api/admin/tenants/:id
>
> Every endpoint must:
>
> - Use the shared auth middleware from /src/lib/auth/middleware.ts to validate the JWT
> - Check that the authenticated user's role is 'super_admin' — return 403 Forbidden if not
> - Write an entry to the audit_logs table for every create and update action
>
> The POST /api/admin/tenants endpoint must also trigger a Supabase Auth invite email to the new organizer.
>
> Follow role permissions in Section 4. Do not build any other endpoints or any frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 2.3 — Events Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The previous endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the events endpoints exactly as defined in Section 7.3 (Events):
>
> - GET /api/events
> - POST /api/events
> - GET /api/events/:id
> - PATCH /api/events/:id
>
> Every endpoint must:
>
> - Use the shared auth middleware from /src/lib/auth/middleware.ts to validate the JWT
> - Enforce role permissions as defined in Section 4
> - Filter all queries by the authenticated user's tenant_id — never trust tenant_id from the request body
> - Write an entry to the audit_logs table for create and update actions
>
> The POST /api/events endpoint must:
>
> - Auto-generate a unique registration_link_token using crypto.randomUUID() or a similar secure method
> - Set the event status to 'draft' on creation
>
> Follow business logic rules in Section 10. Do not build any other endpoints or any frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 2.4 — Participant Categories and Meal Sessions Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The previous endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the participant categories and meal sessions endpoints exactly as defined in Section 7.4 (Participant Categories) and Section 7.5 (Meal Sessions):
>
> - GET /api/events/:eventId/categories
> - POST /api/events/:eventId/categories
> - PATCH /api/events/:eventId/categories/:id
> - DELETE /api/events/:eventId/categories/:id
> - GET /api/events/:eventId/sessions
> - POST /api/events/:eventId/sessions
> - PATCH /api/events/:eventId/sessions/:id
> - DELETE /api/events/:eventId/sessions/:id
>
> Every endpoint must:
>
> - Use the shared auth middleware from /src/lib/auth/middleware.ts
> - Enforce role permissions as defined in Section 4
> - Filter all queries by tenant_id from the authenticated user
>
> Apply these delete protection rules exactly:
>
> - A category cannot be deleted if any participant records reference it. Return a 409 Conflict error with message "Cannot delete category — participants are assigned to it." (Business Logic Rule 12)
> - A meal session cannot be deleted if any meal_checkins records reference it. Return a 409 Conflict error with message "Cannot delete session — meal checkins have been recorded for it." (Business Logic Rule 13)
>
> Write audit_logs entries for all create, update, and delete actions. Do not build any other endpoints or frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 2.5 — Staff Management Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The previous endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the staff management endpoints exactly as defined in Section 7.6 (Staff Management):
>
> - GET /api/events/:eventId/staff
> - POST /api/events/:eventId/staff/invite
> - POST /api/events/:eventId/staff/invite/:inviteId/resend
> - DELETE /api/events/:eventId/staff/:userId
>
> Every endpoint must:
>
> - Use the shared auth middleware from /src/lib/auth/middleware.ts
> - Enforce role permissions as defined in Section 4
> - Filter all queries by tenant_id from the authenticated user
>
> The POST /api/events/:eventId/staff/invite endpoint must:
>
> - Create a staff_invites record with a unique secure token
> - Set expires_at to exactly 48 hours from the time of creation (Business Logic Rule 8)
> - Trigger a Supabase Auth invite email to the staff member's email address
> - Only allow roles: registration_staff, catering_staff, finance_team
>
> The resend endpoint must:
>
> - Generate a new token
> - Reset expires_at to 48 hours from now
> - Update the staff_invites record status back to 'pending'
> - Resend the invite email
>
> Write audit_logs entries for invite sent, invite resent, and staff removed actions. Follow the full staff invitation flow in Section 8.3. Do not build any other endpoints or frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 2.6 — Participants Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The previous endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the participants endpoints exactly as defined in Section 7.7 (Participants):
>
> - GET /api/events/:eventId/participants
> - POST /api/events/:eventId/participants
> - GET /api/events/:eventId/participants/search
> - GET /api/events/:eventId/participants/:id
> - PATCH /api/events/:eventId/participants/:id/approve
> - PATCH /api/events/:eventId/participants/:id/decline
>
> Every endpoint must:
>
> - Use the shared auth middleware from /src/lib/auth/middleware.ts
> - Enforce role permissions as defined in Section 4
> - Filter all queries by tenant_id from the authenticated user
>
> The PATCH /api/events/:eventId/participants/:id/approve endpoint must:
>
> - Check if the event has payment_required = TRUE — if so, require receipt_number in the request body. Return 400 Bad Request if receipt_number is missing or empty (Business Logic Rule 9)
> - If payment_required = FALSE, approve the participant without requiring a receipt_number (Business Logic Rule 3)
> - Generate a unique QR code string using the 'qrcode' npm library. Generate it as a data URL string and store it in the participants.qr_code column (Business Logic Rule 1)
> - Set payment_status to 'approved' and record approved_by and approved_at
> - Return the full participant object including the generated qr_code value
>
> The POST /api/events/:eventId/participants endpoint must:
>
> - If payment_required = FALSE on the parent event, automatically approve the participant and generate the QR code immediately (Business Logic Rule 3)
> - If payment_required = TRUE, create the participant with payment_status 'pending' and qr_code NULL
>
> Write audit_logs entries for: participant_registered, participant_approved, qr_code_generated, participant_declined. Follow Business Logic Rules 1, 2, 3, 9, and 14 from Section 10 exactly. Do not build any other endpoints or frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 2.7 — Public Pre-Registration Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The previous endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the public pre-registration endpoints exactly as defined in Section 7.8 (Public Pre-Registration):
>
> - GET /api/public/register/:registrationLinkToken
> - POST /api/public/register/:registrationLinkToken
>
> These endpoints must require NO authentication at all — they are fully public. Do not apply the auth middleware to these routes.
>
> The GET endpoint must:
>
> - Look up the event by its registration_link_token
> - Return only the public-safe event fields: name, date_start, date_end, venue, logo_url, and the list of participant categories with their names and fees
> - Return 404 if the token does not match any event
>
> The POST endpoint must:
>
> - Create a participant record with payment_status 'pending', registered_online TRUE, and qr_code NULL
> - Never collect or store any payment information or receipt number (Business Logic Rule 11)
> - Return this exact success response: { success: true, message: "Thank you for registering! Please come to the event and complete your payment on arrival to receive your name tag." }
> - Return 404 if the registration token does not match any event
>
> Do not build any other endpoints or any frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 2.8 — Meal Scanning Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The previous endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the meal scanning endpoints exactly as defined in Section 7.9 (Meal Scanning):
>
> - POST /api/events/:eventId/meal/scan
> - POST /api/events/:eventId/meal/scan/override
> - GET /api/events/:eventId/meal/sessions/:sessionId/count
>
> Every endpoint must:
>
> - Use the shared auth middleware from /src/lib/auth/middleware.ts
> - Enforce role permissions as defined in Section 4
>
> The POST /api/events/:eventId/meal/scan endpoint must:
>
> - Look up the participant by qr_code value
> - Return { eligible: false, reason: "not_found", message: "QR code not recognized." } if no participant matches
> - Return { eligible: false, reason: "not_approved", message: "This participant's payment has not been approved." } if the participant's payment_status is not 'approved'
> - Check the meal_checkins table for an existing record matching (participant_id, session_id)
> - Return { eligible: false, reason: "already_served", message: "This participant has already received their meal for this session." } if a checkin already exists (Business Logic Rule 4)
> - If eligible — create a meal_checkins record and return { eligible: true, participant: { full_name, category }, session: { name } }
> - Write to audit_logs for every scan outcome including duplicates and not found
>
> The POST /api/events/:eventId/meal/scan/override endpoint must:
>
> - Require override_reason in the request body
> - Return 400 Bad Request if override_reason is empty, missing, or whitespace only (Business Logic Rule 5)
> - Create a meal_checkins record with is_override TRUE and override_reason populated
> - Write a full audit_logs entry including the override_reason and staff user ID
>
> Do not build any other endpoints or frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 2.9 — Reporting Endpoints

Copy and paste this prompt, then paste the full MD file and all backend code built so far after it:

---

> The previous endpoints have already been built. The code is included below.
>
> Your job now is to build ONLY the reporting endpoints exactly as defined in Section 7.10 (Reporting):
>
> - GET /api/events/:eventId/reports/registration
> - GET /api/events/:eventId/reports/meals
> - GET /api/events/:eventId/reports/payments
> - GET /api/events/:eventId/reports/audit
> - GET /api/events/:eventId/reports/export
>
> Every endpoint must:
>
> - Use the shared auth middleware from /src/lib/auth/middleware.ts
> - Enforce role permissions — only Organizer, Finance Team, and Super Admin can access reports
> - Filter all queries by tenant_id from the authenticated user
>
> The export endpoint must:
>
> - Accept query params: ?type=csv|pdf|excel and ?report=registration|meals|payments|audit
> - Return the correct file download response with the correct Content-Type header for each format:
>   - CSV: text/csv
>   - PDF: application/pdf
>   - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
> - Return 400 Bad Request if type or report param is missing or invalid
>
> The audit report endpoint must support optional query param filters: ?action=string, ?user_id=string, ?from=date, ?to=date
>
> Do not build any frontend code.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

---

# STEP 3 — BUILD THE OFFLINE MODE / PWA

**Tool:** Cursor
**This must be done AFTER the backend is fully built and BEFORE the frontend**

This step implements the full offline capability described in Section 12 of the specification.

---

### STEP 3.1 — PWA Manifest and Service Worker

Copy and paste this prompt, then paste the full MD file and all backend code after it:

---

> The full backend API for the Elira event platform has been built. The code is included below.
>
> Your job now is to set up the Progressive Web App (PWA) foundation exactly as described in Section 12 (Offline Mode Specification) and Section 3.3 (Offline Architecture) of the specification document.
>
> Do the following:
>
> 1. Create a PWA manifest file at /public/manifest.json with:
>
>    - App name: "Elira Event Platform"
>    - Short name: "Elira"
>    - Start URL: "/"
>    - Display: "standalone"
>    - Background color: white
>    - Theme color matching the Elira brand
>    - App icons (provide placeholder icon references)
> 2. Register the PWA manifest in the Next.js app layout
> 3. Create a Service Worker at /public/sw.js that:
>
>    - Caches the app shell on install (HTML, CSS, JavaScript, static assets)
>    - Intercepts fetch requests and serves from cache when offline
>    - Falls back to network when online
>    - Uses a cache-first strategy for static assets
>    - Uses a network-first strategy for API calls
> 4. Register the Service Worker in the Next.js app — add registration code to the root layout that runs only in the browser
>
> Do not build IndexedDB or sync logic yet — that is the next step.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL BACKEND CODE BUILT SO FAR HERE]

---

### STEP 3.2 — IndexedDB Setup

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The Service Worker and PWA manifest have been set up. The code is included below.
>
> Your job now is to create the complete IndexedDB setup using the 'idb' npm library. Create a file at /src/lib/offline/db.ts that:
>
> Sets up an IndexedDB database called 'elira-offline' with the following object stores:
>
> - 'events' — stores event details (keyPath: 'id')
> - 'categories' — stores participant categories (keyPath: 'id', with index on 'event_id')
> - 'sessions' — stores meal sessions (keyPath: 'id', with index on 'event_id')
> - 'participants' — stores approved participant records with QR codes (keyPath: 'id', with index on 'qr_code' and index on 'event_id')
> - 'checkins' — stores meal checkin records (keyPath: 'id', with compound index on ['participant_id', 'session_id'])
> - 'sync_queue' — stores pending offline operations (keyPath: 'id', with index on 'synced')
>
> Export typed helper functions for each store:
>
> - getEvent, saveEvent, getAllEvents
> - getCategories, saveCategory
> - getSessions, saveSession
> - getParticipantByQrCode, saveParticipant, getAllParticipants
> - getCheckin, saveCheckin, getCheckinsBySession
> - addToSyncQueue, getSyncQueue, markSynced, clearSynced
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

### STEP 3.3 — Offline Data Sync Logic

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The IndexedDB setup is complete. The code is included below.
>
> Your job now is to build the complete offline sync logic. Create a file at /src/lib/offline/sync.ts that handles:
>
> 1. INITIAL DATA DOWNLOAD — a function called syncFromServer() that:
>
>    - Fetches all event data, categories, sessions, and approved participants for the current user's assigned event from the API
>    - Saves everything to IndexedDB using the helper functions from /src/lib/offline/db.ts
>    - Should be called when the app loads and the device is online
> 2. OFFLINE REGISTRATION — a function called registerParticipantOffline(data) that:
>
>    - Generates a QR code locally using the 'qrcode' npm library
>    - Creates a participant record in IndexedDB with a temporary ID prefixed 'LOCAL_'
>    - Adds an operation to the sync_queue: { action: 'register_participant', data, timestamp: ISO string, synced: false }
>    - Returns the participant record including the locally generated QR code
> 3. OFFLINE MEAL SCAN — a function called scanMealOffline(qr_code, session_id) that:
>
>    - Looks up the participant by QR code in IndexedDB
>    - Checks the local checkins store for a duplicate (participant_id + session_id)
>    - If duplicate — returns { eligible: false, reason: 'already_served' }
>    - If not found — returns { eligible: false, reason: 'not_found' }
>    - If eligible — saves checkin to IndexedDB and adds to sync_queue, returns { eligible: true, participant }
> 4. BACKGROUND SYNC — a function called processSyncQueue() that:
>
>    - Reads all unsynced operations from sync_queue ordered by timestamp ascending
>    - For each operation sends it to the correct API endpoint
>    - On success — marks the operation as synced and updates local IDs if the server returns a new ID
>    - On conflict — marks the operation as conflict: true
>    - Runs automatically when the online event fires on the window object
>    - Also register this function as a Background Sync event handler in the Service Worker
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

### STEP 3.4 — Offline Status Indicator Component

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The offline sync logic is complete. The code is included below.
>
> Your job now is to create a single reusable React component at /src/components/OfflineIndicator.tsx that:
>
> - Listens to the browser's online and offline events
> - When offline — displays a subtle banner or badge at the top of the screen with the message "Offline — changes will sync when connected"
> - When online and sync queue is empty — shows nothing
> - When online and sync is in progress — shows a brief "Syncing..." message
> - When sync completes — the indicator disappears
>
> Add this component to the root layout so it appears on every page automatically.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

---

# STEP 4 — BUILD THE FRONTEND

**Tool:** Lovable, v0, or Cursor
**Important:** Every prompt must include the full MD file AND all previously generated code.

---

### STEP 4.1 — Public Pages

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> I am building a multi-tenant SaaS event management platform called Elira using Next.js 14. The database, backend API, and offline mode have all been built — the code is included below.
>
> Your job now is to build ONLY the public pages that require no authentication, exactly as defined in Section 9.1 (Public Pages) of the specification:
>
> - Online Pre-Registration Page — route: /register/[registrationLinkToken]
>
>   - Display event name, logo, date, venue, and registration form
>   - Form fields: full name, address, category dropdown
>   - On submit: call POST /api/public/register/:token
>   - On success: hide the form and show the thank you message from the API response
>   - On error: show error message and keep form data intact
> - Login Page — route: /login
>
>   - Email and password fields
>   - Forgot Password link
>   - On submit: call POST /api/auth/login
>   - On success: redirect to the correct dashboard based on the user's role
> - Accept Invite Page — route: /invite/[token]
>
>   - Show invitee name and assigned role
>   - Password and confirm password fields
>   - On submit: call POST /api/auth/accept-invite
>   - On expired token: show "This invite has expired. Please ask your organizer to resend the invite."
> - Forgot Password Page — route: /forgot-password
>
>   - Email input
>   - On submit: call POST /api/auth/reset-password-request
>   - On success: show "Password reset instructions have been sent to your email."
> - Reset Password Page — route: /reset-password
>
>   - New password and confirm password fields
>   - On submit: call POST /api/auth/reset-password
>   - On success: redirect to /login
>
> Do not build any authenticated pages yet.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

### STEP 4.2 — Super Admin Pages

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The public pages have already been built. The code is included below.
>
> Your job now is to build ONLY the Super Admin pages exactly as defined in Section 9.2 (Super Admin Pages):
>
> - Super Admin Dashboard — route: /admin
>
>   - Show total organizers, total events platform-wide, recent activity
> - Manage Organizers — route: /admin/organizers
>
>   - Table: organizer name, email, status badge, number of events, date created
>   - Actions: Create new organizer button, suspend/activate toggle per row
>   - API call: GET /api/admin/tenants
> - Create Organizer — route: /admin/organizers/new
>
>   - Form fields: name, email, phone (optional)
>   - API call on submit: POST /api/admin/tenants
>   - On success: return to organizer list with "Invite sent to [email]" message
> - Organizer Details — route: /admin/organizers/[id]
>
>   - Show organizer info and list of their events
>   - Actions: suspend/activate, edit name and phone
>   - API call: GET /api/admin/tenants/:id
>
> All these pages must be accessible ONLY to users with role 'super_admin'. Redirect all other roles to /login.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

### STEP 4.3 — Organizer Pages

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The previous pages have already been built. The code is included below.
>
> Your job now is to build ONLY the Organizer pages exactly as defined in Section 9.3 (Organizer Pages):
>
> - Organizer Dashboard — route: /dashboard
>
>   - List all events with name, date, status badge, registration count, payment count
>   - Create new event button
>   - API call: GET /api/events
> - Create Event — route: /events/new
>
>   - Fields: event name, start date, end date, venue, logo upload, payment required toggle, payment rules (shown only if payment required is on)
>   - API call: POST /api/events
> - Event Overview — route: /events/[id]
>
>   - Show event details, quick stats, the public registration link (copyable)
>   - Navigation tabs linking to: Categories, Sessions, Staff, Participants, Reports
>   - API call: GET /api/events/:id
> - Manage Categories — route: /events/[id]/categories
>
>   - List categories with name and fee. Add, edit, delete buttons.
>   - On delete: show 409 conflict message if participants are assigned
> - Manage Meal Sessions — route: /events/[id]/sessions
>
>   - List sessions with name, date, start and end time. Add, edit, delete buttons.
>   - On delete: show 409 conflict message if checkins exist
> - Manage Staff — route: /events/[id]/staff
>
>   - Two sections: Active Staff table and Pending Invites table
>   - Invite staff button opens a form: name, email, role dropdown
>   - Resend invite button on expired pending invites
>   - Remove staff button with confirmation dialog
> - View Participants — route: /events/[id]/participants
>
>   - Table: name, category, payment status badge, registration type, registration date
>   - Filter by status, search by name
>   - API call: GET /api/events/:id/participants
> - Reports — route: /events/[id]/reports
>
>   - Tabs: Registration, Meals, Payments, Audit Log
>   - Export button on each tab for CSV, PDF, Excel
>
> All pages accessible only to users with role 'organizer'. Redirect others to /login.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

### STEP 4.4 — Registration Staff Pages

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The previous pages have already been built. The code is included below.
>
> Your job now is to build ONLY the Registration Staff pages exactly as defined in Section 9.4 (Registration Staff Pages):
>
> - Registration Dashboard — route: /events/[id]/register
>
>   - Two large buttons: "New Registration" and "Search Pre-Registered"
>   - Show today's registration count
> - New On-Site Registration Form — route: /events/[id]/register/new
>
>   - Fields: full name (required), address (required), category dropdown (required)
>   - Receipt number field — show this field ONLY if the event's payment_required is TRUE. Hide it completely if payment_required is FALSE.
>   - Submit button label: "Approve & Generate QR" when payment required, "Register" when not required
>   - API calls: POST /api/events/:id/participants then PATCH .../approve
>   - On success: navigate to the Sticker Print Preview page automatically
>   - This page must also work offline using the registerParticipantOffline() function from /src/lib/offline/sync.ts when the device is offline
> - Search Pre-Registered — route: /events/[id]/register/search
>
>   - Search input — trigger live search after 2 characters typed
>   - API call: GET /api/events/:id/participants/search?name=
>   - On result click: navigate to Participant Approval Screen
> - Participant Approval Screen — route: /events/[id]/register/participant/[participantId]
>
>   - Show participant name, address, category, current payment status
>   - Receipt number input (only if payment_required is TRUE)
>   - Approve button and Decline button
>   - API calls: PATCH .../approve or .../decline
>   - On approval: navigate to Sticker Print Preview automatically
> - Sticker Print Preview — route: /events/[id]/register/print/[participantId]
>
>   - Show the sticker layout exactly as specified in Section 11 of the specification document:
>     - Event logo top left
>     - Event name top right
>     - Participant full name large bold center (uppercase)
>     - Category badge below name
>     - QR code center (render the qr_code value from the participant record as an SVG image using the qrcode npm library)
>     - "Powered by Elira Technologies" footer small text bottom center
>   - Print button triggers window.print()
>   - Use @media print CSS to hide ALL other UI elements — only the sticker component prints
>   - After print dialog closes, navigate back to Registration Dashboard automatically
>
> All pages accessible only to 'registration_staff' role. Redirect others to /login.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

### STEP 4.5 — Catering Staff Pages

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The previous pages have already been built. The code is included below.
>
> Your job now is to build ONLY the Catering Staff meal scanning screen exactly as defined in Section 9.5 (Catering Staff Pages):
>
> - Meal Scanning Screen — route: /events/[id]/scan
>
> This page must work as follows:
>
> 1. At the top: a session selector dropdown populated from GET /api/events/:id/sessions
> 2. A QR code input field that is ALWAYS auto-focused — the physical USB/Bluetooth scanner gun types directly into this field like a keyboard. Never let this field lose focus.
> 3. The system must auto-submit as soon as a complete QR code value is received — do NOT require the staff member to press any button. Detect input completion by listening for the Enter key or a short debounce timer after input stops.
> 4. After receiving input, call POST /api/events/:id/meal/scan
> 5. Display the result as a LARGE full-screen color response:
>    - GREEN full screen with participant name and category: eligible — serve the meal
>    - RED full screen with reason message: not eligible — do not serve
> 6. The "Override" button appears ONLY after a RED result. On click: show a text input for override reason, then call POST /api/events/:id/meal/scan/override
> 7. After showing a result for 3 seconds, clear the input field and refocus it automatically — ready for the next scan
> 8. Show a running meal count: "X served this session" — updated after every successful scan via GET /api/events/:id/meal/sessions/:sessionId/count
> 9. This page must also work offline using the scanMealOffline() function from /src/lib/offline/sync.ts when the device is offline
>
> This page is accessible only to users with role 'catering_staff'. Redirect others to /login.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

### STEP 4.6 — Finance Team Pages

Copy and paste this prompt, then paste the full MD file and all code built so far after it:

---

> The previous pages have already been built. The code is included below.
>
> Your job now is to build ONLY the Finance Team pages exactly as defined in Section 9.6 (Finance Team Pages):
>
> - Payments Overview — route: /events/[id]/payments
>   - Summary bar at top: Total Approved count, Total Declined count, Total Pending count
>   - Full participant table: name, category, payment status badge, receipt number
>   - Filter by status dropdown (all / approved / declined / pending)
>   - Search input by participant name or receipt number
>   - Three export buttons: Export CSV, Export PDF, Export Excel — each calls GET /api/events/:id/reports/export with the correct type and report params
>   - API call: GET /api/events/:id/reports/payments
>
> This page is accessible only to users with role 'finance_team'. Redirect others to /login.
>
> [PASTE FULL MD FILE HERE]
>
> [PASTE ALL CODE BUILT SO FAR HERE]

---

---

# COMPLETE BUILD SUMMARY

| Step | What to Build                             | Tool                | Prompts      |
| ---- | ----------------------------------------- | ------------------- | ------------ |
| 0.1  | Create Next.js project + install packages | Terminal / Cursor   | 1 prompt     |
| 0.2  | Set up environment variables              | Manual              | Manual setup |
| 0.3  | Configure Supabase client                 | Cursor              | 1 prompt     |
| 1.1  | Create all database tables                | Supabase SQL Editor | 1 prompt     |
| 1.2  | Create RLS policies                       | Supabase SQL Editor | 1 prompt     |
| 2.1  | Auth middleware + auth endpoints          | Cursor / Bolt       | 1 prompt     |
| 2.2  | Super Admin endpoints                     | Cursor / Bolt       | 1 prompt     |
| 2.3  | Events endpoints                          | Cursor / Bolt       | 1 prompt     |
| 2.4  | Categories + Sessions endpoints           | Cursor / Bolt       | 1 prompt     |
| 2.5  | Staff management endpoints                | Cursor / Bolt       | 1 prompt     |
| 2.6  | Participants endpoints + QR generation    | Cursor / Bolt       | 1 prompt     |
| 2.7  | Public pre-registration endpoints         | Cursor / Bolt       | 1 prompt     |
| 2.8  | Meal scanning endpoints                   | Cursor / Bolt       | 1 prompt     |
| 2.9  | Reporting + export endpoints              | Cursor / Bolt       | 1 prompt     |
| 3.1  | PWA manifest + Service Worker             | Cursor              | 1 prompt     |
| 3.2  | IndexedDB setup                           | Cursor              | 1 prompt     |
| 3.3  | Offline sync logic                        | Cursor              | 1 prompt     |
| 3.4  | Offline status indicator component        | Cursor              | 1 prompt     |
| 4.1  | Public pages                              | Lovable / v0        | 1 prompt     |
| 4.2  | Super Admin pages                         | Lovable / v0        | 1 prompt     |
| 4.3  | Organizer pages                           | Lovable / v0        | 1 prompt     |
| 4.4  | Registration Staff pages + sticker print  | Lovable / v0        | 1 prompt     |
| 4.5  | Catering Staff meal scanning screen       | Lovable / v0        | 1 prompt     |
| 4.6  | Finance Team pages                        | Lovable / v0        | 1 prompt     |

**Total: 23 focused prompts.**

---

## GOLDEN RULES — READ BEFORE YOU START

1. **Always paste the full MD specification file** into every single prompt before anything else
2. **Always paste all previously generated code** below the MD file in every new prompt
3. **Never skip a step** — each step depends on the one before it
4. **Push to GitHub after every step** — this protects your work and lets you switch tools if needed
5. **If an AI makes a mistake** — copy the wrong code, paste it back, and say: "This code has an error. Here is what is wrong: [describe the problem]. Please fix it."
6. **If you run out of credits** — push everything to GitHub, start a new session in a different tool, paste the MD file and all existing code, and continue from where you left off

---

*Build guide prepared for Elira Technologies — Elira Event Platform v1.0*
