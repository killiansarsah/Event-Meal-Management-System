-- =============================================================================
-- Elira Event Platform — Database Schema (Section 5)
-- Migration 0001: Create all ENUM types and tables.
-- NOTE: RLS policies are intentionally NOT created in this migration.
-- =============================================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- ENUM TYPES (created before any table that uses them)
-- =============================================================================

CREATE TYPE tenant_status AS ENUM ('active', 'suspended');

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'organizer',
  'registration_staff',
  'catering_staff',
  'finance_team'
);

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');

CREATE TYPE event_status AS ENUM ('draft', 'active', 'completed', 'cancelled');

CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'declined');

CREATE TYPE staff_invite_role AS ENUM (
  'registration_staff',
  'catering_staff',
  'finance_team'
);

CREATE TYPE staff_invite_status AS ENUM ('pending', 'accepted', 'expired');

-- =============================================================================
-- TABLE: tenants
-- (created_by FK -> users.id is added later via ALTER TABLE to break the cycle)
-- =============================================================================

CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  phone       VARCHAR(50),
  status      tenant_status NOT NULL DEFAULT 'active',
  created_by  UUID,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: users
-- id matches the Supabase Auth user id (no DEFAULT — supplied by Auth).
-- event_id FK -> events.id is added later via ALTER TABLE to break the cycle.
-- =============================================================================

CREATE TABLE users (
  id          UUID PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id),
  event_id    UUID,
  email       VARCHAR(255) NOT NULL UNIQUE,
  full_name   VARCHAR(255) NOT NULL,
  role        user_role NOT NULL,
  status      user_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: events
-- =============================================================================

CREATE TABLE events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  name                     VARCHAR(255) NOT NULL,
  date_start               DATE NOT NULL,
  date_end                 DATE NOT NULL,
  venue                    VARCHAR(500) NOT NULL,
  logo_url                 VARCHAR(500),
  payment_required         BOOLEAN NOT NULL DEFAULT TRUE,
  payment_rules            JSONB,
  status                   event_status NOT NULL DEFAULT 'draft',
  registration_link_token  VARCHAR(255) NOT NULL UNIQUE,
  created_by               UUID NOT NULL REFERENCES users(id),
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: participant_categories
-- =============================================================================

CREATE TABLE participant_categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  name              VARCHAR(100) NOT NULL,
  registration_fee  DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: meal_sessions
-- =============================================================================

CREATE TABLE meal_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        VARCHAR(100) NOT NULL,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: participants
-- =============================================================================

CREATE TABLE participants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID NOT NULL REFERENCES events(id),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  full_name          VARCHAR(255) NOT NULL,
  address            TEXT NOT NULL,
  category_id        UUID REFERENCES participant_categories(id),
  receipt_number     VARCHAR(100),
  payment_status     payment_status NOT NULL DEFAULT 'pending',
  qr_code            TEXT UNIQUE,
  registered_online  BOOLEAN NOT NULL DEFAULT FALSE,
  registered_by      UUID REFERENCES users(id),
  approved_by        UUID REFERENCES users(id),
  approved_at        TIMESTAMP,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: meal_checkins
-- UNIQUE (participant_id, session_id) prevents duplicate check-ins per session.
-- =============================================================================

CREATE TABLE meal_checkins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id   UUID NOT NULL REFERENCES participants(id),
  session_id       UUID NOT NULL REFERENCES meal_sessions(id),
  event_id         UUID NOT NULL REFERENCES events(id),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  scanned_by       UUID NOT NULL REFERENCES users(id),
  is_override      BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason  TEXT,
  scanned_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT meal_checkins_participant_session_unique UNIQUE (participant_id, session_id),
  CONSTRAINT meal_checkins_override_reason_check CHECK (
    is_override = FALSE
    OR (override_reason IS NOT NULL AND length(btrim(override_reason)) > 0)
  )
);

-- =============================================================================
-- TABLE: staff_invites
-- =============================================================================

CREATE TABLE staff_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  email       VARCHAR(255) NOT NULL,
  full_name   VARCHAR(255) NOT NULL,
  role        staff_invite_role NOT NULL,
  invited_by  UUID NOT NULL REFERENCES users(id),
  token       VARCHAR(500) NOT NULL UNIQUE,
  status      staff_invite_status NOT NULL DEFAULT 'pending',
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: audit_logs (INSERT ONLY — never updated or deleted)
-- =============================================================================

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  tenant_id    UUID REFERENCES tenants(id),
  event_id     UUID REFERENCES events(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(100),
  entity_id    UUID,
  details      JSONB,
  ip_address   VARCHAR(50),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DEFERRED FOREIGN KEYS (resolve circular references)
-- =============================================================================

ALTER TABLE tenants
  ADD CONSTRAINT tenants_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE users
  ADD CONSTRAINT users_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id);

-- =============================================================================
-- ENFORCE audit_logs IMMUTABILITY (INSERT ONLY) WITHOUT RLS
-- Block UPDATE and DELETE at the table level for every role.
-- =============================================================================

CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
