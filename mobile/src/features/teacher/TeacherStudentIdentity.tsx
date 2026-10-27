import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/ui/Avatar";
import { space, type } from "@/ui/theme";

export function TeacherStudentIdentity({ name, instrument, userId, hasAvatar, bio }: { name: string; instrument: string; userId?: string; hasAvatar?: boolean; bio?: string | null }) {
  return (
    <View style={styles.profile}>
      <Avatar userId={userId} hasAvatar={hasAvatar} size={80} />
      <View style={styles.identity}>
        <Text accessibilityRole="header" style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>{instrument}</Text>
        {bio ? <Text style={styles.subtitle}>{bio}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: space.xxl },
  identity: { flex: 1, gap: space.xs },
  name: { ...type.body, fontSize: 16, fontWeight: "700" },
  subtitle: { ...type.body, fontSize: 14 },
});
