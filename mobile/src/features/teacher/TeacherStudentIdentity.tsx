import { Image, StyleSheet, Text, View } from "react-native";
import { space, type } from "@/ui/theme";

const avatarImage = require("@/assets/images/figma-student/menu-user.png");

export function TeacherStudentIdentity({ name, instrument }: { name: string; instrument: string }) {
  return (
    <View style={styles.profile}>
      <Image source={avatarImage} style={styles.avatar} accessible={false} />
      <View style={styles.identity}>
        <Text accessibilityRole="header" style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>{instrument}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: space.xxl },
  avatar: { width: 80, height: 80 },
  identity: { flex: 1, gap: space.xs },
  name: { ...type.body, fontSize: 16, fontWeight: "700" },
  subtitle: { ...type.body, fontSize: 14 },
});
