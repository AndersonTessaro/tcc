package br.com.harmonia.infrastructure.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class BearerTokenResolverTest {
    private final SecurityConfig security = new SecurityConfig();

    @Test
    void ignoresBearerOnPublicAuthRoutesIncludingRefreshAndLogout() {
        for (String path : new String[]{"/auth/login", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password"}) {
            var request = new MockHttpServletRequest("POST", path);
            request.addHeader("Authorization", "Bearer invalid");
            assertThat(security.bearerTokenResolver().resolve(request)).isNull();
        }
    }

    @Test
    void stillResolvesBearerForAuthMeAndProtectedRoutes() {
        for (String path : new String[]{"/auth/me", "/auth/me/", "/me/dashboard", "/account"}) {
            var request = new MockHttpServletRequest("GET", path);
            request.addHeader("Authorization", "Bearer invalid");
            assertThat(security.bearerTokenResolver().resolve(request)).isEqualTo("invalid");
        }
    }

    @Test
    void worksUnderServletContextPath() {
        var request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setContextPath("/api");
        request.addHeader("Authorization", "Bearer invalid");

        assertThat(security.bearerTokenResolver().resolve(request)).isNull();
    }
}
