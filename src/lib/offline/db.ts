import { openDB, DBSchema, IDBPDatabase } from 'idb'

/**
 * IndexedDB Schema for Elira Offline Mode
 * Database: 'elira-offline'
 *
 * Object Stores:
 * - events: Event details
 * - categories: Participant categories
 * - sessions: Meal sessions
 * - participants: Approved participant records with QR codes
 * - checkins: Meal checkin records
 * - sync_queue: Pending offline operations to sync
 */

interface Event {
  id: string
  name: string
  date_start: string
  date_end: string
  venue: string
  logo_url?: string
  payment_required: boolean
  registration_link_token?: string
}

interface Category {
  id: string
  event_id: string
  name: string
  fee: number
}

interface Session {
  id: string
  event_id: string
  name: string
  start_time: string
  end_time: string
}

interface Participant {
  id: string
  event_id: string
  full_name: string
  address: string
  category_id?: string
  payment_status: 'pending' | 'approved' | 'declined'
  qr_code: string
  registered_online: boolean
  receipt_number?: string
}

interface Checkin {
  id: string
  participant_id: string
  session_id: string
  checked_in_at: string
  is_override: boolean
  override_reason?: string
}

interface SyncQueueItem {
  id: string
  type: 'checkin' | 'participant_registration'
  data: Record<string, unknown>
  synced: boolean
  created_at: string
  synced_at?: string
}

interface EliraOfflineDB extends DBSchema {
  events: {
    key: string
    value: Event
  }
  categories: {
    key: string
    value: Category
    indexes: { 'by-event_id': string }
  }
  sessions: {
    key: string
    value: Session
    indexes: { 'by-event_id': string }
  }
  participants: {
    key: string
    value: Participant
    indexes: { 'by-qr_code': string; 'by-event_id': string }
  }
  checkins: {
    key: string
    value: Checkin
    indexes: { 'by-participant_id-session_id': [string, string] }
  }
  sync_queue: {
    key: string
    value: SyncQueueItem
    indexes: { 'by-synced': boolean }
  }
}

let dbInstance: IDBPDatabase<EliraOfflineDB> | null = null

/**
 * Initialize or get the IndexedDB database instance
 */
async function getDB(): Promise<IDBPDatabase<EliraOfflineDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<EliraOfflineDB>('elira-offline', 1, {
    upgrade(db) {
      // Create events store
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' })
      }

      // Create categories store with event_id index
      if (!db.objectStoreNames.contains('categories')) {
        const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' })
        categoriesStore.createIndex('by-event_id', 'event_id')
      }

      // Create sessions store with event_id index
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' })
        sessionsStore.createIndex('by-event_id', 'event_id')
      }

      // Create participants store with qr_code and event_id indexes
      if (!db.objectStoreNames.contains('participants')) {
        const participantsStore = db.createObjectStore('participants', { keyPath: 'id' })
        participantsStore.createIndex('by-qr_code', 'qr_code')
        participantsStore.createIndex('by-event_id', 'event_id')
      }

      // Create checkins store with compound index on participant_id + session_id
      if (!db.objectStoreNames.contains('checkins')) {
        const checkinsStore = db.createObjectStore('checkins', { keyPath: 'id' })
        checkinsStore.createIndex('by-participant_id-session_id', ['participant_id', 'session_id'])
      }

      // Create sync_queue store with synced index
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
        syncStore.createIndex('by-synced', 'synced')
      }
    },
  })

  return dbInstance
}

/**
 * Events Store Functions
 */

export async function getEvent(eventId: string): Promise<Event | undefined> {
  const db = await getDB()
  return db.get('events', eventId)
}

export async function saveEvent(event: Event): Promise<string> {
  const db = await getDB()
  return db.put('events', event)
}

export async function getAllEvents(): Promise<Event[]> {
  const db = await getDB()
  return db.getAll('events')
}

/**
 * Categories Store Functions
 */

export async function getCategories(eventId: string): Promise<Category[]> {
  const db = await getDB()
  return db.getAllFromIndex('categories', 'by-event_id', eventId)
}

export async function saveCategory(category: Category): Promise<string> {
  const db = await getDB()
  return db.put('categories', category)
}

/**
 * Sessions Store Functions
 */

export async function getSessions(eventId: string): Promise<Session[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessions', 'by-event_id', eventId)
}

export async function saveSession(session: Session): Promise<string> {
  const db = await getDB()
  return db.put('sessions', session)
}

/**
 * Participants Store Functions
 */

export async function getParticipantByQrCode(qrCode: string): Promise<Participant | undefined> {
  const db = await getDB()
  return db.getFromIndex('participants', 'by-qr_code', qrCode)
}

export async function saveParticipant(participant: Participant): Promise<string> {
  const db = await getDB()
  return db.put('participants', participant)
}

export async function getAllParticipants(eventId: string): Promise<Participant[]> {
  const db = await getDB()
  return db.getAllFromIndex('participants', 'by-event_id', eventId)
}

/**
 * Checkins Store Functions
 */

export async function getCheckin(checkinId: string): Promise<Checkin | undefined> {
  const db = await getDB()
  return db.get('checkins', checkinId)
}

export async function saveCheckin(checkin: Checkin): Promise<string> {
  const db = await getDB()
  return db.put('checkins', checkin)
}

export async function getCheckinsBySession(sessionId: string): Promise<Checkin[]> {
  const db = await getDB()
  const allCheckins = await db.getAll('checkins')
  return allCheckins.filter((c) => c.session_id === sessionId)
}

/**
 * Sync Queue Store Functions
 */

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<string> {
  const db = await getDB()
  const id = `${item.type}-${Date.now()}-${Math.random()}`
  return db.put('sync_queue', {
    ...item,
    id,
  })
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('sync_queue', 'by-synced', false)
}

export async function markSynced(itemId: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('sync_queue', itemId)
  if (item) {
    item.synced = true
    item.synced_at = new Date().toISOString()
    await db.put('sync_queue', item)
  }
}

export async function clearSynced(): Promise<void> {
  const db = await getDB()
  const syncedItems = await db.getAllFromIndex('sync_queue', 'by-synced', true)
  for (const item of syncedItems) {
    await db.delete('sync_queue', item.id)
  }
}

/**
 * Utility function to clear all stores (useful for logout/reset)
 */
export async function clearAllStores(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('events'),
    db.clear('categories'),
    db.clear('sessions'),
    db.clear('participants'),
    db.clear('checkins'),
    db.clear('sync_queue'),
  ])
}
