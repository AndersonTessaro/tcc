import { render } from "@testing-library/react-native";
import RootLayout from "@/app/_layout";
import { useAuth } from "@/features/auth/useAuth";

jest.mock("@/global.css", () => ({}));

const mockReplace = jest.fn();
let mockSegments: string[] = [];
jest.mock("expo-router", () => ({
  Slot: () => null,
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockSegments,
}));
jest.mock("@/features/auth/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: jest.fn(),
}));

const auth = useAuth as jest.Mock;
const student = { authorities: ["ROLE_STUDENT"] };
const teacher = { authorities: ["ROLE_TEACHER"] };

beforeEach(() => {
  jest.clearAllMocks();
});

it.each([
  ["a restored student at the root", student, [], "/(student)/dashboard"],
  ["a restored teacher at the root", teacher, [], "/(teacher)/dashboard"],
  ["a teacher inside the student area", teacher, ["(student)", "(tabs)", "dashboard"], "/(teacher)/dashboard"],
  ["a signed-in student on the login screen", student, ["(auth)", "login"], "/(student)/dashboard"],
  ["a visitor at the root", null, [], "/(auth)/login"],
])("redirects %s", async (_case, user, segments, target) => {
  auth.mockReturnValue({ user, restoring: false });
  mockSegments = segments as string[];

  await render(<RootLayout />);

  expect(mockReplace).toHaveBeenCalledWith(target);
});

it("leaves a student inside the student area alone", async () => {
  auth.mockReturnValue({ user: student, restoring: false });
  mockSegments = ["(student)", "(tabs)", "lessons"];

  await render(<RootLayout />);

  expect(mockReplace).not.toHaveBeenCalled();
});
