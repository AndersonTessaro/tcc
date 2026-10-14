UPDATE practice p
SET notes = s.activity, difficulty = s.difficulty, rating = s.rating
FROM (
    SELECT id, rating,
           nullif(btrim((regexp_match(rest, '(^|;[[:space:]]*)Dificuldade:[[:space:]]*(.*)$'))[2]), '') AS difficulty,
           nullif(btrim(regexp_replace(rest, '(^|;[[:space:]]*)Dificuldade:.*$', '')), '')            AS activity
    FROM (
        SELECT id,
               (regexp_match(notes, '(^|;[[:space:]]*)Avaliação: ([1-5])/5$'))[2]::int AS rating,
               regexp_replace(notes, '(^|;[[:space:]]*)Avaliação: [1-5]/5$', '')      AS rest
        FROM practice
        WHERE difficulty IS NULL AND rating IS NULL
          AND notes ~ '(^|;[[:space:]]*)(Avaliação: [1-5]/5$|Dificuldade:)'
    ) legacy
) s
WHERE p.id = s.id
  AND coalesce(length(s.difficulty), 0) <= 255;
