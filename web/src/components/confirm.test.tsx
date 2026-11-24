import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { confirmDialog } from "./confirm";

const open = (tone?: "danger" | "primary") => {
  let result!: Promise<boolean>;
  act(() => {
    result = confirmDialog({ title: "Excluir instrumento?", message: "Piano sai da lista.", confirmLabel: "Excluir instrumento", tone });
  });
  return result;
};

describe("confirmDialog", () => {
  it("announces the title and message and focuses the safe choice", async () => {
    const trigger = document.body.appendChild(document.createElement("button"));
    trigger.focus();
    void open();

    const dialog = await screen.findByRole("alertdialog", { name: "Excluir instrumento?" });
    expect(dialog).toHaveAccessibleDescription("Piano sai da lista.");
    expect(screen.getByRole("button", { name: "Voltar" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    trigger.remove();
  });

  it("resolves true and closes when confirmed", async () => {
    const result = open();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir instrumento" }));

    await expect(result).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("resolves false when the user goes back", async () => {
    const result = open();
    fireEvent.click(await screen.findByRole("button", { name: "Voltar" }));

    await expect(result).resolves.toBe(false);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("resolves false on Escape", async () => {
    const result = open();
    fireEvent(await screen.findByRole("alertdialog"), new Event("cancel", { cancelable: true }));

    await expect(result).resolves.toBe(false);
  });

  it("resolves false when the backdrop is clicked", async () => {
    const result = open();
    fireEvent.click(await screen.findByRole("alertdialog"));

    await expect(result).resolves.toBe(false);
  });

  it("styles a destructive confirmation differently from a regular one", async () => {
    void open("danger");
    const danger = await screen.findByRole("button", { name: "Excluir instrumento" });
    expect(danger.className).toContain("text-danger");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    void open("primary");
    expect((await screen.findByRole("button", { name: "Excluir instrumento" })).className).toContain("bg-primary");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
