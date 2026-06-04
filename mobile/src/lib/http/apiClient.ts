type Tokens = { access: string | null; refresh: string | null };

type Deps = {
  baseUrl: string;
  getTokens: () => Promise<Tokens>;
  setTokens: (a: string, r: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  onAuthFailure: () => void;
  fetchFn?: typeof fetch;
};

export function createApiClient(deps: Deps) {
  const doFetch = deps.fetchFn ?? fetch;

  async function refresh(): Promise<boolean> {
    const { refresh } = await deps.getTokens();
    if (!refresh) return false;
    const res = await doFetch(`${deps.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (res.status >= 400) return false;
    const body = await res.json();
    await deps.setTokens(body.accessToken, body.refreshToken);
    return true;
  }

  // Sends a request, retrying once after refreshing the token on 401.
  async function withAuth<T>(send: (access: string | null) => Promise<Response>): Promise<T> {
    const run = async () => {
      const { access } = await deps.getTokens();
      return send(access);
    };
    let res = await run();
    if (res.status === 401) {
      if (await refresh()) {
        res = await run();
      } else {
        await deps.clearTokens();
        deps.onAuthFailure();
        throw new Error("UNAUTHENTICATED");
      }
    }
    if (res.status >= 400) throw new Error(`HTTP_${res.status}`);
    return res.json() as Promise<T>;
  }

  function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return withAuth<T>((access) =>
      doFetch(`${deps.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  }

  // Multipart upload. Content-Type is left unset so fetch adds the boundary.
  function requestForm<T>(path: string, form: FormData): Promise<T> {
    return withAuth<T>((access) =>
      doFetch(`${deps.baseUrl}${path}`, {
        method: "POST",
        headers: access ? { Authorization: `Bearer ${access}` } : {},
        body: form,
      }),
    );
  }

  return {
    get: <T>(p: string) => request<T>("GET", p),
    post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b),
    postForm: <T>(p: string, form: FormData) => requestForm<T>(p, form),
  };
}
