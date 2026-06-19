# Finance Team Pages — Elira Event Platform

## Overview

The Finance Team module provides payment reconciliation and reporting capabilities. Finance team members can view, filter, search, and export payment records for their assigned event.

**Status:** Production Ready  
**Build:** ✓ Compiles successfully with no errors  
**Routes:** `/events/[id]/payments`

---

## Pages Built

### 1. Payments Overview (`/events/[id]/payments`)

**Purpose:** Display all participant payment records with filtering, search, and export capabilities.

**Access Control:**
- Accessible ONLY to users with role `finance_team`
- Redirects unauthorized users to `/login`
- Stores `event_id` and `tenant_id` in sessionStorage for data scoping

**Components:**
- `src/app/events/[id]/payments/page.tsx` (15 lines)
- `src/app/events/[id]/payments/PaymentsOverviewContent.tsx` (288 lines)
- `src/components/ProtectFinanceTeam.tsx` (83 lines)

---

## Features

### Summary Bar (Top Section)

Three status cards displaying real-time counts from the backend:

```
┌─────────────┬─────────────┬─────────────┐
│  Approved   │  Declined   │  Pending    │
│    Count    │    Count    │    Count    │
└─────────────┴─────────────┴─────────────┘
```

Colors:
- **Approved:** Green background with green text
- **Declined:** Red background with red text
- **Pending:** Yellow background with yellow text

**Data Source:** `GET /api/events/:id/reports/payments` → `stats` field

---

### Payments Table

Full-width responsive table showing all participant payment records:

| Column | Type | Notes |
|--------|------|-------|
| **Participant Name** | String | Full legal name from `participants.full_name` |
| **Category** | String | Participant category (e.g., VIP, Regular, Student) |
| **Status** | Badge | Color-coded: Green/Red/Yellow + text |
| **Receipt Number** | String | Payment receipt identifier (monospace font) |

**Features:**
- Hover effect on rows (subtle background change)
- Status badges with appropriate color coding
- Displays "—" for missing data (null values)
- Empty state messaging when no records match filters

---

### Filter & Search Controls

Located above the table in a control panel:

**Search Input:**
- Placeholder: "Name or receipt number..."
- Searches across:
  - Participant full name (case-insensitive)
  - Receipt number (case-insensitive)
- Real-time filtering as user types

**Status Filter Dropdown:**
- Options: All Statuses | Approved | Declined | Pending
- Default: "All Statuses"
- Updates table immediately on selection

**Results Counter:**
- Displays "Showing X of Y payments" below table
- Updates dynamically as filters change

---

### Export Buttons

Three export options available in the control panel:

**Export CSV**
- Calls `GET /api/events/:id/reports/export?type=csv&report=payments`
- Downloads as `.csv` file
- Opens in Excel or spreadsheet applications

**Export PDF**
- Calls `GET /api/events/:id/reports/export?type=pdf&report=payments`
- Downloads as `.pdf` file
- Formatted for printing

**Export Excel**
- Calls `GET /api/events/:id/reports/export?type=excel&report=payments`
- Downloads as `.xlsx` file (modern Excel format)
- Preserves formatting and colors

**Export Behavior:**
- All buttons disabled during export (`exportLoading` state)
- Error messages shown in FormError component if export fails
- Downloads automatically to user's default download folder
- Filename derived from response headers or defaults to `payments-export.[type]`

---

## API Integration

### Required Endpoints

**1. Get Payments Data**

```
GET /api/events/:id/reports/payments
```

**Request:**
- No query parameters or body required
- Authenticated user context used for tenant/event scoping

**Response:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "category_name": "VIP",
      "payment_status": "approved",
      "receipt_number": "REC-001-2024"
    }
  ],
  "stats": {
    "total_approved": 45,
    "total_declined": 3,
    "total_pending": 12
  }
}
```

---

**2. Export Reports**

```
GET /api/events/:id/reports/export?type={type}&report=payments
```

**Query Parameters:**
- `type`: `csv`, `pdf`, or `excel`
- `report`: `payments` (fixed for this page)

**Response Headers:**
- `Content-Type`: 
  - `text/csv; charset=utf-8` for CSV
  - `application/pdf` for PDF
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` for Excel
- `Content-Disposition`: `attachment; filename="payments-export.[ext]"`

**Response Body:** Binary file data

---

## Security & Data Isolation

### Role-Based Access Control

The `ProtectFinanceTeam` component enforces access:

1. Checks if authenticated user has role `finance_team`
2. Retrieves user's assigned `event_id`
3. Stores both `event_id` and `tenant_id` in sessionStorage
4. Redirects unauthorized users to `/login`

### Multi-Tenancy

- Finance team members are scoped to a single event
- Row Level Security (RLS) in the database prevents access to other tenants' data
- API calls automatically filtered by user's tenant_id (server-side)

---

## User Experience

### Loading States

- **Initial Load:** Spinner with "Loading payment records..." text
- **Export:** Buttons change text to "Exporting..." and are disabled
- **Empty State:** Helpful message when no records match current filters

### Error Handling

- Network errors shown via `FormError` component
- Export errors caught and displayed below export buttons
- Allows retry without page refresh

### Responsive Design

- **Mobile (< 768px):** Single column layout, stacked controls
- **Tablet (768px - 1024px):** 2 columns for better use of space
- **Desktop (> 1024px):** Full 3-column summary bar, optimized table width

---

## File Structure

```
src/
├── app/events/[id]/payments/
│   ├── page.tsx (15 lines)
│   └── PaymentsOverviewContent.tsx (288 lines)
├── components/
│   └── ProtectFinanceTeam.tsx (83 lines)
```

---

## Testing Checklist

- [ ] Finance team user can access `/events/:id/payments`
- [ ] Non-finance team users are redirected to `/login`
- [ ] Payment records load from backend
- [ ] Summary counts display correctly
- [ ] Search filters by name and receipt number
- [ ] Status dropdown filters correctly
- [ ] Status badges display with correct colors
- [ ] CSV export downloads successfully
- [ ] PDF export downloads successfully
- [ ] Excel export downloads successfully
- [ ] "Showing X of Y" counter updates on filter change
- [ ] Responsive layout works on mobile/tablet/desktop

---

## Future Enhancements

- [ ] Pagination for large datasets (> 1000 records)
- [ ] Column sorting (click header to sort)
- [ ] Advanced filters (date range, category, etc.)
- [ ] Bulk actions (approve/decline multiple)
- [ ] Payment reconciliation workflow
- [ ] Manual payment entry
- [ ] Payment history timeline

---

## Dependencies

- **React 18+** — UI framework
- **Next.js 14+** — Framework with App Router
- **Supabase Client** — Database queries
- **useApiRequest Hook** — API communication
- **FormError Component** — Error display
- **Design Tokens** — Color system and styling

---

## Notes

- All data filtering happens on the frontend after fetching from backend
- Large datasets should implement pagination at backend to reduce initial load time
- Export functionality requires backend implementation of `/api/events/:id/reports/export`
- Finance team members are event-scoped and cannot see other events

