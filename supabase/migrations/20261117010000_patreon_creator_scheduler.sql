-- Periodic membership verification belongs to the existing backend, not best-effort CI.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- No production URL, key or active marker is seeded by migrations or public data dumps.
CREATE TABLE IF NOT EXISTS wg_patreon_private.scheduler (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  secret_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT false,
  last_request_id bigint,
  last_enqueued_at timestamptz
);
ALTER TABLE wg_patreon_private.scheduler ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wg_patreon_private.scheduler FROM PUBLIC, anon, authenticated, service_role;

-- pg_net's queue can be read by database-login roles. Only a short-lived signature
-- and the public anon JWT enter it, never a creator grant or reusable capability.
CREATE OR REPLACE FUNCTION wg_patreon_private.enqueue_membership_sync() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE state wg_patreon_private.scheduler; credentials jsonb; stamp text; signature text; request bigint;
BEGIN
  SELECT * INTO state FROM wg_patreon_private.scheduler WHERE singleton;
  IF NOT FOUND OR NOT state.active THEN RETURN null; END IF;
  BEGIN
    SELECT decrypted_secret::jsonb INTO STRICT credentials FROM vault.decrypted_secrets WHERE id=state.secret_id;
    stamp=floor(extract(epoch FROM clock_timestamp()))::bigint::text;
    signature=encode(extensions.hmac(convert_to('POST'||chr(10)||'sync-patreon-memberships'||chr(10)||stamp,'UTF8'),
      decode(credentials->>'signing_key','hex'),'sha256'),'hex');
    request=net.http_post(
      url:=credentials->>'endpoint',
      headers:=jsonb_build_object('Content-Type','application/json',
        'Authorization','Bearer '||(credentials->>'anon_key'),'apikey',credentials->>'anon_key',
        'X-WG-Patreon-Timestamp',stamp,'X-WG-Patreon-Signature',signature),
      body:='{}'::jsonb,timeout_milliseconds:=150000);
    UPDATE wg_patreon_private.scheduler SET last_request_id=request,last_enqueued_at=clock_timestamp() WHERE singleton;
    RETURN request;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Patreon scheduler enqueue failed; inspect private configuration' USING ERRCODE='P0001';
  END;
END $$;
REVOKE ALL ON FUNCTION wg_patreon_private.enqueue_membership_sync() FROM PUBLIC, anon, authenticated, service_role;

-- Configure/rotate only the narrow sender key. The public JWT must be an anon grant
-- for this exact HTTPS project endpoint, so service credentials cannot enter the queue.
CREATE OR REPLACE FUNCTION public.patreon_creator_scheduler_configure(
  p_endpoint text,p_anon_key text,p_signing_key text,p_active boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE parts text[]; claims jsonb; previous uuid; credentials jsonb; job bigint;
BEGIN
  IF p_endpoint IS NULL OR p_anon_key IS NULL OR p_signing_key IS NULL OR p_active IS NULL
     OR p_endpoint !~ '^https://[a-z0-9]{20}\.supabase\.co/functions/v1/sync-patreon-memberships$'
     OR p_signing_key !~ '^[a-f0-9]{64}$'
     OR p_anon_key !~ '^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$' THEN
    RAISE EXCEPTION 'Invalid Patreon scheduler configuration' USING ERRCODE='22023';
  END IF;
  BEGIN
    parts=string_to_array(p_anon_key,'.');
    claims=convert_from(decode(translate(parts[2],'-_','+/')||repeat('=',(4-length(parts[2])%4)%4),'base64'),'UTF8')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid Patreon scheduler anon JWT' USING ERRCODE='22023';
  END;
  IF claims->>'role' IS DISTINCT FROM 'anon'
     OR split_part(p_endpoint,'/',3) IS DISTINCT FROM (claims->>'ref')||'.supabase.co' THEN
    RAISE EXCEPTION 'Patreon scheduler requires this project anon JWT' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(4805226,3);
  SELECT jobid INTO STRICT job FROM cron.job WHERE jobname='wg-patreon-memberships';
  credentials=jsonb_build_object('endpoint',p_endpoint,'anon_key',p_anon_key,'signing_key',p_signing_key);
  SELECT secret_id INTO previous FROM wg_patreon_private.scheduler WHERE singleton FOR UPDATE;
  IF previous IS NULL THEN
    SELECT vault.create_secret(credentials::text,'wg_patreon_scheduler','Short-lived membership job signatures') INTO previous;
    INSERT INTO wg_patreon_private.scheduler(secret_id,active) VALUES(previous,p_active);
  ELSE
    PERFORM vault.update_secret(previous,credentials::text);
    UPDATE wg_patreon_private.scheduler SET active=p_active WHERE singleton;
  END IF;
  PERFORM cron.alter_job(job_id:=job,active:=p_active);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.patreon_creator_scheduler_configure(text,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patreon_creator_scheduler_configure(text,text,text,boolean) TO service_role;

-- Replaying the migration preserves an already configured live job and rotated key.
DO $$ DECLARE scheduler_job bigint; BEGIN
  SELECT j.jobid INTO scheduler_job FROM cron.job j WHERE j.jobname='wg-patreon-memberships';
  IF scheduler_job IS NULL THEN
    scheduler_job=cron.schedule('wg-patreon-memberships','3,18,33,48 * * * *','select wg_patreon_private.enqueue_membership_sync();');
    PERFORM cron.alter_job(job_id:=scheduler_job,active:=false);
  ELSIF NOT EXISTS(SELECT 1 FROM cron.job j WHERE j.jobid=scheduler_job
      AND j.command='select wg_patreon_private.enqueue_membership_sync();' AND j.database=current_database()) THEN
    RAISE EXCEPTION 'Unexpected existing Patreon scheduler job';
  END IF;
END $$;
