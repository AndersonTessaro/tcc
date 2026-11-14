import { api } from "@/lib/http";
import { ApiError } from "@/lib/http/apiError";
import { createChatService } from "../chatService";

jest.mock("@/lib/http", () => ({ api: { get: jest.fn(), post: jest.fn() } }));

const http = jest.mocked(api);

beforeEach(() => jest.clearAllMocks());

it.each([
  ["teacher", "/teacher/chats", { studentId: "peer-1", studentName: "Ana" }],
  ["student", "/me/chats", { teacherId: "peer-1", teacherName: "Ana" }],
] as const)("normalizes %s conversations and uses its endpoints", async (role, base, peer) => {
  const service = createChatService(role);
  const preview = { lastMessage: null, lastMessageAt: null, unread: 2 };
  http.get.mockResolvedValueOnce([{ ...peer, ...preview }]);
  expect(await service.list()).toEqual([{ peerId: "peer-1", peerName: "Ana", ...preview }]);
  expect(http.get).toHaveBeenLastCalledWith(base);

  const message = { id: "m1", body: "Olá", sentAt: "2026-11-14T12:00:00Z", mine: true };
  http.get.mockResolvedValueOnce([message]);
  expect(await service.messages("peer/1")).toEqual([message]);
  expect(http.get).toHaveBeenLastCalledWith(base + "/peer%2F1/messages");
  http.post.mockResolvedValueOnce(message);
  expect(await service.send("peer/1", "  Olá  ")).toEqual(message);
  expect(http.post).toHaveBeenLastCalledWith(base + "/peer%2F1/messages", { body: "Olá" });
  http.get.mockResolvedValueOnce({ count: 2 });
  expect(await service.unreadCount()).toEqual({ count: 2 });
  expect(http.get).toHaveBeenLastCalledWith(base + "/unread-count");
});

it.each(["", " \n ", "a".repeat(2001)])("rejects an invalid message without an HTTP write", async (body) => {
  await expect(createChatService("teacher").send("peer", body)).rejects.toEqual(new ApiError(422, "VALIDATION"));
  expect(http.post).not.toHaveBeenCalled();
});

it("accepts exactly 2000 characters after trimming and preserves a nonempty preview", async () => {
  const preview = { lastMessage: "Olá", lastMessageAt: "2026-11-14T12:00:00Z", unread: 0 };
  http.get.mockResolvedValueOnce([{ teacherId: "t1", teacherName: "João", ...preview }]);
  const service = createChatService("student");
  expect(await service.list()).toEqual([{ peerId: "t1", peerName: "João", ...preview }]);
  await service.send("t1", " " + "a".repeat(2000) + " ");
  expect(http.post).toHaveBeenCalledWith("/me/chats/t1/messages", { body: "a".repeat(2000) });
});
