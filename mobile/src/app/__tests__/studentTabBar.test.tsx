import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import StudentLayout from "@/app/(student)/_layout";
import { AppTabBar } from "@/components/app-tab-bar";
import { studentTabs } from "@/components/student-tabs";
import { haptics } from "@/lib/haptics";

let mockSegments: string[] = [];
let mockParams: { from?: string } = {};
let mockKeyboardVisible = false;
let mockUser: { authorities: string[] } = { authorities: ["ROLE_STUDENT"] };
jest.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  Stack: () => null,
  useRouter: () => ({ dismissTo: mockDismissTo }),
  useSegments: () => mockSegments,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock("@/hooks/use-keyboard-visible", () => ({ useKeyboardVisible: () => mockKeyboardVisible }));
jest.mock("@/lib/haptics", () => ({ haptics: { select: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockKeyboardVisible = false;
  mockParams = {};
  mockUser = { authorities: ["ROLE_STUDENT"] };
});

it("selects Mais for goals opened from the Mais menu", async () => {
  mockSegments = ["(student)", "goals"];
  mockParams = { from: "more" };
  await render(<StudentLayout />);
  expect(screen.getByRole("tab", { name: "Mais", selected: true })).toBeVisible();
});

it.each([
  [["lesson", "[id]"], "Aulas"],
  [["practice", "register"], "Prática"],
  [["practice", "history"], "Prática"],
  [["goals"], "Progresso"],
  [["materials"], "Mais"],
])("selects the parent tab for %s", async (route, label) => {
  mockSegments = ["(student)", ...route];
  await render(<StudentLayout />);
  expect(screen.getAllByRole("tab")).toHaveLength(5);
  expect(screen.getByRole("tab", { name: label, selected: true })).toBeVisible();
});

it("does not duplicate the tabs navigator bar and hides the Stack bar with the keyboard", async () => {
  mockSegments = ["(student)", "(tabs)", "practice"];
  await render(<StudentLayout />);
  expect(screen.queryByRole("tab", { name: "Prática" })).toBeNull();
  mockSegments = ["(student)", "practice", "register"];
  mockKeyboardVisible = true;
  await screen.rerender(<StudentLayout />);
  expect(screen.queryByRole("tab", { name: "Prática" })).toBeNull();
  mockKeyboardVisible = false;
  mockUser = { authorities: ["ROLE_STUDENT"] };
  await screen.rerender(<StudentLayout />);
  expect(screen.getByRole("tab", { name: "Prática" })).toBeVisible();
});

it("navigates from Stack screens even when the selected parent tab is pressed", async () => {
  mockSegments = ["(student)", "practice", "register"];
  await render(<StudentLayout />);
  await fireEvent.press(screen.getByRole("tab", { name: "Prática" }));
  expect(mockDismissTo).toHaveBeenCalledWith("/(student)/(tabs)/practice");
  expect(haptics.select).toHaveBeenCalledTimes(1);
});

it("preserves tabPress cancellation, active-tab events and haptics for the Tabs navigator", async () => {
  const emit = jest.fn().mockReturnValue({ defaultPrevented: true });
  const navigate = jest.fn();
  const props = {
    state: { index: 0, routes: studentTabs.map((tab) => ({ name: tab.name, key: tab.name })) },
    navigation: { emit, navigate },
    tabs: studentTabs,
  } as unknown as ComponentProps<typeof AppTabBar>;
  await render(<AppTabBar {...props} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Aulas" }));
  expect(emit).toHaveBeenCalledWith({ type: "tabPress", target: "lessons", canPreventDefault: true });
  expect(navigate).not.toHaveBeenCalled();
  emit.mockReturnValue({ defaultPrevented: false });
  await fireEvent.press(screen.getByRole("tab", { name: "Início" }));
  expect(emit).toHaveBeenCalledTimes(2);
  expect(navigate).not.toHaveBeenCalled();
  expect(haptics.select).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("tab", { name: "Aulas" }));
  expect(navigate).toHaveBeenCalledWith("lessons");
  expect(haptics.select).toHaveBeenCalledTimes(1);
});

it("mounts no student screen for a teacher sharing the same URL", async () => {
  mockUser = { authorities: ["ROLE_TEACHER"] };
  mockSegments = ["(student)", "(tabs)", "dashboard"];

  await render(<StudentLayout />);

  expect(screen.toJSON()).toBeNull();
});
