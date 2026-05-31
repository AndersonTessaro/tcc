CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE auth_role (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE auth_permission (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE auth_role_permissions (
    role_id        BIGINT NOT NULL REFERENCES auth_role(id) ON DELETE CASCADE,
    permissions_id BIGINT NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permissions_id)
);

CREATE TABLE auth_user (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(100) NOT NULL UNIQUE,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password       VARCHAR(100) NOT NULL,
    display_name   VARCHAR(150),
    ativo          BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE auth_user_roles (
    user_id  UUID   NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    roles_id BIGINT NOT NULL REFERENCES auth_role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, roles_id)
);

CREATE TABLE auth_refresh_token (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id    UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP
);
CREATE INDEX idx_refresh_token_hash ON auth_refresh_token(token_hash);

CREATE TABLE auth_password_reset_token (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id    UUID NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE
);
