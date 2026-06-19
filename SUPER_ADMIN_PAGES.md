# Super Admin Pages Documentation

## Overview

The Super Admin pages provide platform-wide administration and organizer management capabilities. These pages are accessible **only** to users with the `super_admin` role. All other roles are automatically redirected to `/login`.

## File Structure

```
src/
├── components/
│   └── ProtectAdmin.tsx          # Role-based access control component
├── app/
│   └── admin/
│       ├── page.tsx               # Admin Dashboard page wrapper
│       ├── AdminDashboardContent.tsx  # Dashboard content component
│       ├── organizers/
│       │   ├── page.tsx            # Manage Organizers page wrapper
│       │   ├── ManageOrganizersContent.tsx  # Organizers list component
│       │   ├── new/
│       │   │   ├── page.tsx         # Create Organizer page wrapper
│       │   │   └── CreateOrganizerContent.tsx  # Create form component
│       │   └── [id]/
│       │       ├── page.tsx         # Organizer Details page wrapper
│       │       └── OrganizerDetailsContent.tsx  # Details component
│       └── api/admin/
│           └── tenants/
│               ├── route.ts        # GET all, POST create tenant
│               └── [id]/
│                   └── route.ts    # GET one, PATCH update tenant
```

## Pages

### 1. Super Admin Dashboard (`/admin`)

**Route:** `GET /admin`  
**File:** `src/app/admin/page.tsx`  
**Component:** `src/app/admin/AdminDashboardContent.tsx`

#### Features
- Display total organizer count (platform-wide)
- Display total event count (platform-wide)
- Show platform status (operational indicator)
- Display recent activity (last 10 audit log entries)
- Navigation links to organizer management

#### Key Information Displayed
- **Total Organizers:** Count of all active and suspended organizer accounts
- **Total Events:** Count of all events across all organizers
- **Platform Status:** Real-time operational status indicator
- **Recent Activity:** Latest 10 actions with timestamps (registration, approvals, events, organizer changes)

#### Data Sources
- `tenants` table (for organizer count)
- `events` table (for event count)
- `audit_logs` table (for recent activity)

#### Query Operations
```typescript
// Get organizer count
GET from tenants table, count exact

// Get event count
GET from events table, count exact

// Get recent activity
GET from audit_logs table
  .select('id, action, entity_type, created_at, details')
  .order('created_at', { ascending: false })
  .limit(10)
```

---

### 2. Manage Organizers (`/admin/organizers`)

**Route:** `GET /admin/organizers`  
**File:** `src/app/admin/organizers/page.tsx`  
**Component:** `src/app/admin/organizers/ManageOrganizersContent.tsx`

#### Features
- Display table of all organizers with key information
- Toggle organizer account status (active/suspended)
- Navigate to create new organizer form
- Navigate to organizer details page
- Real-time status updates

#### Table Columns
| Column | Description | Source |
|--------|-------------|--------|
| Organizer Name | Organization name | `tenants.name` |
| Email | Contact email | `tenants.email` |
| Status | Active or Suspended badge | `tenants.status` |
| Events | Number of events created | Count from `events` table |
| Created | Account creation date | `tenants.created_at` |
| Actions | View link, Status toggle | Custom buttons |

#### API Calls
```typescript
// Fetch all organizers
GET /api/admin/tenants

// Toggle organizer status
PATCH /api/admin/tenants/:id
  Body: { status: 'active' | 'suspended' }
```

#### Actions
- **View:** Navigate to Organizer Details page (`/admin/organizers/[id]`)
- **Suspend/Activate:** Toggle the `status` field between `active` and `suspended`
- **Create New:** Navigate to Create Organizer form (`/admin/organizers/new`)

---

### 3. Create Organizer (`/admin/organizers/new`)

**Route:** `GET /admin/organizers/new`  
**File:** `src/app/admin/organizers/new/page.tsx`  
**Component:** `src/app/admin/organizers/new/CreateOrganizerContent.tsx`

#### Features
- Form to create a new organizer (tenant) account
- Send invitation email to organizer
- Form validation
- Success message with redirect to organizer list

#### Form Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Organization Name | Text | Yes | Name of the organization |
| Email Address | Email | Yes | Organizer email (must be unique) |
| Phone Number | Tel | No | Contact phone number |

