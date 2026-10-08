-- Multi-brand newsletter schema
-- Run in Supabase SQL Editor. Creates separate tables per brand.
-- Safe to re-run: uses IF NOT EXISTS.

-- Helper: create the three tables for one brand prefix
-- (subscribers, broadcasts, email_events)

DO $$
DECLARE
  prefixes TEXT[] := ARRAY[
    'aatg',
    'travel_binger',
    'doggo_digest',
    'feline_fam',
    'weather_fox',
    'discover_wild_science'
  ];
  p TEXT;
BEGIN
  FOREACH p IN ARRAY prefixes LOOP
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        status TEXT NOT NULL DEFAULT ''active'' CHECK (status IN (''active'', ''unsubscribed'', ''bounced'')),
        source_url TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        engagement_score INTEGER DEFAULT 5 CHECK (engagement_score >= 0 AND engagement_score <= 10),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )', p || '_subscribers');

    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject TEXT NOT NULL,
        preheader TEXT,
        content_html TEXT,
        content_type TEXT DEFAULT ''digest'' CHECK (content_type IN (''custom'', ''digest'')),
        status TEXT DEFAULT ''draft'' CHECK (status IN (''draft'', ''sent'')),
        recipient_count INTEGER DEFAULT 0,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )', p || '_broadcasts');

    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN (''sent'', ''delivered'', ''opened'', ''clicked'', ''bounced'', ''spam'', ''unsubscribed'')),
        resend_email_id TEXT,
        click_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )', p || '_email_events');

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (email)', 'idx_' || p || '_subs_email', p || '_subscribers');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (status)', 'idx_' || p || '_subs_status', p || '_subscribers');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (created_at)', 'idx_' || p || '_subs_created', p || '_subscribers');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (email)', 'idx_' || p || '_events_email', p || '_email_events');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (event_type)', 'idx_' || p || '_events_type', p || '_email_events');

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p || '_subscribers');
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p || '_broadcasts');
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p || '_email_events');
  END LOOP;
END $$;

-- Migrate legacy single-brand tables into AATG tables (if they exist and AATG is empty)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscribers'
  ) THEN
    IF (SELECT COUNT(*) FROM aatg_subscribers) = 0 THEN
      INSERT INTO aatg_subscribers
      SELECT * FROM subscribers
      ON CONFLICT (email) DO NOTHING;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'broadcasts'
  ) THEN
    IF (SELECT COUNT(*) FROM aatg_broadcasts) = 0 THEN
      INSERT INTO aatg_broadcasts
      SELECT * FROM broadcasts;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_events'
  ) THEN
    IF (SELECT COUNT(*) FROM aatg_email_events) = 0 THEN
      INSERT INTO aatg_email_events
      SELECT * FROM email_events;
    END IF;
  END IF;
END $$;

-- ============================================================
-- AMG Newsletter Hub: users, brand access, automation schedules
-- ============================================================

CREATE TABLE IF NOT EXISTS hub_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hub_user_brands (
  user_id UUID NOT NULL REFERENCES hub_users(id) ON DELETE CASCADE,
  brand_slug TEXT NOT NULL,
  PRIMARY KEY (user_id, brand_slug)
);

CREATE TABLE IF NOT EXISTS brand_schedules (
  brand_slug TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- 0=Sunday ... 6=Saturday (UTC)
  day_of_week INTEGER NOT NULL DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  hour_utc INTEGER NOT NULL DEFAULT 14 CHECK (hour_utc BETWEEN 0 AND 23),
  last_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_users_email ON hub_users(email);
CREATE INDEX IF NOT EXISTS idx_hub_user_brands_user ON hub_user_brands(user_id);

ALTER TABLE hub_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_user_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_schedules ENABLE ROW LEVEL SECURITY;

-- Seed default schedules (disabled until turned on in the hub)
INSERT INTO brand_schedules (brand_slug, enabled, day_of_week, hour_utc)
VALUES
  ('animals-around-the-globe', FALSE, 1, 14),
  ('travel-binger', FALSE, 2, 14),
  ('doggo-digest', FALSE, 3, 14),
  ('feline-fam', FALSE, 4, 14),
  ('weather-fox', FALSE, 5, 14),
  ('discover-wild-science', FALSE, 1, 15)
ON CONFLICT (brand_slug) DO NOTHING;
