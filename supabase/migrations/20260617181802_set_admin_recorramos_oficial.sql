UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'recorramosmexico.oficial@gmail.com');