#### API Call
```typescript
POST /api/admin/tenants
Body: {
  name: string,
  email: string,
  phone?: string
}
Response: {
  tenant: {
    id: UUID,
    name: string,
    email: string,
    phone: string | null,
    status: 'active',
    created_by: UUID,
    created_at: timestamp,
    updated_at: timestamp
  }
}
```

#### Workflow
1. Super Admin fills in the form
2. Clicks "Create Organizer & Send Invite"
3. System creates tenant record in `tenants` table
4. System creates pending user record in `users` table
5. System sends invitation email to the organizer
6. Success message shows: "Invite sent to [email]"
7. Redirects to `/admin/organizers` after 2 seconds

#### Invitation Email
The system uses Supabase Auth to send an invitation email with:
- A unique invite token
- Link to `/auth/accept-invite?token=[inviteToken]`
- Organizer can set their password and activate their account

---

### 4. Organizer Details (`/admin/organizers/[id]`)

**Route:** `GET /admin/organizers/[id]`  
**File:** `src/app/admin/organizers/[id]/page.tsx`  
**Component:** `src/app/admin/organizers/[id]/OrganizerDetailsContent.tsx`

#### Features
- View organizer account information
- Edit organizer name and phone
- Toggle organizer status (suspend/activate)
- View all events created by this organizer
- Event details including participant count

#### Sections

##### Organizer Information
Displays and allows editing of:
- **Organization Name** (editable)
- **Email** (read-only)
- **Phone** (editable)
- **Status** (toggle button: Suspend/Activate)
- **Created Date** (read-only)

**Edit Workflow:**
1. Click "Edit" button
2. Fields become editable
3. Modify as needed
4. Click "Save Changes"
5. Success message and return to view mode

**Status Toggle:**
- Click "Suspend Organizer" to suspend the account
- Click "Activate Organizer" to reactivate
- Real-time status update without page reload

##### Events Table
Shows all events created by this organizer:

| Column | Description |
|--------|-------------|
| Event Name | Name of the event |
| Dates | Start date — End date |
| Status | Draft, Active, Completed, or Cancelled |
| Participants | Total registered participants |

#### API Calls
```typescript
// Get organizer details
GET /api/admin/tenants/:id
Response: {
  tenant: TenantObject,
  events: EventObject[]
}

// Update organizer details
PATCH /api/admin/tenants/:id
Body: {
  name?: string,
  phone?: string,
  status?: 'active' | 'suspended'
}
Response: {
  tenant: TenantObject
}
```

#### Queries (Client-side)
```typescript
// Get organizer with details
GET from tenants table WHERE id = :id

// Get event count for organizer
GET from events table WHERE tenant_id = :id

// For each event, get participant count
GET from participants table WHERE event_id = event.id, count exact
```

---

## Role-Based Access Control

### ProtectAdmin Component

**File:** `src/components/ProtectAdmin.tsx`

Wraps all Super Admin pages to enforce authentication and role validation.

#### Features
- Checks if user is authenticated
- Verifies user has `super_admin` role
- Shows loading spinner during auth check
- Redirects to `/login` if:
  - User is not authenticated
  - User's role is not `super_admin`
  - User's status is not `active`

#### Usage
```tsx
import { ProtectAdmin } from '@/components/ProtectAdmin';

export default function AdminPage() {
  return (
    <ProtectAdmin>
      <AdminContent />
    </ProtectAdmin>
  );
}
```

#### Auth Check Flow
1. Component mounts
2. Fetch current user from Supabase Auth
3. Query `users` table for role and status
4. If `role !== 'super_admin'`, redirect to `/login`
5. If authenticated and authorized, render children

---

## API Endpoints

### GET /api/admin/tenants

**Authentication:** Super Admin only  
**Purpose:** Fetch all organizer accounts

**Response:**
```json
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Organization Name",
      "email": "organizer@example.com",
      "phone": "+1 (555) 000-0000",
      "status": "active",
      "created_by": "uuid",
      "created_at": "2024-06-19T10:30:00Z",
      "updated_at": "2024-06-19T10:30:00Z"
    }
  ]
}
```

---

### POST /api/admin/tenants

**Authentication:** Super Admin only  
**Purpose:** Create a new organizer account

**Request Body:**
```json
{
  "name": "Organization Name",
  "email": "organizer@example.com",
  "phone": "+1 (555) 000-0000"
}
```

