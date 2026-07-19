#!/usr/bin/env bash
#
# Seed d'un utilisateur de test + données minimales sur la stack Supabase LOCALE,
# pour les parcours E2E authentifiés (Playwright). À lancer APRÈS `supabase start`.
#
# Variables attendues (cf. `supabase status -o env`) :
#   API_URL            ex. http://127.0.0.1:54321
#   SERVICE_ROLE_KEY   clé service_role (admin) de la stack locale
#   DB_URL             chaîne de connexion postgres
#
# Usage local :
#   set -a; eval "$(supabase status -o env)"; set +a
#   bash scripts/seed-e2e.sh
set -euo pipefail

EMAIL="e2e@finixa.test"
PASSWORD="e2e-password-123"

API_URL="${API_URL:?API_URL manquant (lancer supabase status -o env avant)}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-${SECRET_KEY:-}}"
DB_URL="${DB_URL:?DB_URL manquant}"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "SERVICE_ROLE_KEY/SECRET_KEY manquant — impossible d'appeler l'API admin." >&2
  exit 1
fi

# 1) Utilisateur confirmé via l'API admin Auth : GoTrue gère le hash bcrypt et
#    l'identité email, garantissant un compte réellement connectable (vs un
#    INSERT SQL fragile dans auth.users).
resp=$(curl -s -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}")

uid=$(printf '%s' "$resp" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null || true)

# Rerun (utilisateur déjà présent) : on récupère son id existant.
if [ -z "$uid" ]; then
  uid=$(psql "$DB_URL" -tAc "select id from auth.users where email = '$EMAIL' limit 1;" | tr -d '[:space:]')
fi

if [ -z "$uid" ]; then
  echo "Echec de creation/recuperation du compte de test. Reponse API : $resp" >&2
  exit 1
fi
echo "Utilisateur de test : $uid"

# 2) Préférences (onboarding terminé → l'app va direct au dashboard) + des
#    transaction déterministes pour les parcours E2E (recherche/filtre/période).
#    `do update` FORCE onboarding_completed=true même si une ligne par défaut a
#    déjà été créée (sinon l'app redirige vers /onboarding).
#    - « E2E Café »    : dépense, mois courant, NON pointée  (pending)
#    - « E2E Salaire » : revenu (+), mois courant, POINTÉE   (checked)
#    - « E2E Loyer »   : dépense, MOIS DERNIER               (hors période courante)
psql "$DB_URL" -v ON_ERROR_STOP=1 \
  -c "insert into public.user_preferences (user_id, onboarding_completed)
      values ('$uid', true)
      on conflict (user_id) do update set onboarding_completed = true;" \
  -c "insert into public.transactions (user_id, name, category, amount, date, type, status, categorized, hors_budget)
      values
        ('$uid', 'E2E Café',    '',          -4.50,  now(),                    'depense', 'pending', false, false),
        ('$uid', 'E2E Salaire', 'Revenus',  2000.00, now(),                    'revenu',  'checked', true,  false),
        ('$uid', 'E2E Loyer',   'Logement', -800.00, now() - interval '1 month','depense', 'pending', true,  false)
      on conflict do nothing;"

echo "Vérification user_preferences :"
psql "$DB_URL" -tAc "select user_id, onboarding_completed from public.user_preferences where user_id = '$uid';"

echo "Seed E2E terminé."
