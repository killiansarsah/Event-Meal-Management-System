# Offline Sync System Guide

## Overview

The Elira Event Meal Management System includes a complete offline-first architecture that allows staff to register participants and scan meal QR codes without an internet connection. All operations are queued locally and automatically synced to the server when the device reconnects.

## Architecture

### Components

1. **IndexedDB Database** (`/src/lib/offline/db.ts`)
   - Local browser storage for event data, participants, categories, sessions, and checkins
   - Synced on app startup when online
   - Survives browser refresh and offline periods

2. **Sync Logic** (`/src/lib/offline/sync.ts`)
   - Handles initial data download from server
   - Manages offline registration and meal scanning
   - Processes background sync queue with conflict resolution
   - Provides utility functions for sync management

3. **Service Worker** (`/public/sw.js`)
   - Caches app shell for offline access
   - Implements cache strategies (cache-first, network-first)
   - Handles Background Sync API events
   - Communicates with app for sync triggers

4. **Service Worker Registration** (`/src/components/service-worker-registration.tsx`)
   - Registers service worker on app startup
   - Listens for online/offline events
   - Initializes sync handler
   - Manages background sync registration

## How It Works

### 1. Initial Data Download (`syncFromServer()`)

When the app loads and the device is online:

```typescript
import { syncFromServer } from '@/lib/offline/sync'

// Called during app initialization
const result = await syncFromServer()
if (result.success) {
  console.log(`Downloaded ${result.itemsDownloaded} items`)
}
```

**What it syncs:**
- Event details (name, date, venue, logo)
- Participant categories (VIP, Regular, Student, etc.)
- Meal sessions (Breakfast, Lunch, Dinner)
- All approved participants with QR codes

**Note:** Only approved participants are synced — pending or declined registrations are not available offline.

### 2. Offline Participant Registration

Staff can register new participants while offline:

```typescript
import { registerParticipantOffline } from '@/lib/offline/sync'

const result = await registerParticipantOffline({
  full_name: 'John Doe',
  address: '123 Main St',
  category_id: 'cat-uuid',
  receipt_number: 'RCP-001',
  eventId: 'event-uuid'
})

if (result.success) {
  const participant = result.participant
  console.log('Participant registered offline')
  console.log('QR code data URL:', participant.qr_code_data_url)
  // Display QR code to user
}
```

**What happens:**
- Locally generates a unique QR code using the qrcode library
- Creates participant record in IndexedDB with temporary ID (prefixed with `LOCAL_`)
- Adds operation to sync queue with timestamp
- Returns participant data including QR code for immediate display/printing

**Temporary IDs:**
- Participants registered offline get temporary IDs like `LOCAL_1718700123456_abc123def`
- When synced, server returns permanent UUID and local record is updated
- This allows stickers/badges to be printed immediately with a QR code

### 3. Offline Meal Scanning

Catering staff can scan meal QR codes while offline:

```typescript
import { scanMealOffline } from '@/lib/offline/sync'

const result = await scanMealOffline(
  qrCodeValue,           // QR code scanned from participant
  sessionId,             // UUID of meal session
  eventId                // UUID of event
)

if (result.eligible) {
  console.log('Meal eligible:', result.participant.full_name)
  console.log('Checkin ID:', result.checkinId)
  // Update UI - mark as served
} else {
  console.log(`Ineligible: ${result.reason}`)
  console.log('Message:', result.message)
  // Handle error case (not_found, already_served, not_approved)
}
```

**Eligibility rules:**
- `eligible: true` — Participant found, approved, not yet served this meal → adds to sync queue
- `eligible: false, reason: 'not_found'` — QR code not recognized
- `eligible: false, reason: 'already_served'` — Participant already checked in for this session
- `eligible: false, reason: 'not_approved'` — Participant's payment not approved yet

**Conflict Handling:**
- When synced, if another device already checked in this participant, the server returns error
- Sync queue detects "already_served" conflicts and marks as synced to prevent retries
- No manual intervention needed

### 4. Background Sync Processing

Queued operations sync automatically when connectivity returns:

**Automatic triggers:**
- `online` event fires when device reconnects to internet
- Service Worker's `sync` event if Background Sync API is available
- Manual call to `processSyncQueue()` or `forceSyncNow()`

**Sync flow:**
```typescript
import { processSyncQueue } from '@/lib/offline/sync'

const stats = await processSyncQueue()
console.log(`Processed: ${stats.processed}, Synced: ${stats.synced}, Conflicts: ${stats.conflicts}`)
```

**For each queued operation:**
1. Read from sync queue in timestamp order (oldest first)
2. Send to appropriate API endpoint:
   - Registrations → `POST /api/events/:eventId/participants`
   - Meal scans → `POST /api/events/:eventId/meal/scan`
3. On success:
   - Mark as synced in queue
   - If server returns new ID (for participants), update local record with permanent ID
