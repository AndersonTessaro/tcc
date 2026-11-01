import { goBack } from "../navigation";

const router = (canGoBack: boolean) => ({ canGoBack: () => canGoBack, back: jest.fn(), replace: jest.fn() });

test("volta quando há histórico", () => {
  const r = router(true);
  goBack(r);
  expect(r.back).toHaveBeenCalled();
  expect(r.replace).not.toHaveBeenCalled();
});

test("vai para a raiz quando a tela foi aberta direto", () => {
  const r = router(false);
  goBack(r);
  expect(r.replace).toHaveBeenCalledWith("/");
  expect(r.back).not.toHaveBeenCalled();
});
