CREATE TABLE processed_domain_event (
    event_id      UUID PRIMARY KEY,
    event_type    VARCHAR(120) NOT NULL,
    processed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
