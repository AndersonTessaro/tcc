DO $$
DECLARE
    fk RECORD;
    definition TEXT;
    action TEXT;
BEGIN
    FOR fk IN
        SELECT c.conname, c.conrelid::regclass AS table_name, pg_get_constraintdef(c.oid) AS definition,
               (c.conrelid = 'goal'::regclass AND a.attname = 'created_by_teacher_id')
               OR (c.conrelid = 'enrollment'::regclass AND a.attname = 'class_group_id')
               OR (c.conrelid = 'financial_transaction'::regclass AND a.attname = 'student_id') AS preserved_reference
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'f'
          AND c.confrelid IN ('auth_user'::regclass, 'student'::regclass, 'teacher'::regclass,
                             'enrollment'::regclass, 'lesson'::regclass, 'practice'::regclass, 'class_group'::regclass)
    LOOP
        action := CASE WHEN fk.preserved_reference THEN 'SET NULL' ELSE 'CASCADE' END;
        definition := regexp_replace(fk.definition, ' ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)', '');
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.table_name, fk.conname);
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON DELETE %s',
                       fk.table_name, fk.conname, definition, action);
    END LOOP;
END $$;
