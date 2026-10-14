ALTER TABLE practice
    ADD COLUMN difficulty VARCHAR(255),
    ADD COLUMN rating     INT CONSTRAINT ck_practice_rating CHECK (rating BETWEEN 1 AND 5);
