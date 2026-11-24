import { toApiError } from "./apiError";

type Deps = {
  baseUrl: string;
  getAccessToken: () => string | null;
  setAccessToken: (a: string) => void;
  clearAccessToken: () => void;
  onAuthFailure: () => void;
  fetchFn?: typeof fetch;
  gatewayRetryDelaysMs?: number[];
};

// Azure answers 502/503/504 while the API replica scales between zero and one; a GET is safe to repeat.
const GATEWAY_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];
const isGatewayError = (status: number) => status >= 502 && status <= 504;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Refresh tokens rotate: a second refresh with the same cookie would fail and log the user out.
  let refreshing: Promise<boolean> | null = null;
  function refreshOnce() {
    if (!refreshing) refreshing = refresh().finally(() => { refreshing = null; });
    return refreshing;
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    // Login/refresh/forgot are anonymous: a stale Bearer would make Spring answer 401 even on permitAll.
    const anonymous = path.startsWith("/auth/") && path !== "/auth/me";
    const send = (access: string | null) =>
      doFetch(`${deps.baseUrl}${path}`, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    const sendWithRetry = async (access: string | null) => {
      let res = await send(access);
      for (const delay of method === "GET" ? deps.gatewayRetryDelaysMs ?? GATEWAY_RETRY_DELAYS_MS : []) {
        if (!isGatewayError(res.status)) break;
        await wait(delay);
        res = await send(access);
      }
      return res;
    };
    const sentAccess = anonymous ? null : deps.getAccessToken();
    let res = await sendWithRetry(sentAccess);
    if (res.status === 401 && !anonymous) {
      const refreshedElsewhere = deps.getAccessToken() !== sentAccess;
      if (refreshedElsewhere || await refreshOnce()) {
        res = await sendWithRetry(deps.getAccessToken());
      } else {
        deps.clearAccessToken();
        deps.onAuthFailure();
        throw new Error("UNAUTHENTICATED");
      }
    }
    if (res.status >= 400) throw await toApiError(res);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    get: <T>(p: string) => request<T>("GET", p),
    post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
    patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b),
    delete: <T>(p: string) => request<T>("DELETE", p),
  };
}
