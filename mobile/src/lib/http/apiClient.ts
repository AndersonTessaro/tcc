import { toApiError } from "./apiError";

type RequestOptions = { auth?: boolean; timeoutMs?: number };

type Deps = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (access: string) => Promise<void>;
  clearAccessToken: () => Promise<void>;
  onAuthFailure: () => void;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  gatewayRetryDelaysMs?: number[];
};

type Send = (access: string | null, signal: AbortSignal) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 20_000;
// Azure answers 502/503/504 while the API replica scales between zero and one; a GET is safe to repeat.
const GATEWAY_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];
const isGatewayError = (status: number) => status >= 502 && status <= 504;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RequestTimeoutError extends Error {
  constructor() {
    super("REQUEST_TIMEOUT");
    this.name = "RequestTimeoutError";
  }
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new RequestTimeoutError());
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export function createApiClient(deps: Deps) {
  const doFetch = deps.fetchFn ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let refreshing: Promise<boolean> | null = null;

  const retryingGateway = (send: Send): Send => async (access, signal) => {
    let res = await send(access, signal);
    for (const delay of deps.gatewayRetryDelaysMs ?? GATEWAY_RETRY_DELAYS_MS) {
      if (!isGatewayError(res.status) || signal.aborted) break;
      await wait(delay);
      res = await send(access, signal);
    }
    return res;
  };

  // The refresh token travels as an httpOnly cookie, so this carries no body.
  async function refresh(): Promise<boolean> {
    const capturedAccess = await deps.getAccessToken();
    return withTimeout(async (signal) => {
      const res = await doFetch(`${deps.baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        signal,
      });
      if (res.status >= 400) return false;
      const body = await res.json();
      if (signal.aborted || await deps.getAccessToken() !== capturedAccess) return false;
      await deps.setAccessToken(body.accessToken);
      return true;
    }, timeoutMs);
  }

  function refreshOnce() {
    if (!refreshing) refreshing = refresh().finally(() => { refreshing = null; });
    return refreshing;
  }

  // Sends a request, retrying once after refreshing the token on 401.
  async function dispatch<T>(
    send: Send,
    auth: boolean,
    read: (response: Response) => Promise<T> = (response) => response.json(),
    requestTimeoutMs = timeoutMs,
  ): Promise<T> {
    return withTimeout(async (signal) => {
      const initialAccess = auth ? await deps.getAccessToken() : null;
      let sentAccess = initialAccess;
      let res = await send(sentAccess, signal);
      if (auth && res.status === 401) {
        let refreshed = false;
        let currentAccess = await deps.getAccessToken();
        if (currentAccess === initialAccess) {
          refreshed = await refreshOnce();
          currentAccess = await deps.getAccessToken();
        }
        if (currentAccess && (refreshed || currentAccess !== initialAccess)) {
          sentAccess = currentAccess;
          res = await send(sentAccess, signal);
        }
        if (res.status === 401) {
          if (await deps.getAccessToken() === sentAccess) {
            await deps.clearAccessToken();
            deps.onAuthFailure();
          }
          throw new Error("UNAUTHENTICATED");
        }
      }
      if (res.status >= 400) throw await toApiError(res);
      if (res.status === 204) return undefined as T;
      return read(res);
    }, requestTimeoutMs);
  }

  function request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ): Promise<T> {
    const send: Send = (access, signal) =>
      doFetch(`${deps.baseUrl}${path}`, {
        method,
        credentials: "include",
        signal,
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    return dispatch<T>(
      method === "GET" ? retryingGateway(send) : send,
      opts?.auth ?? true,
      undefined,
      opts?.timeoutMs,
    );
  }

  // Multipart upload. Content-Type is left unset so fetch adds the boundary.
  function requestForm<T>(method: "POST" | "PUT", path: string, form: FormData, opts?: RequestOptions): Promise<T> {
    return dispatch<T>(
      (access, signal) =>
        doFetch(`${deps.baseUrl}${path}`, {
          method,
          credentials: "include",
          signal,
          headers: access ? { Authorization: `Bearer ${access}` } : {},
          body: form,
        }),
      opts?.auth ?? true,
      undefined,
      opts?.timeoutMs,
    );
  }

  return {
    get: <T>(p: string) => request<T>("GET", p),
    getBytes: (p: string, opts?: RequestOptions) => dispatch<ArrayBuffer>(retryingGateway((access, signal) => doFetch(`${deps.baseUrl}${p}`, {
      credentials: "include",
      signal,
      headers: access ? { Authorization: `Bearer ${access}` } : {},
    })), opts?.auth ?? true, (response) => response.arrayBuffer(), opts?.timeoutMs),
    post: <T>(p: string, b?: unknown, opts?: RequestOptions) => request<T>("POST", p, b, opts),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
    patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b),
    del: <T = void>(p: string) => request<T>("DELETE", p),
    postForm: <T>(p: string, form: FormData, opts?: RequestOptions) => requestForm<T>("POST", p, form, opts),
    putForm: <T>(p: string, form: FormData, opts?: RequestOptions) => requestForm<T>("PUT", p, form, opts),
  };
}
