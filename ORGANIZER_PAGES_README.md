# Organizer Pages Implementation

## Overview

This document describes the complete implementation of all Organizer pages for the Elira Event Platform, as specified in Section 9.3 of the technical specification document.

## Architecture

All organizer pages are protected by the `ProtectOrganizer` component which:
- Verifies user authentication via Supabase
- Checks that the user has the `organizer` role
- Stores the user's `tenant_id` in sessionStorage for later use
- Redirects unauthorized users to `/login`

## Pages Implemented

### 1. Organizer Dashboard
**Route:** `/dashboard`  
**File:** `src/app/dashboard/page.tsx` + `DashboardContent.tsx`

**Features:**
- Lists all events created by the organizer
- Displays event status badges (draft, active, completed, cancelled)
- Shows quick stats: registration count and approved payment count
- Create new event button
- Clickable event cards linking to event overview pages
- Fetches from `GET /api/events`

**Components Used:**
- Status badge with color coding
- Grid layout (responsive: 1 column mobile, 3 columns desktop)
- Empty state messaging

---

### 2. Create Event
**Route:** `/events/new`  
**File:** `src/app/events/new/page.tsx` + `CreateEventContent.tsx`

**Features:**
- Form fields:
  - Event name (text input)
  - Start date (date picker)
  - End date (date picker)
  - Venue (text input)
  - Logo upload (file input with preview)
  - Payment required (toggle checkbox)
  - Payment rules (conditional, shown only if payment required):
    - Full payment required toggle
    - Deposit allowed toggle
    - Payment deadline date picker (shown if deposit allowed)

**Form Validation:**
- All required fields enforced
- Logo preview shown during upload
- POST to `/api/events` on submit
- Success redirect to event overview page

---

### 3. Event Overview
**Route:** `/events/[id]`  
**File:** `src/app/events/[id]/page.tsx` + `EventOverviewContent.tsx`

**Features:**
- Event header with logo (if available) and details
- Quick statistics dashboard:
  - Total registrations
  - Approved payments (green)
  - Pending payments (yellow)
  - Meal check-ins (blue)
- Public registration link section (copyable to clipboard)
- Navigation tabs to sub-pages:
  - Categories (📂)
  - Sessions (🍽️)
  - Staff (👥)
  - Participants (📋)
  - Reports (📊)
- Fetches from `GET /api/events/:id`

---

### 4. Manage Categories
**Route:** `/events/[id]/categories`  
**File:** `src/app/events/[id]/categories/page.tsx` + `ManageCategoriesContent.tsx`

**Features:**
- Add category button opens form:
  - Category name input
  - Registration fee input (decimal)
- Table view showing:
  - Category name
  - Registration fee
  - Delete button
- Conflict handling: Shows 409 error if participants are assigned
- API calls:
  - POST `/api/events/:id/categories` (add)
  - DELETE `/api/events/:id/categories/:id` (delete)

---

### 5. Manage Meal Sessions
**Route:** `/events/[id]/sessions`  
**File:** `src/app/events/[id]/sessions/page.tsx` + `ManageSessionsContent.tsx`

**Features:**
- Add session button opens form:
  - Session name (e.g., Breakfast, Lunch, Dinner)
  - Date picker
  - Start time picker
  - End time picker
- Table view showing:
  - Session name
  - Date (formatted)
  - Time range (start — end)
  - Delete button
- Conflict handling: Shows 409 error if meal check-ins exist
- API calls:
  - POST `/api/events/:id/sessions` (add)
  - DELETE `/api/events/:id/sessions/:id` (delete)

---

### 6. Manage Staff
**Route:** `/events/[id]/staff`  
**File:** `src/app/events/[id]/staff/page.tsx` + `ManageStaffContent.tsx`

**Features:**
- Invite staff button opens form:
  - Full name input
  - Email input
  - Role dropdown (registration_staff, catering_staff, finance_team)

**Two sections:**
1. **Active Staff** - Table showing:
   - Name
   - Email
   - Role
   - Remove button (with confirmation)

2. **Pending Invites** - Table showing:
   - Name
   - Email
   - Role
   - Expiration date
   - Resend button (for expired invites)

**API calls:**
- POST `/api/events/:id/staff/invite` (invite)
- DELETE `/api/events/:id/staff/:id` (remove)
- POST `/api/events/:id/staff/invite/:id/resend` (resend)

---

### 7. View Participants
**Route:** `/events/[id]/participants`  
**File:** `src/app/events/[id]/participants/page.tsx` + `ViewParticipantsContent.tsx`

