export async function saveDownload(bytes: ArrayBuffer, fileName: string, contentType?: string | null) {
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType || "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
