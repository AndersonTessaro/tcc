import { ATTACHMENT_MAX_BYTES, attachmentError, attachmentMimeType, galleryAttachment } from "../lessonAttachments";

const file = (name: string, size = 1024, mimeType?: string) => ({ uri: `file:///${name}`, name, size, mimeType });

describe("lesson attachments", () => {
  it("accepts PDF, images, audio and video", () => {
    for (const name of ["partitura.pdf", "foto.JPG", "foto.heic", "exemplo.mp3", "aula.mp4"]) {
      expect(attachmentError(file(name), 0)).toBeNull();
    }
  });

  it("rejects other types even with a permissive mime type", () => {
    expect(attachmentError(file("setup.exe", 10, "application/pdf"), 0)).toBe("Escolha um PDF, imagem, áudio ou vídeo.");
    expect(attachmentError(file("notas.docx"), 0)).toBe("Escolha um PDF, imagem, áudio ou vídeo.");
  });

  it("rejects empty, oversized and the eleventh file", () => {
    expect(attachmentError(file("vazio.pdf", 0), 0)).toBe("O arquivo está vazio.");
    expect(attachmentError(file("grande.pdf", ATTACHMENT_MAX_BYTES + 1), 0)).toBe("O arquivo passa de 50 MB.");
    expect(attachmentError(file("aula.mp4", ATTACHMENT_MAX_BYTES + 1), 0)).toBeNull();
    expect(attachmentError(file("aula.mp4", 150 * 1024 * 1024 + 1), 0)).toBe("O vídeo passa de 150 MB. Envie um vídeo mais curto.");
    expect(attachmentError(file("onze.pdf"), 10)).toBe("A aula já tem 10 anexos.");
  });

  it("infers the mime type from the extension when the picker omits it", () => {
    expect(attachmentMimeType("partitura.pdf")).toBe("application/pdf");
    expect(attachmentMimeType("foto.png", "application/octet-stream")).toBe("image/png");
    expect(attachmentMimeType("exemplo.mp3")).toBe("audio/mpeg");
  });

  it("names gallery assets that come without an extension", () => {
    expect(galleryAttachment({ uri: "content://media/1000012345", fileName: "1000012345", mimeType: "image/jpeg", fileSize: 10 }))
      .toEqual({ uri: "content://media/1000012345", name: "1000012345.jpg", mimeType: "image/jpeg", size: 10, file: undefined });
    expect(galleryAttachment({ uri: "file:///cache/clip", mimeType: "video/quicktime" }).name).toBe("clip.mov");
    expect(galleryAttachment({ uri: "file:///cache/abc", type: "video" })).toMatchObject({ name: "abc.mp4", mimeType: "video/mp4" });
  });

  it("keeps the gallery name when it already has a known extension", () => {
    const picked = galleryAttachment({ uri: "file:///cache/x.tmp", fileName: "IMG_0001.HEIC", mimeType: "image/heic", fileSize: 2048 });
    expect(picked.name).toBe("IMG_0001.HEIC");
    expect(attachmentError(picked, 0)).toBeNull();
  });
});