**Response (201 Created):**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "Organization Name",
    "email": "organizer@example.com",
    "phone": "+1 (555) 000-0000",
    "status": "active",
    "created_by": "super_admin_uuid",
    "created_at": "2024-06-19T10:30:00Z",
    "updated_at": "2024-06-19T10:30:00Z"
  }
}
```

**Side Effects:**
- Creates tenant in `tenants` table
- Creates pending user in `users` table with role `organizer`
- Sends invitation email via Supabase Auth
- Logs action to `audit_logs` table

---

### GET /api/admin/tenants/:id

**Authentication:** Super Admin only  
**Purpose:** Get organizer details and their events

**Response:**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "Organization Name",
    "email": "organizer@example.com",
    "phone": "+1 (555) 000-0000",
    "status": "active",
    "created_by": "uuid",
    "created_at": "2024-06-19T10:30:00Z",
    "updated_at": "2024-06-19T10:30:00Z"
  },
  "events": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Event Name",
      "date_start": "2024-07-01",
      "date_end": "2024-07-02",
      "venue": "Venue Location",
      "logo_url": "https://...",
      "payment_required": true,
      "payment_rules": {...},
      "status": "active",
      "registration_link_token": "token",
      "created_by": "uuid",
      "created_at": "2024-06-19T10:30:00Z",
      "updated_at": "2024-06-19T10:30:00Z"
    }
  ]
}
```

---

### PATCH /api/admin/tenants/:id

**Authentication:** Super Admin only  
**Purpose:** Update organizer details or status

**Request Body:**
```json
{
  "name": "New Organization Name",
  "phone": "+1 (555) 111-1111",
  "status": "suspended"
}
```

**Response:**
```json
{
  "tenant": {
    "id": "uuid",
    "name": "New Organization Name",
    "email": "organizer@example.com",
    "phone": "+1 (555) 111-1111",
    "status": "suspended",
    "created_by": "uuid",
    "created_at": "2024-06-19T10:30:00Z",
    "updated_at": "2024-06-19T10:30:00Z"
  }
}
```

**Side Effects:**
- Updates tenant record in `tenants` table
- Logs action to `audit_logs` table with update details

---

## Error Handling

All components implement comprehensive error handling:

### Authentication Errors
- **401 Unauthorized:** User not authenticated
- **403 Forbidden:** User not super_admin
- Redirects to `/login` automatically

### API Errors
- **400 Bad Request:** Invalid input data
- **404 Not Found:** Organizer not found
- **409 Conflict:** Email already exists (when creating)
- **500 Internal Server Error:** Server-side failure
- Displayed as error message in UI

### Validation Errors
- Empty fields validation
- Email format validation
- Phone number format validation
- Field-level error messages

---

## User Experience

### Loading States
- Spinner during initial auth check
- Loading indicators on buttons during API calls
- Disabled state prevents double-submissions

### Success Feedback
- Toast/banner messages for completed actions
- Auto-dismiss after 3 seconds
- Redirect to listing after creation

### Error Feedback
- Error messages displayed at top of page
- Field-level errors shown beneath inputs
- Persistent until user corrects or dismisses

---

## Security Considerations

1. **Role-Based Access Control**
   - Only `super_admin` role can access these pages
   - Enforced at component level (ProtectAdmin)
   - Enforced at API endpoint level (validateAuth middleware)

2. **Data Isolation**
   - Super Admin queries use admin client (bypass RLS)
   - Audit logs track all admin actions
   - IP address logged for compliance

3. **Input Validation**
   - Email format validated
   - Required fields enforced
   - Status enums validated on API

4. **SQL Injection Prevention**
   - All queries use parameterized statements
   - No raw SQL user input

---

## Testing Checklist

- [ ] Unauthenticated user redirected to login when accessing `/admin`
- [ ] Non-super_admin user redirected to login
- [ ] Super Admin can view dashboard with stats
- [ ] Super Admin can view all organizers in list
- [ ] Super Admin can create new organizer
- [ ] Invitation email is sent after creation
- [ ] Super Admin can view organizer details
- [ ] Super Admin can edit organizer name and phone
- [ ] Super Admin can suspend/activate organizer
- [ ] Events list shows correct participant counts
- [ ] All actions logged to audit_logs
- [ ] Error messages display correctly
- [ ] Loading states work properly
- [ ] Form validation prevents submission with empty fields

