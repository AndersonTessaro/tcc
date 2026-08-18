package br.com.harmonia.infrastructure.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.converter.RsaKeyConverters;
import org.springframework.security.oauth2.jwt.*;

import java.io.IOException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

@Configuration
public class JwtConfig {
    private final RSAPublicKey publicKey;
    private final RSAPrivateKey privateKey;

    public JwtConfig(RsaKeyProperties keys) throws IOException {
        this.publicKey = RsaKeyConverters.x509().convert(keys.publicKey().getInputStream());
        this.privateKey = RsaKeyConverters.pkcs8().convert(keys.privateKey().getInputStream());
    }

    @Bean
    JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withPublicKey(publicKey).build();
    }

    @Bean
    JwtEncoder jwtEncoder() {
        var jwk = new RSAKey.Builder(publicKey).privateKey(privateKey).build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwk)));
    }
}
