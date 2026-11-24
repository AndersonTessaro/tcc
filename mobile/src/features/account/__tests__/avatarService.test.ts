import { api } from "@/lib/http";
import { avatarService } from "../avatarService";
import { ApiError } from "@/lib/http/apiError";
import { Platform } from "react-native";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

jest.mock("@/lib/http", () => ({ api: { getBytes: jest.fn(), putForm: jest.fn().mockResolvedValue(undefined), del: jest.fn().mockResolvedValue(undefined) } }));

jest.mock("expo-image-manipulator", () => ({ ImageManipulator: { manipulate: jest.fn() }, SaveFormat: { JPEG: "jpeg" } }));

const saveAsync = jest.fn();
const renderAsync = jest.fn();
const resize = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  saveAsync.mockResolvedValue({ uri: "file:///avatar.jpg", width: 512, height: 512 });
  renderAsync.mockResolvedValue({ saveAsync });
  const context = { resize, renderAsync };
  resize.mockReturnValue(context);
  jest.mocked(ImageManipulator.manipulate).mockReturnValue(context as unknown as ReturnType<typeof ImageManipulator.manipulate>);
});
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
  await avatarService.upload({ uri: "file:///photo.jpg", width: 2048, height: 2048 });
  expect(api.putForm).toHaveBeenCalledWith("/account/avatar", expect.any(FormData));
  expect(listener).toHaveBeenCalledTimes(1);
  await avatarService.remove();
  expect(api.del).toHaveBeenCalledWith("/account/avatar");
  expect(listener).toHaveBeenCalledTimes(2);
  jest.mocked(api.putForm).mockRejectedValueOnce(new Error("offline"));
  await expect(avatarService.upload({ uri: "file:///a.png", width: 1024, height: 1024 })).rejects.toThrow("offline");
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
});

it.each(["android", "ios"] as const)("resizes and compresses a large photo to JPEG before uploading on %s", async (platform) => {
  jest.replaceProperty(Platform, "OS", platform);
  const append = jest.spyOn(FormData.prototype, "append");
  const image = { uri: "file:///large.heic", width: 4096, height: 4096, size: 5000000 };
  await avatarService.upload(image);
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith(image.uri);
  expect(resize).toHaveBeenCalledWith({ width: 512, height: 512 });
  expect(renderAsync).toHaveBeenCalledTimes(1);
  expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8 });
  expect(append).toHaveBeenCalledWith("file", { uri: "file:///avatar.jpg", name: "avatar.jpg", type: "image/jpeg" });
  expect(api.putForm).toHaveBeenCalledWith("/account/avatar", expect.any(FormData));
});

it.each([
  [2048, 1024, 512, 256],
  [1024, 2048, 256, 512],
  [128, 256, 128, 256],
])("preserves the aspect ratio without enlarging a %s x %s photo", async (width, height, resultWidth, resultHeight) => {
  await avatarService.upload({ uri: "file:///photo.jpg", width, height });
  expect(resize).toHaveBeenCalledWith({ width: resultWidth, height: resultHeight });
});

it.each([[0, 0], [0, 1024], [1024, 0]])("uses decoded dimensions when the picker returns %s x %s", async (width, height) => {
  renderAsync.mockResolvedValueOnce({ width: 2048, height: 1024 });
  await avatarService.upload({ uri: "file:///photo.jpg", width, height });
  expect(resize).toHaveBeenCalledWith({ width: 512, height: 256 });
  expect(renderAsync).toHaveBeenCalledTimes(2);
  expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8 });
});

it.each(["render", "save"])("propagates a compression failure during %s without uploading or invalidating", async (stage) => {
  const error = new Error("compression failed");
  (stage === "render" ? renderAsync : saveAsync).mockRejectedValueOnce(error);
  const version = avatarService.getVersion();
  await expect(avatarService.upload({ uri: "file:///photo.png", width: 1024, height: 1024 })).rejects.toBe(error);
  expect(api.putForm).not.toHaveBeenCalled();
  expect(avatarService.getVersion()).toBe(version);
});

it.each(["data:image/jpeg;base64,/9j/", "blob:compressed-photo"])("uploads the compressed web Blob from %s", async (uri) => {
  jest.replaceProperty(Platform, "OS", "web");
  const append = jest.spyOn(FormData.prototype, "append");
  const blob = new Blob([new Uint8Array([255, 216, 255])], { type: "image/jpeg" });
  const fetch = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, blob: async () => blob } as Response);
  saveAsync.mockResolvedValueOnce({ uri, width: 512, height: 512 });
  await avatarService.upload({ uri: "blob:original-photo", width: 1024, height: 1024 });
  expect(fetch).toHaveBeenCalledWith(uri);
  expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8 });
  expect(append).toHaveBeenCalledWith("file", blob, "avatar.jpg");
  expect(api.putForm).toHaveBeenCalledWith("/account/avatar", expect.any(FormData));
});

it("does not upload or invalidate when the compressed web URI cannot be read", async () => {
  jest.replaceProperty(Platform, "OS", "web");
  jest.spyOn(global, "fetch").mockResolvedValue({ ok: false } as Response);
  const version = avatarService.getVersion();
  await expect(avatarService.upload({ uri: "blob:photo", width: 1024, height: 1024 })).rejects.toThrow("Unable to read compressed profile photo");
  expect(api.putForm).not.toHaveBeenCalled();
  expect(avatarService.getVersion()).toBe(version);
});
