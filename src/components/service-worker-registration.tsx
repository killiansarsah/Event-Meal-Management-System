'use client'

import { useEffect } from 'react'
import { registerSyncHandler } from '@/lib/offline/sync'

/**
 * Service Worker Registration Component
 * Registers the Service Worker on the client side
 * Handles browser offline/online events to trigger background sync
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Check if Service Workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Workers are not supported in this browser')
      return
    }

    // Register Service Worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered successfully:', registration.scope)

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New Service Worker is ready - notify user
                console.log('[PWA] New Service Worker version available')
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('[PWA] Failed to register Service Worker:', error)
      })

    // Handle online/offline events for background sync
    const handleOnline = () => {
      console.log('[PWA] Device is online - triggering background sync')

      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          navigator.serviceWorker.ready
            .then((registration: any) => {
              // Request background sync (sync property may not be in TS types but exists at runtime)
              if (registration.sync) {
                registration.sync.register('sync-offline-queue').catch((err: Error) => {
                  console.warn('[PWA] Failed to register background sync:', err)
                })
              }
            })
            .catch((error: Error) => {
              console.warn('[PWA] Failed to access Service Worker for sync:', error)
            })
        } catch (err) {
          console.warn('[PWA] Background sync not available:', err)
        }
      }

      // Also send message to Service Worker to trigger sync
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'REGISTER_BACKGROUND_SYNC',
          })
        }
      } catch (err) {
        console.warn('[PWA] Failed to send message to Service Worker:', err)
      }
    }

    const handleOffline = () => {
      console.log('[PWA] Device is offline - offline mode enabled')
    }

    // Attach event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initialize sync handler for message listening and online event handling
    registerSyncHandler()

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Component doesn't render anything visible
  return null
}
