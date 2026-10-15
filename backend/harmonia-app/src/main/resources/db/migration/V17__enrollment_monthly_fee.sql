ALTER TABLE enrollment ADD COLUMN monthly_fee NUMERIC(10,2)
    CHECK (monthly_fee IS NULL OR monthly_fee >= 0);
