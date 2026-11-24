import { Text } from "react-native";
import { useRouter } from "expo-router";
import { AuthSheet, authStyles } from "@/features/auth/AuthSheet";
import { Button } from "@/ui/Button";

export default function Forgot() {
  const router = useRouter();
  return (
    <AuthSheet title="Recuperar senha" subtitle="Precisa recuperar seu acesso?">
      <Text style={authStyles.message}>
        A recuperação de senha por e-mail ainda não está disponível. Para recuperar seu acesso, entre em contato com a secretaria da escola.
      </Text>
      <Button label="Voltar ao login" onPress={() => router.replace("/(auth)/login")} style={authStyles.footer} />
    </AuthSheet>
  );
}
