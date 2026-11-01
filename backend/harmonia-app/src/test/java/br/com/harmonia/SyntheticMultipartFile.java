package br.com.harmonia;

import org.springframework.mock.web.MockMultipartFile;

import java.io.InputStream;
import java.util.Arrays;
import java.util.Objects;

public class SyntheticMultipartFile extends MockMultipartFile {
    private final long size;
    private final byte[] header;

    public SyntheticMultipartFile(String name, String type, long size, byte[] header) {
        super("file", name, type, header);
        this.size = size;
        this.header = header.clone();
    }

    @Override
    public long getSize() {
        return size;
    }

    @Override
    public byte[] getBytes() {
        throw new AssertionError("Large upload must be streamed");
    }

    @Override
    public InputStream getInputStream() {
        return new InputStream() {
            private long position;

            @Override
            public int read() {
                if (position >= size) return -1;
                return position < header.length ? header[(int) position++] & 0xff : zero();
            }

            private int zero() {
                position++;
                return 0;
            }

            @Override
            public int read(byte[] bytes, int offset, int length) {
                Objects.checkFromIndexSize(offset, length, bytes.length);
                if (length == 0) return 0;
                if (position >= size) return -1;
                int count = (int) Math.min(length, size - position);
                Arrays.fill(bytes, offset, offset + count, (byte) 0);
                int leading = (int) Math.min(count, Math.max(0, header.length - position));
                if (leading > 0) System.arraycopy(header, (int) position, bytes, offset, leading);
                position += count;
                return count;
            }
        };
    }
}
