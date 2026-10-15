package br.com.harmonia.domain.common;

import java.nio.charset.StandardCharsets;

public final class FileSignatures {
    private FileSignatures() {}

    public static boolean isPdf(byte[] head) {
        return head != null && startsWith(head, 0, "%PDF");
    }

    public static boolean isImage(byte[] head) {
        if (head == null) return false;
        return startsWith(head, 0, new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})
            || startsWith(head, 0, new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47})
            || (startsWith(head, 0, "RIFF") && startsWith(head, 8, "WEBP"))
            || startsWith(head, 4, "ftyp");
    }

    public static boolean isMedia(byte[] head) {
        if (head == null || head.length < 4) return false;
        return startsWith(head, 4, "ftyp")
            || startsWith(head, 0, new byte[] {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3})
            || startsWith(head, 0, "ID3")
            || ((head[0] & 0xFF) == 0xFF && (head[1] & 0xE0) == 0xE0)
            || (startsWith(head, 0, "RIFF") && startsWith(head, 8, "WAVE"))
            || startsWith(head, 0, "OggS")
            || startsWith(head, 0, "fLaC")
            || startsWith(head, 0, "#!AMR");
    }

    private static boolean startsWith(byte[] head, int offset, String ascii) {
        return startsWith(head, offset, ascii.getBytes(StandardCharsets.US_ASCII));
    }

    private static boolean startsWith(byte[] head, int offset, byte[] expected) {
        if (head.length < offset + expected.length) return false;
        for (int i = 0; i < expected.length; i++)
            if (head[offset + i] != expected[i]) return false;
        return true;
    }
}
