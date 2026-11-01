import { recordingError, recordingMimeType, AUDIO_RECORDING_MAX_BYTES, VIDEO_RECORDING_MAX_BYTES } from "../recording";

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

it("accepts 150 MB video and unknown size, rejects wrong type, empty and oversized files", () => {
  const file = { uri: "file:///practice", name: "Prática.mp4", size: VIDEO_RECORDING_MAX_BYTES };
  expect(recordingError(file)).toBeNull();
  expect(recordingError({ ...file, size: undefined })).toBeNull();
  expect(recordingError({ ...file, name: "document.pdf" })).toBe("Escolha um arquivo de áudio ou vídeo.");
  expect(recordingError({ ...file, size: 0 })).toBe("O arquivo está vazio.");
  expect(recordingError({ ...file, size: VIDEO_RECORDING_MAX_BYTES + 1 })).toBe("O vídeo passa de 150 MB. Grave um vídeo mais curto.");
});

it("accepts 50 MB audio and rejects larger audio, including the web file size fallback", () => {
  const file = { uri: "file:///practice", name: "Prática.m4a", size: AUDIO_RECORDING_MAX_BYTES };
  expect(recordingError(file)).toBeNull();
  expect(recordingError({ ...file, size: AUDIO_RECORDING_MAX_BYTES + 1 })).toBe("O áudio passa de 50 MB. Envie um arquivo menor.");
  expect(recordingError({ ...file, size: undefined, file: { size: AUDIO_RECORDING_MAX_BYTES + 1 } as Blob })).toBe("O áudio passa de 50 MB. Envie um arquivo menor.");
});
