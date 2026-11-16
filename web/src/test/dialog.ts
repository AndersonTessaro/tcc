import { act, fireEvent, screen, within } from "@testing-library/react";

// The page keeps running after `await confirmDialog`, so the click must flush inside act.
export async function answerConfirm(button: string) {
  const dialog = await screen.findByRole("alertdialog");
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: button }));
  });
}
