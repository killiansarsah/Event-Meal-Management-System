# Offline Sync Integration Examples

## Quick Start

### 1. Initialize Sync on App Startup

Add to your root layout or app initializer component:

```typescript
'use client'

import { useEffect } from 'react'
import { syncFromServer, registerSyncHandler } from '@/lib/offline/sync'

export function AppOfflineInitializer() {
  useEffect(() => {
    const initializeOfflineSync = async () => {
      // If online, download fresh data
      if (navigator.onLine) {
        const result = await syncFromServer()
        if (result.success) {
          console.log(`[Offline] Downloaded ${result.itemsDownloaded} items`)
        } else {
          console.warn('[Offline] Initial sync failed:', result.error)
        }
      }

      // Register sync event handlers for when connectivity returns
      registerSyncHandler()
    }

    initializeOfflineSync()
  }, [])

  return null
}
```

Add to `layout.tsx`:
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AppOfflineInitializer />
        {children}
      </body>
    </html>
  )
}
```

### 2. Offline Registration Form

```typescript
'use client'

import { useState } from 'react'
import { registerParticipantOffline } from '@/lib/offline/sync'

interface OfflineRegistrationFormProps {
  eventId: string
  categories: Array<{ id: string; name: string; fee: number }>
}

export function OfflineRegistrationForm({ eventId, categories }: OfflineRegistrationFormProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    address: '',
    category_id: '',
    receipt_number: '',
  })

  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')

    try {
      const result = await registerParticipantOffline({
        full_name: formData.full_name,
        address: formData.address,
        category_id: formData.category_id || undefined,
        receipt_number: formData.receipt_number || undefined,
        eventId,
      })

      if (result.success) {
        setQrCode(result.participant.qr_code_data_url || null)
        setParticipantId(result.participant.id)
        setState('success')

        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({
            full_name: '',
            address: '',
            category_id: '',
            receipt_number: '',
          })
          setState('idle')
          setQrCode(null)
        }, 3000)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed')
      setState('error')

      setTimeout(() => {
        setState('idle')
        setErrorMessage('')
      }, 3000)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded border">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            disabled={state === 'loading' || state === 'success'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address *</label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            disabled={state === 'loading' || state === 'success'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            disabled={state === 'loading' || state === 'success'}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} (${cat.fee})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Receipt Number</label>
          <input
            type="text"
            value={formData.receipt_number}
            onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            disabled={state === 'loading' || state === 'success'}
          />
        </div>

        <button
          type="submit"
          disabled={state === 'loading' || state === 'success'}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {state === 'loading' ? 'Registering...' : state === 'success' ? '✓ Registered!' : 'Register Participant'}
        </button>
      </form>

      {state === 'error' && (
        <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200">
          {errorMessage}
        </div>
      )}

      {qrCode && state === 'success' && (
        <div className="bg-green-50 p-4 rounded border border-green-200 text-center">
          <p className="text-sm font-medium text-green-700 mb-3">Participant Registered Successfully!</p>
          <div className="space-y-3">
            <div>
              <img src={qrCode} alt="QR Code" className="w-40 h-40 mx-auto" />
              <p className="text-xs text-gray-600 mt-2">ID: {participantId}</p>
            </div>
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = qrCode
                link.download = `qr-${participantId}.png`
                link.click()
              }}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Download QR Code
            </button>
            <button
              onClick={() => window.print()}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Print Sticker
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 3. Offline Meal Scanner

```typescript
'use client'

import { useRef, useState, useEffect } from 'react'
import { scanMealOffline } from '@/lib/offline/sync'

interface OfflineMealScannerProps {
  eventId: string
  sessionId: string
  sessionName: string
}

interface ScanResult {
  status: 'success' | 'error' | 'already_served' | 'not_approved'
  participantName?: string
  message: string
}

export function OfflineMealScanner({ eventId, sessionId, sessionName }: OfflineMealScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [qrInput, setQrInput] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Auto-focus input for keyboard scanner
    inputRef.current?.focus()
  }, [])

  const handleScan = async () => {
    if (!qrInput.trim()) return

    setIsProcessing(true)
    const scanResult = await scanMealOffline(qrInput, sessionId, eventId)

    if (scanResult.eligible) {
      setResult({
        status: 'success',
        participantName: scanResult.participant.full_name,
        message: `✓ ${scanResult.participant.full_name} - Meal served`,
      })
      setScanCount((c) => c + 1)

      // Clear input and reset after 2 seconds
      setTimeout(() => {
        setQrInput('')
        setResult(null)
        setIsProcessing(false)
        inputRef.current?.focus()
      }, 2000)
    } else {
      const statusMap: Record<string, 'error' | 'already_served' | 'not_approved'> = {
        not_found: 'error',
        already_served: 'already_served',
        not_approved: 'not_approved',
      }

      setResult({
        status: statusMap[scanResult.reason] || 'error',
        message: scanResult.message,
      })

      // Clear input after error
      setTimeout(() => {
        setQrInput('')
        inputRef.current?.focus()
      }, 1500)

      setIsProcessing(false)
    }
  }

  const statusColors = {
    success: 'bg-green-50 border-green-300 text-green-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    already_served: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    not_approved: 'bg-orange-50 border-orange-300 text-orange-800',
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="bg-white p-4 rounded border-2 border-blue-300">
        <h2 className="text-lg font-bold mb-1">{sessionName}</h2>
        <p className="text-sm text-gray-600">Scanned: {scanCount}</p>
      </div>

      <div className="bg-white p-4 rounded border">
        <label className="block text-sm font-medium mb-2">Scan QR Code:</label>
        <input
          ref={inputRef}
          type="text"
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isProcessing) {
              handleScan()
            }
          }}
          placeholder="Position scanner and scan..."
          className="w-full px-4 py-3 border-2 rounded text-lg font-mono focus:outline-none focus:border-blue-500"
          disabled={isProcessing}
          autoComplete="off"
        />
        <p className="text-xs text-gray-500 mt-2">
          Connect USB/Bluetooth scanner to this device or paste QR code value
        </p>
      </div>

      {result && (
        <div className={`p-4 rounded border-2 ${statusColors[result.status]}`}>
          <p className="font-bold">{result.message}</p>
          {result.status === 'success' && (
            <p className="text-sm mt-1">Participant has received their meal</p>
          )}
          {result.status === 'already_served' && (
            <p className="text-sm mt-1">This participant already received this meal</p>
          )}
          {result.status === 'not_approved' && (
            <p className="text-sm mt-1">Payment has not been approved yet</p>
          )}
          {result.status === 'error' && (
            <p className="text-sm mt-1">QR code not recognized. Please check and retry.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleScan}
          disabled={!qrInput.trim() || isProcessing}
          className="bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          Scan
        </button>
        <button
          onClick={() => {
            setQrInput('')
            inputRef.current?.focus()
          }}
          disabled={isProcessing}
          className="bg-gray-300 text-gray-700 py-2 rounded font-medium hover:bg-gray-400 disabled:bg-gray-200"
        >
          Clear
        </button>
      </div>

      <div className="text-center text-xs text-gray-500 p-2 bg-gray-50 rounded">
        <p>Working offline • Syncs when connection returns</p>
      </div>
    </div>
  )
}
```

