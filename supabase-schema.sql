-- Run this in your Supabase SQL Editor
-- Go to: supabase.com → your project → SQL Editor → New query → paste and run

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source_url TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  engagement_score INTEGER DEFAULT 5 CHECK (engagement_score >= 0 AND engagement_score <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  preheader TEXT,
  content_html TEXT,
  content_type TEXT DEFAULT 'custom' CHECK (content_type IN ('custom', 'digest')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  recipient_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email events table
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam', 'unsubscribed')),
  resend_email_id TEXT,
  click_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily growth function for analytics
CREATE OR REPLACE FUNCTION get_daily_growth(days INTEGER DEFAULT 30)
RETURNS TABLE(date TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(d.day, 'MM/DD') as date,
    COUNT(s.id) as count
  FROM generate_series(
    CURRENT_DATE - (days || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d(day)
  LEFT JOIN subscribers s ON DATE(s.created_at) = d.day AND s.status = 'active'
  GROUP BY d.day
  ORDER BY d.day;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_created ON subscribers(created_at);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);

-- Enable Row Level Security
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by the app backend)
CREATE POLICY "Service role full access on subscribers" ON subscribers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on broadcasts" ON broadcasts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on email_events" ON email_events
  FOR ALL USING (auth.role() = 'service_role');
