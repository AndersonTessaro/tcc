import type { RefObject } from "react";
import * as Router from "expo-router";

type ScrollableRef = RefObject<unknown>;

const useScrollToTop = (Router as { useScrollToTop?: (ref: ScrollableRef) => void }).useScrollToTop;

// Outside a navigator (screens rendered alone in tests, or mocked expo-router) the upstream hook
// throws before registering any hook state, so catching keeps the hook order stable.
export function useTabScrollToTop(ref: ScrollableRef): void {
  if (!useScrollToTop) return;
  try {
    useScrollToTop(ref);
  } catch {
    return;
  }
}
