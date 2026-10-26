import { monthGrid, shiftMonth } from "../calendar";
import { toIsoDate } from "@/lib/format";

it.each([
  [2021, 1, 28, 35],
  [2028, 1, 29, 35],
  [2026, 2, 31, 35],
])("covers every day of %s/%s in complete Sunday-first weeks", (year, month, days, cells) => {
  const grid = monthGrid(new Date(year, month, 1));
  expect(grid).toHaveLength(cells);
  const dates = grid.filter((day): day is Date => day !== null);
  expect(dates).toHaveLength(days);
  expect(dates[0].getDate()).toBe(1);
  expect(dates.at(-1)?.getDate()).toBe(days);
  for (const [index, date] of grid.entries()) {
    if (date) expect(date.getDay()).toBe(index % 7);
  }
});

it("places October 1, 2026 on Thursday after four empty cells", () => {
  const grid = monthGrid(new Date(2026, 9, 1));
  expect(grid.slice(0, 4)).toEqual([null, null, null, null]);
  expect(toIsoDate(grid[4]!)).toBe("2026-10-01");
});

it("moves across year boundaries without overflowing a short month", () => {
  expect(toIsoDate(shiftMonth(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
  expect(toIsoDate(shiftMonth(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
  expect(toIsoDate(shiftMonth(new Date(2026, 0, 31), -1))).toBe("2025-12-01");
});
