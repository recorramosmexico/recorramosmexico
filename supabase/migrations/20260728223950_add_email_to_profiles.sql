ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
INSERT INTO public.profiles (id, full_name, email)
VALUES (
NEW.id,
COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
NEW.email
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;
RETURN NEW;
END;
$function$;
