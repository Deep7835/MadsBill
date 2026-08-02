"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Small fetch-on-mount helper used by every list/detail page:
 * loading + error + manual refresh, with a toast on failure.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  options: { errorMessage?: string; toastOnError?: boolean } = {},
): AsyncState<T> {
  const { errorMessage = "Could not load data", toastOnError = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mounted.current) setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage;
      if (mounted.current) setError(message);
      if (toastOnError) toast.error(errorMessage, { description: message });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [errorMessage, toastOnError]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh: run, setData };
}
