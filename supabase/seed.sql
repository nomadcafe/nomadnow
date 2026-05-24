-- Seed data for development and demo purposes
-- This file contains sample data to showcase the platform

-- Insert sample users
INSERT INTO users (handle, display_name, bio, location, website, avatar_url, country)
VALUES
  ('demo', 'Demo Creator', 'Indie maker sharing my journey. Building products that matter.', 'San Francisco, CA', 'https://example.com', 'https://i.pravatar.cc/150?img=1', 'USA'),
  ('alice', 'Alice Chen', 'Full-stack developer and indie hacker. Sharing my MRR journey transparently.', 'New York, NY', 'https://alice.dev', 'https://i.pravatar.cc/150?img=5', 'USA'),
  ('bob', 'Bob Smith', 'SaaS founder documenting revenue growth. Building in public.', 'London, UK', 'https://bob.io', 'https://i.pravatar.cc/150?img=12', 'UK'),
  ('charlie', 'Charlie Brown', 'Product designer turned indie maker. Tracking my side projects.', 'Berlin, Germany', 'https://charlie.design', 'https://i.pravatar.cc/150?img=15', 'Germany')
ON CONFLICT (handle) DO NOTHING;

-- Get user IDs (assuming they exist or were just created)
DO $$
DECLARE
  demo_user_id UUID;
  alice_user_id UUID;
  bob_user_id UUID;
  charlie_user_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO demo_user_id FROM users WHERE handle = 'demo';
  SELECT id INTO alice_user_id FROM users WHERE handle = 'alice';
  SELECT id INTO bob_user_id FROM users WHERE handle = 'bob';
  SELECT id INTO charlie_user_id FROM users WHERE handle = 'charlie';

  -- Insert sample projects for demo user
  IF demo_user_id IS NOT NULL THEN
    INSERT INTO projects (user_id, name, slug, summary, tags, started_at, status)
    VALUES
      (demo_user_id, 'TaskFlow', 'taskflow', 'A simple task management app for teams', ARRAY['productivity', 'saas', 'web'], '2023-01-15', 'active'),
      (demo_user_id, 'CodeSnippets', 'codesnippets', 'Share and discover code snippets', ARRAY['developer-tools', 'open-source'], '2023-06-01', 'active'),
      (demo_user_id, 'DesignHub', 'designhub', 'Design resources marketplace', ARRAY['design', 'marketplace'], '2024-01-10', 'active')
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Insert sample revenues for demo user's projects
    -- TaskFlow revenues (last 12 months)
    INSERT INTO revenues (project_id, month, mrr_cents, oneoff_cents, currency)
    SELECT 
      p.id,
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * generate_series)::DATE,
      (5000 + (random() * 2000)::int) * 100, -- MRR between $50-$70
      CASE WHEN random() > 0.7 THEN (random() * 500)::int * 100 ELSE 0 END, -- One-off revenue
      'USD'
    FROM projects p
    CROSS JOIN generate_series(0, 11)
    WHERE p.user_id = demo_user_id AND p.slug = 'taskflow'
    ON CONFLICT (project_id, month) DO NOTHING;

    -- CodeSnippets revenues
    INSERT INTO revenues (project_id, month, mrr_cents, oneoff_cents, currency)
    SELECT 
      p.id,
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * generate_series)::DATE,
      (2000 + (random() * 1500)::int) * 100, -- MRR between $20-$35
      CASE WHEN random() > 0.8 THEN (random() * 300)::int * 100 ELSE 0 END,
      'USD'
    FROM projects p
    CROSS JOIN generate_series(0, 11)
    WHERE p.user_id = demo_user_id AND p.slug = 'codesnippets'
    ON CONFLICT (project_id, month) DO NOTHING;

    -- DesignHub revenues (newer project, fewer months)
    INSERT INTO revenues (project_id, month, mrr_cents, oneoff_cents, currency)
    SELECT 
      p.id,
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * generate_series)::DATE,
      (1000 + (random() * 1000)::int) * 100, -- MRR between $10-$20
      CASE WHEN random() > 0.75 THEN (random() * 200)::int * 100 ELSE 0 END,
      'USD'
    FROM projects p
    CROSS JOIN generate_series(0, 5)
    WHERE p.user_id = demo_user_id AND p.slug = 'designhub'
    ON CONFLICT (project_id, month) DO NOTHING;

    -- Insert sample milestones
    INSERT INTO milestones (project_id, happened_at, title, note)
    SELECT 
      p.id,
      CURRENT_DATE - INTERVAL '1 month' * (random() * 12)::int,
      CASE 
        WHEN random() > 0.7 THEN 'First 100 users'
        WHEN random() > 0.4 THEN 'Product Launch'
        ELSE 'Revenue Milestone'
      END,
      CASE 
        WHEN random() > 0.5 THEN 'Reached an important milestone in our journey'
        ELSE NULL
      END
    FROM projects p
    WHERE p.user_id = demo_user_id
    LIMIT 10
    ON CONFLICT DO NOTHING;

    -- Insert social accounts
    INSERT INTO social_accounts (user_id, platform, handle, url, is_verified)
    VALUES
      (demo_user_id, 'x', '@democreator', 'https://x.com/democreator', false),
      (demo_user_id, 'github', 'democreator', 'https://github.com/democreator', false)
    ON CONFLICT (user_id, platform) DO NOTHING;

    -- Insert social metrics
    INSERT INTO social_metrics (social_account_id, followers_count, following_count, posts_count, source)
    SELECT 
      sa.id,
      (5000 + (random() * 2000)::int),
      (200 + (random() * 100)::int),
      (100 + (random() * 50)::int),
      'user_report'
    FROM social_accounts sa
    WHERE sa.user_id = demo_user_id AND sa.platform = 'x'
    LIMIT 1
    ON CONFLICT DO NOTHING;

    -- Insert profile settings
    INSERT INTO profile_settings (user_id, layout_template, theme_color, enabled_sections, section_order)
    VALUES
      (demo_user_id, 'centered', 'blue', 
       ARRAY['header', 'revenue', 'projects', 'chart', 'milestones'],
       ARRAY['header', 'revenue', 'projects', 'chart', 'milestones'])
    ON CONFLICT (user_id) DO UPDATE SET
      layout_template = EXCLUDED.layout_template,
      theme_color = EXCLUDED.theme_color,
      enabled_sections = EXCLUDED.enabled_sections,
      section_order = EXCLUDED.section_order;
  END IF;

  -- Insert sample projects for alice
  IF alice_user_id IS NOT NULL THEN
    INSERT INTO projects (user_id, name, slug, summary, tags, started_at, status)
    VALUES
      (alice_user_id, 'DevTools Pro', 'devtools-pro', 'Developer productivity suite', ARRAY['dev-tools', 'saas'], '2023-03-01', 'active')
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Insert sample revenues
    INSERT INTO revenues (project_id, month, mrr_cents, oneoff_cents, currency)
    SELECT 
      p.id,
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * generate_series)::DATE,
      (8000 + (random() * 3000)::int) * 100,
      0,
      'USD'
    FROM projects p
    CROSS JOIN generate_series(0, 11)
    WHERE p.user_id = alice_user_id AND p.slug = 'devtools-pro'
    ON CONFLICT (project_id, month) DO NOTHING;
  END IF;

  -- Insert sample projects for bob
  IF bob_user_id IS NOT NULL THEN
    INSERT INTO projects (user_id, name, slug, summary, tags, started_at, status)
    VALUES
      (bob_user_id, 'SaaS Analytics', 'saas-analytics', 'Analytics dashboard for SaaS metrics', ARRAY['analytics', 'saas'], '2023-05-15', 'active')
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Insert sample revenues
    INSERT INTO revenues (project_id, month, mrr_cents, oneoff_cents, currency)
    SELECT 
      p.id,
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * generate_series)::DATE,
      (12000 + (random() * 4000)::int) * 100,
      CASE WHEN random() > 0.6 THEN (random() * 1000)::int * 100 ELSE 0 END,
      'USD'
    FROM projects p
    CROSS JOIN generate_series(0, 11)
    WHERE p.user_id = bob_user_id AND p.slug = 'saas-analytics'
    ON CONFLICT (project_id, month) DO NOTHING;
  END IF;

END $$;

-- Mark all users as active
UPDATE users SET status = 'active' WHERE handle IN ('demo', 'alice', 'bob', 'charlie');




