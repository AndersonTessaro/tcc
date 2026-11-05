package br.com.harmonia.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// ponytail: in-memory fixed window per instance; move to Redis/Bucket4j if the API runs with several replicas.
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final String LOGIN_PATH = "/auth/login";
    private static final Set<String> LIMITED_PATHS = Set.of(LOGIN_PATH, "/auth/forgot-password", "/auth/reset-password");
    private static final long WINDOW_SECONDS = 60;
    private static final int MAX_TRACKED_KEYS = 10_000;
    // Decoded, ";params" stripped and "//" collapsed, so "/auth//login" or "/auth/%6Cogin" can't dodge the limit.
    private static final UrlPathHelper PATHS = new UrlPathHelper();

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final int maxRequestsPerWindow;
    private final Clock clock;

    public AuthRateLimitFilter(@Value("${app.security.auth-rate-limit-per-minute:10}") int maxRequestsPerWindow,
                               Clock clock) {
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.clock = clock;
    }

    private record Window(long startEpochSecond, int count) {}

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !LIMITED_PATHS.contains(path(request));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = clock.instant().getEpochSecond();
        String key = request.getRemoteAddr() + "|" + path(request);
        if (windows.size() > MAX_TRACKED_KEYS) windows.values().removeIf(w -> now - w.startEpochSecond() >= WINDOW_SECONDS);
        Window window = windows.compute(key, (k, w) -> w == null || now - w.startEpochSecond() >= WINDOW_SECONDS
            ? new Window(now, 1) : new Window(w.startEpochSecond(), w.count() + 1));

        if (window.count() <= maxRequestsPerWindow) {
            chain.doFilter(request, response);
            // Successful logins don't spend the quota: only failed guesses (brute force) do.
            if (LOGIN_PATH.equals(path(request)) && response.getStatus() < 400)
                windows.computeIfPresent(key, (k, w) -> new Window(w.startEpochSecond(), w.count() - 1));
            return;
        }
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(WINDOW_SECONDS - (now - window.startEpochSecond())));
        response.setContentType("application/json");
        response.getWriter().write("""
            {"timestamp":"%s","status":429,"code":"TOO_MANY_REQUESTS","message":"Too many attempts, try again later","fields":[]}"""
            .formatted(clock.instant()));
    }

    private static String path(HttpServletRequest request) {
        return PATHS.getLookupPathForRequest(request);
    }
}
