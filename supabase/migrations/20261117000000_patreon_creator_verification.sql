-- Creator credentials and campaign observations never enter public.* data exports.
CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault CASCADE;
CREATE SCHEMA IF NOT EXISTS wg_patreon_private;
REVOKE ALL ON SCHEMA wg_patreon_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS wg_patreon_private.creator (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  secret_id uuid NOT NULL,
  pilot_users uuid[] NOT NULL DEFAULT '{}',
  all_accounts boolean NOT NULL DEFAULT false,
  members jsonb NOT NULL DEFAULT '{}',
  unidentified boolean NOT NULL DEFAULT true,
  observed_at timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  refresh_pending boolean NOT NULL DEFAULT false
);
ALTER TABLE wg_patreon_private.creator ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wg_patreon_private.creator FROM PUBLIC, anon, authenticated, service_role;

-- Bootstrap is one-use. It cannot overwrite a rotated grant or enable any patron.
CREATE OR REPLACE FUNCTION public.patreon_creator_initialize(p_tokens jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE secret_id uuid;
BEGIN
  IF jsonb_typeof(p_tokens) IS DISTINCT FROM 'object'
     OR coalesce(length(p_tokens->>'access_token'),0) < 1
     OR coalesce(length(p_tokens->>'refresh_token'),0) < 1
     OR coalesce(length(p_tokens->>'client_id'),0) < 1 THEN
    RAISE EXCEPTION 'Invalid creator credential' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(4805226,2);
  IF EXISTS (SELECT 1 FROM wg_patreon_private.creator) THEN RETURN false; END IF;
  SELECT vault.create_secret(p_tokens::text, 'wg_patreon_v2_creator', 'WG campaign verification; rotated by fenced service RPC') INTO secret_id;
  INSERT INTO wg_patreon_private.creator(secret_id) VALUES(secret_id);
  RETURN true;
END $$;

-- Lease covers the whole bounded scan. An ambiguous exchange blocks further refreshes.
CREATE OR REPLACE FUNCTION public.patreon_creator_acquire(p_lease uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE state wg_patreon_private.creator; tokens jsonb;
BEGIN
  IF p_lease IS NULL THEN RETURN null; END IF;
  UPDATE wg_patreon_private.creator SET lease_id=p_lease,lease_until=clock_timestamp()+interval '3 minutes'
    WHERE singleton AND NOT refresh_pending AND (lease_until IS NULL OR lease_until < clock_timestamp())
    RETURNING * INTO state;
  IF NOT FOUND THEN RETURN null; END IF;
  SELECT decrypted_secret::jsonb INTO STRICT tokens FROM vault.decrypted_secrets WHERE id=state.secret_id;
  RETURN tokens;
END $$;

CREATE OR REPLACE FUNCTION public.patreon_creator_begin_refresh(p_lease uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE wg_patreon_private.creator SET refresh_pending=true
    WHERE singleton AND lease_id=p_lease AND lease_until>clock_timestamp() AND NOT refresh_pending;
  RETURN FOUND;
END $$;

-- Save a rotated pair before further provider I/O. Repeating this same save is safe;
-- the refresh exchange itself is never retried. A pending refresh prevents lease theft.
CREATE OR REPLACE FUNCTION public.patreon_creator_save(p_lease uuid,p_tokens jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE state wg_patreon_private.creator; previous jsonb;
BEGIN
  SELECT * INTO state FROM wg_patreon_private.creator WHERE singleton AND lease_id=p_lease FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT decrypted_secret::jsonb INTO STRICT previous FROM vault.decrypted_secrets WHERE id=state.secret_id;
  IF p_tokens->>'client_id' IS DISTINCT FROM previous->>'client_id'
     OR coalesce(length(p_tokens->>'access_token'),0)<1
     OR coalesce(length(p_tokens->>'refresh_token'),0)<1 THEN
    RAISE EXCEPTION 'Invalid creator credential' USING ERRCODE='22023';
  END IF;
  IF NOT state.refresh_pending AND p_tokens IS DISTINCT FROM previous THEN RETURN false; END IF;
  PERFORM vault.update_secret(state.secret_id,p_tokens::text);
  UPDATE wg_patreon_private.creator SET refresh_pending=false WHERE singleton;
  RETURN true;
END $$;

-- A complete validated campaign scan is published atomically, without updating any
-- customer's OAuth tokens, link, group metadata, characters, or saved profile.
CREATE OR REPLACE FUNCTION public.patreon_creator_publish(p_lease uuid,p_members jsonb,p_unidentified boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF jsonb_typeof(p_members) IS DISTINCT FROM 'object' OR p_unidentified IS NULL OR EXISTS (
    SELECT 1 FROM jsonb_each(p_members) e WHERE length(e.key)=0
      OR jsonb_typeof(e.value) IS DISTINCT FROM 'object'
      OR coalesce(length(e.value->>'member_id'),0)=0
      OR (e.value->>'tier' IS NOT NULL AND e.value->>'tier' NOT IN ('ADVOCATE','WANDERER','LEGEND','GAME-MASTER'))
  ) THEN RAISE EXCEPTION 'Invalid campaign observations' USING ERRCODE='22023'; END IF;
  -- Use the beginning of this fixed three-minute lease, not publication time:
  -- a new personal authorization during pagination must outrank earlier pages.
  UPDATE wg_patreon_private.creator SET members=p_members,unidentified=p_unidentified,observed_at=lease_until-interval '3 minutes'
    WHERE singleton AND lease_id=p_lease AND lease_until>clock_timestamp() AND NOT refresh_pending;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.patreon_creator_release(p_lease uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Keep the fencing identity when a rotated credential may still be in flight.
  UPDATE wg_patreon_private.creator SET lease_id=null,lease_until=null
    WHERE singleton AND lease_id=p_lease AND NOT refresh_pending;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.patreon_creator_configure(p_users uuid[],p_all boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_users IS NULL OR p_all IS NULL OR cardinality(p_users)>2 OR array_position(p_users,null) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid creator rollout' USING ERRCODE='22023';
  END IF;
  UPDATE wg_patreon_private.creator SET pilot_users=p_users,all_accounts=p_all WHERE singleton;
  RETURN FOUND;
END $$;

-- Service-only lookup binds the observation to the account's existing saved Patreon ID.
-- An absent/hidden identity is unverified, never evidence that an existing paid link ended.
CREATE OR REPLACE FUNCTION public.patreon_creator_membership(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE state wg_patreon_private.creator; patron text; observation jsonb;
BEGIN
  SELECT * INTO state FROM wg_patreon_private.creator WHERE singleton;
  IF NOT FOUND OR NOT (state.all_accounts OR p_user=ANY(state.pilot_users)) THEN
    RETURN jsonb_build_object('enabled',false);
  END IF;
  SELECT nullif(patreon->>'patreon_user_id','') INTO patron FROM public.public_user
    WHERE user_id=p_user AND deactivated IS NOT true;
  IF patron IS NULL THEN RETURN jsonb_build_object('enabled',false); END IF;
  observation=state.members->patron;
  IF state.observed_at IS NULL OR state.observed_at<now()-interval '1 hour'
     OR observation IS NULL THEN
    RETURN jsonb_build_object('enabled',true,'available',false);
  END IF;
  RETURN jsonb_build_object('enabled',true,'available',true,'tier',observation->>'tier','observed_at',state.observed_at);
END $$;

REVOKE ALL ON FUNCTION public.patreon_creator_initialize(jsonb), public.patreon_creator_acquire(uuid),
  public.patreon_creator_begin_refresh(uuid), public.patreon_creator_save(uuid,jsonb),
  public.patreon_creator_publish(uuid,jsonb,boolean), public.patreon_creator_release(uuid),
  public.patreon_creator_configure(uuid[],boolean), public.patreon_creator_membership(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.patreon_creator_initialize(jsonb), public.patreon_creator_acquire(uuid),
  public.patreon_creator_begin_refresh(uuid), public.patreon_creator_save(uuid,jsonb),
  public.patreon_creator_publish(uuid,jsonb,boolean), public.patreon_creator_release(uuid),
  public.patreon_creator_configure(uuid[],boolean), public.patreon_creator_membership(uuid)
  TO service_role;
