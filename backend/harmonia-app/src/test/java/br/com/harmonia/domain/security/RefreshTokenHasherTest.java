package br.com.harmonia.domain.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RefreshTokenHasherTest {
    private final RefreshTokenHasher hasher = new RefreshTokenHasher();

    @Test
    void hash_isDeterministicAndHex64() {
        String h1 = hasher.sha256Hex("abc");
        String h2 = hasher.sha256Hex("abc");
        assertEquals(h1, h2);
        assertEquals(64, h1.length());
        assertTrue(h1.matches("[0-9a-f]{64}"));
    }

    @Test
    void hash_differsForDifferentInput() {
        assertNotEquals(hasher.sha256Hex("abc"), hasher.sha256Hex("abd"));
    }

    @Test
    void newOpaqueToken_isUrlSafeAndLongEnough() {
        String t = hasher.newOpaqueToken();
        assertTrue(t.length() >= 43);
        assertTrue(t.matches("[A-Za-z0-9_-]+"));
    }
}
