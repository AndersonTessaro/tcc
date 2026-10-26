import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { studentService, type StudentMaterial } from "@/features/student/studentService";
import { useResource } from "@/hooks/use-resource";
import { formatFileSize, formatFullDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { DownloadButton } from "@/features/files/DownloadButton";
import { MaterialSourceTag } from "@/features/files/MaterialSourceTag";
import { Card } from "@/ui/Card";
import { IconButton } from "@/ui/IconButton";
import { ScreenHeader } from "@/ui/ScreenHeader";
import { ScreenState } from "@/ui/ScreenState";
import { TextField } from "@/ui/TextField";
import { colors, space, type } from "@/ui/theme";

const fileIcon = require("@/assets/images/figma-student/file.png");
const SEARCH_DEBOUNCE_MS = 300;

export default function Materials() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [shownItems, setShownItems] = useState<StudentMaterial[] | undefined>(undefined);

  useEffect(() => {
    const next = search.trim();
    const timer = setTimeout(() => setQuery(next), next ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMaterials = useCallback(() => studentService.materials(query), [query]);
  const materials = useResource(fetchMaterials, query);
  if (materials.data && materials.data !== shownItems) setShownItems(materials.data);
  const items = materials.data ?? shownItems;
  const searching = materials.data === undefined && items !== undefined && !materials.error;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Materiais" back />
      <View style={styles.search}>
        <TextField
          accessibilityLabel="Buscar material"
          placeholder="Buscar material…"
          autoComplete="off"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          onSubmitEditing={() => setQuery(search.trim())}
          leading={<Ionicons name="search" size={18} color={colors.muted} />}
          trailing={
            searching ? <ActivityIndicator accessibilityLabel="Buscando" size="small" color={colors.primary} />
              : search ? <IconButton icon="close-circle" label="Limpar busca" size={20} color={colors.muted} onPress={() => setSearch("")} />
              : null
          }
        />
      </View>
      {materials.error ? (
        <ScreenState message={apiErrorMessage(materials.error, "Não foi possível carregar os materiais.")} retry={materials.reload} />
      ) : items ? (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.source}:${item.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={materials.refreshing} onRefresh={materials.refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            query
              ? <ScreenState icon="search-outline" message="Nenhum material encontrado." />
              : <ScreenState icon="document-text-outline" title="Sem materiais" message="Nenhum material enviado pelo professor." />
          }
          renderItem={({ item }) => (
            <MaterialCard material={item} />
          )}
        />
      ) : (
        <ScreenState loading skeleton />
      )}
    </View>
  );
}

function MaterialCard({ material }: { material: StudentMaterial }) {
  const size = formatFileSize(material.sizeBytes);
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Image source={fileIcon} style={styles.fileIcon} accessible={false} />
        <View style={styles.cardText}>
          <Text style={styles.title}>{material.title}</Text>
          <MaterialSourceTag item={material} />
          {material.description ? <Text style={styles.description}>{material.description}</Text> : null}
          <Text style={styles.fileName}>{material.fileName}{size ? ` · ${size}` : ""}</Text>
          <Text style={styles.metadata}>{material.teacherName} · {formatFullDate(material.createdAt.slice(0, 10))}</Text>
        </View>
      </View>
      <DownloadButton
        label="Baixar material"
        accessibilityLabel={`Baixar ${material.title}`}
        fileName={material.fileName}
        contentType={material.contentType}
        download={() => studentService.downloadMaterialItem(material)}
        failureMessage="Não foi possível baixar o material. Tente novamente."
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  search: { paddingHorizontal: space.screenGutter, paddingBottom: space.md },
  list: { flexGrow: 1, paddingHorizontal: space.screenGutter, paddingBottom: space.xxl, gap: space.md },
  card: { gap: space.md },
  cardHeader: { flexDirection: "row", gap: space.md },
  fileIcon: { width: 36, height: 36 },
  cardText: { flex: 1, gap: space.xs },
  title: { ...type.bodyStrong },
  description: { ...type.body, color: colors.muted },
  fileName: { color: colors.link, fontSize: 13 },
  metadata: { ...type.caption },
});
