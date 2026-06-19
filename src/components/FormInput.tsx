'use client';

import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function FormInput({ label, error, helperText, className, ...props }: FormInputProps) {
  const id = props.id || props.name;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          rounded-lg border border-border bg-background-secondary px-4 py-3
          text-foreground placeholder-foreground-tertiary
          transition-colors duration-200
          focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20
          disabled:bg-border-light disabled:cursor-not-allowed disabled:text-foreground-tertiary
          ${error ? 'border-error-light' : ''}
          ${className || ''}
        `}
        {...props}
      />
      {error && <p className="text-sm font-medium text-error-light">{error}</p>}
      {helperText && !error && <p className="text-sm text-foreground-tertiary">{helperText}</p>}
    </div>
  );
}
