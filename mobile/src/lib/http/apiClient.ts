type RequestOptions = { auth?: boolean };

type Deps = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (access: string) => Promise<void>;
  clearAccessToken: () => Promise<void>;
  onAuthFailure: () => void;
  fetchFn?: typeof fetch;
};

export function createApiClient(deps: Deps) {
  const doFetch = deps.fetchFn ?? fetch;

  // The refresh token travels as an httpOnly cookie, so this carries no body.
  async function refresh(): Promise<boolean> {
    const res = await doFetch(`${deps.baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (res.status >= 400) return false;
    const body = await res.json();
    await deps.setAccessToken(body.accessToken);
    return true;
  }

  // Sends a request, retrying once after refreshing the token on 401.
  async function dispatch<T>(
    send: (access: string | null) => Promise<Response>,
    auth: boolean,
  ): Promise<T> {
    const run = async () => send(auth ? await deps.getAccessToken() : null);
    let res = await run();
    if (auth && res.status === 401) {
      if (await refresh()) {
        res = await run();
      } else {
        await deps.clearAccessToken();
        deps.onAuthFailure();
        throw new Error("UNAUTHENTICATED");
      }
    }
    if (res.status >= 400) throw new Error(`HTTP_${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  function request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ): Promise<T> {
    return dispatch<T>(
      (access) =>
        doFetch(`${deps.baseUrl}${path}`, {
          method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(access ? { Authorization: `Bearer ${access}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      opts?.auth ?? true,
    );
  }

  // Multipart upload. Content-Type is left unset so fetch adds the boundary.
  function requestForm<T>(path: string, form: FormData): Promise<T> {
    return dispatch<T>(
      (access) =>
        doFetch(`${deps.baseUrl}${path}`, {
          method: "POST",
          credentials: "include",
          headers: access ? { Authorization: `Bearer ${access}` } : {},
          body: form,
        }),
      true,
    );
  }

  return {
    get: <T>(p: string) => request<T>("GET", p),
    post: <T>(p: string, b?: unknown, opts?: RequestOptions) => request<T>("POST", p, b, opts),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
    postForm: <T>(p: string, form: FormData) => requestForm<T>(p, form),
  };
}
