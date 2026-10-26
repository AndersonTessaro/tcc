import { api } from "@/lib/http";
import { avatarService } from "../avatarService";
import { ApiError } from "@/lib/http/apiError";
import { Platform } from "react-native";

jest.mock("@/lib/http", () => ({ api: { getBytes: jest.fn(), putForm: jest.fn().mockResolvedValue(undefined), del: jest.fn().mockResolvedValue(undefined) } }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it.each([
  [[137, 80, 78, 71], "data:image/png;base64,iVBORw=="],
  [[255, 216, 255], "data:image/jpeg;base64,/9j/"],
  [[255, 216], "data:image/jpeg;base64,/9g="],
])("converts authenticated image bytes into a portable data URI", async (bytes, uri) => {
  jest.mocked(api.getBytes).mockResolvedValue(new Uint8Array(bytes).buffer);
  expect(await avatarService.get()).toBe(uri);
  expect(api.getBytes).toHaveBeenLastCalledWith("/account/avatar");
  await avatarService.get("user-2");
  expect(api.getBytes).toHaveBeenLastCalledWith("/users/user-2/avatar");
});

it("treats 404 as an absent avatar and propagates other errors", async () => {
  jest.mocked(api.getBytes).mockRejectedValueOnce(new ApiError(404, "RESOURCE_NOT_FOUND"));
  expect(await avatarService.get()).toBeNull();
  jest.mocked(api.getBytes).mockRejectedValueOnce(new Error("offline"));
  await expect(avatarService.get()).rejects.toThrow("offline");
});

it("uploads a multipart file with PUT and invalidates only after success", async () => {
  const listener = jest.fn();
  const unsubscribe = avatarService.subscribe(listener);
  await avatarService.upload({ uri: "file:///photo.jpg", name: "photo.jpg", mimeType: "image/jpeg", size: 1024 });
  expect(api.putForm).toHaveBeenCalledWith("/account/avatar", expect.any(FormData));
  expect(listener).toHaveBeenCalledTimes(1);
  await avatarService.remove();
  expect(api.del).toHaveBeenCalledWith("/account/avatar");
  expect(listener).toHaveBeenCalledTimes(2);
  jest.mocked(api.putForm).mockRejectedValueOnce(new Error("offline"));
  await expect(avatarService.upload({ uri: "file:///a.png", name: "a.png", mimeType: "image/png" })).rejects.toThrow("offline");
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
});

it("rejects oversized or unsupported photos before sending", async () => {
  await expect(avatarService.upload({ uri: "x", name: "x.png", mimeType: "image/png", size: 2097153 })).rejects.toThrow("2 MB");
  await expect(avatarService.upload({ uri: "x", name: "x.pdf", mimeType: "application/pdf" })).rejects.toThrow("PNG ou JPEG");
  expect(api.putForm).not.toHaveBeenCalled();
});

it("uploads the original web Blob under the multipart file field", async () => {
  jest.replaceProperty(Platform, "OS", "web");
  const append = jest.spyOn(FormData.prototype, "append");
  const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
  await avatarService.upload({ uri: "blob:photo", name: "photo.png", mimeType: "image/png", file: blob });
  expect(append).toHaveBeenCalledWith("file", blob, "photo.png");
  expect(api.putForm).toHaveBeenCalledWith("/account/avatar", expect.any(FormData));
});
