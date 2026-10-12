import { recordingError, recordingMimeType, RECORDING_MAX_BYTES } from "../recording";

it.each([
  ["Prática.MP4", "video/mp4"], ["clip.mov", "video/quicktime"],
  ["clip.webm", "video/webm"], ["clip.3gp", "video/3gpp"],
  ["audio.m4a", "audio/mp4"], ["audio.mp3", "audio/mpeg"],
  ["audio.aac", "audio/aac"], ["audio.wav", "audio/wav"], ["audio.ogg", "audio/ogg"],
])("infers %s when MIME is missing or generic", (name, expected) => {
  expect(recordingMimeType(name)).toBe(expected);
  expect(recordingMimeType(name, "application/octet-stream")).toBe(expected);
});

it("keeps the declared audio/video MIME only for allowed extensions", () => {
  expect(recordingMimeType("pratica.flac", "audio/x-flac")).toBe("audio/x-flac");
  expect(recordingMimeType("pratica.MKV")).toBe("video/x-matroska");
  expect(recordingMimeType("recording", "audio/flac")).toBeNull();
  expect(recordingMimeType("aula.exe", "video/mp4")).toBeNull();
  expect(recordingMimeType("document.pdf", "application/pdf")).toBeNull();
});

it("accepts exactly 50 MB and unknown size, rejects wrong type, empty and oversized files", () => {
  const file = { uri: "file:///practice", name: "Prática.mp4", size: RECORDING_MAX_BYTES };
  expect(recordingError(file)).toBeNull();
  expect(recordingError({ ...file, size: undefined })).toBeNull();
  expect(recordingError({ ...file, name: "document.pdf" })).toBe("Escolha um arquivo de áudio ou vídeo.");
  expect(recordingError({ ...file, size: 0 })).toBe("O arquivo está vazio.");
  expect(recordingError({ ...file, size: RECORDING_MAX_BYTES + 1 })).toBe("O arquivo passa de 50 MB. Grave um vídeo mais curto ou envie só o áudio.");
});
