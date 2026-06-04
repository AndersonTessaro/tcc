CREATE TABLE financial_transaction (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(10) NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL,
    description VARCHAR(255),
    category    VARCHAR(80),
    date        DATE NOT NULL,
    student_id  UUID REFERENCES student(id),
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_financial_transaction_date ON financial_transaction(date);
