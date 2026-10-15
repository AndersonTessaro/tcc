import { DownloadButton } from "@/features/files/DownloadButton";
import { formatFileSize } from "@/lib/format";
import type { StudentPractice } from "./studentService";

type Props = {
  practice: StudentPractice;
  download: (id: string) => Promise<ArrayBuffer>;
  prefix?: string;
};

export function PracticeRecordingDownload({ practice, download, prefix = "" }: Props) {
  const recording = practice.recording;
  if (!recording) return null;
  return (
    <DownloadButton
      label={`${prefix}${recording.fileName} · ${formatFileSize(recording.sizeBytes)}`}
      accessibilityLabel={`Baixar gravação ${recording.fileName}`}
      fileName={recording.fileName}
      contentType={recording.contentType}
      download={() => download(practice.id)}
      failureMessage="Não foi possível baixar a gravação. Tente novamente."
    />
  );
}
