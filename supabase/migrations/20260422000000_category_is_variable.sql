ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_variable boolean NOT NULL DEFAULT false;
