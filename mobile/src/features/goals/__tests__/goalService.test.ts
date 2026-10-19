import { api } from "@/lib/http";
import { studentService } from "@/features/student/studentService";
import { teacherService } from "@/features/teacher/teacherService";
import type { NewGoal } from "../goalService";

jest.mock("@/lib/http", () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
const body: NewGoal = { title: "Praticar", type: "PRACTICE_TIME", period: "WEEKLY", target: 180 };

beforeEach(() => jest.clearAllMocks());

it("uses the student recurring goals endpoints", () => {
  studentService.goals("ACTIVE");
  studentService.goals("ENDED");
  studentService.createGoal(body);
  studentService.endGoal("g1");
  expect(api.get).toHaveBeenCalledWith("/me/goals?status=ACTIVE");
  expect(api.get).toHaveBeenCalledWith("/me/goals?status=ENDED");
  expect(api.post).toHaveBeenCalledWith("/me/goals", body);
  expect(api.patch).toHaveBeenCalledWith("/me/goals/g1/end");
  expect(studentService).not.toHaveProperty("updateGoal");
});

it("scopes teacher goals to the selected student", () => {
  teacherService.studentGoals("s1");
  teacherService.studentGoals("s1", "ENDED");
  teacherService.createGoal("s1", body);
  teacherService.endGoal("s1", "g1");
  expect(api.get).toHaveBeenCalledWith("/teacher/students/s1/goals");
  expect(api.get).toHaveBeenCalledWith("/teacher/students/s1/goals?status=ENDED");
  expect(api.post).toHaveBeenCalledWith("/teacher/students/s1/goals", body);
  expect(api.patch).toHaveBeenCalledWith("/teacher/students/s1/goals/g1/end");
});
