import { render, screen } from "@testing-library/react-native";
import { GoalCard } from "../GoalCard";
import type { Goal } from "../goalService";

const goal: Goal = { id: "g1", title: "Praticar", description: null, type: "PRACTICE_TIME", period: "DAILY", target: 30, currentProgress: 30, status: "ENDED", legacy: false, createdByTeacher: null, canEnd: false, periodStart: "2026-10-26", periodEnd: "2026-10-26", achieved: false, streak: 1, completed: true };

it.each([true, false])("uses completed=%s for the ended goal badge", async (completed) => {
  await render(<GoalCard goal={{ ...goal, completed, achieved: !completed }} onEnd={jest.fn()} onEnded={jest.fn()} />);
  expect(screen.getByText(completed ? "Cumprida" : "Encerrada")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Encerrar meta/ })).toBeNull();
});
