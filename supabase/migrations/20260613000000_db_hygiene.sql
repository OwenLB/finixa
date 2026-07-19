-- ============================================================================
-- Hygiène DB
--
-- 1. Index couvrants sur les FK non indexées (advisor 0001).
-- 2. search_path épinglé sur les 3 fonctions restantes (advisor 0011).
-- 3. REVOKE EXECUTE ... FROM anon sur les fonctions SECURITY DEFINER : elles
--    filtrent déjà par auth.uid() (pas de fuite), mais inutile de les exposer
--    au rôle anonyme (advisors 0028).
-- 4. Suppression de la policy dupliquée sur budget_envelopes (advisor 0006).
-- 5. Réécriture des policies RLS avec (select auth.uid()) — évite la
--    réévaluation par ligne (advisor 0003).
-- ============================================================================

-- ── 1. Index couvrants sur les FK ───────────────────────────────────────────
create index if not exists idx_push_subscriptions_user_id   on public.push_subscriptions (user_id);
create index if not exists idx_recurring_transactions_user_id on public.recurring_transactions (user_id);
create index if not exists idx_savings_goals_user_id         on public.savings_goals (user_id);
create index if not exists idx_savings_goals_subcategory_id  on public.savings_goals (subcategory_id);
create index if not exists idx_user_api_keys_user_id         on public.user_api_keys (user_id);

-- NB : pas d'index d'expression sur COALESCE(accounting_date, date::date) —
-- le cast timestamptz::date est STABLE (dépend du fuseau), donc non indexable.
-- idx_transactions_date (user_id, date desc) du baseline couvre l'essentiel.

-- ── 2. search_path épinglé sur les 3 fonctions restantes ────────────────────
alter function public.bulk_check_transactions(uuid[]) set search_path = public;
alter function public.get_category_budgets()          set search_path = public;
alter function public.get_budget_totals()             set search_path = public;

-- ── 3. Restreindre les fonctions SECURITY DEFINER au rôle authenticated ─────
-- EXECUTE est accordé à PUBLIC par défaut (anon en hérite) : on révoque de
-- PUBLIC puis on accorde explicitement à authenticated. Ces fonctions filtrent
-- déjà par auth.uid() (anon n'obtiendrait rien), c'est de la défense en profondeur.
revoke execute on function public.bulk_check_transactions(uuid[])       from public, anon;
revoke execute on function public.get_category_suggestions_bulk(text[])  from public, anon;
revoke execute on function public.get_label_suggestions(text, integer)   from public, anon;
revoke execute on function public.get_savings_goal_history(uuid)         from public, anon;
revoke execute on function public.get_savings_goals_progress()           from public, anon;
revoke execute on function public.reset_account_data()                   from public, anon;

grant execute on function public.bulk_check_transactions(uuid[])       to authenticated;
grant execute on function public.get_category_suggestions_bulk(text[])  to authenticated;
grant execute on function public.get_label_suggestions(text, integer)   to authenticated;
grant execute on function public.get_savings_goal_history(uuid)         to authenticated;
grant execute on function public.get_savings_goals_progress()           to authenticated;
grant execute on function public.reset_account_data()                   to authenticated;

-- ── 4 & 5. Policies RLS : dédup + (select auth.uid()) ───────────────────────
drop policy if exists "Users can manage their own envelopes" on public.budget_envelopes;
drop policy if exists "Users manage own envelopes"           on public.budget_envelopes;
create policy "Users manage own envelopes" on public.budget_envelopes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users manage own categories" on public.categories;
create policy "users manage own categories" on public.categories
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users manage own subcategories" on public.subcategories;
create policy "users manage own subcategories" on public.subcategories
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users manage own transactions" on public.transactions;
create policy "users manage own transactions" on public.transactions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences" on public.user_preferences
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recurring transactions" on public.recurring_transactions;
create policy "Users can manage own recurring transactions" on public.recurring_transactions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own favorites" on public.favorites;
create policy "Users can manage their own favorites" on public.favorites
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "savings_goals_user_policy" on public.savings_goals;
create policy "savings_goals_user_policy" on public.savings_goals
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage their own API keys" on public.user_api_keys;
create policy "Users can manage their own API keys" on public.user_api_keys
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
