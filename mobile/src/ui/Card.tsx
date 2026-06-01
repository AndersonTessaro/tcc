import { View } from "react-native";
import React from "react";

export const Card = ({ children }: { children: React.ReactNode }) => (
  <View className="bg-white/5 rounded-2xl p-4 mb-3">{children}</View>
);
