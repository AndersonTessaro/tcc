import { ATTACHMENT_MAX_BYTES, attachmentError, attachmentMimeType } from "../lessonAttachments";

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
    expect(attachmentError(file("grande.mp4", ATTACHMENT_MAX_BYTES + 1), 0)).toBe("O arquivo passa de 50 MB.");
    expect(attachmentError(file("onze.pdf"), 10)).toBe("A aula já tem 10 anexos.");
  });

  it("infers the mime type from the extension when the picker omits it", () => {
    expect(attachmentMimeType("partitura.pdf")).toBe("application/pdf");
    expect(attachmentMimeType("foto.png", "application/octet-stream")).toBe("image/png");
    expect(attachmentMimeType("exemplo.mp3")).toBe("audio/mpeg");
  });
});