4. On conflict:
   - Detect "already_served" and mark as synced (don't retry)
   - Log conflict for audit trail
5. On error:
   - Leave unsynced for retry on next sync attempt
   - Report error in stats

**Sync queue data:**
```typescript
interface SyncQueueItem {
  id: string                              // Unique queue item ID
  type: 'checkin' | 'participant_registration'
  data: Record<string, unknown>           // Operation payload
  synced: boolean                         // Whether successfully synced
  created_at: string                      // ISO timestamp
  synced_at?: string                      // ISO timestamp when synced
}
```

## Usage Examples

### Register app initialization with sync

```typescript
'use client'

import { useEffect } from 'react'
import { syncFromServer, registerSyncHandler } from '@/lib/offline/sync'

export default function AppInitializer() {
  useEffect(() => {
    // Initialize offline sync on app load
    const initSync = async () => {
      // Download initial data if online
      if (navigator.onLine) {
        const result = await syncFromServer()
        if (!result.success) {
          console.warn('Initial sync failed:', result.error)
        }
      }
      
      // Register sync event handlers
      registerSyncHandler()
    }

    initSync()
  }, [])

  return null
}
```

### Particle registration form (offline-capable)

```typescript
'use client'

import { useState } from 'react'
import { registerParticipantOffline } from '@/lib/offline/sync'

export function OfflineRegistrationForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    address: '',
    category_id: '',
  })
  const [qrCode, setQrCode] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await registerParticipantOffline({
      ...formData,
      eventId: 'current-event-id',
    })

    if (result.success) {
      setQrCode(result.participant.qr_code_data_url)
      // Reset form or show confirmation
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Full Name"
        />
        {/* ... other fields ... */}
        <button type="submit">Register Participant</button>
      </form>
      {qrCode && <img src={qrCode} alt="QR Code" />}
    </div>
  )
}
```

### Meal scanning interface (offline-capable)

```typescript
'use client'

import { useState } from 'react'
import { scanMealOffline } from '@/lib/offline/sync'

export function MealScannerOffline({ sessionId, eventId }: { sessionId: string; eventId: string }) {
  const [qrInput, setQrInput] = useState('')
  const [result, setResult] = useState<any>(null)

  const handleScan = async () => {
    const scanResult = await scanMealOffline(qrInput, sessionId, eventId)
    setResult(scanResult)
    
    if (scanResult.eligible) {
      // Show success message
      setTimeout(() => {
        setQrInput('')
        setResult(null)
      }, 2000)
    }
  }

  return (
    <div>
      <input
        type="text"
        value={qrInput}
        onChange={(e) => setQrInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleScan()}
        placeholder="Scan QR code..."
        autoFocus
      />
      {result && (
        <div className={result.eligible ? 'success' : 'error'}>
          {result.eligible ? (
            <p>✓ {result.participant.full_name} - Meal served</p>
          ) : (
            <p>✗ {result.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

## Data Integrity & Conflict Resolution

### Local ID Management

**Participant Registration:**
- Offline: `LOCAL_<timestamp>_<random>`
- After sync: Replaced with server UUID
- QR code: Generated at registration time (unique)

**Meal Checkins:**
- Offline: `LOCAL_CHECKIN_<timestamp>_<random>`
- After sync: Server creates permanent record
- Session uniqueness enforced by server

### Conflict Scenarios

| Scenario | Offline Behavior | Server Resolution |
|----------|------------------|-------------------|
| Participant scanned twice offline | Both operations added to queue | Server enforces unique constraint, returns 400 `already_served` |
| Participant scanned on 2 devices simultaneously | Both sync to server at same time | Server enforces unique constraint for one device, other gets conflict |
| Participant registered offline, then online | Both create participant records | Application should deduplicate by full_name or receipt number |
| Network reconnects during sync | Operations partially synced | Unsynced items retry on next sync |

### Server-Side Enforcement

The database has these constraints:
- `UNIQUE (participant_id, session_id)` on meal_checkins prevents duplicates
- Timestamps on all records for audit trail
- All changes logged to audit_logs for full history

## Performance Considerations

### Data Downloaded per Event

- Event record: ~500 bytes
- Each category: ~100 bytes
- Each session: ~150 bytes
- Each participant with QR: ~1-2 KB
- **Typical event with 1000 participants: ~2-3 MB**

### IndexedDB Limits

- Modern browsers: 50+ MB per domain
- Plenty of capacity for typical event sizes
- Automatically cleared on logout for security

### Sync Performance

- Each operation: 1-2 requests to server
- Typical 1000 operations: 1000-2000 requests
- Throttled/batch if needed in production

## Debugging

### Check Sync Queue

```typescript
import { getSyncQueue } from '@/lib/offline/db'

const queue = await getSyncQueue()
console.log('Pending sync operations:', queue.length)
queue.forEach((item) => {
  console.log(`- ${item.type}: ${item.data} (${item.synced ? 'synced' : 'pending'})`)
})
```

### Force Sync Now

```typescript
import { forceSyncNow } from '@/lib/offline/sync'

const stats = await forceSyncNow()
console.log('Sync results:', stats)
```

### Clear All Offline Data

```typescript
import { clearOfflineData } from '@/lib/offline/sync'

await clearOfflineData()
console.log('Offline data cleared')
```

### Monitor Service Worker

Open DevTools → Application → Service Workers to see:
- Registration status
- Cache contents
- Messages from app

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ 11.1+ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ 10+ | ✅ |
| Background Sync | ✅ 49+ | ❌ | ❌ | ✅ 79+ |
| Cache API | ✅ | ✅ | ✅ 11.1+ | ✅ |

**Note:** Offline mode works in all browsers via Service Worker + IndexedDB. Background Sync API (automatic sync on reconnection) works in Chrome/Edge; other browsers use manual online event handlers.

## Security Notes

1. **No sensitive data cached** — Only approved participant records are cached (no payment info)
2. **Local storage isolation** — Data stored in IndexedDB (per-origin isolation)
3. **Session-based** — All data cleared on logout
4. **Server validation** — All offline operations re-validated on sync
5. **Audit trail** — Every offline operation logged on server with timestamp and user

## Future Enhancements

- Periodic incremental sync (delta syncing)
- Conflict resolution UI for user review
- Offline reporting/analytics
- Media file caching for event logos
- Encryption of sensitive sync data
