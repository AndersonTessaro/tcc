import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react-native";
import { KeyboardAvoidingView, Platform, Text } from "react-native";
import { KeyboardScreen } from "../KeyboardScreen";

jest.mock("react-native/Libraries/Components/Keyboard/KeyboardAvoidingView", () => ({ __esModule: true, default: jest.fn(({ children }: { children: ReactNode }) => children) }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it.each([
  ["ios", "padding"],
  ["android", "padding"],
  ["web", undefined],
] as const)("uses the expected keyboard behavior on %s", async (platform, behavior) => {
  jest.replaceProperty(Platform, "OS", platform);
  await render(<KeyboardScreen style={{ flex: 1 }}><Text>Conteúdo</Text></KeyboardScreen>);
  expect(jest.mocked(KeyboardAvoidingView).mock.calls[0][0]).toEqual(expect.objectContaining({ behavior }));
  expect(screen.getByText("Conteúdo")).toBeVisible();
});
