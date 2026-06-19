import { useState, useCallback } from 'react';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export function useApiRequest<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const request = useCallback(
    async (
      url: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
      body?: Record<string, unknown>
    ): Promise<ApiResponse<T>> => {
      setIsLoading(true);
      setError(null);
      setFieldErrors({});

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle field-level errors
          if (data.errors && typeof data.errors === 'object') {
            setFieldErrors(data.errors);
            return { success: false, error: 'Please check the form for errors', errors: data.errors };
          }

          // Handle general errors
          const errorMsg = data.error || data.message || 'An error occurred';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        return { success: true, data };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { request, isLoading, error, fieldErrors, setError, setFieldErrors };
}
