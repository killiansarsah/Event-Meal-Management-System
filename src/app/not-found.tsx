import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mt-2 text-foreground-secondary">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-accent px-6 py-2 font-medium text-white hover:bg-accent/90 transition-colors"
          >
            Go to Login
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border bg-background-secondary px-6 py-2 font-medium text-foreground hover:bg-background-tertiary transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
