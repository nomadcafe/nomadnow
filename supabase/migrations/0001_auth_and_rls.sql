-- Migration 0001: Auth + real RLS policies
--
-- Replaces the placeholder `USING (true)` policies with real owner-checks via auth.uid().
-- Apply in Supabase SQL editor after the initial schema.sql.
--
-- Idempotent: drops old policies by name before recreating.
--
-- Important: this migration does NOT add a foreign key from public.users.id to auth.users.
-- Ownership is enforced by RLS (auth.uid() = id) rather than at the DB level. This keeps
-- service-role operations (seed.sql, admin backfills) unconstrained.

-- ============================================================================
-- Drop old "allow everything" policies
-- ============================================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Public revenues are viewable by everyone" ON revenues;
DROP POLICY IF EXISTS "Public milestones are viewable by everyone" ON milestones;
DROP POLICY IF EXISTS "Public social accounts are viewable by everyone" ON social_accounts;
DROP POLICY IF EXISTS "Public social metrics are viewable by everyone" ON social_metrics;
DROP POLICY IF EXISTS "Public nomad links are viewable by everyone" ON nomad_links;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- ============================================================================
-- users
-- ============================================================================

CREATE POLICY "users_select_public" ON users
  FOR SELECT USING (true);

CREATE POLICY "users_insert_self" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_self" ON users
  FOR DELETE USING (auth.uid() = id);

-- ============================================================================
-- projects
-- ============================================================================

CREATE POLICY "projects_select_public" ON projects
  FOR SELECT USING (true);

CREATE POLICY "projects_insert_owner" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_owner" ON projects
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_owner" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- revenues (owned via project)
-- ============================================================================

CREATE POLICY "revenues_select_public" ON revenues
  FOR SELECT USING (true);

CREATE POLICY "revenues_insert_owner" ON revenues
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = revenues.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "revenues_update_owner" ON revenues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = revenues.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "revenues_delete_owner" ON revenues
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = revenues.project_id AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- milestones (owned via project)
-- ============================================================================

CREATE POLICY "milestones_select_public" ON milestones
  FOR SELECT USING (true);

CREATE POLICY "milestones_insert_owner" ON milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "milestones_update_owner" ON milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "milestones_delete_owner" ON milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- profile_settings
-- ============================================================================

CREATE POLICY "profile_settings_select_public" ON profile_settings
  FOR SELECT USING (true);

CREATE POLICY "profile_settings_insert_self" ON profile_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_settings_update_self" ON profile_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_settings_delete_self" ON profile_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- social_accounts
-- ============================================================================

CREATE POLICY "social_accounts_select_public" ON social_accounts
  FOR SELECT USING (true);

CREATE POLICY "social_accounts_insert_self" ON social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "social_accounts_update_self" ON social_accounts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "social_accounts_delete_self" ON social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- social_metrics (owned via social_account)
-- ============================================================================

CREATE POLICY "social_metrics_select_public" ON social_metrics
  FOR SELECT USING (true);

CREATE POLICY "social_metrics_insert_owner" ON social_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_accounts
      WHERE social_accounts.id = social_metrics.social_account_id
        AND social_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "social_metrics_delete_owner" ON social_metrics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM social_accounts
      WHERE social_accounts.id = social_metrics.social_account_id
        AND social_accounts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- nomad_links
-- ============================================================================

CREATE POLICY "nomad_links_select_public" ON nomad_links
  FOR SELECT USING (true);

CREATE POLICY "nomad_links_insert_self" ON nomad_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "nomad_links_update_self" ON nomad_links
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "nomad_links_delete_self" ON nomad_links
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Rollback (for reference, run manually if needed)
-- ============================================================================
-- DROP POLICY ... and recreate the original USING (true) policies from schema.sql.
