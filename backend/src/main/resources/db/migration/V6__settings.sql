CREATE TABLE setting (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       VARCHAR(1000) NOT NULL,
    description VARCHAR(255),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
