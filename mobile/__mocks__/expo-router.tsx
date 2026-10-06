import { useEffect } from "react";
import { Text } from "react-native";
import type { ReactNode } from "react";

export function Link({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) {
  return <Text {...props}>{children}</Text>;
}

export const useRouter = () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true });

export const useLocalSearchParams = () => ({});

export const useFocusEffect = (callback: () => void | (() => void)) => useEffect(callback, [callback]);
