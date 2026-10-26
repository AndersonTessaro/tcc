export function monthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leading = new Date(year, monthIndex, 1).getDay();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => {
    const day = index - leading + 1;
    return day < 1 || day > count ? null : new Date(year, monthIndex, day);
  });
}

export function shiftMonth(month: Date, offset: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}
