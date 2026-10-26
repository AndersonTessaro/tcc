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
