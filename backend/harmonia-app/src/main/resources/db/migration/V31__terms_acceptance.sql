ALTER TABLE auth_user ADD COLUMN terms_version VARCHAR(20);
ALTER TABLE auth_user ADD COLUMN terms_accepted_at TIMESTAMP;
