-- =============================================================================
-- Elira Platform — Row Level Security (RLS)
-- Implements Section 6.5 (Row Level Security Policies) of the specification.
--
-- Scoping model:
--   super_admin .......... bypasses tenant isolation; can read all rows everywhere
--   organizer ............ scoped to rows where tenant_id = their own tenant_id
--   *_staff (registration/catering/finance)
--                          scoped to rows where tenant_id = their tenant_id
--                          AND event_id = their assigned event_id
--
-- audit_logs ............. INSERT allowed for any authenticated user; SELECT is
--                          tenant-scoped (super_admin reads all). No UPDATE or
--                          DELETE policy exists, so those operations are denied
--                          for everyone — including super_admin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER)
--
-- These read attributes of the currently authenticated user directly from
-- public.users. They run as the function owner and therefore bypass RLS on the
-- users table, which prevents infinite recursion when other tables' policies
-- need to look up the caller's role / tenant / event.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_event_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'super_admin';
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on ALL tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.tenants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_checkins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- tenants
-- Super Admin reads all rows. Organizer (and their staff) read only their own
-- tenant row. Only Super Admin may create/update/delete tenant rows.
-- =============================================================================

CREATE POLICY tenants_select ON public.tenants
  FOR SELECT
  USING (
    public.is_super_admin()
    OR id = public.current_user_tenant_id()
  );

CREATE POLICY tenants_super_admin_manage ON public.tenants
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =============================================================================
-- users
-- Super Admin manages all users. A user can always read their own record.
-- An Organizer can read and manage users within their own tenant.
-- =============================================================================

CREATE POLICY users_select ON public.users
  FOR SELECT
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
  );

CREATE POLICY users_super_admin_manage ON public.users
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY users_organizer_manage ON public.users
  FOR ALL
  USING (
    public.current_user_role() = 'organizer'
    AND tenant_id = public.current_user_tenant_id()
  )
  WITH CHECK (
    public.current_user_role() = 'organizer'
    AND tenant_id = public.current_user_tenant_id()
  );

-- =============================================================================
-- events
-- Super Admin: all rows. Organizer: rows in their tenant. Staff: only their
-- assigned event (matched on events.id) within their tenant.
-- =============================================================================

CREATE POLICY events_access ON public.events
  FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND id = public.current_user_event_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND id = public.current_user_event_id()
    )
  );

-- =============================================================================
-- participant_categories
-- =============================================================================

CREATE POLICY participant_categories_access ON public.participant_categories
  FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  );

-- =============================================================================
-- meal_sessions
-- =============================================================================

CREATE POLICY meal_sessions_access ON public.meal_sessions
  FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  );

-- =============================================================================
-- participants
-- =============================================================================

CREATE POLICY participants_access ON public.participants
  FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  );

-- =============================================================================
-- meal_checkins
-- =============================================================================

CREATE POLICY meal_checkins_access ON public.meal_checkins
  FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  );

-- =============================================================================
-- staff_invites
-- Organizer reads/writes only rows where tenant_id matches their own.
-- Super Admin sees all. Staff (event-scoped) may read invites for their event.
-- =============================================================================

CREATE POLICY staff_invites_access ON public.staff_invites
  FOR ALL
  USING (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
    OR (
      public.current_user_role() IN ('registration_staff', 'catering_staff', 'finance_team')
      AND tenant_id = public.current_user_tenant_id()
      AND event_id = public.current_user_event_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.current_user_role() = 'organizer'
      AND tenant_id = public.current_user_tenant_id()
    )
  );

-- =============================================================================
-- audit_logs  (INSERT ONLY)
-- SELECT: tenant-scoped; Super Admin reads all (tenant_id may be NULL for
--         platform-level actions, which only Super Admin can see).
-- INSERT: allowed for any authenticated user.
-- UPDATE / DELETE: no policy is defined, so both are denied for ALL users,
--         including Super Admin. (Table rules also block them at the SQL level.)
-- =============================================================================

CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT
  USING (
    public.is_super_admin()
    OR tenant_id = public.current_user_tenant_id()
  );

CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
