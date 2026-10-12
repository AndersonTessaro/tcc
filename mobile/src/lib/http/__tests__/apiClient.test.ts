import { createApiClient, RequestTimeoutError } from "../apiClient";

function jsonResponse(status: number, body: any) {
  return Promise.resolve({
    status,
    ok: status < 400,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("apiClient", () => {
  const store = { access: "a1" as string | null };
  const deps = {
    baseUrl: "http://x",
    getAccessToken: async () => store.access,
    setAccessToken: async (a: string) => {
      store.access = a;
    },
    clearAccessToken: async () => {
      store.access = null;
    },
    onAuthFailure: jest.fn(),
  };

  beforeEach(() => {
    store.access = "a1";
    deps.onAuthFailure.mockClear();
  });

  it("retries with refreshed token after 401", async () => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(jsonResponse(401, {}))
      .mockReturnValueOnce(jsonResponse(200, { accessToken: "a2" }))
      .mockReturnValueOnce(jsonResponse(200, { ok: true }));
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    const res = await api.get("/me/dashboard");
    expect(res).toEqual({ ok: true });
    expect(store.access).toBe("a2");
  });

  it("sends the refresh request without a body so the cookie carries the token", async () => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(jsonResponse(401, {}))
      .mockReturnValueOnce(jsonResponse(200, { accessToken: "a2" }))
      .mockReturnValueOnce(jsonResponse(200, { ok: true }));
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    await api.get("/me/dashboard");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("http://x/auth/refresh");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it.each([null, "new-login"])("preserves a changed session during refresh (%s)", async (nextAccess) => {
    let resolveRefresh!: (response: Response) => void;
    let refreshStarted!: () => void;
    const started = new Promise<void>((resolve) => { refreshStarted = resolve; });
    const fetchMock = jest.fn()
      .mockReturnValueOnce(jsonResponse(401, {}))
      .mockImplementationOnce(() => {
        refreshStarted();
        return new Promise<Response>((resolve) => { resolveRefresh = resolve; });
      })
      .mockReturnValueOnce(jsonResponse(200, { ok: true }));
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    const request = api.get("/me/dashboard");
    const outcome = request.catch((error: unknown) => error);
    await started;
    store.access = nextAccess;
    resolveRefresh(await jsonResponse(200, { accessToken: "stale-refresh" }));
    const result = await outcome;
    expect(store.access).toBe(nextAccess);
    expect(deps.onAuthFailure).not.toHaveBeenCalled();
    if (nextAccess) {
      expect(result).toEqual({ ok: true });
      expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer new-login");
    } else {
      expect(result).toEqual(new Error("UNAUTHENTICATED"));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  });

  it("emits auth failure when refresh fails", async () => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(jsonResponse(401, {}))
      .mockReturnValueOnce(jsonResponse(401, {}));
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    await expect(api.get("/me/dashboard")).rejects.toBeTruthy();
    expect(deps.onAuthFailure).toHaveBeenCalled();
  });

  it("does not refresh or log out when an unauthenticated call is rejected", async () => {
    const fetchMock = jest.fn().mockReturnValueOnce(jsonResponse(401, {}));
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    await expect(api.post("/auth/login", { login: "x" }, { auth: false })).rejects.toThrow(
      "HTTP_401",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(deps.onAuthFailure).not.toHaveBeenCalled();
    expect(store.access).toBe("a1");
  });

  it("returns undefined for 204 responses instead of parsing an empty body", async () => {
    const fetchMock = jest.fn().mockReturnValueOnce(
      Promise.resolve({
        status: 204,
        ok: true,
        json: () => Promise.reject(new Error("no body")),
      } as unknown as Response),
    );
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    await expect(api.post("/auth/logout")).resolves.toBeUndefined();
  });
});

describe("apiClient timeout", () => {
  it("rejects with RequestTimeoutError when the server never answers", async () => {
    const { RequestTimeoutError } = jest.requireActual("../apiClient");
    const hangingFetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    const api = createApiClient({
      baseUrl: "http://x",
      getAccessToken: async () => null,
      setAccessToken: async () => undefined,
      clearAccessToken: async () => undefined,
      onAuthFailure: jest.fn(),
      fetchFn: hangingFetch as unknown as typeof fetch,
      timeoutMs: 10,
    });

    await expect(api.get("/auth/me")).rejects.toBeInstanceOf(RequestTimeoutError);
  });
});


describe("apiClient body timeout", () => {
  it.each(["json", "arrayBuffer"])("times out while reading %s after headers arrive", async (method) => {
    let signal: AbortSignal | undefined;
    const fetchMock = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return Promise.resolve({ status: 200, [method]: () => new Promise(() => {}) } as unknown as Response);
    });
    const api = createApiClient({
      baseUrl: "http://x", getAccessToken: async () => null,
      setAccessToken: async () => undefined, clearAccessToken: async () => undefined,
      onAuthFailure: jest.fn(), fetchFn: fetchMock as typeof fetch, timeoutMs: 10,
    });
    await expect(method === "json" ? api.get("/data") : api.getBytes("/data")).rejects.toBeInstanceOf(RequestTimeoutError);
    expect(signal?.aborted).toBe(true);
  });
});

describe("media timeout override", () => {
  it.each(["postForm", "getBytes"] as const)("keeps %s alive beyond the default and aborts at the override", async (method) => {
    jest.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const fetchMock = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      });
      const api = createApiClient({
        baseUrl: "http://x", getAccessToken: async () => "token",
        setAccessToken: async () => undefined, clearAccessToken: async () => undefined,
        onAuthFailure: jest.fn(), fetchFn: fetchMock as typeof fetch, timeoutMs: 20_000,
      });
      const request = method === "postForm"
        ? api.postForm("/recording", new FormData(), { timeoutMs: 300_000 })
        : api.getBytes("/recording", { timeoutMs: 300_000 });
      const outcome = request.catch((error: unknown) => error);
      await jest.advanceTimersByTimeAsync(20_000);
      expect(signal?.aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(280_000);
      expect(await outcome).toBeInstanceOf(RequestTimeoutError);
      expect(signal?.aborted).toBe(true);
    } finally { jest.useRealTimers(); }
  });
});
