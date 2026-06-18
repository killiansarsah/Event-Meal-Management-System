# Event Participant Registration, Payment & Food Attendance Checking System
## Technical Specification Document

**Project Owner:** Elira Technologies  
**Client Contact:** Kelvin Elikem Sedziafa  
**Email:** comp@theelira.com  
**Website:** www.theelira.com  
**BRS Version Referenced:** v1.2  
**Spec Version:** 1.0  
**Status:** Final — Ready for Development  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Database Schema](#5-database-schema)
6. [Authentication & Security](#6-authentication--security)
7. [API Endpoints](#7-api-endpoints)
8. [Module Flows](#8-module-flows)
9. [Frontend Pages & Components](#9-frontend-pages--components)
10. [Business Logic Rules](#10-business-logic-rules)
11. [Sticker / Badge Design Specification](#11-sticker--badge-design-specification)
12. [Offline Mode Specification](#12-offline-mode-specification)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Future Phases](#14-future-phases)

---

## 1. Project Overview

### 1.1 What Is This System?

This is a **multi-tenant SaaS (Software as a Service) web application** built and owned by Elira Technologies. It manages the full lifecycle of event participation — from participant registration and payment verification, to QR code generation, badge/sticker printing, and meal attendance tracking.

It is designed for use at conferences, church events, corporate gatherings, and any similar events where participant registration and meal management are required.

### 1.2 Who Owns It?

Elira Technologies owns and operates the platform. Multiple event organizers (clients) use it independently to manage their own events. Each organizer's data is completely isolated from every other organizer on the platform.

### 1.3 Core Problems It Solves

- Eliminates paper-based registration and manual meal tracking
- Prevents food fraud by blocking duplicate meal claims via QR scanning
- Provides real-time visibility into registrations, payments, and meal attendance
- Streamlines the full registration process — payment verification, QR generation, and sticker printing in one workflow
- Scales to events with up to 10,000 participants

### 1.4 Multi-Tenant Architecture

The platform is multi-tenant. This means:
- One platform serves many event organizers (tenants)
- Each organizer logs in and manages only their own events and data
- No organizer can access another organizer's data under any circumstances
- Elira's Super Admin can view and manage all events and organizers across the entire platform

### 1.5 Two Development Phases

**Phase 1 — Current Build:**
- Full web application accessible in any browser
- QR code scanning via physical USB or Bluetooth scanner gun connected to a laptop
- All core features: registration, payment verification, QR generation, sticker printing, meal scanning, offline support, and reporting

**Phase 2 — Future:**
- Dedicated mobile application for QR code scanning using a phone camera
- The backend API built in Phase 1 must fully support Phase 2 without any rebuilding
- Payment gateway integration (e.g. Paystack for the Ghanaian market)

---

## 2. Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | Next.js (React) | Best support across all AI building tools (Lovable, Bolt, Cursor, v0), unified codebase with backend, excellent ecosystem |
| Backend | Next.js API Routes | Lives in the same codebase as the frontend — no separate server project needed |
| Database | PostgreSQL via Supabase | Supports Row Level Security for multi-tenant data isolation, handles complex reporting queries, industry standard for SaaS |
| Authentication | Supabase Auth | Same platform as the database — user identity and roles in one place, no per-user pricing limits, handles invite emails and password resets natively |
| QR Code Generation | qrcode (npm library) | Simple, free, generates QR codes instantly without any external service |
| QR Code Scanning — Phase 1 | Physical USB / Bluetooth Scanner Gun | Plugs into laptop, types QR value directly into browser input field like a keyboard — no additional code needed |
| QR Code Scanning — Phase 2 | Mobile App (Future) | Phone camera based, connects to the same backend API built in Phase 1 |
| Offline Support | PWA + IndexedDB + Background Sync API | App works fully without internet connection, auto-syncs all data when internet returns |
| Sticker Printing | Browser Print API with custom CSS | No third-party print service needed, works with any printer connected to the laptop |
| Frontend Hosting | Vercel | Built by the Next.js team, one-click deployment, free tier available |
| Database / Auth Hosting | Supabase | Managed PostgreSQL, generous free tier, built-in auth and file storage |

---

## 3. System Architecture

### 3.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT DEVICES                        │
│   Laptop (Registration Desk)   Phone (Meal Scanning)    │
│            PWA — Works Offline                          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│              Next.js Application (Vercel)               │
│   ┌─────────────────┐   ┌──────────────────────────┐   │
│   │  Frontend Pages  │   │   Backend API Routes     │   │
│   │  (React / UI)    │   │   (/api/* endpoints)     │   │
│   └─────────────────┘   └──────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ Supabase Client
┌──────────────────────▼──────────────────────────────────┐
│                      Supabase                           │
│   ┌──────────────┐  ┌────────────┐  ┌───────────────┐  │
│   │  PostgreSQL  │  │  Auth      │  │  Storage      │  │
│   │  (RLS on)    │  │  (JWT)     │  │  (Logos/Files)│  │
│   └──────────────┘  └────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Multi-Tenancy Implementation

- Every database table storing event or participant data includes a `tenant_id` column
- Row Level Security (RLS) policies are enabled on all tables
- RLS enforces that users can only query rows where `tenant_id` matches their own tenant
- This isolation is enforced at the **database level** — not just application code
- Even if there is a bug in application code, the database will refuse to return another organizer's data
- The `tenant_id` used in queries is always read from the authenticated user's record — never from the request body

### 3.3 Offline Architecture

- The web app is registered as a **Progressive Web App (PWA)**
- A Service Worker caches the app shell (HTML, CSS, JavaScript) for offline use
- **IndexedDB** stores event data, participant records, QR codes, meal sessions, and checkin records locally on the device
- When offline, all registration and meal scan operations are written to IndexedDB first and added to a sync queue
- When internet returns, the **Background Sync API** automatically sends all queued operations to the server in timestamp order
- Conflicts are resolved server-side — no manual intervention required from staff

---

## 4. User Roles & Permissions

### 4.1 Role Definitions

| Role | Description |
|------|-------------|
| Super Admin | Elira Technologies staff. Full platform-wide access. Creates and manages all organizer accounts. |
| Organizer | Event client. Self-manages their own events, participant categories, meal sessions, and staff accounts. |
| Registration Staff | Registers participants on-site, verifies payments, and prints stickers. Scoped to one event. |
| Catering Staff | Scans participant QR codes at meal distribution points. Scoped to one event. |
| Finance Team | Views and reconciles payment records and reports. Scoped to one event. |

### 4.2 Permissions Matrix

| Action | Super Admin | Organizer | Registration Staff | Catering Staff | Finance Team |
|--------|:-----------:|:---------:|:-----------------:|:--------------:|:------------:|
| View all organizer accounts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create organizer account | ✅ | ❌ | ❌ | ❌ | ❌ |
| Suspend organizer account | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create event | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit event details | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure participant categories | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure meal sessions | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite and manage staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Register participant on-site | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve participant payment | ✅ | ✅ | ✅ | ❌ | ❌ |
| Decline participant payment | ✅ | ✅ | ✅ | ❌ | ❌ |
| Print participant sticker | ✅ | ✅ | ✅ | ❌ | ❌ |
| Scan QR code at meal point | ✅ | ✅ | ❌ | ✅ | ❌ |
| Perform manual meal override | ✅ | ✅ | ❌ | ✅ | ❌ |
| View payment records | ✅ | ✅ | ❌ | ❌ | ✅ |
| View reports and dashboard | ✅ | ✅ | ❌ | ❌ | ✅ |
| Export reports | ✅ | ✅ | ❌ | ❌ | ✅ |
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.3 Role Scoping Rules

- **Super Admin** sees ALL data across ALL organizers and ALL events on the platform
- **Organizer** sees only events they created under their own tenant
- **Registration Staff, Catering Staff, Finance Team** are scoped to a single specific event — they cannot see any other events, even within the same tenant
- An organizer can have multiple events; staff are always assigned to exactly one event

---

## 5. Database Schema

### 5.1 General Conventions

- All primary keys use `UUID` type with `DEFAULT gen_random_uuid()`
- All tables include `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- Tables that can be updated include `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`
- All foreign keys enforce referential integrity
- `tenant_id` is present on all tables that require RLS isolation

### 5.2 Tables

---

#### `tenants`
Represents each event organizer (client) on the platform.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique tenant identifier |
| name | VARCHAR(255) | NOT NULL | Organization or person name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Login email address |
| phone | VARCHAR(50) | NULLABLE | Contact phone number |
| status | ENUM('active', 'suspended') | NOT NULL, DEFAULT 'active' | Account status |
| created_by | UUID | FK → users.id, NULLABLE | Super Admin who created this account |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

#### `users`
All system users across all roles. The `id` matches the Supabase Auth user ID.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Matches Supabase Auth user ID |
| tenant_id | UUID | FK → tenants.id, NULLABLE | NULL for Super Admin only |
| event_id | UUID | FK → events.id, NULLABLE | NULL for Organizer and Super Admin. Set for staff. |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| full_name | VARCHAR(255) | NOT NULL | User full name |
| role | ENUM('super_admin', 'organizer', 'registration_staff', 'catering_staff', 'finance_team') | NOT NULL | Assigned role |
| status | ENUM('active', 'inactive', 'pending') | NOT NULL, DEFAULT 'pending' | Account status — pending until invite accepted |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

#### `events`
Events created and managed by organizers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique event identifier |
| tenant_id | UUID | NOT NULL, FK → tenants.id | Owning organizer (tenant) |
| name | VARCHAR(255) | NOT NULL | Event name |
| date_start | DATE | NOT NULL | Event start date |
| date_end | DATE | NOT NULL | Event end date |
| venue | VARCHAR(500) | NOT NULL | Event venue name and location |
| logo_url | VARCHAR(500) | NULLABLE | URL to event logo stored in Supabase Storage |
| payment_required | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether payment is required for registration |
| payment_rules | JSONB | NULLABLE | Payment configuration: full payment, deposit allowed, payment deadlines |
| status | ENUM('draft', 'active', 'completed', 'cancelled') | NOT NULL, DEFAULT 'draft' | Event lifecycle status |
| registration_link_token | VARCHAR(255) | UNIQUE, NOT NULL | Unique token used to generate the public pre-registration URL |
| created_by | UUID | NOT NULL, FK → users.id | Organizer who created the event |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

#### `participant_categories`
Categories defined per event (e.g. VIP, Regular, Student).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique category identifier |
| event_id | UUID | NOT NULL, FK → events.id | Parent event |
| tenant_id | UUID | NOT NULL, FK → tenants.id | For RLS — must match event's tenant |
| name | VARCHAR(100) | NOT NULL | Category name (e.g. VIP, Regular, Student) |
| registration_fee | DECIMAL(10, 2) | NOT NULL, DEFAULT 0.00 | Registration fee for this category |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

#### `meal_sessions`
Meal sessions configured per event (e.g. Breakfast, Lunch, Dinner).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique session identifier |
| event_id | UUID | NOT NULL, FK → events.id | Parent event |
| tenant_id | UUID | NOT NULL, FK → tenants.id | For RLS |
| name | VARCHAR(100) | NOT NULL | Session name (e.g. Breakfast, Lunch, Dinner) |
| date | DATE | NOT NULL | Date this session takes place |
| start_time | TIME | NOT NULL | Session start time |
| end_time | TIME | NOT NULL | Session end time |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

---

#### `participants`
All registered participants per event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique participant identifier |
| event_id | UUID | NOT NULL, FK → events.id | Parent event |
| tenant_id | UUID | NOT NULL, FK → tenants.id | For RLS |
| full_name | VARCHAR(255) | NOT NULL | Participant full name |
| address | TEXT | NOT NULL | Participant address |
| category_id | UUID | NULLABLE, FK → participant_categories.id | Assigned participant category |
| receipt_number | VARCHAR(100) | NULLABLE | Payment receipt number — required only if event payment_required is true |
| payment_status | ENUM('pending', 'approved', 'declined') | NOT NULL, DEFAULT 'pending' | Current payment status |
| qr_code | TEXT | UNIQUE, NULLABLE | QR code data string — generated ONLY when payment_status is set to 'approved' |
| registered_online | BOOLEAN | NOT NULL, DEFAULT FALSE | TRUE if participant self-registered via public link |
| registered_by | UUID | NULLABLE, FK → users.id | Staff member who registered — NULL if self-registered online |
| approved_by | UUID | NULLABLE, FK → users.id | Staff member who approved payment |
| approved_at | TIMESTAMP | NULLABLE | Timestamp when payment was approved |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

#### `meal_checkins`
Records every meal scan attempt — both successful and overridden.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique checkin identifier |
| participant_id | UUID | NOT NULL, FK → participants.id | Participant who was scanned |
| session_id | UUID | NOT NULL, FK → meal_sessions.id | Meal session being checked into |
| event_id | UUID | NOT NULL, FK → events.id | Parent event |
| tenant_id | UUID | NOT NULL, FK → tenants.id | For RLS |
| scanned_by | UUID | NOT NULL, FK → users.id | Staff member who performed the scan |
| is_override | BOOLEAN | NOT NULL, DEFAULT FALSE | TRUE if this was a manual override scan |
| override_reason | TEXT | NULLABLE | Required and must be non-empty when is_override is TRUE |
| scanned_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Exact timestamp of scan |

**Unique Constraint:** `UNIQUE (participant_id, session_id)` — prevents any participant from checking into the same meal session more than once.

---

#### `staff_invites`
Tracks pending and accepted staff invitation links.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique invite identifier |
| event_id | UUID | NOT NULL, FK → events.id | Event the staff member is being invited to |
| tenant_id | UUID | NOT NULL, FK → tenants.id | Owning organizer |
| email | VARCHAR(255) | NOT NULL | Invitee email address |
| full_name | VARCHAR(255) | NOT NULL | Invitee full name |
| role | ENUM('registration_staff', 'catering_staff', 'finance_team') | NOT NULL | Role being assigned |
| invited_by | UUID | NOT NULL, FK → users.id | Organizer who sent the invite |
| token | VARCHAR(500) | NOT NULL, UNIQUE | Unique secure invite token |
| status | ENUM('pending', 'accepted', 'expired') | NOT NULL, DEFAULT 'pending' | Current invite status |
| expires_at | TIMESTAMP | NOT NULL | Expiry time — 48 hours after creation |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Invite creation timestamp |

---

#### `audit_logs`
Immutable record of every action taken in the system. INSERT ONLY — records are never updated or deleted.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique log entry identifier |
| user_id | UUID | NOT NULL, FK → users.id | User who performed the action |
| tenant_id | UUID | NULLABLE, FK → tenants.id | For RLS — NULL for platform-level actions |
| event_id | UUID | NULLABLE, FK → events.id | Related event if applicable |
| action | VARCHAR(100) | NOT NULL | Action type (see action types below) |
| entity_type | VARCHAR(100) | NULLABLE | Type of entity affected (e.g. 'participant', 'meal_checkin') |
| entity_id | UUID | NULLABLE | ID of the affected entity |
| details | JSONB | NULLABLE | Additional context (e.g. receipt number, override reason) |
| ip_address | VARCHAR(50) | NULLABLE | IP address of the user at time of action |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Exact timestamp of action |

**Audit Log Action Types:**

| Action Value | Trigger |
|-------------|---------|
| `participant_registered` | New participant record created |
| `participant_approved` | Payment status set to approved |
| `participant_declined` | Payment status set to declined |
| `qr_code_generated` | QR code created for participant |
| `sticker_printed` | Sticker print triggered by staff |
| `meal_scanned` | Successful meal check-in recorded |
| `meal_scan_duplicate` | Duplicate scan attempt blocked |
| `meal_scan_not_found` | QR code not recognized |
| `meal_scan_not_approved` | Scan attempted for unapproved participant |
| `meal_override` | Manual override performed at meal point |
| `staff_invited` | Staff invitation email sent |
| `staff_invite_accepted` | Staff accepted invitation and created account |
| `staff_removed` | Staff removed from event |
| `event_created` | New event created |
| `event_updated` | Event details modified |
| `organizer_created` | New organizer account created by Super Admin |
| `organizer_suspended` | Organizer account suspended |
| `password_reset_requested` | Password reset email triggered |

### 5.3 Entity Relationships

```
tenants
  └── events (tenant_id)
        ├── participant_categories (event_id)
        ├── meal_sessions (event_id)
        │
        ├── participants (event_id)
        │     └── meal_checkins (participant_id + session_id)
        │
        └── staff_invites (event_id)

users
  ├── tenant_id → tenants (NULL for Super Admin)
  └── event_id → events (NULL for Organizer + Super Admin, set for all staff)
```

---

## 6. Authentication & Security

### 6.1 Supabase Auth

All authentication is handled by **Supabase Auth**. It manages:
- User identity (email and password)
- JWT session tokens
- Password reset email delivery
- Staff invitation email delivery

The `users` table in PostgreSQL mirrors the Supabase Auth user — the `users.id` matches the Supabase Auth `user.id` exactly.

### 6.2 Login Flow

1. User visits `/login`
2. Enters email and password
3. Supabase Auth verifies credentials and returns a JWT session token
4. App reads the user's `role`, `tenant_id`, and `event_id` from the `users` table
5. User is redirected to their role-appropriate dashboard

### 6.3 Staff Invitation Flow

1. Organizer opens Staff Management for their event
2. Enters staff member's full name, email, and selects role
3. System creates a record in `staff_invites` with a unique token and 48-hour expiry
4. Supabase Auth sends the invite email containing the link: `/invite/:token`
5. Staff clicks the link and is taken to the Accept Invite page
6. If token is expired — error is shown, organizer must resend
7. If token is valid — staff sets their password
8. Supabase Auth creates the user account
9. System creates a `users` record with the correct `role`, `tenant_id`, and `event_id`
10. `staff_invites` record status updated to `'accepted'`
11. Staff is redirected to their role-appropriate dashboard

### 6.4 Password Reset Flow

1. User clicks "Forgot Password" on the login page
2. Enters their email address
3. Supabase Auth sends a password reset email automatically
4. User clicks the reset link in the email
5. User is taken to the Reset Password page
6. User enters and confirms their new password
7. Password updated via Supabase Auth
8. User is redirected to `/login` with a success message

**Note:** Password reset applies to all roles — Organizer, Registration Staff, Catering Staff, and Finance Team. The Super Admin password reset follows the same flow with the same level of security.

### 6.5 Row Level Security (RLS) Policies

RLS is enabled on all data tables. Core policies:

| Table | Policy |
|-------|--------|
| `tenants` | Super Admin reads all rows. Organizer reads only their own row. |
| `events` | Users read/write only rows where `tenant_id` matches their own. |
| `participant_categories` | Users access only rows where `tenant_id` matches their own. |
| `meal_sessions` | Users access only rows where `tenant_id` matches their own. |
| `participants` | Users access only rows where `tenant_id` matches their own. |
| `meal_checkins` | Users access only rows where `tenant_id` matches their own. |
| `staff_invites` | Organizer reads/writes only rows where `tenant_id` matches their own. |
| `audit_logs` | Users read only rows where `tenant_id` matches their own. Super Admin reads all. No user may UPDATE or DELETE audit log rows. |

### 6.6 API-Level Security

- Every protected API route validates the Supabase Auth JWT token from the request `Authorization` header
- Every API route checks the user's `role` before processing the request
- Insufficient role returns `403 Forbidden`
- `tenant_id` is always read from the authenticated user's `users` record — **never from the request body**
- HTTPS enforced on all traffic in production

---

## 7. API Endpoints

**Base URL:** `/api`  
**Authentication:** All protected endpoints require a valid Supabase Auth JWT in the request header:  
`Authorization: Bearer <token>`  
**Content-Type:** `application/json` for all requests and responses  

---

### 7.1 Authentication

#### `POST /api/auth/login`
- **Access:** Public
- **Request body:** `{ email: string, password: string }`
- **Response:** `{ user: UserObject, session: SessionObject, role: string }`
- **Description:** Authenticates a user and returns a session token

#### `POST /api/auth/logout`
- **Access:** All authenticated users
- **Request body:** None
- **Response:** `{ success: true }`
- **Description:** Invalidates the current session

#### `POST /api/auth/reset-password-request`
- **Access:** Public
- **Request body:** `{ email: string }`
- **Response:** `{ success: true }`
- **Description:** Triggers a password reset email via Supabase Auth. Always returns success to prevent email enumeration.

#### `POST /api/auth/reset-password`
- **Access:** Public (requires valid Supabase reset token)
- **Request body:** `{ new_password: string }`
- **Response:** `{ success: true }`
- **Description:** Sets a new password using the Supabase reset session

#### `POST /api/auth/accept-invite`
- **Access:** Public (requires valid invite token)
- **Request body:** `{ token: string, password: string }`
- **Response:** `{ user: UserObject, session: SessionObject }`
- **Description:** Validates invite token, creates user account in Supabase Auth and `users` table, updates `staff_invites` record to accepted

---

### 7.2 Super Admin — Organizer Management

#### `GET /api/admin/tenants`
- **Access:** Super Admin only
- **Response:** `{ tenants: TenantObject[] }`
- **Description:** Returns all organizer accounts on the platform

#### `POST /api/admin/tenants`
- **Access:** Super Admin only
- **Request body:** `{ name: string, email: string, phone?: string }`
- **Response:** `{ tenant: TenantObject }`
- **Description:** Creates a new organizer account and sends an invite email

#### `GET /api/admin/tenants/:id`
- **Access:** Super Admin only
- **Response:** `{ tenant: TenantObject, events: EventObject[] }`
- **Description:** Returns organizer details and all their events

#### `PATCH /api/admin/tenants/:id`
- **Access:** Super Admin only
- **Request body:** `{ name?: string, phone?: string, status?: 'active' | 'suspended' }`
- **Response:** `{ tenant: TenantObject }`
- **Description:** Updates organizer details or suspends/activates their account

---

### 7.3 Events

#### `GET /api/events`
- **Access:** Organizer, Super Admin
- **Response:** `{ events: EventObject[] }`
- **Description:** Returns all events belonging to the authenticated organizer

#### `POST /api/events`
- **Access:** Organizer only
- **Request body:** `{ name: string, date_start: string, date_end: string, venue: string, logo_url?: string, payment_required: boolean, payment_rules?: object }`
- **Response:** `{ event: EventObject }`
- **Description:** Creates a new event. System auto-generates a unique `registration_link_token`.

#### `GET /api/events/:id`
- **Access:** Organizer, Registration Staff, Catering Staff, Finance Team, Super Admin
- **Response:** `{ event: EventObject }`
- **Description:** Returns full event details

#### `PATCH /api/events/:id`
- **Access:** Organizer only
- **Request body:** `{ name?: string, date_start?: string, date_end?: string, venue?: string, logo_url?: string, payment_required?: boolean, payment_rules?: object, status?: string }`
- **Response:** `{ event: EventObject }`
- **Description:** Updates event details

---

### 7.4 Participant Categories

#### `GET /api/events/:eventId/categories`
- **Access:** Organizer, Registration Staff, Super Admin
- **Response:** `{ categories: CategoryObject[] }`
- **Description:** Returns all categories for the event

#### `POST /api/events/:eventId/categories`
- **Access:** Organizer only
- **Request body:** `{ name: string, registration_fee: number }`
- **Response:** `{ category: CategoryObject }`
- **Description:** Creates a new participant category

#### `PATCH /api/events/:eventId/categories/:id`
- **Access:** Organizer only
- **Request body:** `{ name?: string, registration_fee?: number }`
- **Response:** `{ category: CategoryObject }`
- **Description:** Updates a category

#### `DELETE /api/events/:eventId/categories/:id`
- **Access:** Organizer only
- **Response:** `{ success: true }`
- **Description:** Deletes a category. Returns error if any participants are currently assigned to this category.

---

### 7.5 Meal Sessions

#### `GET /api/events/:eventId/sessions`
- **Access:** Organizer, Registration Staff, Catering Staff, Super Admin
- **Response:** `{ sessions: SessionObject[] }`
- **Description:** Returns all meal sessions for the event

#### `POST /api/events/:eventId/sessions`
- **Access:** Organizer only
- **Request body:** `{ name: string, date: string, start_time: string, end_time: string }`
- **Response:** `{ session: SessionObject }`
- **Description:** Creates a new meal session

#### `PATCH /api/events/:eventId/sessions/:id`
- **Access:** Organizer only
- **Request body:** `{ name?: string, date?: string, start_time?: string, end_time?: string }`
- **Response:** `{ session: SessionObject }`
- **Description:** Updates a meal session

#### `DELETE /api/events/:eventId/sessions/:id`
- **Access:** Organizer only
- **Response:** `{ success: true }`
- **Description:** Deletes a meal session. Returns error if any checkins have been recorded for this session.

---

### 7.6 Staff Management

#### `GET /api/events/:eventId/staff`
- **Access:** Organizer, Super Admin
- **Response:** `{ staff: UserObject[], pending_invites: InviteObject[] }`
- **Description:** Returns all active staff and all pending invitations for the event

#### `POST /api/events/:eventId/staff/invite`
- **Access:** Organizer only
- **Request body:** `{ email: string, full_name: string, role: 'registration_staff' | 'catering_staff' | 'finance_team' }`
- **Response:** `{ invite: InviteObject }`
- **Description:** Creates a staff invite record and sends invite email. Token expires in 48 hours.

#### `POST /api/events/:eventId/staff/invite/:inviteId/resend`
- **Access:** Organizer only
- **Response:** `{ invite: InviteObject }`
- **Description:** Resends invite email and resets the 48-hour expiry window

#### `DELETE /api/events/:eventId/staff/:userId`
- **Access:** Organizer only
- **Response:** `{ success: true }`
- **Description:** Removes a staff member from the event and deactivates their account for this event

---

### 7.7 Participants

#### `GET /api/events/:eventId/participants`
- **Access:** Organizer, Registration Staff, Finance Team, Super Admin
- **Query params:** `?status=pending|approved|declined`, `?search=name`
- **Response:** `{ participants: ParticipantObject[], total: number }`
- **Description:** Returns participants for an event with optional status filter and name search

#### `POST /api/events/:eventId/participants`
- **Access:** Registration Staff, Organizer, Super Admin
- **Request body:** `{ full_name: string, address: string, category_id: string, receipt_number?: string }`
- **Response:** `{ participant: ParticipantObject }`
- **Description:** Registers a new participant on-site. Creates record with `payment_status: 'pending'`. If event `payment_required` is FALSE, auto-approves and generates QR code immediately.

#### `GET /api/events/:eventId/participants/search`
- **Access:** Registration Staff, Organizer, Super Admin
- **Query params:** `?name=string`
- **Response:** `{ participants: ParticipantObject[] }`
- **Description:** Searches for pre-registered participants by name for on-arrival check-in

#### `GET /api/events/:eventId/participants/:id`
- **Access:** Organizer, Registration Staff, Finance Team, Super Admin
- **Response:** `{ participant: ParticipantObject }`
- **Description:** Returns full participant details

#### `PATCH /api/events/:eventId/participants/:id/approve`
- **Access:** Registration Staff, Organizer, Super Admin
- **Request body:** `{ receipt_number: string }` (required if event `payment_required` is TRUE)
- **Response:** `{ participant: ParticipantObject }` — includes generated `qr_code` value
- **Description:** Sets payment_status to 'approved', generates a unique QR code string, logs action in audit_logs

#### `PATCH /api/events/:eventId/participants/:id/decline`
- **Access:** Registration Staff, Organizer, Super Admin
- **Request body:** `{ reason?: string }`
- **Response:** `{ participant: ParticipantObject }`
- **Description:** Sets payment_status to 'declined'. No QR code is generated. Logs action in audit_logs.

---

### 7.8 Public Pre-Registration (No Authentication Required)

#### `GET /api/public/register/:registrationLinkToken`
- **Access:** Public — no authentication required
- **Response:** `{ event: { name, date_start, date_end, venue, logo_url, categories: CategoryObject[] } }`
- **Description:** Returns public-facing event details to populate the pre-registration form

#### `POST /api/public/register/:registrationLinkToken`
- **Access:** Public — no authentication required
- **Request body:** `{ full_name: string, address: string, category_id: string }`
- **Response:** `{ success: true, message: "Thank you for registering! Please come to the event and complete your payment on arrival to receive your name tag." }`
- **Description:** Creates participant record with `payment_status: 'pending'`, `registered_online: true`, `qr_code: null`. No email is sent. Only an on-screen message is displayed.

---

### 7.9 Meal Scanning

#### `POST /api/events/:eventId/meal/scan`
- **Access:** Catering Staff, Organizer, Super Admin
- **Request body:** `{ qr_code: string, session_id: string }`
- **Response (eligible):** `{ eligible: true, participant: { full_name, category }, session: { name } }`
- **Response (already served):** `{ eligible: false, reason: "already_served", message: "This participant has already received their meal for this session." }`
- **Response (not found):** `{ eligible: false, reason: "not_found", message: "QR code not recognized." }`
- **Response (not approved):** `{ eligible: false, reason: "not_approved", message: "This participant's payment has not been approved." }`
- **Description:** Verifies meal eligibility. On eligible result, creates a `meal_checkins` record and logs in audit_logs. The UNIQUE constraint on (participant_id, session_id) enforces no duplicates.

#### `POST /api/events/:eventId/meal/scan/override`
- **Access:** Catering Staff, Organizer, Super Admin
- **Request body:** `{ qr_code: string, session_id: string, override_reason: string }`
- **Response:** `{ success: true, checkin: CheckinObject }`
- **Description:** Manual override. `override_reason` is required and must be non-empty. Creates checkin with `is_override: true`. Full details logged in audit_logs.

#### `GET /api/events/:eventId/meal/sessions/:sessionId/count`
- **Access:** Catering Staff, Organizer, Super Admin
- **Response:** `{ session_id, session_name, total_served: number, total_registered: number, overrides: number }`
- **Description:** Returns real-time meal count for a specific session

---

### 7.10 Reporting

#### `GET /api/events/:eventId/reports/registration`
- **Access:** Organizer, Finance Team, Super Admin
- **Response:** `{ total: number, by_category: CategoryCountObject[], by_status: { approved, declined, pending }, by_date: DateCountObject[] }`
- **Description:** Full registration summary report

#### `GET /api/events/:eventId/reports/meals`
- **Access:** Organizer, Finance Team, Super Admin
- **Response:** `{ sessions: [ { session_id, session_name, date, total_served, total_registered, no_shows, overrides } ] }`
- **Description:** Meal attendance report broken down per session

#### `GET /api/events/:eventId/reports/payments`
- **Access:** Organizer, Finance Team, Super Admin
- **Response:** `{ total_approved: number, total_declined: number, total_pending: number, participants: PaymentReportObject[] }`
- **Description:** Payment reconciliation report with per-participant detail

#### `GET /api/events/:eventId/reports/audit`
- **Access:** Organizer, Super Admin
- **Query params:** `?action=string`, `?user_id=string`, `?from=date`, `?to=date`
- **Response:** `{ logs: AuditLogObject[], total: number }`
- **Description:** Full audit log with optional filters by action type, user, and date range

#### `GET /api/events/:eventId/reports/export`
- **Access:** Organizer, Finance Team, Super Admin
- **Query params:** `?type=csv|pdf|excel`, `?report=registration|meals|payments|audit`
- **Response:** File download (CSV, PDF, or Excel)
- **Description:** Exports the selected report as a downloadable file

---

## 8. Module Flows

### 8.1 Organizer Onboarding Flow

1. Elira Super Admin logs into the platform
2. Navigates to Manage Organizers and clicks "Create New Organizer"
3. Enters the organizer's name and email
4. System creates a `tenants` record and sends an invite email to the organizer via Supabase Auth
5. Organizer receives the email and clicks the invite link → `/invite/:token`
6. Organizer sets their password
7. System creates a `users` record with role `'organizer'` and links it to the tenant
8. Organizer is redirected to their dashboard — empty events list

---

### 8.2 Event Setup Flow

1. Organizer clicks "Create New Event"
2. Fills in: event name, start date, end date, venue
3. Uploads event logo (stored in Supabase Storage)
4. Sets `payment_required` to TRUE or FALSE
5. If TRUE — defines payment rules (full payment, deposit allowed, deadlines)
6. Saves event — status set to `'draft'`
7. Creates participant categories — enters name and fee for each
8. Creates meal sessions — enters name, date, start time, and end time for each
9. Organizer publishes event — status changes to `'active'`
10. System generates a unique `registration_link_token`
11. Public pre-registration URL is now live: `/register/:registrationLinkToken`
12. Organizer can copy and share this link

---

### 8.3 Staff Invitation Flow

1. Organizer navigates to Staff Management for the event
2. Clicks "Invite Staff"
3. Enters: full name, email address, and selects role
4. System creates a `staff_invites` record with a unique token — expires in 48 hours
5. Supabase Auth sends invite email to the staff member
6. Staff clicks the link → `/invite/:token`
7. **If token expired:** Error shown — "This invite has expired. Please ask your organizer to resend the invite."
8. **If token valid:** Staff sets their password
9. Supabase Auth creates the user account
10. System creates a `users` record with the correct role, `tenant_id`, and `event_id`
11. `staff_invites` record updated to status `'accepted'`
12. Staff redirected to their role-specific dashboard

---

### 8.4 Online Pre-Registration Flow

1. Organizer shares the public registration link
2. Participant opens the link in any browser
3. System calls `GET /api/public/register/:token` and displays:
   - Event name, logo, date, and venue
   - Registration form: full name, address, category dropdown
4. Participant fills in the form and clicks Submit
5. System calls `POST /api/public/register/:token`
6. Participant record created: `payment_status: 'pending'`, `registered_online: true`, `qr_code: null`
7. On-screen success message displayed:
   > *"Thank you for registering! Please come to the event and complete your payment on arrival to receive your name tag."*
8. No email is sent. No QR code is generated. Participant waits until arrival.

---

### 8.5 On-Site Registration Flow (Payment Required = TRUE)

1. Participant walks up to the registration desk
2. Registration Staff opens the registration screen on their laptop
3. Staff clicks "New Registration"
4. Enters: full name, address, selects participant category
5. Enters the receipt number from the participant's payment
6. Clicks "Approve & Generate QR"
7. System calls `POST /api/events/:eventId/participants` then `PATCH .../approve`
8. QR code generated instantly — within 5 seconds
9. Sticker print dialog opens automatically
10. Staff confirms print — sticker prints from connected printer
11. Staff hands sticker to participant
12. Audit log entries created for `participant_registered`, `participant_approved`, `qr_code_generated`, `sticker_printed`

---

### 8.6 On-Site Registration Flow (Payment Required = FALSE)

1. Participant walks up to the registration desk
2. Staff clicks "New Registration"
3. Enters: full name, address, selects participant category
4. No receipt number field is shown — payment is disabled for this event
5. Clicks "Register"
6. System auto-approves the participant immediately
7. QR code generated instantly
8. Sticker print dialog opens automatically
9. Sticker prints
10. Staff hands sticker to participant

---

### 8.7 Pre-Registered Participant Arrival Flow

1. Pre-registered participant arrives at the event and approaches the registration desk
2. Gives their name to the registration staff
3. Staff goes to Search Pre-Registered screen and types the participant's name
4. System calls `GET /api/events/:eventId/participants/search?name=`
5. Matching record appears with pre-filled name and address
6. Staff clicks the participant's record
7. Staff verifies the participant's identity
8. **If payment required:** Staff enters receipt number and clicks "Approve & Generate QR"
9. **If payment not required:** Staff clicks "Approve & Generate QR" directly
10. QR code generated — sticker prints
11. Staff hands sticker to participant

---

### 8.8 Declined Payment Flow

1. Staff enters receipt number
2. Staff cannot verify the payment
3. Staff clicks "Decline"
4. System sets `payment_status` to `'declined'`
5. No QR code is generated
6. No sticker is printed
7. Participant is informed they cannot proceed
8. Audit log entry created for `participant_declined`
9. Record remains in the system — organizer can review in reports

---

### 8.9 Meal Scanning Flow — Phase 1 (Scanner Gun)

1. Catering Staff opens the Meal Scanning screen on their laptop
2. Selects the active meal session from the dropdown
3. The QR code input field is auto-focused — ready for scanner gun input
4. Participant walks up and presents their sticker
5. Staff points the USB/Bluetooth scanner gun at the QR code and pulls the trigger
6. Scanner types the QR code value directly into the input field — no keyboard needed
7. System auto-submits as soon as input is received
8. System calls `POST /api/events/:eventId/meal/scan`
9. Result displayed on screen immediately:

| Result | Screen | Color | Action |
|--------|--------|-------|--------|
| Eligible | "Serve Meal — [Name] — [Category]" | Green | Serve the meal |
| Already served | "Already received [Session Name]" | Red | Do not serve |
| Not found | "QR code not recognized" | Red | Do not serve |
| Not approved | "Payment not approved" | Red | Do not serve |

10. Meal count on screen updates automatically after each eligible scan
11. Input field clears and refocuses automatically — ready for next scan

---

### 8.10 Manual Override Flow

1. Scan returns a RED result
2. Catering Staff determines a special case justification exists
3. Staff clicks the "Override" button
4. System displays an override reason input field
5. Staff types a reason — this field is mandatory and cannot be empty
6. Staff clicks "Confirm Override"
7. System calls `POST /api/events/:eventId/meal/scan/override`
8. Checkin recorded with `is_override: true` and `override_reason` populated
9. Audit log entry created with full override details including staff ID and reason
10. Screen shows green override confirmation — meal is served

---

### 8.11 Offline Mode Flow

1. Device is connected to internet — Service Worker activates and caches the app shell
2. IndexedDB downloads and stores locally:
   - Event details and configuration
   - Participant categories
   - Meal sessions
   - All approved participant records with QR codes
   - Existing meal checkin records
3. Internet connection drops — staff notice no change in the app
4. **Registration offline:**
   - Staff registers participant normally
   - QR code generated locally using the `qrcode` library
   - Participant record saved to IndexedDB with a temporary local ID
   - Sticker prints immediately from local data
   - Operation queued: `{ action: 'register_participant', data: {...}, timestamp }`
5. **Meal scanning offline:**
   - Staff scans QR code
   - System checks local IndexedDB for participant record
   - Checks local checkin records for duplicates — duplicate blocking fully works offline
   - Eligible: checkin saved to IndexedDB, GREEN shown
   - Duplicate: RED shown — no checkin created
   - Checkin operation queued: `{ action: 'meal_checkin', data: {...}, timestamp }`
6. A subtle "Offline — syncing when connected" indicator appears in the app UI
7. Internet returns — Background Sync API fires automatically
8. All queued operations sent to server in timestamp order
9. Server confirms each operation — removes from sync queue
10. Local IndexedDB updated with confirmed server state
11. Sync indicator disappears — app fully up to date

---

### 8.12 Reporting Flow

1. Organizer or Finance Team navigates to the Reports section
2. Selects report type: Registration, Meals, Payments, or Audit Log
3. Optionally applies filters: date range, status, category
4. Report renders on screen in real time — data fetched live from server
5. User clicks Export
6. Selects format: CSV, PDF, or Excel
7. File downloads to device immediately
8. Audit log entry created for the export action

---

## 9. Frontend Pages & Components

### 9.1 Public Pages (No Authentication Required)

---

#### Online Pre-Registration Page
- **Route:** `/register/:registrationLinkToken`
- **Access:** Public
- **Data displayed:** Event name, logo, date, venue, registration form
- **Form fields:** Full name (text), address (textarea), category (dropdown)
- **API call on submit:** `POST /api/public/register/:registrationLinkToken`
- **On success:** Show on-screen thank you message — form hidden
- **On error:** Show error message — form stays populated

---

#### Login Page
- **Route:** `/login`
- **Access:** Public
- **Data displayed:** Email input, password input, "Forgot Password" link
- **API call on submit:** `POST /api/auth/login`
- **On success:** Redirect to role-appropriate dashboard
- **On error:** Show "Invalid email or password" message

---

#### Accept Invite Page
- **Route:** `/invite/:token`
- **Access:** Public (valid invite token required)
- **Data displayed:** Welcome message showing invitee name and assigned role, password field, confirm password field
- **API call on submit:** `POST /api/auth/accept-invite`
- **On success:** Redirect to role-appropriate dashboard
- **On expired token:** Show message: "This invite has expired. Please ask your organizer to resend the invite."
- **On invalid token:** Show message: "This invite link is not valid."

---

#### Forgot Password Page
- **Route:** `/forgot-password`
- **Access:** Public
- **Data displayed:** Email input field
- **API call on submit:** `POST /api/auth/reset-password-request`
- **On success:** Show: "Password reset instructions have been sent to your email."

---

#### Reset Password Page
- **Route:** `/reset-password`
- **Access:** Public (Supabase Auth handles token via URL params)
- **Data displayed:** New password field, confirm password field
- **API call on submit:** `POST /api/auth/reset-password`
- **On success:** Redirect to `/login` with message: "Password updated. Please log in."

---

### 9.2 Super Admin Pages

---

#### Super Admin Dashboard
- **Route:** `/admin`
- **Access:** Super Admin only
- **Data displayed:** Total organizers on platform, total events platform-wide, recent platform activity feed
- **Actions:** Navigate to Manage Organizers, Create New Organizer

---

#### Manage Organizers
- **Route:** `/admin/organizers`
- **Access:** Super Admin only
- **Data displayed:** Table — organizer name, email, status (active/suspended), number of events, date created
- **Actions:** Create new organizer, click row to view organizer details, suspend/activate account
- **API call:** `GET /api/admin/tenants`

---

#### Create Organizer
- **Route:** `/admin/organizers/new`
- **Access:** Super Admin only
- **Form fields:** Name, email, phone (optional)
- **API call on submit:** `POST /api/admin/tenants`
- **On success:** Return to organizer list with "Invite sent to [email]" message

---

#### Organizer Details
- **Route:** `/admin/organizers/:id`
- **Access:** Super Admin only
- **Data displayed:** Organizer details, list of their events with status, account status badge
- **Actions:** Suspend/activate account, edit name and phone
- **API call:** `GET /api/admin/tenants/:id`

---

### 9.3 Organizer Pages

---

#### Organizer Dashboard
- **Route:** `/dashboard`
- **Access:** Organizer only
- **Data displayed:** All events — name, date, status, quick stats (total registrations, total approved payments)
- **Actions:** Create new event, click event to open Event Overview
- **API call:** `GET /api/events`

---

#### Create Event
- **Route:** `/events/new`
- **Access:** Organizer only
- **Form fields:** Event name, start date, end date, venue, logo upload, payment required toggle, payment rules (conditional)
- **API call on submit:** `POST /api/events`
- **On success:** Redirect to Event Overview for the new event

---

#### Event Overview
- **Route:** `/events/:id`
- **Access:** Organizer only
- **Data displayed:** Event details, quick stats, status badge, public registration link
- **Navigation tabs:** Categories, Meal Sessions, Staff, Participants, Reports
- **Actions:** Edit event, copy public registration link, publish event

---

#### Manage Categories
- **Route:** `/events/:id/categories`
- **Access:** Organizer only
- **Data displayed:** List of categories with name and fee
- **Actions:** Add new category, edit existing, delete (blocked if participants assigned)
- **API calls:** `GET`, `POST`, `PATCH`, `DELETE /api/events/:id/categories`

---

#### Manage Meal Sessions
- **Route:** `/events/:id/sessions`
- **Access:** Organizer only
- **Data displayed:** List of sessions with name, date, start time, end time
- **Actions:** Add session, edit session, delete (blocked if checkins recorded)
- **API calls:** `GET`, `POST`, `PATCH`, `DELETE /api/events/:id/sessions`

---

#### Manage Staff
- **Route:** `/events/:id/staff`
- **Access:** Organizer only
- **Data displayed:** Two sections — Active Staff (name, email, role, status) and Pending Invites (email, role, expiry)
- **Actions:** Invite new staff, remove staff, resend expired invite
- **API calls:** `GET`, `POST`, `DELETE /api/events/:id/staff`

---

#### View Participants
- **Route:** `/events/:id/participants`
- **Access:** Organizer only
- **Data displayed:** Table — name, category, payment status badge, registration type (online/on-site), registration date
- **Filters:** Status dropdown (all / approved / declined / pending), name search input
- **API call:** `GET /api/events/:id/participants`

---

#### Reports
- **Route:** `/events/:id/reports`
- **Access:** Organizer, Finance Team
- **Data displayed:** Tab navigation — Registration, Meals, Payments, Audit Log
- **Registration tab:** Total count, breakdown by category, breakdown by status, daily registrations chart
- **Meals tab:** Per-session table — total served, registered, no-shows, overrides
- **Payments tab:** Summary totals, full participant payment list with receipt numbers
- **Audit Log tab:** Full action log with filters by action type, user, and date range
- **Actions:** Export any report to CSV, PDF, or Excel
- **API calls:** `GET /api/events/:id/reports/*`

---

### 9.4 Registration Staff Pages

---

#### Registration Dashboard
- **Route:** `/events/:id/register`
- **Access:** Registration Staff only
- **Data displayed:** Event name, two prominent action buttons — "New Registration" and "Search Pre-Registered", today's registration count
- **API call:** `GET /api/events/:id` for event details

---

#### New On-Site Registration Form
- **Route:** `/events/:id/register/new`
- **Access:** Registration Staff only
- **Form fields:**
  - Full name (required, text)
  - Address (required, textarea)
  - Category (required, dropdown — populated from categories API)
  - Receipt number (required text, shown ONLY if event `payment_required` is TRUE)
- **Submit button label:** "Approve & Generate QR" (if payment required) / "Register" (if no payment)
- **API calls:** `POST /api/events/:id/participants` then `PATCH .../approve`
- **On success:** Open Sticker Print Preview automatically
- **On error:** Show error message, keep form data intact

---

#### Search Pre-Registered
- **Route:** `/events/:id/register/search`
- **Access:** Registration Staff only
- **Data displayed:** Search input field, live results list below
- **Behavior:** Calls search API as staff types (minimum 2 characters before triggering)
- **API call:** `GET /api/events/:id/participants/search?name=`
- **On result click:** Navigate to participant record for approval and printing

---

#### Participant Approval Screen
- **Route:** `/events/:id/register/participant/:participantId`
- **Access:** Registration Staff only
- **Data displayed:** Participant name, address, category, current payment status
- **Form fields (if payment_required):** Receipt number input
- **Actions:** Approve button, Decline button
- **API calls:** `PATCH /api/events/:id/participants/:id/approve` or `.../decline`
- **On approval:** Open Sticker Print Preview automatically

---

#### Sticker Print Preview
- **Route:** `/events/:id/register/print/:participantId`
- **Access:** Registration Staff only
- **Data displayed:** Sticker layout preview — see Section 11 for exact design specification
- **Actions:** "Print Sticker" button, "Back" button
- **On print:** Triggers browser `window.print()` — only the sticker component renders in print view via `@media print` CSS
- **On print dialog close:** Return to Registration Dashboard automatically
- **API call:** `GET /api/events/:id/participants/:id` for participant data

---

### 9.5 Catering Staff Pages

---

#### Meal Scanning Screen
- **Route:** `/events/:id/scan`
- **Access:** Catering Staff only
- **Data displayed:**
  - Session selector dropdown at top — populated with all event meal sessions
  - Large QR code input field (auto-focused, ready for scanner gun)
  - Large result display area — full-screen color feedback (green or red)
  - Running meal count: "X served this session"
  - "Override" button — appears only after a red result
- **Behavior:**
  - Staff selects the active session from the dropdown
  - Input field is auto-focused — scanner gun types directly into it
  - System auto-submits as soon as a complete QR code value is received (no button press needed)
  - API call: `POST /api/events/:id/meal/scan`
  - After result displayed — input field clears and refocuses automatically for next scan
  - Meal count refreshes after each successful scan via `GET /api/events/:id/meal/sessions/:sessionId/count`

---

### 9.6 Finance Team Pages

---

#### Payments Overview
- **Route:** `/events/:id/payments`
- **Access:** Finance Team only
- **Data displayed:**
  - Summary bar: Total Approved, Total Declined, Total Pending (with counts)
  - Full participant table: name, category, payment status, receipt number
- **Filters:** Status dropdown, search by name or receipt number
- **Actions:** Export to CSV, PDF, or Excel
- **API call:** `GET /api/events/:id/reports/payments`

---

## 10. Business Logic Rules

These rules are enforced by both the API (authoritative) and the frontend (for UX feedback). The API is always the final authority.

**Rule 1 — QR Code Generation**  
A QR code is generated ONLY when a participant's `payment_status` is changed to `'approved'`. A participant with `payment_status` of `'pending'` or `'declined'` will NEVER have a QR code. The `qr_code` field remains NULL until approval.

**Rule 2 — Sticker Print Gate**  
The sticker print dialog ONLY opens when the participant record contains a non-null `qr_code` value. A participant without a QR code cannot have a sticker printed under any circumstances.

**Rule 3 — Payment Disabled Auto-Approve**  
If an event has `payment_required = FALSE`, the system automatically sets `payment_status = 'approved'` at the moment of registration and generates the QR code immediately. No receipt number field is shown or required.

**Rule 4 — No Duplicate Meal Scans**  
A participant can check into any given meal session exactly ONCE. The `meal_checkins` table enforces a UNIQUE constraint on `(participant_id, session_id)`. Any second scan attempt for the same participant and session returns an `already_served` error. This cannot be bypassed except via a manual override with a logged reason.

**Rule 5 — Manual Override Requires Reason**  
A manual override at meal scanning MUST include a non-empty `override_reason` string. The API returns a `400 Bad Request` error if `override_reason` is empty, missing, or whitespace-only. All overrides are recorded in `meal_checkins` with `is_override: true` and fully logged in `audit_logs`.

**Rule 6 — Tenant Data Isolation**  
Every database query filters by the authenticated user's `tenant_id`. RLS at the database level enforces this independently of application code. An organizer can never read, create, modify, or delete another organizer's data.

**Rule 7 — Staff Event Scope**  
Registration Staff, Catering Staff, and Finance Team are scoped to exactly one event (stored in `users.event_id`). They cannot access any other event — even if it belongs to the same organizer/tenant.

**Rule 8 — Invite Token Expiry**  
Staff invite tokens expire 48 hours after creation. An expired token cannot be used to create an account. The organizer must use the "Resend Invite" function to generate a new token with a fresh 48-hour window.

**Rule 9 — Receipt Number Required on Approval**  
If `payment_required = TRUE` for an event, the `receipt_number` field is required when calling the approve endpoint. The API returns a `400 Bad Request` error if `receipt_number` is missing or empty on an approval request.

**Rule 10 — Audit Log Immutability**  
Audit log entries are INSERT ONLY. No record in `audit_logs` can ever be updated or deleted by anyone — including the Super Admin. RLS enforces this at the database level.

**Rule 11 — No Public Payment Collection**  
The public pre-registration form NEVER collects payment, receipt numbers, or any financial information. Payment is always completed on arrival at the event by registration staff. This is non-negotiable and must not be changed without explicit instruction.

**Rule 12 — Category Delete Protection**  
A participant category cannot be deleted if any participant records reference it via `category_id`. The API returns a `409 Conflict` error. The organizer must reassign or remove those participants first.

**Rule 13 — Session Delete Protection**  
A meal session cannot be deleted if any `meal_checkins` records reference it via `session_id`. The API returns a `409 Conflict` error.

**Rule 14 — Declined Participant Re-approval**  
A participant with `payment_status = 'declined'` CAN be re-approved if the organizer or staff provides a valid receipt number. This is the intended recovery path for declined records.

---

## 11. Sticker / Badge Design Specification

### 11.1 Visual Layout

```
┌────────────────────────────────────┐
│  [Event Logo]    [Event Name]      │
│────────────────────────────────────│
│                                    │
│      [PARTICIPANT FULL NAME]       │
│           (Large, Bold)            │
│                                    │
│         [Category Badge]           │
│      e.g.  VIP  /  Regular         │
│                                    │
│            [QR CODE]               │
│          (Center, Large)           │
│                                    │
│────────────────────────────────────│
│    Powered by Elira Technologies   │
│          (Small, Footer)           │
└────────────────────────────────────┘
```

### 11.2 Design Requirements

| Element | Specification |
|---------|---------------|
| Event Logo | Top left, max height 40px, maintains aspect ratio |
| Event Name | Top right or center, bold, 14px |
| Participant Name | Center, bold, 20–24px, all uppercase |
| Category Badge | Below name, 12px, styled pill badge with category color |
| QR Code | Center, minimum 80×80px, generated as SVG for crisp print quality, black on white |
| Footer Text | "Powered by Elira Technologies", 8px, gray, bottom center |
| Sticker Size | Standard name tag — 3.5" × 2.25" (adjustable per event if needed) |
| Background | White |
| Border | Optional thin border around the sticker |
| Font | Clean sans-serif (e.g. Inter, Helvetica) |

### 11.3 Print Behavior

- The sticker print preview component is a hidden DOM element styled for print only
- `@media print` CSS hides ALL other UI elements — only the sticker component renders when printing
- QR code is generated using the `qrcode` npm library and rendered as SVG for maximum print clarity
- `window.print()` is called programmatically when the "Print Sticker" button is clicked
- After the print dialog is dismissed by the user, the app navigates back to the Registration Dashboard automatically
- The sticker component must render identically in the browser preview and in the actual print output

---

## 12. Offline Mode Specification

### 12.1 Data Cached in IndexedDB

When the device has an internet connection, the following data is downloaded and stored locally:

| Data | IndexedDB Store | Purpose |
|------|----------------|---------|
| App shell (HTML, CSS, JS) | Service Worker Cache | App loads and runs without internet |
| Event details | `events` | Configuration available offline |
| Participant categories | `categories` | Populate dropdowns during offline registration |
| Meal sessions | `sessions` | Session selection during offline scanning |
| Approved participants + QR codes | `participants` | Verify QR codes during offline meal scanning |
| Existing meal checkins | `checkins` | Enforce duplicate blocking while offline |
| Sync queue | `sync_queue` | Store pending operations for later upload |

### 12.2 Offline Registration Behavior

1. Staff registers a participant as normal
2. QR code generated locally using the `qrcode` library — no server call required
3. Participant record written to local `participants` IndexedDB store with a temporary local UUID prefixed `LOCAL_`
4. Sticker prints immediately from local data
5. Operation added to `sync_queue`:
   ```json
   {
     "id": "LOCAL_uuid",
     "action": "register_participant",
     "data": { "full_name": "...", "address": "...", "category_id": "...", "receipt_number": "..." },
     "timestamp": "ISO 8601 datetime",
     "synced": false
   }
   ```
6. Subtle "Offline" indicator shown in the UI header

### 12.3 Offline Meal Scanning Behavior

1. Staff scans QR code
2. System looks up QR code in local IndexedDB `participants` store
3. System checks local `checkins` store for any existing checkin for this `(participant_id, session_id)` pair
4. **Eligible:** New checkin written to local `checkins` store, GREEN result shown, count incremented locally
5. **Already served:** RED result shown — duplicate blocking enforced fully offline
6. Checkin operation added to `sync_queue`:
   ```json
   {
     "id": "LOCAL_uuid",
     "action": "meal_checkin",
     "data": { "qr_code": "...", "session_id": "...", "scanned_at": "ISO 8601" },
     "timestamp": "ISO 8601 datetime",
     "synced": false
   }
   ```

### 12.4 Sync Process When Internet Returns

1. Background Sync API detects internet connection restored
2. Reads all unsynced operations from `sync_queue` in IndexedDB, ordered by `timestamp` ascending
3. For each operation, calls the appropriate API endpoint
4. **On server success:**
   - Removes operation from `sync_queue`
   - Updates local IndexedDB records with server-assigned IDs (replaces `LOCAL_` prefixed IDs)
5. **On server conflict (e.g. duplicate detected server-side):**
   - Marks operation as `conflict: true` in `sync_queue`
   - Logs conflict details for organizer review in the reports section
6. When `sync_queue` is empty — "Offline" indicator disappears from UI
7. Local IndexedDB refreshed with full server state

### 12.5 Offline Limitations

- Meal count displayed on catering staff screen may not reflect scans done on OTHER devices while offline — counts reconcile after sync
- Organizer reports and dashboards require an internet connection — not available offline
- Staff invitation and account management requires an internet connection
- Event configuration changes (new categories, new sessions) made by the organizer while staff are offline will only be visible to staff after their device syncs

---

## 13. Non-Functional Requirements

Sourced directly from BRS v1.2 Section 5, with implementation notes:

| Requirement | Target | Implementation Notes |
|-------------|--------|---------------------|
| Performance | Payment verification + QR code generation within 5 seconds | Supabase is low-latency; QR generation is a local library call — target is easily achievable |
| Security | All data encrypted in transit and at rest | HTTPS enforced via Vercel; Supabase encrypts data at rest; RLS enforces tenant isolation at database level |
| Scalability | Up to 10,000 participants per event | PostgreSQL handles this comfortably; Vercel scales automatically; Supabase free tier supports this scale |
| Usability | Simple workflows designed for quick staff training | All role-specific screens show only what is needed for that role; registration and scanning flows are minimal steps |
| Offline Mode | Full offline support for registration and meal scanning; auto-sync when internet returns | Implemented via PWA, Service Worker, IndexedDB, and Background Sync API |
| Availability | 99% uptime during event days | Vercel and Supabase both offer 99.9% uptime SLAs on paid plans |
| Audit | Every significant action logged with user identity and timestamp | `audit_logs` table with INSERT ONLY policy covers all required actions |

---

## 14. Future Phases

### 14.1 Phase 2 — Mobile App for QR Scanning

**What it is:**  
A dedicated mobile application for Android and iOS that allows catering staff to scan participant QR codes using the phone camera — replacing or supplementing the physical USB/Bluetooth scanner gun.

**Backend readiness:**  
The Phase 1 backend is built to fully support Phase 2 from day one:
- The `POST /api/events/:eventId/meal/scan` endpoint accepts QR code input from any source
- Authentication uses Supabase Auth JWT tokens — the mobile app uses the same tokens
- All business logic (duplicate detection, eligibility checking, override logging) lives in the API — the mobile app is purely a new frontend consumer

**What needs to be built in Phase 2:**
- React Native application (cross-platform iOS and Android)
- Camera-based QR scanning using a React Native QR library (e.g. `react-native-camera` or `expo-barcode-scanner`)
- Login screen — uses existing Supabase Auth credentials
- Session selection screen — calls existing `GET /api/events/:eventId/sessions`
- Meal scanning screen with green/red visual feedback — calls existing `POST /api/events/:eventId/meal/scan`
- Real-time count display — calls existing `GET /api/events/:eventId/meal/sessions/:sessionId/count`
- Override flow — calls existing `POST /api/events/:eventId/meal/scan/override`

**No backend changes are required for Phase 2.** The mobile app simply connects to the same API.

---

### 14.2 Payment Gateway Integration

**What it is:**  
Replacing the current manual receipt number verification with automated payment processing — participants pay digitally and are automatically approved.

**Recommended provider:**  
Paystack — widely used and supported in Ghana, the primary market for Elira Technologies.

**Current state:**  
The system is architected to support this with minimal changes:
- `payment_required` boolean already exists on events
- `payment_status`, `receipt_number`, and `approved_by` fields already exist on participants
- The approve/decline flow is already modular — it only needs a gateway trigger added

**What needs to be built:**
- Paystack integration on the backend — payment initiation and webhook handling
- On successful payment webhook — auto-set `payment_status = 'approved'` and generate QR code
- On failed payment — set `payment_status = 'declined'`
- Digital receipt generation for participants
- Payment configuration in event setup (currency, amount per category via gateway)
- Optional: digital QR code delivery to participants via email after payment confirmation (requires email service integration — e.g. Resend or SendGrid)

---

### 14.3 Email Notifications (Optional Future)

Currently, no email notifications are sent to participants beyond the password reset and staff invite flows. Future optional additions:

- Confirmation email to participant after online pre-registration form submission
- QR code delivery email after payment approval — participant receives their QR code digitally as a backup
- Event reminder emails

**Requires:** Integration with an email service provider. Recommended: **Resend** (modern, developer-friendly, generous free tier) or **SendGrid**.

---

*End of Technical Specification Document*

---

*Specification prepared based on BRS v1.2 authored by Kelvin Elikem Sedziafa, Elira Technologies, and comprehensive discovery sessions with the development team.*  
*All decisions in this document have been explicitly confirmed before inclusion.*
