import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

type Options = { refetchOnFocus?: boolean };

export type Resource<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  setData: (update: (current: T | undefined) => T | undefined) => void;
};

// Keeps the last data on screen while refetching, so returning to a screen never blanks it.
export function useResource<T>(fetcher: () => Promise<T>, key: string = "", { refetchOnFocus = true }: Options = {}): Resource<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  const requestRef = useRef(0);
  const hasDataRef = useRef(false);
  fetcherRef.current = fetcher;

  const run = useCallback(async (mode: "initial" | "background" | "refresh") => {
    const request = ++requestRef.current;
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      if (request !== requestRef.current) return;
      hasDataRef.current = true;
      setDataState(result);
      setError(null);
    } catch (cause) {
      if (request !== requestRef.current) return;
      if (mode !== "background" || !hasDataRef.current) setError(cause);
    } finally {
      if (request === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    hasDataRef.current = false;
    setDataState(undefined);
    setError(null);
    void run("initial");
  }, [key, run]);

  const isFirstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (isFirstFocus.current) {
      isFirstFocus.current = false;
      return;
    }
    if (refetchOnFocus) void run(hasDataRef.current ? "background" : "initial");
  }, [refetchOnFocus, run]));

  // A local edit supersedes any in-flight fetch, which would otherwise overwrite it with older data.
  const setData = useCallback((update: (current: T | undefined) => T | undefined) => {
    requestRef.current++;
    setLoading(false);
    setRefreshing(false);
    setDataState(update);
  }, []);
  const refresh = useCallback(() => run("refresh"), [run]);
  const reload = useCallback(() => run(hasDataRef.current ? "background" : "initial"), [run]);

  return { data, error, loading: loading && data === undefined, refreshing, refresh, reload, setData };
}
