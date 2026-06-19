# Registration Staff Pages Documentation

## Overview

This document details the Registration Staff pages for the Elira Event Platform, as specified in Section 9.4 of the technical specification. These pages enable on-site event staff to register participants, verify payments, generate QR codes, and print stickers.

## Pages & Routes

### 1. Registration Dashboard
**Route:** `/events/[id]/register`

**Purpose:** Main hub for registration staff providing quick access to registration functions.

**Features:**
- Two prominent action buttons: "New Registration" and "Search Pre-Registered"
- Real-time count of participants registered today
- Event information and quick reference about payment requirements
- Mobile-responsive design with large touch-friendly buttons

**Component Files:**
- `src/app/events/[id]/register/page.tsx` - Page wrapper with auth protection
- `src/app/events/[id]/register/RegistrationDashboardContent.tsx` - Dashboard content

**Auth:** Protected by `ProtectRegistrationStaff` component (role: `registration_staff`)

---

### 2. New On-Site Registration Form
**Route:** `/events/[id]/register/new`

**Purpose:** Register a new participant on-site with immediate approval and QR code generation.

**Features:**
- Form fields: Full Name (required), Address (required), Category (required)
- Conditional Receipt Number field (shown only if event has `payment_required === true`)
- Dynamic submit button label: "Approve & Generate QR" when payment required, "Register" when not
- Offline support using `registerParticipantOffline()` function
- Online/offline mode indicator with warning message
- Auto-redirect to Sticker Print Preview upon successful registration

**Form Workflow:**
1. User fills form with participant details
2. Participant created with `payment_status: 'pending'`
3. Participant immediately approved with `payment_status: 'approved'`
4. QR code generated automatically
5. Redirected to print preview for sticker generation

**Offline Functionality:**
- When offline, registration is saved to IndexedDB via `registerParticipantOffline()`
- Automatically synced to server when internet returns
- UI displays offline mode warning

**Component Files:**
- `src/app/events/[id]/register/new/page.tsx` - Page wrapper
- `src/app/events/[id]/register/new/NewRegistrationContent.tsx` - Registration form

**Auth:** Protected by `ProtectRegistrationStaff` component

**API Calls:**
- POST `/api/events/:id/participants` - Create participant
- PATCH `/api/events/:id/participants/:participantId` - Approve payment
- Supabase function: `generate-qr-code` - Generate QR code

---

### 3. Search Pre-Registered
**Route:** `/events/[id]/register/search`

**Purpose:** Find and approve pre-registered participants (registered via public link before event).

**Features:**
- Live search input with real-time results
- Minimum 2 characters required before search triggers
- Results show: Name, Address, Payment Status (Pending/Approved/Declined)
- Click any result to navigate to Participant Approval Screen
- Empty state guidance when no search performed

**Search Logic:**
- Uses case-insensitive `ilike` search on `full_name`
- Results ordered by name alphabetically
- Displays payment status with color-coded badges

**Component Files:**
- `src/app/events/[id]/register/search/page.tsx` - Page wrapper
- `src/app/events/[id]/register/search/SearchPreRegisteredContent.tsx` - Search interface

**Auth:** Protected by `ProtectRegistrationStaff` component

**API Calls:**
- GET `/api/events/:id/participants/search?name=` - Search participants

---

### 4. Participant Approval Screen
**Route:** `/events/[id]/register/participant/[participantId]`

**Purpose:** Review and approve/decline a pre-registered participant's payment.

**Features:**
- Display participant information: Name, Address, Category, Current Payment Status
- Conditional Receipt Number input (only if event has `payment_required === true`)
- Two action buttons: "Approve" and "Decline"
- Confirmation dialog for decline action
- Real-time validation of required fields

**Approval Workflow:**
1. Staff reviews participant details
2. If payment required, staff enters receipt number
3. Staff clicks "Approve"
4. Payment status updated to `approved`
5. QR code generated
6. Auto-redirect to Sticker Print Preview

**Decline Workflow:**
1. Staff clicks "Decline" button
2. Confirmation dialog shown
3. Payment status updated to `declined`
4. Redirected back to search screen

