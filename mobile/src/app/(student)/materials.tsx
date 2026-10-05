import { useCallback, useRef, useState } from "react";
import { FlatList, Image, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { studentService, type StudentMaterial } from "@/features/student/studentService";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { saveDownload } from "@/lib/files/saveDownload";

const searchIcon = require("@/assets/images/figma-teacher/search.png");
const fileIcon = require("@/assets/images/figma-student/file.png");

export default function Materials() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<StudentMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const pending = useRef(false);

  const download = async (material: StudentMaterial) => {
    if (pending.current) return;
    pending.current = true;
    setDownloading(material.id);
    setDownloadError("");
    try {
      await saveDownload(await studentService.downloadMaterial(material.id), material.fileName, material.contentType);
    } catch (cause) {
      setDownloadError(apiErrorMessage(cause, "Não foi possível baixar o material. Tente novamente."));
    } finally {
      pending.current = false;
      setDownloading(null);
    }
  };

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      studentService.materials(search.trim())
        .then((result) => { if (active) setItems(result); })
        .catch((cause) => { if (active) setError(apiErrorMessage(cause, "Não foi possível carregar os materiais.")); })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [search, retry]));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F4" />
      <ScreenHeader title="Materiais" back />
      <View style={styles.searchField}>
        <Image source={searchIcon} style={styles.searchIcon} />
        <TextInput accessibilityLabel="Buscar material" placeholder="Buscar material..." placeholderTextColor="#9A969B" value={search} onChangeText={setSearch} style={styles.searchInput} />
      </View>
      {downloadError ? <Text accessibilityRole="alert" style={styles.downloadError}>{downloadError}</Text> : null}
      {loading || error ? <ScreenState loading={loading} message={error} retry={() => setRetry((value) => value + 1)} /> : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ScreenState message={search.trim() ? "Nenhum material encontrado." : "Nenhum material enviado pelo professor."} />}
          renderItem={({ item }) => <View style={styles.card}>
            <Image source={fileIcon} style={styles.fileIcon} />
            <View style={styles.cardContent}>
              <Text style={styles.title}>{item.title}</Text>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              <Text style={styles.fileName}>{item.fileName}</Text>
              <Text style={styles.metadata}>{item.teacherName} · {item.createdAt.slice(0, 10).split("-").reverse().join("/")}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Baixar ${item.title}`} disabled={downloading !== null} onPress={() => download(item)} style={styles.downloadButton}><Text style={styles.downloadLabel}>{downloading === item.id ? "Baixando..." : "Baixar material"}</Text></Pressable>
            </View>
          </View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F4F4" },
  searchField: { height: 46, marginHorizontal: 29, marginTop: 24, marginBottom: 19, borderWidth: 1, borderColor: "#CCCCCC", borderRadius: 15, backgroundColor: "#FFFFFF", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  searchIcon: { width: 15, height: 15 },
  searchInput: { flex: 1, height: "100%", padding: 0, color: "#17131A", fontSize: 14 },
  list: { paddingHorizontal: 29, paddingBottom: 30, gap: 11, flexGrow: 1 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D3D3D3", borderRadius: 15, padding: 16, flexDirection: "row", alignItems: "center", gap: 15 },
  fileIcon: { width: 38, height: 38 },
  cardContent: { flex: 1, gap: 6 },
  title: { color: "#17131A", fontSize: 14, fontWeight: "700" },
  description: { color: "#333333", fontSize: 14 },
  fileName: { color: "#572AA8", fontSize: 13 },
  metadata: { color: "#6A666B", fontSize: 12 },
  downloadError: { color: "#B42318", marginHorizontal: 29, marginBottom: 12 },
  downloadButton: { alignSelf: "flex-start", paddingVertical: 10 },
  downloadLabel: { color: "#572AA8", fontWeight: "600", fontSize: 14 },
});
