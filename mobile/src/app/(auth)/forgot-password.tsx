import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { authService } from "@/features/auth/authService";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    await authService.forgot(email);
    setSent(true);
  };

  return (
    <View className="flex-1 justify-center px-6 bg-bg">
      <Text className="text-2xl font-bold text-white mb-6">Recuperar senha</Text>
      {sent ? (
        <Text className="text-accent">Se o e-mail existir, enviamos as instruções.</Text>
      ) : (
        <>
          <TextInput
            className="bg-white/10 text-white rounded-xl p-4 mb-3"
            placeholder="E-mail"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Pressable className="bg-primary rounded-xl p-4 items-center" onPress={onSubmit}>
            <Text className="text-white font-semibold">Enviar</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
