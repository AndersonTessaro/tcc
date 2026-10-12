import { Platform } from "react-native";
import { appendFile } from "../formFile";

afterEach(() => jest.restoreAllMocks());

it("appends a native file with its URI, filename and MIME", () => {
  jest.replaceProperty(Platform, "OS", "android");
  const append = jest.fn();
  const form = { append } as unknown as FormData;
  appendFile(form, "file", { uri: "file:///practice.mp4", name: "Prática.mp4", mimeType: "video/mp4", size: 4 });
  expect(append).toHaveBeenCalledWith("file", { uri: "file:///practice.mp4", name: "Prática.mp4", type: "video/mp4" });
});

it("uses octet-stream when native MIME is missing", () => {
  jest.replaceProperty(Platform, "OS", "ios");
  const append = jest.fn();
  appendFile({ append } as unknown as FormData, "file", { uri: "file:///document", name: "document" });
  expect(append).toHaveBeenCalledWith("file", { uri: "file:///document", name: "document", type: "application/octet-stream" });
});

it("appends the original web Blob and requires reselection when it is absent", () => {
  jest.replaceProperty(Platform, "OS", "web");
  const append = jest.fn();
  const form = { append } as unknown as FormData;
  const blob = { size: 4, type: "video/mp4" } as Blob;
  appendFile(form, "file", { uri: "blob:practice", name: "Prática.mp4", file: blob });
  expect(append).toHaveBeenCalledWith("file", blob, "Prática.mp4");
  expect(() => appendFile(form, "file", { uri: "blob:practice", name: "Prática.mp4" })).toThrow("Escolha novamente o arquivo para enviar.");
});
