ALTER TABLE practice
    ADD COLUMN recording_file_name    VARCHAR(255),
    ADD COLUMN recording_storage_path VARCHAR(500),
    ADD COLUMN recording_content_type VARCHAR(120),
    ADD COLUMN recording_size_bytes   BIGINT,
    ADD COLUMN recording_uploaded_at  TIMESTAMP;

ALTER TABLE practice ADD CONSTRAINT ck_practice_recording_complete CHECK (
    (recording_storage_path IS NULL AND recording_file_name IS NULL AND recording_content_type IS NULL
        AND recording_size_bytes IS NULL AND recording_uploaded_at IS NULL)
    OR
    (recording_storage_path IS NOT NULL AND recording_file_name IS NOT NULL AND recording_content_type IS NOT NULL
        AND recording_size_bytes > 0 AND recording_uploaded_at IS NOT NULL)
);
