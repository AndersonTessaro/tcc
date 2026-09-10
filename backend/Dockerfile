# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build: the whole Maven reactor (lesson-core -> harmonia-app).
# Tests are skipped here on purpose - CI is what runs them (see docs/ci.md).
# ---------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-25-alpine AS build

WORKDIR /build
COPY pom.xml ./
COPY lesson-core lesson-core
COPY harmonia-app harmonia-app

RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -DskipTests package \
 && mv harmonia-app/target/harmonia-app-*.jar /build/app.jar

# ---------------------------------------------------------------------------
# Runtime: JRE only, unprivileged user.
# ---------------------------------------------------------------------------
FROM eclipse-temurin:25-jre-alpine AS runtime

# openssl is only needed for the HARMONIA_DEV_KEYS escape hatch in the entrypoint.
RUN apk add --no-cache openssl \
 && addgroup -S harmonia \
 && adduser -S -G harmonia harmonia

WORKDIR /app
COPY --from=build /build/app.jar app.jar
COPY --chmod=0755 scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /app/certs /app/storage && chown -R harmonia:harmonia /app

USER harmonia
EXPOSE 8080

# Materials/attachments (RNF08) live outside the image - mount a volume here.
ENV APP_STORAGE_LOCAL_DIR=/app/storage

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["java", "-jar", "/app/app.jar"]
