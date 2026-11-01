import type { useRouter } from "expo-router";

// A screen opened by reload or deep link has no history; "/" lets the auth guard pick the home for the role.
export function goBack(router: Pick<ReturnType<typeof useRouter>, "back" | "canGoBack" | "replace">): void {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
