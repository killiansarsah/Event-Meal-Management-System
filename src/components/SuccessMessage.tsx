'use client';

export function SuccessMessage({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-success-light bg-success-light/5 px-4 py-3">
      <p className="text-sm font-medium text-success-light">{message}</p>
    </div>
  );
}
