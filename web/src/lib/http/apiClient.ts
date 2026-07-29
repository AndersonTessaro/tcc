type Deps = {
  baseUrl: string;
  getAccessToken: () => string | null;
  setAccessToken: (a: string) => void;
  clearAccessToken: () => void;
  onAuthFailure: () => void;
  fetchFn?: typeof fetch;
};

export function createApiClient(deps: Deps) {
  const doFetch = deps.fetchFn ?? fetch;

  async function refresh(): Promise<boolean> {
    const res = await doFetch(`${deps.baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (res.status >= 400) return false;
    const b = await res.json();
    deps.setAccessToken(b.accessToken);
    return true;
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const send = () => {
      const access = deps.getAccessToken();
      return doFetch(`${deps.baseUrl}${path}`, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    };
    let res = await send();
    if (res.status === 401) {
      if (await refresh()) {
        res = await send();
      } else {
        deps.clearAccessToken();
        deps.onAuthFailure();
        throw new Error("UNAUTHENTICATED");
      }
    }
    if (res.status >= 400) throw new Error(`HTTP_${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    get: <T>(p: string) => request<T>("GET", p),
    post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
  };
}
