\set ON_ERROR_STOP on
-- All queue rows and credentials roll back before pg_net can send them.
BEGIN;
SET LOCAL statement_timeout='15s';
CREATE TEMP TABLE scheduler_creator_before AS SELECT md5(to_jsonb(c)::text) fingerprint FROM wg_patreon_private.creator c;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM wg_patreon_private.scheduler) THEN RAISE EXCEPTION 'Expected unprovisioned fixture'; END IF;
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='wg-patreon-memberships' AND active) THEN RAISE EXCEPTION 'Migration enabled unprovisioned sender'; END IF;
  IF wg_patreon_private.enqueue_membership_sync() IS NOT NULL THEN RAISE EXCEPTION 'Unprovisioned sender enqueued HTTP'; END IF;
  PERFORM set_config('test.scheduler_anon','e30.'||rtrim(translate(encode(convert_to('{"role":"anon","ref":"aaaaaaaaaaaaaaaaaaaa"}','UTF8'),'base64'),'+/','-_'),'=')||'.fixture',true);
  PERFORM set_config('test.scheduler_service','e30.'||rtrim(translate(encode(convert_to('{"role":"service_role","ref":"aaaaaaaaaaaaaaaaaaaa"}','UTF8'),'base64'),'+/','-_'),'=')||'.fixture',true);
END $$;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  BEGIN PERFORM public.patreon_creator_scheduler_configure('http://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/sync-patreon-memberships',current_setting('test.scheduler_anon'),repeat('ab',32),false); RAISE EXCEPTION 'HTTP target accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.patreon_creator_scheduler_configure('https://bbbbbbbbbbbbbbbbbbbb.supabase.co/functions/v1/sync-patreon-memberships',current_setting('test.scheduler_anon'),repeat('ab',32),false); RAISE EXCEPTION 'Other project accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.patreon_creator_scheduler_configure('https://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/sync-patreon-memberships',current_setting('test.scheduler_service'),repeat('ab',32),false); RAISE EXCEPTION 'Service credential accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.patreon_creator_scheduler_configure('https://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/sync-patreon-memberships',current_setting('test.scheduler_anon'),'bad-key',false); RAISE EXCEPTION 'Bad key accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.patreon_creator_scheduler_configure('https://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/sync-patreon-memberships',current_setting('test.scheduler_anon'),repeat('ab',32),false);
  BEGIN PERFORM wg_patreon_private.enqueue_membership_sync(); RAISE EXCEPTION 'Service accessed private sender'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM wg_patreon_private.scheduler; RAISE EXCEPTION 'Service read private credentials'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF wg_patreon_private.enqueue_membership_sync() IS NOT NULL THEN RAISE EXCEPTION 'Disabled sender enqueued HTTP'; END IF;
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='wg-patreon-memberships' AND active) THEN RAISE EXCEPTION 'Disabled configuration left job active'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.patreon_creator_scheduler_configure(null,null,null,true); RAISE EXCEPTION 'Anon changed scheduler'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM wg_patreon_private.enqueue_membership_sync(); RAISE EXCEPTION 'Anon invoked sender'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM wg_patreon_private.scheduler; RAISE EXCEPTION 'Anon read scheduler'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.patreon_creator_scheduler_configure(null,null,null,true); RAISE EXCEPTION 'User changed scheduler'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM wg_patreon_private.enqueue_membership_sync(); RAISE EXCEPTION 'User invoked sender'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.patreon_creator_scheduler_configure('https://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/sync-patreon-memberships',current_setting('test.scheduler_anon'),repeat('ab',32),true);
RESET ROLE;
CREATE TEMP TABLE scheduler_request AS SELECT wg_patreon_private.enqueue_membership_sync() id;
DO $$ DECLARE request net.http_request_queue; expected text; BEGIN
  SELECT q.* INTO STRICT request FROM net.http_request_queue q JOIN scheduler_request r ON r.id=q.id;
  IF request.method<>'POST' OR request.url<>'https://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/sync-patreon-memberships'
     OR convert_from(request.body,'UTF8')<>'{}' OR request.timeout_milliseconds<>150000 THEN RAISE EXCEPTION 'Unexpected fixed request'; END IF;
  IF encode(extensions.hmac(convert_to('POST'||chr(10)||'sync-patreon-memberships'||chr(10)||'1794880000','UTF8'),decode(repeat('ab',32),'hex'),'sha256'),'hex')<>'6e2f9bc14d50fa0dbb3c2a65f9e656f82420dcf53b62c6aea945ffe1aa5bdb25' THEN RAISE EXCEPTION 'Cross-runtime known answer changed'; END IF;
  expected=encode(extensions.hmac(convert_to('POST'||chr(10)||'sync-patreon-memberships'||chr(10)||(request.headers->>'X-WG-Patreon-Timestamp'),'UTF8'),decode(repeat('ab',32),'hex'),'sha256'),'hex');
  IF request.headers->>'X-WG-Patreon-Signature' IS DISTINCT FROM expected THEN RAISE EXCEPTION 'SQL and receiver signature protocol differ'; END IF;
  IF request.headers->>'Authorization' IS DISTINCT FROM 'Bearer '||current_setting('test.scheduler_anon')
     OR request.headers->>'apikey' IS DISTINCT FROM current_setting('test.scheduler_anon') THEN RAISE EXCEPTION 'Missing public anon admission'; END IF;
  IF request.headers::text LIKE '%'||repeat('ab',32)||'%' OR request.headers ? 'X-WG-Patreon-Sync' THEN RAISE EXCEPTION 'Reusable key entered HTTP queue'; END IF;
  IF NOT EXISTS(SELECT 1 FROM wg_patreon_private.scheduler WHERE last_request_id=request.id AND last_enqueued_at IS NOT NULL) THEN RAISE EXCEPTION 'Request health cannot be correlated'; END IF;
  IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='wg-patreon-memberships' AND active) THEN RAISE EXCEPTION 'Activated job not active'; END IF;
END $$;
SET LOCAL ROLE service_role;
SELECT public.patreon_creator_scheduler_configure('https://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/sync-patreon-memberships',current_setting('test.scheduler_anon'),repeat('cd',32),false);
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets v JOIN wg_patreon_private.scheduler s ON s.secret_id=v.id WHERE v.decrypted_secret::jsonb->>'signing_key'=repeat('cd',32)) THEN RAISE EXCEPTION 'Signing key rotation not durable'; END IF;
  IF wg_patreon_private.enqueue_membership_sync() IS NOT NULL THEN RAISE EXCEPTION 'Deactivation failed'; END IF;
  IF (SELECT coalesce(jsonb_agg(md5(to_jsonb(c)::text)),'[]') FROM wg_patreon_private.creator c) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(fingerprint),'[]') FROM scheduler_creator_before) THEN RAISE EXCEPTION 'Scheduler changed creator credentials or observations'; END IF;
END $$;
ROLLBACK;
