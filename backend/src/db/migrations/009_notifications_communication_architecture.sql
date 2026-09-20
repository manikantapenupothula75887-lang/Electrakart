-- ElectraKart Relational Schema (PostgreSQL 16+)
-- Migration 009: Production-Ready Notification & Communication Architecture

-- ============================================================================
-- 1. EXTEND NOTIFICATIONS TABLE FOR IN-APP AUDIT & ENTITY LINKAGE
-- ============================================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- ============================================================================
-- 2. NOTIFICATION DELIVERY LOGS (EMAIL, SMS, WHATSAPP, IN-APP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY,
    notification_id TEXT REFERENCES notifications(id) ON DELETE SET NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')),
    provider VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255),
    recipient TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ')),
    attempt_count INT NOT NULL DEFAULT 1,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notif_channel ON notification_logs(notification_id, channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_provider_msg ON notification_logs(provider, provider_message_id);

-- ============================================================================
-- 3. USER NOTIFICATION CHANNEL PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')),
    event_category VARCHAR(50) NOT NULL DEFAULT 'ALL',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, channel, event_category)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
