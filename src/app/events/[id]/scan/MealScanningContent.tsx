import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useApiRequest } from '@/hooks/useApiRequest';
import { scanMealOffline } from '@/lib/offline/sync';

interface Session {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface ScanResult {
  eligible: boolean;
  participant?: {
    id: string;
    full_name: string;
    category?: string;
  };
  reason?: string;
  message?: string;
}

export default function MealScanningContent() {
  const { id: eventId } = useParams();
  const supabase = createClient();
  const { request } = useApiRequest();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [qrInput, setQrInput] = useState('');
  const [mealCount, setMealCount] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const qrInputRef = useRef<HTMLInputElement>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await request(`/api/events/${eventId}/sessions`, 'GET');
        if (response.success && Array.isArray(response.data)) {
          setSessions(response.data);
          if (response.data.length > 0) {
            setSelectedSessionId(response.data[0].id);
          }
        }
      } catch (error) {
        console.error('[v0] Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchSessions();
    }
  }, [eventId, request]);

  // Update meal count when session changes or result is shown
  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchMealCount = async () => {
      try {
        const response = await request(
          `/api/events/${eventId}/meal/sessions/${selectedSessionId}/count`,
          'GET'
        );
        if (response.success && typeof response.data === 'number') {
          setMealCount(response.data);
        }
      } catch (error) {
        console.error('[v0] Error fetching meal count:', error);
      }
    };

    fetchMealCount();
  }, [selectedSessionId, showResult, eventId, request]);

  // Auto-focus QR input on mount and after results clear
  useEffect(() => {
    if (qrInputRef.current && !showResult && !overrideMode) {
      qrInputRef.current.focus();
    }
  }, [showResult, overrideMode]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle QR code input with debounce for scanner gun
  const handleQrInput = async (value: string) => {
    setQrInput(value);

    // Auto-submit when input looks complete (ends with newline from scanner gun)
    if (value.includes('\n')) {
      const qrCode = value.replace('\n', '').trim();
      await processScan(qrCode);
      setQrInput('');
    }
  };

  // Handle Enter key for manual submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const qrCode = qrInput.trim();
      if (qrCode) {
        processScan(qrCode);
        setQrInput('');
      }
    }
  };

  // Process the meal scan
  const processScan = async (qrCode: string) => {
    if (!selectedSessionId) {
      setScanResult({
        eligible: false,
        message: 'Please select a meal session first.',
        reason: 'no_session',
      });
      setShowResult(true);
      return;
    }

    try {
      let result: ScanResult;

      if (isOnline) {
        // Online mode: call server
        const response = await request(
          `/api/events/${eventId}/meal/scan`,
          'POST',
          {
            qr_code: qrCode,
            session_id: selectedSessionId,
          }
        );

        if (response.success) {
          result = {
            eligible: true,
            participant: {
              id: (response.data as any).participant_id,
              full_name: (response.data as any).full_name,
              category: (response.data as any).category_name,
            },
          };
        } else {
          result = {
            eligible: false,
            message: (response.data as any)?.message || (response.error as any),
            reason: (response.data as any)?.reason,
          };
        }
      } else {
        // Offline mode: use local IndexedDB
        const offlineResult = await scanMealOffline(qrCode, selectedSessionId, eventId as string);
        result = offlineResult as any;
      }

      setScanResult(result);
      setShowResult(true);
      setOverrideMode(false);
      setOverrideReason('');

      // Auto-clear result after 3 seconds
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
      resultTimeoutRef.current = setTimeout(() => {
        setScanResult(null);
        setShowResult(false);
        if (qrInputRef.current) {
          qrInputRef.current.focus();
        }
      }, 3000);

      // Update meal count if successful
      if (result.eligible) {
        setMealCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('[v0] Scan error:', error);
      setScanResult({
        eligible: false,
        message: 'Error processing meal scan. Try again.',
        reason: 'error',
      });
      setShowResult(true);
    }
  };

  // Handle override
  const handleOverride = async () => {
    if (!overrideReason.trim() || !scanResult?.participant) {
      return;
    }

    try {
      const response = await request(
        `/api/events/${eventId}/meal/scan/override`,
        'POST',
        {
          qr_code: qrInput,
          session_id: selectedSessionId,
          override_reason: overrideReason,
        }
      );

      if (response.success) {
        // Show success message
        setScanResult({
          eligible: true,
          participant: scanResult.participant,
        });
        setMealCount((prev) => prev + 1);

        // Auto-clear after 3 seconds
        if (resultTimeoutRef.current) {
          clearTimeout(resultTimeoutRef.current);
        }
        resultTimeoutRef.current = setTimeout(() => {
          setScanResult(null);
          setShowResult(false);
          setOverrideMode(false);
          setOverrideReason('');
          if (qrInputRef.current) {
            qrInputRef.current.focus();
          }
        }, 3000);
      } else {
        setScanResult({
          eligible: false,
          message: (response.error as any) || 'Override failed. Try again.',
          reason: 'error',
        });
      }
    } catch (error) {
      console.error('[v0] Override error:', error);
      setScanResult({
        eligible: false,
        message: 'Error processing override.',
        reason: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground">Loading meal sessions...</p>
        </div>
      </div>
    );
  }

  // Full-screen result display
  if (showResult && scanResult) {
    const bgColor = scanResult.eligible ? 'bg-green-500' : 'bg-red-500';
    const textColor = 'text-white';

    if (scanResult.eligible) {
      return (
        <div className={`${bgColor} min-h-screen flex flex-col items-center justify-center p-4`}>
          <div className={`${textColor} text-center`}>
            <div className="text-6xl font-bold mb-8">✓</div>
            <h1 className="text-5xl font-bold mb-6">{scanResult.participant?.full_name}</h1>
            {scanResult.participant?.category && (
              <p className="text-3xl mb-12">{scanResult.participant.category}</p>
            )}
            <p className="text-2xl">Serve the meal</p>
          </div>
        </div>
      );
    } else {
      // Not eligible result
      return (
        <div className={`${bgColor} min-h-screen flex flex-col items-center justify-center p-4`}>
          <div className={`${textColor} text-center`}>
            <div className="text-6xl font-bold mb-8">✗</div>
            <h2 className="text-4xl font-bold mb-8">Not Eligible</h2>
            <p className="text-2xl mb-12">{scanResult.message}</p>

            {!overrideMode ? (
              <button
                onClick={() => setOverrideMode(true)}
                className="bg-white text-red-500 font-bold py-4 px-8 rounded-lg text-xl hover:bg-gray-100 transition-colors"
              >
                Override
              </button>
            ) : (
              <div className="max-w-md mx-auto">
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enter override reason..."
                  className="w-full p-4 rounded-lg text-gray-900 text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-white"
                  rows={4}
                  autoFocus
                />
                <button
                  onClick={handleOverride}
                  disabled={!overrideReason.trim()}
                  className="w-full bg-white text-red-500 font-bold py-4 rounded-lg text-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Confirm Override
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // Normal scanning mode
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Status indicator */}
        <div className="mb-6 p-3 rounded-lg flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          <span className="text-sm text-foreground-secondary">
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
        </div>

        {/* Session selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Meal Session
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full px-4 py-3 bg-background-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Choose a session...</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} ({session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
        </div>

        {/* Meal count */}
        <div className="mb-8 p-4 bg-accent/10 rounded-lg border border-accent/30">
          <p className="text-center text-lg font-semibold text-foreground">
            {mealCount} served this session
          </p>
        </div>

        {/* QR input field - ALWAYS focused */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Scan QR Code
          </label>
          <input
            ref={qrInputRef}
            type="text"
            value={qrInput}
            onChange={(e) => handleQrInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scanner gun will type here..."
            className="w-full px-4 py-4 bg-background-secondary border-2 border-accent rounded-lg text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-accent text-center text-lg"
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Info text */}
        <p className="text-center text-sm text-foreground-secondary">
          Point the QR code scanner at participant stickers to check them in.
        </p>
      </div>
    </div>
  );
}
