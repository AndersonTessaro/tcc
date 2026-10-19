import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DurationInput } from "../DurationInput";

const changed = jest.fn();
function Input() {
  const [value, setValue] = useState<number | null>(0);
  return <DurationInput value={value} onChange={(next) => { changed(next); setValue(next); }} shortcuts={[15, 90, 180]} />;
}

beforeEach(() => jest.clearAllMocks());

it("combines hours and minutes and keeps the editable fields", async () => {
  await render(<Input />);
  await fireEvent.changeText(screen.getByLabelText("Horas"), "2");
  await fireEvent.changeText(screen.getByLabelText("Minutos"), "30");
  expect(changed).toHaveBeenLastCalledWith(150);
  expect(screen.getByLabelText("Horas")).toHaveProp("value", "2");
  expect(screen.getByLabelText("Minutos")).toHaveProp("value", "30");
});

it("uses caller shortcuts to fill both fields", async () => {
  await render(<Input />);
  await fireEvent.press(screen.getByRole("radio", { name: "1 h 30 min" }));
  expect(changed).toHaveBeenLastCalledWith(90);
  expect(screen.getByLabelText("Horas")).toHaveProp("value", "1");
  expect(screen.getByLabelText("Minutos")).toHaveProp("value", "30");
  expect(screen.getByRole("radio", { name: "1 h 30 min" })).toBeChecked();
});

it("rejects minutes over 59 and allows correction", async () => {
  await render(<Input />);
  await fireEvent.changeText(screen.getByLabelText("Minutos"), "60");
  expect(changed).toHaveBeenLastCalledWith(null);
  expect(screen.getByLabelText("Minutos")).toHaveProp("value", "60");
  expect(screen.getByText("Informe de 0 a 59 minutos.")).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText("Minutos"), "59");
  expect(changed).toHaveBeenLastCalledWith(59);
});

it.each(["-1", "1.5", "abc", "9999999999999"])("rejects invalid hours %s", async (value) => {
  await render(<Input />);
  await fireEvent.changeText(screen.getByLabelText("Horas"), value);
  expect(changed).toHaveBeenLastCalledWith(null);
});

it("updates fields when its value is changed externally", async () => {
  const change = jest.fn();
  const view = await render(<DurationInput value={15} onChange={change} shortcuts={[]} />);
  await view.rerender(<DurationInput value={125} onChange={change} shortcuts={[]} />);
  expect(screen.getByLabelText("Horas")).toHaveProp("value", "2");
  expect(screen.getByLabelText("Minutos")).toHaveProp("value", "5");
  expect(change).not.toHaveBeenCalled();
});
