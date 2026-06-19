'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'qrcode';

interface Category {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  full_name: string;
  address: string;
  category_id: string;
  qr_code: string;
}

interface EventInfo {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function StickerPrintPreviewContent({
  eventId,
  participantId,
}: {
  eventId: string;
  participantId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data and generate QR code
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get event
        const eventRes = await supabase
          .from('events')
          .select('id, name, logo_url')
          .eq('id', eventId)
          .single();

        if (eventRes.error || !eventRes.data) {
          setError('Failed to load event');
          return;
        }

        setEvent(eventRes.data);

        // Get participant
        const partRes = await supabase
          .from('participants')
          .select('id, full_name, address, category_id, qr_code')
          .eq('id', participantId)
          .single();

        if (partRes.error || !partRes.data) {
          setError('Failed to load participant');
          return;
        }

        setParticipant(partRes.data);

        // Get category
        if (partRes.data.category_id) {
          const catRes = await supabase
            .from('participant_categories')
            .select('id, name')
            .eq('id', partRes.data.category_id)
            .single();

          if (!catRes.error && catRes.data) {
            setCategory(catRes.data);
          }
        }

        // Generate QR code image
        if (partRes.data.qr_code) {
          try {
            const qrDataUrl = await QRCode.toDataURL(partRes.data.qr_code, {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            });
            setQrDataUrl(qrDataUrl);
          } catch (qrErr) {
            console.error('[v0] QR code generation error:', qrErr);
            setError('Failed to generate QR code');
            return;
          }
        }
      } catch (err) {
        console.error('[v0] Load data error:', err);
        setError('An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, participantId, supabase]);

  const handlePrint = () => {
    window.print();

    // After print dialog closes, navigate back to dashboard
    // This is a best-effort approach as we can't detect print completion reliably
    setTimeout(() => {
      router.push(`/events/${eventId}/register`);
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          <p className="mt-4 text-foreground-secondary">Preparing sticker...</p>
        </div>
      </div>
    );
  }

  if (error || !participant || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-error font-medium">{error || 'Failed to load data'}</p>
          <button
            onClick={() => router.push(`/events/${eventId}/register`)}
            className="mt-4 inline-block text-accent hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <style>{`
        @media print {
          body, html {
            background: white;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .sticker-container {
            page-break-after: always;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        {/* No Print Header */}
        <div className="no-print mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Sticker Print Preview</h1>
          <p className="text-foreground-secondary mb-6">
            Review the sticker below and click Print to proceed
          </p>
          <button
            onClick={handlePrint}
            className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            🖨️ Print Sticker
          </button>
        </div>

        {/* Sticker Layout - Based on Section 11 Specification */}
        <div className="sticker-container bg-white border-4 border-accent rounded-lg overflow-hidden" style={{ width: '600px', height: '400px', margin: '0 auto' }}>
          <div className="relative w-full h-full bg-white p-8 flex flex-col">
            {/* Top Section: Logo (left) and Event Name (right) */}
            <div className="flex justify-between items-start mb-6">
              {/* Event Logo - Top Left */}
              {event.logo_url && (
                <div className="w-24 h-24 bg-background-secondary rounded border border-border flex items-center justify-center">
                  <Image
                    src={event.logo_url}
                    alt={event.name}
                    width={80}
                    height={80}
                    style={{ objectFit: 'contain' }}
                    onError={() => <div className="text-xs text-center text-foreground-secondary">Logo</div>}
                  />
                </div>
              )}

              {/* Event Name - Top Right */}
              <div className="text-right flex-1 ml-4">
                <p className="text-sm font-bold text-foreground uppercase">{event.name}</p>
              </div>
            </div>

            {/* Center Section: Participant Name */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold text-foreground text-center uppercase tracking-wide mb-4">
                {participant.full_name}
              </p>

              {/* Category Badge */}
              {category && (
                <div className="bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  {category.name}
                </div>
              )}

              {/* QR Code - Center */}
              {qrDataUrl && (
                <div className="bg-white border-2 border-foreground p-2 rounded">
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    width={160}
                    height={160}
                    style={{ display: 'block' }}
                  />
                </div>
              )}
            </div>

            {/* Footer: Powered by Text */}
            <div className="text-center">
              <p className="text-xs text-foreground-secondary font-semibold">
                Powered by Elira Technologies
              </p>
            </div>
          </div>
        </div>

        {/* No Print Footer */}
        <div className="no-print mt-8 text-center text-foreground-secondary">
          <p className="text-sm">
            After printing, you will be automatically redirected to the registration dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}
