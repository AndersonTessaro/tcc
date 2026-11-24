import { Platform } from "react-native";
import { confirm } from "../confirm";

describe("web confirmation", () => {
  const originalPlatform = Platform.OS;
  const originalConfirm = Object.getOwnPropertyDescriptor(globalThis, "confirm");
  beforeEach(() => { Object.defineProperty(Platform, "OS", { configurable: true, value: "web" }); });
  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalPlatform });
    if (originalConfirm) Object.defineProperty(globalThis, "confirm", originalConfirm);
    else Reflect.deleteProperty(globalThis, "confirm");
  });

  it("declines when the browser cannot confirm", async () => {
    Object.defineProperty(globalThis, "confirm", { configurable: true, value: undefined });
    await expect(confirm({ title: "Sair?", confirmLabel: "Sair" })).resolves.toBe(false);
  });

  it.each([true, false])("uses the user's confirmation: %s", async (answer) => {
    const prompt = jest.fn(() => answer);
    Object.defineProperty(globalThis, "confirm", { configurable: true, value: prompt });
    await expect(confirm({ title: "Sair?", message: "Entre novamente.", confirmLabel: "Sair" })).resolves.toBe(answer);
    expect(prompt).toHaveBeenCalledWith("Sair?\n\nEntre novamente.");
  });
});
