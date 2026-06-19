# Catering Staff Meal Scanning Page

## Overview

The meal scanning page (`/events/[id]/scan`) is a specialized, high-performance interface designed for catering staff to scan QR codes at meal distribution points. It uses a physical USB or Bluetooth scanner gun that types directly into the input field like a keyboard.

## Page Location

**Route:** `/events/[id]/scan`  
**Access:** Catering staff only (role: `catering_staff`)  
**Redirect:** All other roles → `/login`

## Component Structure

```
src/app/events/[id]/scan/
├── page.tsx                          # Route wrapper (dynamic rendering)
└── MealScanningContent.tsx           # Main component (403 lines)

src/components/
└── ProtectCateringStaff.tsx          # Role-based access control
```

## Features & Specifications

### 1. Session Selector Dropdown
- Populated from `GET /api/events/:id/sessions`
- Shows session name, start time, and end time
- Selection triggers meal count update
- Required before scanning

**Format:** `{session.name} (HH:MM - HH:MM)`  
**Example:** `Breakfast (06:00 - 09:00)`

### 2. QR Code Input Field
- **ALWAYS** auto-focused (never loses focus unless showing result)
- Single text input field
- Scanner gun types directly into this field like a keyboard
- Placeholder: "Scanner gun will type here..."
- No button needed — auto-submission on input completion

**Auto-Submission Detection:**
- Listens for Enter key (manual input)
- Detects newline character (scanner gun end-of-string marker)
- Uses debounce timer for timeout detection

### 3. Scan Processing

**Online Mode:**
```
POST /api/events/:id/meal/scan
{
  "qr_code": "participant:xxxxx",
  "session_id": "uuid"
}
```

**Offline Mode:**
- Uses `scanMealOffline()` from `/src/lib/offline/sync.ts`
- Stores in IndexedDB
- Queues for background sync when online

**Response Handling:**
- Success → eligible flag `true`
- Failure → eligible flag `false` with reason and message

### 4. Full-Screen Results

#### Eligible (Green Screen)
- **Background:** Solid green (green-500)
- **Content:**
  - Large checkmark (✓)
  - Participant full name (large, bold)
  - Category badge/label (if applicable)
  - Text: "Serve the meal"
- **Duration:** 3 seconds, then auto-clear
- **Font Size:** Optimized for visibility across room

#### Not Eligible (Red Screen)
- **Background:** Solid red (red-500)
- **Content:**
  - Large X symbol (✗)
  - Heading: "Not Eligible"
  - Reason message (e.g., "Already served", "Payment not approved")
  - **Override button** (appears ONLY on red result)

**Override Workflow (Red Screen Only):**
1. User clicks "Override" button
2. Text area appears: "Enter override reason..."
3. User types reason (required, non-empty)
4. Click "Confirm Override"
5. Calls `POST /api/events/:id/meal/scan/override`
6. If successful, shows green screen for 3 seconds
7. Meal count increments

### 5. Running Meal Count

**Display:** "X served this session"  
**Location:** Persistent status box above input field  
**Update Triggers:**
- When session changes
- After successful scan (immediate +1)
- After successful override (immediate +1)
- Every result display (refetch count)

**Endpoint:** `GET /api/events/:id/meal/sessions/:sessionId/count`

### 6. Auto-Focus & Input Management

**Initial State:**
- QR input field auto-focused on component mount
- Scanner gun can immediately start typing

**After Result (3-second timer):**
1. Result disappears (green or red screen)
2. Input field automatically clears (`setQrInput('')`)
3. Field automatically re-focused
4. Ready for next scan immediately

**Critical:** Input field is NEVER disabled or hidden during normal operation. If focus is lost, user can click the input to refocus, but this should not happen in normal usage.

### 7. Online/Offline Status

**Status Indicator:**
- Green dot + "Online" → Device online, using server API
- Orange dot + "Offline Mode" → Device offline, using IndexedDB

**Behavior:**
- Monitors `window.online` and `window.offline` events
- Automatically switches mode based on connectivity
- Offline scans queue for sync when internet returns
- Uses `scanMealOffline()` function when offline

### 8. Error Handling

**No Session Selected:**
- Message: "Please select a meal session first."
- Red screen display
- No scan is recorded

**QR Code Not Found:**
- Message: "QR code not recognized."
- Red screen
- Override available

**Already Served:**
- Message: "This participant already received this meal."
- Red screen
- Override available

**Payment Not Approved:**
- Message: "This participant's payment has not been approved."
- Red screen
- Override available

**Network Error (Online Mode):**
- Message: "Error processing meal scan. Try again."
- Red screen
- Override available

### 9. Accessibility & UX

- **Large fonts** on result screens for visibility
- **High contrast** colors (green/red backgrounds with white text)
- **No animations** that distract from scanning workflow
- **Responsive** to different screen sizes (laptop, tablet)
- **Keyboard-first** design (scanner gun is essentially a keyboard)

## Implementation Details

### State Management

