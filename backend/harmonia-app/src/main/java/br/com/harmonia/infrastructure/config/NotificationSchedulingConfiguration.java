package br.com.harmonia.infrastructure.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(name = "app.notifications.jobs.enabled", havingValue = "true", matchIfMissing = true)
public class NotificationSchedulingConfiguration {}
