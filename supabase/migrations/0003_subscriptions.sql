-- 0003_subscriptions.sql
-- Stripe billing state, joined onto users 1:1. Kept as columns rather than a
-- separate subscriptions table because nomad.now is one-plan-per-user — a row
-- in `users` always has at most one active subscription, and the join would
-- be needless overhead.
--
-- Grandfather clause: any user that exists when this migration runs is set to
-- plan='basic' with no Stripe IDs. They can edit their card without being
-- forced into Checkout. New users (created after migration) start with
-- plan=NULL and must complete Checkout to claim a handle.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS plan TEXT,
  -- Mirrors Stripe's subscription.status: active | past_due | canceled |
  -- incomplete | incomplete_expired | trialing | unpaid | paused.
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- One-time grandfather: keep existing demo / pre-Stripe users functional.
-- Idempotent — only sets plan when it's NULL, so re-running this migration
-- doesn't downgrade a Pro user back to Basic.
UPDATE users
  SET plan = 'basic',
      subscription_status = 'active'
  WHERE plan IS NULL;

-- Helps the webhook handler's primary lookup (stripe_customer_id → user_id).
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
