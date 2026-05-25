-- social_metrics had INSERT + DELETE policies but no UPDATE policy. With RLS
-- enabled, the absence of an UPDATE policy means no end-user role can update
-- (Postgres defaults to deny) — so this is not currently exploitable. But
-- it's a correctness gap: legitimate owners couldn't mutate their own rows,
-- and the table shape diverged from the other owned-via-FK tables (revenues,
-- milestones), which makes it easy for a future contributor to "fix" the gap
-- by adding a permissive policy and accidentally widening access. Make the
-- intent explicit with an owner-only UPDATE policy.
CREATE POLICY "social_metrics_update_owner" ON social_metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM social_accounts
      WHERE social_accounts.id = social_metrics.social_account_id
        AND social_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_accounts
      WHERE social_accounts.id = social_metrics.social_account_id
        AND social_accounts.user_id = auth.uid()
    )
  );