```typescript
const [sessions, setSessions] = useState<Session[]>([]);           // Available sessions
const [selectedSessionId, setSelectedSessionId] = useState('');     // Currently selected
const [qrInput, setQrInput] = useState('');                         // Current input
const [mealCount, setMealCount] = useState(0);                      // Served count
const [scanResult, setScanResult] = useState<ScanResult | null>(null);  // Last result
const [showResult, setShowResult] = useState(false);                // Show result screen
const [overrideMode, setOverrideMode] = useState(false);            // Override UI active
const [overrideReason, setOverrideReason] = useState('');           // Override text
const [isOnline, setIsOnline] = useState(true);                     // Online/offline
const [loading, setLoading] = useState(true);                       // Initial load
```

### Key Functions

**`handleQrInput(value)`**
- Monitors input changes
- Detects newline character from scanner gun
- Triggers `processScan()` automatically

**`handleKeyDown(e)`**
- Detects Enter key press
- Allows manual submission
- Trims whitespace before submit

**`processScan(qrCode)`**
- Validates session selection
- Calls appropriate API (online) or IndexedDB (offline)
- Displays result screen
- Starts 3-second auto-clear timer
- Updates meal count

**`handleOverride()`**
- Validates override reason (non-empty)
- Calls override endpoint
- Handles success/failure

**`useEffect` hooks:**
- Sessions fetch on mount
- Meal count update on session change or result display
- Auto-focus management
- Online/offline event listeners

### Refs

```typescript
const qrInputRef = useRef<HTMLInputElement>(null);    // QR input field
const resultTimeoutRef = useRef<NodeJS.Timeout>();   // 3-second auto-clear timer
```

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/events/:id/sessions` | GET | Fetch available meal sessions |
| `/api/events/:id/meal/scan` | POST | Process QR code scan |
| `/api/events/:id/meal/scan/override` | POST | Perform manual override |
| `/api/events/:id/meal/sessions/:sessionId/count` | GET | Get current meal count |

## Offline Support

**Function:** `scanMealOffline(qrCode, sessionId, eventId)`  
**Location:** `/src/lib/offline/sync.ts`

**Behavior:**
1. Looks up participant by QR code in IndexedDB
2. Checks payment status (must be "approved")
3. Checks for duplicate checkin (participant + session)
4. Creates local checkin record
5. Adds to sync queue
6. Returns eligibility status

**Sync on Reconnect:**
- Background Sync API automatically processes queue
- No manual intervention needed
- Conflicts resolved server-side

## Role-Based Access

**ProtectCateringStaff Component:**
- Checks user role = 'catering_staff'
- Stores event_id in sessionStorage
- Redirects non-catering_staff to /login
- Shows loading spinner during auth check

## Design & Layout

### Color Scheme

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Background | Dark gray | bg-background |
| Text | Light | text-foreground |
| Accent | Brand color | bg-accent |
| Success screen | Green | bg-green-500 |
| Error screen | Red | bg-red-500 |
| Online indicator | Green | bg-green-500 |
| Offline indicator | Orange | bg-orange-500 |

### Typography

- Input field label: Small, medium weight
- Meal count: Large, semibold
- Result screen names: Extra large, bold (6xl)
- Result screen category: Large (3xl)
- Instructions: Small, secondary color

### Spacing

- Main container: Max width 28rem (md), padded
- Sections: Stacked vertically with consistent gaps (mb-6, mb-8)
- Result screens: Centered, full viewport
- Form elements: Full width with rounded corners

## Testing Checklist

- [ ] Session dropdown populates correctly
- [ ] QR input field auto-focuses on mount
- [ ] Scanner gun input (newline detection) works
- [ ] Enter key manual submission works
- [ ] Green result displays correctly (eligible)
- [ ] Red result displays correctly (not eligible)
- [ ] Override button appears only on red
- [ ] Override reason text area functions
- [ ] 3-second auto-clear timer works
- [ ] Meal count increments after successful scan
- [ ] Meal count updates on session change
- [ ] Online/offline indicator shows correctly
- [ ] Offline mode uses IndexedDB
- [ ] Background sync triggers on reconnect
- [ ] Page redirects non-catering_staff to /login

## Performance Considerations

- **No animations on result screens** — improves legibility
- **Debounce input parsing** — prevents false submissions
- **3-second result display** — balance between visibility and workflow speed
- **Session-scoped meal count** — accurate tracking per meal
- **IndexedDB queries** — instant offline lookups
- **Request deduplication** — avoid redundant API calls

## Future Enhancements

- Mobile app integration (Phase 2)
- Camera-based QR scanning (Phase 2)
- Audio/visual feedback on successful scan
- Participant photo display on green screen
- Real-time sync status
- Scan history/analytics dashboard
- Barcode scanning as alternative to QR

## Troubleshooting

**QR input field loses focus:**
- Ensure no other interactive elements capture focus
- Check z-index of result overlay
- Verify `autoFocus` attribute is present

**Results not auto-clearing:**
- Check browser console for errors
- Verify setTimeout is clearing correctly
- Confirm resultTimeoutRef is being set

**Offline mode not working:**
- Check IndexedDB is available in browser
- Verify scanMealOffline function exists
- Confirm network status detection works

**Meal count not updating:**
- Check API endpoint response format
- Verify count endpoint is accessible
- Confirm selected session ID is valid
