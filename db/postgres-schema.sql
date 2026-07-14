CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'subscribed',
  source TEXT NOT NULL DEFAULT 'manual',
  last_activity_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  contact_ids TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS amp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  source_json JSONB,
  html TEXT NOT NULL,
  amp TEXT NOT NULL DEFAULT '',
  form_html TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT 'Your email client does not support HTML or AMP emails.',
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  audit_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bulk_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  subject TEXT,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT,
  template_id TEXT,
  template_slug TEXT,
  variables JSONB NOT NULL DEFAULT '{}',
  sender_email TEXT,
  reply_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bulk_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  campaign_id UUID NOT NULL REFERENCES bulk_email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  skip_reason TEXT,
  error TEXT,
  error_code TEXT,
  message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  tracking_id TEXT,
  email TEXT,
  subject TEXT,
  campaign_name TEXT,
  campaign_type TEXT,
  template_id TEXT,
  template_slug TEXT,
  template_name TEXT,
  rendered_form_html TEXT,
  message_id TEXT,
  sender_email TEXT,
  sender_provider TEXT,
  delivery_provider TEXT,
  provider_event_id TEXT,
  provider_status TEXT,
  email_type TEXT,
  event_type TEXT NOT NULL,
  is_subscribed BOOLEAN,
  clicked_url TEXT,
  clicked_domain TEXT,
  bounce_type TEXT,
  bounce_reason TEXT,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_reason TEXT,
  delivery_status_raw JSONB NOT NULL DEFAULT '{}',
  delivery_meta JSONB NOT NULL DEFAULT '{}',
  render JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  form_submission JSONB NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  form_submit_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_event_id UUID,
  tracking_id TEXT,
  email TEXT,
  subject TEXT,
  campaign_name TEXT,
  campaign_type TEXT,
  template_id TEXT,
  template_slug TEXT,
  template_name TEXT,
  message_id TEXT,
  sender_email TEXT,
  sender_provider TEXT,
  delivery_provider TEXT,
  provider_event_id TEXT,
  provider_status TEXT,
  event_type TEXT NOT NULL,
  bounce_type TEXT,
  bounce_reason TEXT,
  delivery_meta JSONB NOT NULL DEFAULT '{}',
  delivery_status_raw JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  template_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT,
  subject TEXT,
  status TEXT,
  source_json JSONB,
  html TEXT NOT NULL,
  amp TEXT NOT NULL DEFAULT '',
  form_html TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  variables TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

CREATE TABLE IF NOT EXISTS saved_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongo_id TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  block JSONB NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contacts_status_created_at_idx ON contacts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS tracking_events_email_event_type_idx ON tracking_events(email, event_type);
CREATE INDEX IF NOT EXISTS tracking_events_sender_event_created_idx ON tracking_events(sender_email, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS tracking_events_template_event_created_idx ON tracking_events(template_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS delivery_status_events_tracking_event_created_idx ON delivery_status_events(tracking_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS delivery_status_events_email_event_created_idx ON delivery_status_events(email, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS delivery_status_events_provider_event_idx ON delivery_status_events(provider_event_id);
CREATE INDEX IF NOT EXISTS bulk_email_campaigns_status_created_idx ON bulk_email_campaigns(status, created_at);
CREATE INDEX IF NOT EXISTS bulk_email_recipients_campaign_status_created_idx ON bulk_email_recipients(campaign_id, status, created_at);
CREATE INDEX IF NOT EXISTS bulk_email_recipients_email_status_idx ON bulk_email_recipients(email, status);
CREATE INDEX IF NOT EXISTS amp_templates_created_at_idx ON amp_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS amp_templates_status_created_at_idx ON amp_templates(status, created_at DESC);
CREATE INDEX IF NOT EXISTS template_versions_template_version_idx ON template_versions(template_id, version DESC);
CREATE INDEX IF NOT EXISTS saved_blocks_type_category_created_idx ON saved_blocks(type, category, created_at DESC);

-- Analytics Performance Indexes
CREATE INDEX IF NOT EXISTS tracking_events_campaign_name_event_type_idx ON tracking_events(campaign_name, event_type);
CREATE INDEX IF NOT EXISTS tracking_events_created_at_idx ON tracking_events(created_at);
CREATE INDEX IF NOT EXISTS tracking_events_campaign_type_idx ON tracking_events(campaign_type);
CREATE INDEX IF NOT EXISTS tracking_events_is_bot_idx ON tracking_events(is_bot);
CREATE INDEX IF NOT EXISTS tracking_events_render_device_idx ON tracking_events ((render->>'device'));
CREATE INDEX IF NOT EXISTS tracking_events_render_browser_idx ON tracking_events ((render->>'browser'));
CREATE INDEX IF NOT EXISTS tracking_events_render_os_idx ON tracking_events ((render->>'os'));
CREATE INDEX IF NOT EXISTS tracking_events_render_country_idx ON tracking_events ((render->>'country'));
CREATE INDEX IF NOT EXISTS tracking_events_render_city_idx ON tracking_events ((render->>'city'));

-- Tracking ID Indexes for fast distinct counts and event joins
CREATE INDEX IF NOT EXISTS tracking_events_tracking_id_idx ON tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS delivery_status_events_tracking_id_idx ON delivery_status_events(tracking_id);
CREATE INDEX IF NOT EXISTS delivery_status_events_created_at_idx ON delivery_status_events(created_at);

-- Materialized View for hourly summarized tracking events
DROP MATERIALIZED VIEW IF EXISTS tracking_events_hourly_summary CASCADE;

CREATE MATERIALIZED VIEW tracking_events_hourly_summary AS
SELECT
  DATE_TRUNC('hour', created_at) AS created_at,
  campaign_name,
  campaign_type,
  template_id,
  template_slug,
  template_name,
  sender_email,
  event_type,
  is_bot,
  COUNT(*)::int AS total_events
FROM tracking_events
GROUP BY 
  DATE_TRUNC('hour', created_at), 
  campaign_name, 
  campaign_type, 
  template_id, 
  template_slug, 
  template_name, 
  sender_email, 
  event_type, 
  is_bot;

CREATE UNIQUE INDEX IF NOT EXISTS tracking_events_hourly_summary_unique_idx 
ON tracking_events_hourly_summary(
  created_at, 
  campaign_name, 
  campaign_type, 
  template_id, 
  template_slug, 
  template_name, 
  sender_email, 
  event_type, 
  is_bot
);

CREATE INDEX IF NOT EXISTS tracking_events_hourly_summary_campaign_idx 
ON tracking_events_hourly_summary(campaign_name);

CREATE TABLE IF NOT EXISTS scanned_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page INTEGER NOT NULL,
  scanned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(page, scanned_date)
);

CREATE INDEX IF NOT EXISTS scanned_pages_date_page_idx ON scanned_pages(scanned_date, page);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR(255) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  url VARCHAR(255) NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_logs_subscription_id_idx ON webhook_logs(subscription_id);
CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx ON webhook_logs(created_at);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token);

CREATE TABLE IF NOT EXISTS sender_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  host VARCHAR(100) NOT NULL,
  port INTEGER NOT NULL,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  from_email VARCHAR(100) NOT NULL,
  from_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sender_profiles_user_id_idx ON sender_profiles(user_id);

-- Migration support for existing local tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS blocked_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Admin Blocked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blocked_emails_email_idx ON blocked_emails(email);
