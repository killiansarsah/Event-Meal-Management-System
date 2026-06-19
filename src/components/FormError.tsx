'use client';

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-error-light bg-error-light/5 px-4 py-3">
      <p className="text-sm font-medium text-error-light">{message}</p>
    </div>
  );
}
