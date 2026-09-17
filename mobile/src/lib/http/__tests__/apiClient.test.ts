import { createApiClient } from "../apiClient";

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