**Component Files:**
- `src/app/events/[id]/register/participant/[participantId]/page.tsx` - Page wrapper
- `src/app/events/[id]/register/participant/[participantId]/ParticipantApprovalContent.tsx` - Approval form

**Auth:** Protected by `ProtectRegistrationStaff` component

**API Calls:**
- PATCH `/api/events/:id/participants/:participantId` - Update approval status
- GET `/api/events/:id/participants/:participantId` - Fetch participant details

---

### 5. Sticker Print Preview
**Route:** `/events/[id]/register/print/[participantId]`

**Purpose:** Display participant sticker in print-ready format before printing.

**Features:**
- Print-ready sticker layout following Section 11 specification
- Sticker layout components:
  - **Top Left:** Event logo (if available)
  - **Top Right:** Event name (uppercase)
  - **Center:** Large bold participant name (uppercase)
  - **Below Name:** Category badge (color-highlighted)
  - **Center Bottom:** QR code (SVG rendered using `qrcode` npm package)
  - **Footer:** "Powered by Elira Technologies" text
- Print button triggers `window.print()`
- CSS media queries hide UI controls when printing
- Auto-redirect to dashboard after print dialog closes

**Print Functionality:**
- Uses Next.js `<Image>` component for logo
- QR code generated from `participants.qr_code` value using `qrcode` library
- Responsive sticker layout (600px × 400px)
- All styles hidden on print via `@media print` CSS

**Component Files:**
- `src/app/events/[id]/register/print/[participantId]/page.tsx` - Page wrapper
- `src/app/events/[id]/register/print/[participantId]/StickerPrintPreviewContent.tsx` - Sticker preview

**Auth:** Protected by `ProtectRegistrationStaff` component

**API Calls:**
- GET `/api/events/:id/participants/:participantId` - Fetch participant with QR code

---

## Security & Access Control

### Role-Based Protection
- All pages protected by `ProtectRegistrationStaff` component
- Only users with `role === 'registration_staff'` can access
- Unauthorized users redirected to `/login`
- Event ID stored in `sessionStorage` during auth check

### Data Scoping
- Registration staff scoped to **one specific event**
- Cannot access other events or organizer-level functions
- `event_id` stored in auth check and used for all queries

### File: ProtectRegistrationStaff.tsx
Location: `src/components/ProtectRegistrationStaff.tsx`

```typescript
export function ProtectRegistrationStaff({ children }) {
  // Checks role === 'registration_staff'
  // Stores event_id and tenant_id in sessionStorage
  // Redirects to /login if unauthorized
}
```

---

## Offline Functionality

The New On-Site Registration form supports full offline operation using the PWA + IndexedDB + Background Sync API pattern.

### Offline Dependencies
- **Module:** `src/lib/offline/sync.ts`
- **Key Function:** `registerParticipantOffline()`

### Offline Registration Flow
1. User fills form while offline
2. Registration saved to IndexedDB via `registerParticipantOffline()`
3. Added to sync queue with timestamp
4. UI confirms registration (no redirect needed)
5. When online, `processSyncQueue()` syncs all offline registrations
6. Server creates participant and generates QR code

### Environment Detection
```typescript
const isOnline = navigator.onLine;
window.addEventListener('online', () => setIsOnline(true));
window.addEventListener('offline', () => setIsOnline(false));
```

### Offline Limitations
- Cannot generate QR codes offline (synced when online)
- Cannot print stickers offline (requires server-generated QR code)
- Form shows offline warning message

---

## Technical Stack

| Concern | Technology |
|---------|-----------|
| **Protection** | `ProtectRegistrationStaff` component wrapper |
| **Forms** | React hooks + Supabase client |
| **Search** | Supabase `ilike` text search |
| **QR Codes** | `qrcode` npm package (SVG rendering) |
| **Printing** | Browser Print API + CSS `@media print` |
| **Offline** | IndexedDB + Background Sync API |
| **Auth** | Supabase Auth (JWT tokens) |
| **Database** | PostgreSQL via Supabase (RLS enabled) |

---

