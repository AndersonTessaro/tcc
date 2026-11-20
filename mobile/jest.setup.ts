jest.mock("expo-router");
jest.mock("expo-secure-store");
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("expo-audio", () => require("./src/test/expoAudioMock"));
