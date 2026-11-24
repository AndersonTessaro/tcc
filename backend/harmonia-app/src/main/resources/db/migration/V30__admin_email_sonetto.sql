UPDATE auth_user SET email = 'admin@sonetto.local'
WHERE email = 'admin@harmonia.local'
  AND NOT EXISTS (SELECT 1 FROM auth_user WHERE email = 'admin@sonetto.local');
