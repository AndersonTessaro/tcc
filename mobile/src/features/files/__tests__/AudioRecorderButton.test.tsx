import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { recorder, requestRecordingPermissionsAsync } from "@/test/expoAudioMock";
import { AudioRecorderButton } from "../AudioRecorderButton";

const mockShow = jest.fn();
jest.mock("@/ui/Toast", () => ({ useToast: () => ({ show: mockShow }) }));

beforeEach(() => {
  jest.clearAllMocks();
  recorder.uri = "file:///cache/recording.m4a";
});

it("records, stops and hands back an m4a file", async () => {
  const onRecorded = jest.fn();
  await render(<AudioRecorderButton onRecorded={onRecorded} />);

  await fireEvent.press(screen.getByRole("button", { name: "Gravar áudio" }));
  expect(recorder.record).toHaveBeenCalledTimes(1);
  await fireEvent.press(await screen.findByRole("button", { name: /Parar gravação/ }));

  await waitFor(() => expect(onRecorded).toHaveBeenCalledWith(expect.objectContaining({
    uri: "file:///cache/recording.m4a", mimeType: "audio/mp4", name: expect.stringMatching(/^gravacao-.*\.m4a$/),
  })));
  expect(screen.getByRole("button", { name: "Gravar áudio" })).toBeVisible();
});

it("explains a denied microphone permission without recording", async () => {
  requestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false, status: "denied" });
  await render(<AudioRecorderButton onRecorded={jest.fn()} />);

  await fireEvent.press(screen.getByRole("button", { name: "Gravar áudio" }));

  await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Permita o acesso ao microfone para gravar.", "error"));
  expect(recorder.record).not.toHaveBeenCalled();
});
