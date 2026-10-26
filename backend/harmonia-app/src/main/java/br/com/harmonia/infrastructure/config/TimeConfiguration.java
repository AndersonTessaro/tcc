package br.com.harmonia.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration(proxyBeanMethods = false)
public class TimeConfiguration {
    @Bean
    Clock applicationClock(@Value("${app.notifications.zone:America/Sao_Paulo}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
