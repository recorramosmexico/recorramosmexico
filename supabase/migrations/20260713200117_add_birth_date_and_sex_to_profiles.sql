ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer_not_to_say'));