**Features:**
- Search by participant name (case-insensitive)
- Filter by payment status:
  - All
  - Approved (green badge)
  - Pending (yellow badge)
  - Declined (red badge)

**Table columns:**
- Participant name
- Category
- Payment status (color-coded badge)
- Registration type (Online / On-site)
- Registered date

**Pagination info:** Shows "Showing X of Y participants"  
**API call:** GET `/api/events/:id/participants`

---

### 8. Reports
**Route:** `/events/[id]/reports`  
**File:** `src/app/events/[id]/reports/page.tsx` + `ReportsContent.tsx`

**Features:**
- Tab navigation between report types:
  - **Registration** 📋 - All participant registration data
  - **Meals** 🍽️ - Meal check-in records
  - **Payments** 💳 - Payment records and statuses
  - **Audit Log** 📝 - System audit trail

**Export buttons:**
- Export CSV (functional, downloads CSV file)
- Export PDF (placeholder, requires additional setup)
- Export Excel (placeholder, requires additional setup)

**Dynamic table:** Displays all data for selected report type

---

## Component Structure

```
src/
├── components/
│   ├── ProtectOrganizer.tsx         (Role-based access control)
│   ├── FormInput.tsx                (Reusable form input)
│   ├── FormError.tsx                (Error message display)
│   └── SuccessMessage.tsx           (Success message display)
├── app/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── DashboardContent.tsx
│   └── events/
│       ├── new/
│       │   ├── page.tsx
│       │   └── CreateEventContent.tsx
│       └── [id]/
│           ├── page.tsx
│           ├── EventOverviewContent.tsx
│           ├── categories/
│           │   ├── page.tsx
│           │   └── ManageCategoriesContent.tsx
│           ├── sessions/
│           │   ├── page.tsx
│           │   └── ManageSessionsContent.tsx
│           ├── staff/
│           │   ├── page.tsx
│           │   └── ManageStaffContent.tsx
│           ├── participants/
│           │   ├── page.tsx
│           │   └── ViewParticipantsContent.tsx
│           └── reports/
│               ├── page.tsx
│               └── ReportsContent.tsx
```

## Styling System

All pages use:
- **Colors:** Design tokens from `globals.css`:
  - `bg-background`, `bg-background-secondary`
  - `text-foreground`, `text-foreground-secondary`, `text-foreground-tertiary`
  - `border-border`
  - `text-accent` (primary action color)
  - Status colors: red, green, yellow, blue
  
- **Layout:** Tailwind CSS with flexbox and grid
- **Typography:** Sans font with semantic sizes
- **Spacing:** Consistent gap and padding scale (4px units)

## Data Flow

1. **Authentication:** ProtectOrganizer validates user role
2. **Context:** tenant_id stored in sessionStorage
3. **API Requests:** useApiRequest hook handles all API communication
4. **Supabase:** Real-time queries for counts, stats, and relationships
5. **State Management:** React hooks (useState, useEffect) manage local state

## API Integration Points

All pages connect to these endpoints:
- `GET /api/events` - List all events for organizer
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event details
- `POST /api/events/:id/categories` - Add category
- `DELETE /api/events/:id/categories/:id` - Delete category
- `POST /api/events/:id/sessions` - Add session
- `DELETE /api/events/:id/sessions/:id` - Delete session
- `POST /api/events/:id/staff/invite` - Invite staff
- `DELETE /api/events/:id/staff/:id` - Remove staff
- `POST /api/events/:id/staff/invite/:id/resend` - Resend invite
- `GET /api/events/:id/participants` - List participants

## Error Handling

- Form errors displayed above forms
- 409 Conflict errors handled with user-friendly messages
- API errors displayed in error blocks
- Toast/temporary success messages for operations

## Responsive Design

- Mobile-first approach
- Grid layouts responsive (1-3 columns based on screen size)
- Tables scroll horizontally on mobile
- Forms stack single column on all sizes
- Touch-friendly button sizes

## Next Steps for Backend

To complete this implementation, the following API endpoints must be created:
1. Event CRUD endpoints with tenant isolation
2. Category management endpoints
3. Meal session endpoints
4. Staff invitation and management endpoints
5. Participant list endpoint with filtering
6. Report data endpoints
7. All endpoints must enforce RLS and tenant_id scoping

---

**Total Pages:** 8 main pages  
**Total Components:** 8 content components + 1 protection component  
**File Count:** 17 files created  
**Build Status:** ✅ Successfully compiles with no errors
