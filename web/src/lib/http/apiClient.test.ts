import { describe, it, expect, vi } from "vitest";
import { createApiClient } from "./apiClient";

const json = (status: number, body: unknown) =>
  Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body) } as Response);

describe("apiClient", () => {
  const store = { access: "a1" };
  const deps = {
    baseUrl: "http://x",
    getAccessToken: () => store.access,
    setAccessToken: (a: string) => {
      store.access = a;
    },
    clearAccessToken: () => {
      store.access = "";
    },
    onAuthFailure: vi.fn(),
  };

  it("retries after 401 with refreshed token", async () => {
    store.access = "a1";
    const f = vi
      .fn()
      .mockReturnValueOnce(json(401, {}))
      .mockReturnValueOnce(json(200, { accessToken: "a2" }))
      .mockReturnValueOnce(json(200, { ok: true }));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch });
    expect(await api.get("/me/dashboard")).toEqual({ ok: true });
    expect(store.access).toBe("a2");
  });

  it("shares one refresh between requests that expire together", async () => {
    store.access = "a1";
    deps.onAuthFailure.mockClear();
    const f = vi.fn((url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return json(200, { accessToken: "a2" });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer a2" ? json(200, { url }) : json(401, {});
    });
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch });

    const results = await Promise.all([api.get("/admin/teachers"), api.get("/admin/instruments"), api.get("/admin/schools")]);

    expect(results).toHaveLength(3);
    expect(f.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
    expect(deps.onAuthFailure).not.toHaveBeenCalled();
    expect(store.access).toBe("a2");
  });

  it("retries with a token refreshed by another request instead of refreshing again", async () => {
    store.access = "a1";
    const f = vi.fn()
      .mockImplementationOnce(() => { store.access = "a2"; return json(401, {}); })
      .mockReturnValueOnce(json(200, { ok: true }));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch });

    expect(await api.get("/admin/teachers")).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[1][1].headers.Authorization).toBe("Bearer a2");
  });

  it("retries a GET that hits a gateway error while the API wakes up", async () => {
    store.access = "a1";
    const f = vi.fn()
      .mockReturnValueOnce(json(503, {}))
      .mockReturnValueOnce(json(502, {}))
      .mockReturnValueOnce(json(200, [{ id: "s1" }]));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch, gatewayRetryDelaysMs: [0, 0, 0] });

    expect(await api.get("/admin/schools")).toEqual([{ id: "s1" }]);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("reports the gateway error once the retries run out", async () => {
    store.access = "a1";
    const f = vi.fn(() => json(504, {}));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch, gatewayRetryDelaysMs: [0, 0] });

    await expect(api.get("/admin/schools")).rejects.toMatchObject({ status: 504 });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("does not repeat a write after a gateway error", async () => {
    store.access = "a1";
    const f = vi.fn(() => json(502, {}));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch, gatewayRetryDelaysMs: [0, 0] });

    await expect(api.post("/admin/teachers", { name: "x" })).rejects.toMatchObject({ status: 502 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("logs out when refresh fails", async () => {
    store.access = "a1";
    const f = vi.fn().mockReturnValueOnce(json(401, {})).mockReturnValueOnce(json(401, {}));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch });
    await expect(api.get("/me/dashboard")).rejects.toBeTruthy();
    expect(deps.onAuthFailure).toHaveBeenCalled();
  });

  it("sends login without the stale token and does not refresh on 401", async () => {
    store.access = "stale";
    const f = vi.fn().mockReturnValueOnce(json(401, { code: "INVALID_CREDENTIALS" }));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch });
    await expect(api.post("/auth/login", { login: "admin", password: "x" })).rejects.toMatchObject({ status: 401 });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    expect(store.access).toBe("stale");
  });

  it("keeps the token on /auth/me", async () => {
    store.access = "a1";
    const f = vi.fn().mockReturnValueOnce(json(200, { username: "admin" }));
    const api = createApiClient({ ...deps, fetchFn: f as unknown as typeof fetch });
    await api.get("/auth/me");
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer a1");
  });
});
