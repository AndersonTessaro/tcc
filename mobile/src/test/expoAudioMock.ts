import { jest } from "@jest/globals";

export const recorder = {
  uri: "file:///cache/recording.m4a" as string | null,
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(),
  stop: jest.fn(async () => undefined),
};
export const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined), replace: jest.fn() };
export const RecordingPresets = { HIGH_QUALITY: {} };
export const useAudioRecorder = () => recorder;
export const useAudioRecorderState = () => ({ isRecording: false, durationMillis: 0 });
export const useAudioPlayer = () => player;
export const useAudioPlayerStatus = () => ({ playing: false, currentTime: 0, duration: 0, didJustFinish: false });
export const requestRecordingPermissionsAsync = jest.fn(async () => ({ granted: true, status: "granted" }));
export const setAudioModeAsync = jest.fn(async () => undefined);
