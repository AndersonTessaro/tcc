import { useEffect, useState, useSyncExternalStore } from "react";
import { Image, StyleSheet, type ImageStyle, type StyleProp } from "react-native";
import { avatarService } from "@/features/account/avatarService";

const placeholder = require("@/assets/images/figma-student/menu-user.png");

type AvatarProps = { userId?: string; hasAvatar?: boolean; label?: string; size?: number; style?: StyleProp<ImageStyle> };

export function Avatar({ userId, hasAvatar = false, label, size = 60, style }: AvatarProps) {
  const version = useSyncExternalStore(avatarService.subscribe, avatarService.getVersion, avatarService.getVersion);
  const key = `${userId ?? "account"}:${hasAvatar}:${version}`;
  const [image, setImage] = useState<{ key: string; uri: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (hasAvatar) {
      void avatarService.get(userId).then((uri) => {
        if (active) setImage(uri ? { key, uri } : null);
      }).catch(() => { if (active) setImage(null); });
    }
    return () => { active = false; };
  }, [userId, hasAvatar, key]);
  return <Image source={hasAvatar && image?.key === key ? { uri: image.uri } : placeholder}
    accessible={!!label} accessibilityLabel={label} onError={() => setImage(null)}
    style={[styles.image, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const styles = StyleSheet.create({ image: { resizeMode: "cover" } });
