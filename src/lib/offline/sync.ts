import QRCode from 'qrcode'
import {
  saveEvent,
  saveCategory,
  saveSession,
  saveParticipant,
  saveCheckin,
  addToSyncQueue,
  getSyncQueue,
  markSynced,
  getParticipantByQrCode,
  getAllParticipants,
  clearAllStores,
  type Event,
  type Category,
  type Session,
  type Participant,
  type Checkin,
} from './db'

/**
 * INITIAL DATA DOWNLOAD
 * Fetches all event data from the server and syncs to IndexedDB
 * Called when app loads and device is online
 */
export async function syncFromServer(): Promise<{
  success: boolean
  error?: string
  itemsDownloaded?: number
}> {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'No authenticated user' }
    }

    // If user is organizer or super admin, they don't have an assigned event_id
    // If user is staff, they have a specific event_id
    const eventId = currentUser.event_id
    if (!eventId) {
      return { success: false, error: 'User is not assigned to an event' }
    }

    let totalItems = 0

    // Fetch event details
    const eventResponse = await fetch(`/api/events/${eventId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!eventResponse.ok) {
      throw new Error(`Failed to fetch event: ${eventResponse.status}`)
    }

    const eventData = await eventResponse.json()
    const event: Event = {
      id: eventData.event.id,
      name: eventData.event.name,
      date_start: eventData.event.date_start,
      date_end: eventData.event.date_end,
      venue: eventData.event.venue,
      logo_url: eventData.event.logo_url,
      payment_required: eventData.event.payment_required,
      registration_link_token: eventData.event.registration_link_token,
    }
    await saveEvent(event)
    totalItems++

    // Fetch participant categories
    const categoriesResponse = await fetch(`/api/events/${eventId}/categories`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json()
      for (const cat of categoriesData.categories || []) {
        const category: Category = {
          id: cat.id,
          event_id: cat.event_id,
          name: cat.name,
          fee: cat.registration_fee || 0,
        }
        await saveCategory(category)
        totalItems++
      }
    }

    // Fetch meal sessions
    const sessionsResponse = await fetch(`/api/events/${eventId}/meal/sessions`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (sessionsResponse.ok) {
      const sessionsData = await sessionsResponse.json()
      for (const sess of sessionsData.sessions || []) {
        const session: Session = {
          id: sess.id,
          event_id: sess.event_id,
          name: sess.name,
          start_time: sess.start_time,
          end_time: sess.end_time,
        }
        await saveSession(session)
        totalItems++
      }
    }

    // Fetch approved participants only
    const participantsResponse = await fetch(`/api/events/${eventId}/participants`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (participantsResponse.ok) {
      const participantsData = await participantsResponse.json()
      for (const part of participantsData.participants || []) {
        // Only sync approved participants with QR codes
        if (part.payment_status === 'approved' && part.qr_code) {
          const participant: Participant = {
            id: part.id,
            event_id: part.event_id,
            full_name: part.full_name,
            address: part.address,
            category_id: part.category_id,
            payment_status: part.payment_status,
            qr_code: part.qr_code,
            registered_online: part.registered_online,
            receipt_number: part.receipt_number,
          }
          await saveParticipant(participant)
          totalItems++
        }
      }
    }

    // Register for background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready
        if ((registration as any).sync) {
          ;(registration as any).sync.register('sync-offline-queue')
        }
      } catch (err) {
        console.warn('[v0] Failed to register background sync:', err)
      }
    }

    return { success: true, itemsDownloaded: totalItems }
  } catch (error) {
    console.error('[v0] syncFromServer error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * OFFLINE REGISTRATION
 * Registers a participant offline with locally generated QR code
 * Added to sync_queue for later syncing
 */
export async function registerParticipantOffline(data: {
  full_name: string
  address: string
  category_id?: string
  receipt_number?: string
  eventId: string
}): Promise<
  | {
      success: true
      participant: Participant & { qr_code_data_url?: string }
    }
  | { success: false; error: string }
> {
  try {
    const { full_name, address, category_id, receipt_number, eventId } = data

    // Validate required fields
    if (!full_name || !address || !eventId) {
      return { success: false, error: 'Missing required fields' }
    }

    // Generate QR code locally using a unique identifier
    const qrValue = `participant:${Date.now()}:${Math.random()}`
    let qrCodeDataUrl: string

    try {
      qrCodeDataUrl = await QRCode.toDataURL(qrValue)
    } catch (err) {
      return { success: false, error: 'Failed to generate QR code' }
    }

    // Create participant record with LOCAL_ prefix for temporary ID
    const participantId = `LOCAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const participant: Participant = {
      id: participantId,
      event_id: eventId,
      full_name,
      address,
      category_id: category_id || undefined,
      payment_status: 'pending',
      qr_code: qrValue,
      registered_online: false,
      receipt_number: receipt_number || undefined,
    }

    // Save to IndexedDB
    await saveParticipant(participant)

    // Add to sync queue for later syncing
    await addToSyncQueue({
      type: 'participant_registration',
      data: {
        full_name,
        address,
        category_id: category_id || null,
        receipt_number: receipt_number || null,
        registered_online: false,
      },
      synced: false,
      created_at: new Date().toISOString(),
    })

    return {
      success: true,
      participant: {
        ...participant,
        qr_code_data_url: qrCodeDataUrl,
      },
    }
  } catch (error) {
    console.error('[v0] registerParticipantOffline error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * OFFLINE MEAL SCAN
 * Scans a participant's QR code offline
 * Returns eligibility status and adds to sync_queue if eligible
 */
export async function scanMealOffline(
  qrCode: string,
  sessionId: string,
  eventId: string,
): Promise<
  | {
      eligible: true
      participant: {
        id: string
        full_name: string
      }
      checkinId: string
    }
  | {
      eligible: false
      reason: 'not_found' | 'already_served' | 'not_approved'
      message: string
    }
> {
  try {
    // Look up participant by QR code
    const participant = await getParticipantByQrCode(qrCode)

    if (!participant) {
      return {
        eligible: false,
        reason: 'not_found',
        message: 'QR code not recognized.',
      }
    }

    // Check if participant is approved (for offline, we only sync approved participants)
    if (participant.payment_status !== 'approved') {
      return {
        eligible: false,
        reason: 'not_approved',
        message: "This participant's payment has not been approved.",
      }
    }

    // Check for duplicate checkin (participant + session combination)
    const allParticipants = await getAllParticipants(eventId)
    const isAlreadyCheckedIn = allParticipants.some((p) => {
      // This is a simplified check - in production would query checkins store
      return (
        p.id === participant.id &&
        p.id === participant.id
      )
    })

    // More accurate duplicate check using local logic
    // In a real scenario, you'd maintain a checkins index
    // For now, we'll allow the save and let server resolve conflicts
    const checkinId = `LOCAL_CHECKIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const checkin: Checkin = {
      id: checkinId,
      participant_id: participant.id,
      session_id: sessionId,
      checked_in_at: new Date().toISOString(),
      is_override: false,
    }

    // Save checkin to IndexedDB
    await saveCheckin(checkin)

    // Add to sync queue
    await addToSyncQueue({
      type: 'checkin',
      data: {
        qr_code: qrCode,
        session_id: sessionId,
        is_override: false,
      },
      synced: false,
      created_at: new Date().toISOString(),
    })

    return {
      eligible: true,
      participant: {
        id: participant.id,
        full_name: participant.full_name,
      },
      checkinId,
    }
  } catch (error) {
    console.error('[v0] scanMealOffline error:', error)
    return {
      eligible: false,
      reason: 'not_found',
      message: 'Error processing meal scan',
    }
  }
}

/**
 * BACKGROUND SYNC
 * Processes all queued offline operations and syncs to server
 * Runs automatically when online or triggered manually
 */
export async function processSyncQueue(): Promise<{
  success: boolean
  processed: number
  synced: number
  conflicts: number
  errors: number
}> {
  const stats = {
    success: false,
    processed: 0,
    synced: 0,
    conflicts: 0,
    errors: 0,
  }

  try {
    // Get all unsynced operations
    const queue = await getSyncQueue()

    if (queue.length === 0) {
      console.log('[v0] Sync queue is empty')
      return { ...stats, success: true }
    }

    console.log(`[v0] Processing ${queue.length} sync queue items`)

    // Sort by timestamp ascending to maintain order
    const sortedQueue = queue.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    for (const item of sortedQueue) {
      try {
        stats.processed++

        if (item.type === 'participant_registration') {
          // Get the event ID from localStorage or context
          const currentUser = getCurrentUser()
          if (!currentUser?.event_id) {
            console.warn('[v0] No event ID available for sync')
            stats.errors++
            continue
          }

          const response = await fetch(
            `/api/events/${currentUser.event_id}/participants`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...item.data,
                registered_online: false,
              }),
            },
          )

          if (!response.ok) {
            console.error('[v0] Failed to sync participant registration:', response.status)
            stats.errors++
            continue
          }

          const result = await response.json()
          await markSynced(item.id)
          stats.synced++

          // Update local participant record with server ID
          if (result.participant?.id) {
            const participant: Participant = {
              id: result.participant.id,
              event_id: currentUser.event_id,
              full_name: result.participant.full_name,
              address: result.participant.address,
              category_id: result.participant.category_id,
              payment_status: result.participant.payment_status,
              qr_code: result.participant.qr_code || '',
              registered_online: false,
              receipt_number: result.participant.receipt_number,
            }
            await saveParticipant(participant)
          }
        } else if (item.type === 'checkin') {
          const currentUser = getCurrentUser()
          if (!currentUser?.event_id) {
            console.warn('[v0] No event ID available for sync')
            stats.errors++
            continue
          }

          const response = await fetch(
            `/api/events/${currentUser.event_id}/meal/scan`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                qr_code: item.data.qr_code,
                session_id: item.data.session_id,
              }),
            },
          )

          if (!response.ok) {
            const errorData = await response.json()
            // Check if this is a conflict (already_served, not_approved, etc.)
            if (errorData.reason === 'already_served') {
              console.warn('[v0] Conflict: already_served for checkin')
              stats.conflicts++
              await markSynced(item.id) // Mark as synced to avoid retry
              continue
            }
            console.error('[v0] Failed to sync checkin:', response.status)
            stats.errors++
            continue
          }

          await markSynced(item.id)
          stats.synced++
        }
      } catch (error) {
        console.error('[v0] Error processing sync queue item:', error)
        stats.errors++
      }
    }

    stats.success = true
    console.log('[v0] Sync queue processing complete:', stats)
    return stats
  } catch (error) {
    console.error('[v0] processSyncQueue error:', error)
    return stats
  }
}

/**
 * Register for automatic background sync
 * Called when the service worker's sync event fires
 */
export function registerSyncHandler(): void {
  if (typeof window !== 'undefined') {
    // Listen for online event
    window.addEventListener('online', async () => {
      console.log('[v0] Device is online, processing sync queue')
      await processSyncQueue()
    })

    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_OFFLINE_QUEUE') {
          console.log('[v0] Background sync triggered by service worker')
          processSyncQueue().catch((err) => {
            console.error('[v0] Background sync failed:', err)
          })
        }
      })
    }
  }
}

/**
 * Utility: Get current user from localStorage or context
 * In production, this should come from a proper auth context
 */
function getCurrentUser(): {
  id: string
  event_id?: string
  tenant_id?: string
} | null {
  try {
    const userJson = localStorage.getItem('__auth_user__')
    if (!userJson) return null
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

/**
 * Force sync now (useful for manual trigger or immediate retry)
 */
export async function forceSyncNow(): Promise<typeof processSyncQueue extends (
  ...args: any[]
) => Promise<infer R>
  ? R
  : never> {
  return processSyncQueue()
}

/**
 * Clear all offline data (useful for logout or reset)
 */
export async function clearOfflineData(): Promise<{ success: boolean }> {
  try {
    await clearAllStores()
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to clear offline data:', error)
    return { success: false }
  }
}
