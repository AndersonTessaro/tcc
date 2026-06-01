import { createApiClient } from "../apiClient";

function jsonResponse(status: number, body: any) {
  return Promise.resolve({
    status,
    ok: status < 400,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("apiClient", () => {
  const store = { access: "a1", refresh: "r1" };
  const deps = {
    baseUrl: "http://x",
    getTokens: async () => store,
    setTokens: async (a: string, r: string) => {
      store.access = a;
      store.refresh = r;
    },
    clearTokens: async () => {
      store.access = "";
      store.refresh = "";
    },
    onAuthFailure: jest.fn(),
  };

  beforeEach(() => {
    store.access = "a1";
    store.refresh = "r1";
    deps.onAuthFailure.mockClear();
  });

  it("retries with refreshed token after 401", async () => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(jsonResponse(401, {}))
      .mockReturnValueOnce(jsonResponse(200, { accessToken: "a2", refreshToken: "r2" }))
      .mockReturnValueOnce(jsonResponse(200, { ok: true }));
    const api = createApiClient({ ...deps, fetchFn: fetchMock as any });
    const res = await api.get("/me/dashboard");
    expect(res).toEqual({ ok: true });
    expect(store.access).toBe("a2");
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
});
