import { Platform } from "react-native";
import { api, MEDIA_TIMEOUT_MS } from "@/lib/http";
import { studentService } from "../studentService";
import { teacherService } from "@/features/teacher/teacherService";

jest.mock("@/lib/http", () => ({
  MEDIA_TIMEOUT_MS: 300_000,
  api: { post: jest.fn(), postForm: jest.fn(), get: jest.fn(), getBytes: jest.fn() },
}));
const client = jest.mocked(api);

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
});
afterEach(() => jest.restoreAllMocks());

it("returns practiceId along with progress from JSON registration", async () => {
  const response = { practiceId: "practice-1", xpTotal: 30, level: 1, streakDays: 1, totalPracticeMin: 30 };
  client.post.mockResolvedValue(response);
  expect(await studentService.registerPractice(30, "Escalas", "2026-10-12")).toEqual(response);
  expect(client.post).toHaveBeenCalledWith("/me/practices", { durationMin: 30, notes: "Escalas", date: "2026-10-12" });
});

it("uploads the file part with inferred MIME and a media timeout without registering again", async () => {
  const append = jest.spyOn(FormData.prototype, "append");
  await studentService.uploadPracticeRecording("practice-1", { uri: "file:///practice.mov", name: "Prática.mov", mimeType: "application/octet-stream" });
  expect(append).toHaveBeenCalledWith("file", { uri: "file:///practice.mov", name: "Prática.mov", type: "video/quicktime" });
  expect(client.postForm).toHaveBeenCalledWith("/me/practices/practice-1/recording", expect.any(FormData), { timeoutMs: MEDIA_TIMEOUT_MS });
  expect(client.post).not.toHaveBeenCalled();
});

it("uses authenticated role-specific recording routes with the media timeout", async () => {
  await studentService.downloadPracticeRecording("practice-1");
  await teacherService.downloadPracticeRecording("practice-1");
  await teacherService.studentPractices("student-1");
  expect(client.getBytes).toHaveBeenNthCalledWith(1, "/me/practices/practice-1/recording", { timeoutMs: MEDIA_TIMEOUT_MS });
  expect(client.getBytes).toHaveBeenNthCalledWith(2, "/teacher/practices/practice-1/recording", { timeoutMs: MEDIA_TIMEOUT_MS });
  expect(client.get).toHaveBeenCalledWith("/teacher/students/student-1/practices");
});

it("keeps material multipart metadata while using the shared file helper and media timeout", async () => {
  const append = jest.spyOn(FormData.prototype, "append");
  await teacherService.uploadMaterial("student-1", { uri: "file:///score.pdf", name: "score.pdf", mimeType: "application/pdf" }, "Partitura", "Estudo");
  expect(append).toHaveBeenCalledWith("file", { uri: "file:///score.pdf", name: "score.pdf", type: "application/pdf" });
  expect(append).toHaveBeenCalledWith("title", "Partitura");
  expect(append).toHaveBeenCalledWith("description", "Estudo");
  expect(client.postForm).toHaveBeenCalledWith("/teacher/students/student-1/materials", expect.any(FormData), { timeoutMs: MEDIA_TIMEOUT_MS });
});
