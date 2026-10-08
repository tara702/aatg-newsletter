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
