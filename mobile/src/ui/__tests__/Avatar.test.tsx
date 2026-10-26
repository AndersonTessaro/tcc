import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Avatar } from "../Avatar";
import { avatarService } from "@/features/account/avatarService";

let mockVersion = 0;
const mockListeners = new Set<() => void>();
jest.mock("@/features/account/avatarService", () => ({ avatarService: {
  get: jest.fn(),
  subscribe: (listener: () => void) => { mockListeners.add(listener); return () => { mockListeners.delete(listener); }; },
  getVersion: () => mockVersion,
} }));
const get = jest.mocked(avatarService.get);
const placeholder = require("@/assets/images/figma-student/menu-user.png");

beforeEach(() => { jest.clearAllMocks(); mockVersion = 0; mockListeners.clear(); });

it("uses the placeholder without fetching when there is no avatar", async () => {
  await render(<Avatar label="Foto de Ana" hasAvatar={false} />);
  expect(screen.getByLabelText("Foto de Ana")).toHaveProp("source", placeholder);
  expect(get).not.toHaveBeenCalled();
});

it("loads a data URI through the service and falls back on image failure", async () => {
  get.mockResolvedValue("data:image/png;base64,abc");
  await render(<Avatar label="Foto de Ana" userId="u1" hasAvatar />);
  await waitFor(() => expect(screen.getByLabelText("Foto de Ana")).toHaveProp("source", { uri: "data:image/png;base64,abc" }));
  expect(get).toHaveBeenCalledWith("u1");
  await act(() => screen.getByLabelText("Foto de Ana").props.onError());
  expect(screen.getByLabelText("Foto de Ana")).toHaveProp("source", placeholder);
});

it("ignores an old image request when identity changes", async () => {
  let finish!: (uri: string) => void;
  get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce("data:image/jpeg;base64,new");
  const view = await render(<Avatar label="Foto" userId="old" hasAvatar />);
  await view.rerender(<Avatar label="Foto" userId="new" hasAvatar />);
  await act(() => finish("data:image/png;base64,old"));
  await waitFor(() => expect(screen.getByLabelText("Foto")).toHaveProp("source", { uri: "data:image/jpeg;base64,new" }));
});

it("shows the placeholder on fetch failure", async () => {
  get.mockRejectedValue(new Error("offline"));
  await render(<Avatar label="Foto" hasAvatar />);
  await waitFor(() => expect(get).toHaveBeenCalled());
  expect(screen.getByLabelText("Foto")).toHaveProp("source", placeholder);
});

it("reloads after invalidation and removes the image when hasAvatar becomes false", async () => {
  get.mockResolvedValueOnce("data:image/png;base64,old").mockResolvedValueOnce("data:image/png;base64,new");
  const view = await render(<Avatar label="Foto" hasAvatar />);
  await waitFor(() => expect(screen.getByLabelText("Foto")).toHaveProp("source", { uri: "data:image/png;base64,old" }));
  await act(() => { mockVersion++; mockListeners.forEach((listener) => listener()); });
  await waitFor(() => expect(screen.getByLabelText("Foto")).toHaveProp("source", { uri: "data:image/png;base64,new" }));
  await view.rerender(<Avatar label="Foto" hasAvatar={false} />);
  expect(screen.getByLabelText("Foto")).toHaveProp("source", placeholder);
  expect(get).toHaveBeenCalledTimes(2);
});
