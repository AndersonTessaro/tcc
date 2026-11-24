export async function playableUri(bytes: ArrayBuffer, contentType: string): Promise<string> {
  return URL.createObjectURL(new Blob([bytes], { type: contentType }));
}
