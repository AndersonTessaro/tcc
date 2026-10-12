import { useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { formatFileSize } from "@/lib/format";
import { saveDownload } from "@/lib/files/saveDownload";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import type { StudentPractice } from "./studentService";

type Props = {
  practice: StudentPractice;
  download: (id: string) => Promise<ArrayBuffer>;
  prefix?: string;
};

export function PracticeRecordingDownload({ practice, download, prefix = "" }: Props) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const downloadingRef = useRef(false);
  const recording = practice.recording;
  if (!recording) return null;

  const handleDownload = async () => {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    try {
      await saveDownload(await download(practice.id), recording.fileName, recording.contentType);
      toast.show(`${recording.fileName} pronto para salvar`, "success");
    } catch (cause) {
      toast.show(apiErrorMessage(cause, "Não foi possível baixar a gravação. Tente novamente."), "error");
    } finally {
      downloadingRef.current = false;
      setDownloading(false);
    }
  };

  return (
    <Button
      label={`${prefix}${recording.fileName} · ${formatFileSize(recording.sizeBytes)}`}
      accessibilityLabel={`Baixar gravação ${recording.fileName}`}
      variant="ghost"
      icon="download-outline"
      compact
      loading={downloading}
      onPress={handleDownload}
      style={styles.download}
    />
  );
}

const styles = StyleSheet.create({
  download: { alignSelf: "flex-start" },
});
