import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/features/auth/useAuth";

export default function Login() {
  const { login, loading } = useAuth();
  const [l, setL] = useState("");
  const [s, setS] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async () => {
    setErr("");
    try {
      await login(l, s);
    } catch {
      setErr("Login ou senha inválidos");
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-bg">
      <Text className="text-3xl font-bold text-white mb-8">Bem-vindo</Text>
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-3"
        placeholder="E-mail ou usuário"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        value={l}
        onChangeText={setL}
      />
      <TextInput
        className="bg-white/10 text-white rounded-xl p-4 mb-2"
        placeholder="Senha"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={s}
        onChangeText={setS}
      />
      {err ? <Text className="text-red-400 mb-2">{err}</Text> : null}
      <Pressable
        className="bg-primary rounded-xl p-4 items-center"
        onPress={onSubmit}
        disabled={loading}
      >
        <Text className="text-white font-semibold">{loading ? "Entrando..." : "Entrar"}</Text>
      </Pressable>
      <Link href="/(auth)/forgot-password" className="text-accent mt-4 text-center">
        Esqueci a senha
      </Link>
    </View>
  );
}
