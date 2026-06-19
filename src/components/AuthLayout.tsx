'use client';

import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function AuthLayout({ children, title, subtitle, maxWidth = 'sm' }: AuthLayoutProps) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className={`w-full ${maxWidthClass} space-y-8`}>
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-foreground-secondary">{subtitle}</p>}
        </div>

        {/* Form Container */}
        <div className="rounded-lg border border-border bg-background-secondary p-6 sm:p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
