import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/http/errorMessage";

export function useAdminList<T>(load: () => Promise<T>, initial: T, fallback: string) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const loader = useRef(load);
  const errorMessage = useRef(fallback);

  useLayoutEffect(() => {
    loader.current = load;
    errorMessage.current = fallback;
  }, [load, fallback]);

  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await loader.current();
      if (id === request.current) setData(result);
    } catch (cause) {
      if (id === request.current) setError(apiErrorMessage(cause, errorMessage.current));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const requests = request;
    void Promise.resolve().then(() => { if (active) void reload(); });
    return () => {
      active = false;
      requests.current++;
    };
  }, [reload, load, fallback]);

  return { data, loading, error, reload };
}
