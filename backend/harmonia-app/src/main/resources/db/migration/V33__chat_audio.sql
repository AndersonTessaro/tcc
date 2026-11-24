ALTER TABLE chat_message ADD COLUMN audio_path VARCHAR(1000);
ALTER TABLE chat_message ADD COLUMN audio_content_type VARCHAR(100);
ALTER TABLE chat_message ADD COLUMN audio_size_bytes BIGINT;
