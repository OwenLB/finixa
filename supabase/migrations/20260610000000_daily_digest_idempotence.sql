-- Idempotence du digest quotidien : marqueur du dernier envoi par utilisateur
-- (un retry du cron dans la même fenêtre ne renvoie plus de doublon).
alter table public.user_preferences
  add column if not exists last_digest_sent_at timestamptz;
