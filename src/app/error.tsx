'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[v0] Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold text-foreground">⚠️</h1>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-2 text-foreground-secondary">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        {error.message && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 break-words">
            {error.message}
          </p>
        )}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-accent px-6 py-2 font-medium text-white hover:bg-accent/90 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-border bg-background-secondary px-6 py-2 font-medium text-foreground hover:bg-background-tertiary transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