## Component Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `ProtectRegistrationStaff.tsx` | 83 | Auth protection wrapper |
| `RegistrationDashboardContent.tsx` | 148 | Dashboard with action buttons |
| `NewRegistrationContent.tsx` | 321 | Registration form with offline support |
| `SearchPreRegisteredContent.tsx` | 163 | Live search interface |
| `ParticipantApprovalContent.tsx` | 317 | Approval screen with form |
| `StickerPrintPreviewContent.tsx` | 264 | Print preview with QR code |
| **Total** | **1,296** | **All registration staff pages** |

---

## User Flows

### Scenario 1: New On-Site Registration (Payment Required)
1. Staff navigates to Registration Dashboard
2. Clicks "New Registration"
3. Fills: Name, Address, Category, Receipt Number
4. Clicks "Approve & Generate QR"
5. Redirected to Sticker Print Preview
6. Clicks Print button
7. Sticker prints with QR code and participant details

### Scenario 2: Pre-Registered Approval (No Payment Required)
1. Staff navigates to Registration Dashboard
2. Clicks "Search Pre-Registered"
3. Types participant name (min 2 characters)
4. Results appear in real-time
5. Clicks participant name
6. Navigated to Approval Screen
7. No receipt field shown (payment not required)
8. Clicks "Approve"
9. Redirected to Sticker Print Preview
10. Prints sticker

### Scenario 3: Offline Registration
1. Device goes offline
2. Staff navigates to "New Registration"
3. Offline warning message displayed
4. Fills form and submits
5. Registration saved to IndexedDB
6. Staff sees confirmation
7. Later, when online, registration syncs automatically
8. User can then print sticker

---

## API Requirements

The following endpoints must exist for these pages to function:

### Endpoints Referenced
- `POST /api/events/:id/participants` - Create participant
- `GET /api/events/:id/participants/search?name=` - Search participants
- `GET /api/events/:id/participants/:participantId` - Get participant details
- `PATCH /api/events/:id/participants/:participantId` - Update participant (approval/decline)
- `Supabase Function: generate-qr-code` - Generate QR code (optional, can be inline)

### Offline Sync Endpoints
- `POST /api/events/:id/participants` - Used for sync queue
- `POST /api/events/:id/meal/scan` - Used for meal checkin syncs

---

## Styling & Theme

All pages use:
- **Design Tokens** from `globals.css` (colors, spacing, typography)
- **Tailwind CSS** for responsive design
- **Mobile-first approach** with desktop enhancements
- **Consistent UI patterns** with existing pages (FormInput, FormError, SuccessMessage)

### Key CSS Classes Used
- `.bg-background`, `.bg-background-secondary`, `.bg-background-tertiary`
- `.text-foreground`, `.text-foreground-secondary`, `.text-foreground-tertiary`
- `.border-border`, `.rounded-lg`, `.shadow-md`
- `.hover:` states for interactivity
- `.disabled:opacity-50` for disabled states
- `@media print` for print-specific styling

---

## Testing Checklist

- [ ] All routes load with proper auth protection
- [ ] Unauthenticated users redirected to /login
- [ ] New registration form saves participant and redirects to print
- [ ] Payment status conditional Receipt Number field shows/hides correctly
- [ ] Search works after 2 characters typed
- [ ] Participant approval updates payment status
- [ ] Decline action shows confirmation
- [ ] Sticker prints with QR code and event logo
- [ ] Offline registration saves to IndexedDB
- [ ] Sync queue processes when online
- [ ] Print button triggers browser print dialog
- [ ] Auto-redirect after print completes

---

## Future Enhancements

1. **Batch Registration** - Upload CSV of participants for bulk registration
2. **Pre-filled Categories** - Default category selection based on payment amount
3. **Duplicate Detection** - Warn if participant already registered
4. **Barcode Scanning** - USB/Bluetooth scanner support for receipt numbers
5. **Mobile App** - Native mobile QR code scanning interface
6. **Performance** - Pagination for search results on large event

---

## Maintenance Notes

- All pages use dynamic rendering (`export const dynamic = 'force-dynamic'`) due to auth checks
- QR code generation uses `qrcode` npm package (v1.5.4+)
- Offline sync relies on service worker and Background Sync API (not all browsers)
- Print layout fixed at 600×400px - adjust if sticker dimensions change
- Audit logs created for all approve/decline actions (backend responsibility)

