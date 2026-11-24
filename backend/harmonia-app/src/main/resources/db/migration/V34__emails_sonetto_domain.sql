-- E-mails appear in the admin users list; the product is now Sonetto. Skips any address that would collide.
UPDATE auth_user u
SET email = regexp_replace(u.email, '@harmonia\.(local|dev)$', '@sonetto.\1')
WHERE u.email ~ '@harmonia\.(local|dev)$'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user other
    WHERE other.email = regexp_replace(u.email, '@harmonia\.(local|dev)$', '@sonetto.\1')
  );
