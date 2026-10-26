import { api, MEDIA_TIMEOUT_MS } from "@/lib/http";
import { studentService } from "../studentService";
import { teacherService } from "@/features/teacher/teacherService";

jest.mock("@/lib/http", () => ({ api: { getBytes: jest.fn().mockResolvedValue(new ArrayBuffer(0)) }, MEDIA_TIMEOUT_MS: 300000 }));

beforeEach(() => jest.clearAllMocks());

it.each([
  [studentService, "/me"],
  [teacherService, "/teacher"],
])("routes material and lesson downloads through their source endpoints (%s)", async (service, prefix) => {
  await service.downloadMaterialItem({ id: "file-1", source: "MATERIAL", lessonId: null, lessonDate: null });
  expect(api.getBytes).toHaveBeenLastCalledWith(`${prefix}/materials/file-1/download`, { timeoutMs: MEDIA_TIMEOUT_MS });
  await service.downloadMaterialItem({ id: "file-1", source: "LESSON", lessonId: "lesson-2", lessonDate: "2026-10-01" });
  expect(api.getBytes).toHaveBeenLastCalledWith(`${prefix}/lessons/lesson-2/attachments/file-1`, { timeoutMs: MEDIA_TIMEOUT_MS });
});
