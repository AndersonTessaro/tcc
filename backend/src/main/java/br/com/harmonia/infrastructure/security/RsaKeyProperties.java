package br.com.harmonia.infrastructure.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.io.Resource;

@ConfigurationProperties(prefix = "app.rsa")
public record RsaKeyProperties(Resource publicKey, Resource privateKey) {
}