### 4. Sync Status Monitor

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getSyncQueue, getAllParticipants } from '@/lib/offline/db'
import { processSyncQueue, forceSyncNow } from '@/lib/offline/sync'

export function SyncStatusMonitor() {
  const [queueSize, setQueueSize] = useState(0)
  const [participantCount, setParticipantCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const updateStatus = async () => {
    try {
      const queue = await getSyncQueue()
      setQueueSize(queue.length)

      // Count local participants
      const participants = await getAllParticipants('current-event-id')
      setParticipantCount(participants.length)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  useEffect(() => {
    updateStatus()
    const interval = setInterval(updateStatus, 5000) // Update every 5 seconds

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await forceSyncNow()
      setLastSync(new Date())
      await updateStatus()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="bg-white border rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Offline Status</h3>
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <p className="text-gray-600">Status</p>
          <p className="font-bold">{isOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <p className="text-gray-600">Queue</p>
          <p className="font-bold">{queueSize} items</p>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <p className="text-gray-600">Participants</p>
          <p className="font-bold">{participantCount}</p>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <p className="text-gray-600">Last Sync</p>
          <p className="font-bold text-xs">{lastSync ? lastSync.toLocaleTimeString() : 'Never'}</p>
        </div>
      </div>

      {queueSize > 0 && (
        <button
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSyncing ? 'Syncing...' : `Sync ${queueSize} Items`}
        </button>
      )}

      {queueSize === 0 && isOnline && (
        <p className="text-sm text-green-600 text-center">✓ All data synced</p>
      )}

      {!isOnline && queueSize > 0 && (
        <p className="text-sm text-yellow-600 text-center">Waiting for connection to sync...</p>
      )}
    </div>
  )
}
```

### 5. Logout Handler

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { clearOfflineData } from '@/lib/offline/sync'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    // Clear all offline data on logout
    await clearOfflineData()

    // Clear auth
    localStorage.removeItem('__auth_user__')

    // Redirect to login
    router.push('/login')
  }

  return (
    <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
      Logout
    </button>
  )
}
```

## API Endpoint Expectations

### Participant Registration Response
```json
{
  "participant": {
    "id": "uuid",
    "event_id": "uuid",
    "full_name": "John Doe",
    "address": "123 Main St",
    "category_id": "uuid",
    "payment_status": "pending",
    "qr_code": "data:image/png;base64,...",
    "registered_online": false,
    "receipt_number": "RCP-001",
    "created_at": "2024-06-18T12:00:00Z"
  }
}
```

### Meal Scan Response (Success)
```json
{
  "eligible": true,
  "participant": {
    "full_name": "John Doe",
    "category": "VIP"
  },
  "session": {
    "name": "Lunch"
  }
}
```

### Meal Scan Response (Error)
```json
{
  "eligible": false,
  "reason": "already_served",
  "message": "This participant has already received their meal for this session."
}
```

## Error Handling

Always wrap sync functions in try-catch:

```typescript
try {
  const result = await scanMealOffline(qrCode, sessionId, eventId)
  if (result.eligible) {
    // Handle success
  } else {
    // Handle eligibility failure
    console.log(`Ineligible: ${result.reason} - ${result.message}`)
  }
} catch (error) {
  // Handle network/other errors
  console.error('Scan failed:', error)
  // Show error UI
}
```

## Testing Without Internet

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. App continues working with cached data

### Intentional Disconnection
```typescript
// Simulate going offline
window.dispatchEvent(new Event('offline'))

// Simulate coming back online
window.dispatchEvent(new Event('online'))
```

## Performance Optimization Tips

1. **Debounce sync queue checks** - Don't query every second
2. **Batch QR scans** - Collect multiple scans before syncing if possible
3. **Lazy load participants** - Don't load all participants on startup
4. **Clear old synced items** - Periodically call `clearSynced()`
5. **Monitor IndexedDB size** - Set up alerts if it exceeds 10MB

## Troubleshooting

| Issue | Solution |
|-------|----------|
| QR codes not generating | Check qrcode library is installed |
| Sync not triggering | Check Service Worker is registered in DevTools |
| Duplicate participants | Check server-side deduplication logic |
| Memory issues | Clear old synced items with `clearSynced()` |
| Offline data not persisting | Check IndexedDB quota not exceeded |
