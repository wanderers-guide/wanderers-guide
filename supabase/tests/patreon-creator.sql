\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='15s';
DO $$ BEGIN
 IF to_regclass('auth.users') IS NOT NULL THEN
   EXECUTE $q$INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
     ('00000000-0000-4000-8000-000000000001','wg-creator-1@example.invalid','{"display_name":"Creator fixture"}'),
     ('00000000-0000-4000-8000-000000000002','wg-creator-2@example.invalid','{"display_name":"Creator fixture"}')$q$;
 END IF;
END $$;
INSERT INTO public.public_user(user_id,patreon) VALUES
 ('00000000-0000-4000-8000-000000000001','{"patreon_user_id":"fixture-paid","access_token":"personal-unchanged","refresh_token":"refresh-unchanged","game_master":{"virtual_tier":{"group":"unchanged"}}}'),
 ('00000000-0000-4000-8000-000000000002','{"patreon_user_id":"fixture-absent","access_token":"other-unchanged"}')
ON CONFLICT(user_id) DO UPDATE SET patreon=excluded.patreon;
CREATE TEMP TABLE previous_profiles AS SELECT user_id,patreon FROM public.public_user;
SET LOCAL ROLE service_role;
DO $$ DECLARE a uuid='10000000-0000-4000-8000-000000000001'; b uuid='10000000-0000-4000-8000-000000000002'; scan_started_before timestamptz; BEGIN
 IF NOT public.patreon_creator_initialize('{"client_id":"fixture-v2","access_token":"creator-access","refresh_token":"creator-refresh"}') THEN RAISE EXCEPTION 'Bootstrap failed'; END IF;
 IF public.patreon_creator_initialize('{"client_id":"fixture-v2","access_token":"replacement","refresh_token":"replacement"}') THEN RAISE EXCEPTION 'Bootstrap overwrote grant'; END IF;
 IF public.patreon_creator_acquire(a)->>'access_token' IS DISTINCT FROM 'creator-access' THEN RAISE EXCEPTION 'Acquire failed'; END IF;
 scan_started_before=clock_timestamp();
 IF public.patreon_creator_acquire(b) IS NOT NULL THEN RAISE EXCEPTION 'Concurrent lease accepted'; END IF;
 IF NOT public.patreon_creator_begin_refresh(a) OR public.patreon_creator_begin_refresh(a) THEN RAISE EXCEPTION 'Exchange can repeat'; END IF;
 IF public.patreon_creator_publish(a,'{}',false) THEN RAISE EXCEPTION 'Unpersisted grant published'; END IF;
 IF public.patreon_creator_save(b,'{"client_id":"fixture-v2","access_token":"wrong","refresh_token":"wrong"}') THEN RAISE EXCEPTION 'Wrong fence saved'; END IF;
 IF NOT public.patreon_creator_save(a,'{"client_id":"fixture-v2","access_token":"rotated","refresh_token":"rotated-refresh"}') THEN RAISE EXCEPTION 'Rotation not saved'; END IF;
 IF NOT public.patreon_creator_save(a,'{"client_id":"fixture-v2","access_token":"rotated","refresh_token":"rotated-refresh"}') THEN RAISE EXCEPTION 'Idempotent save failed'; END IF;
 IF public.patreon_creator_save(a,'{"client_id":"fixture-v2","access_token":"stale","refresh_token":"stale"}') THEN RAISE EXCEPTION 'Stale overwrite allowed'; END IF;
 IF NOT public.patreon_creator_publish(a,'{"fixture-paid":{"member_id":"member-id-not-user-id","tier":"WANDERER","next_charge_date":null,"patron_status":"former_patron"}}',false) THEN RAISE EXCEPTION 'Publish failed'; END IF;
 IF public.patreon_creator_membership('00000000-0000-4000-8000-000000000001')->>'enabled' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Unconfigured patron enabled'; END IF;
 PERFORM public.patreon_creator_configure(ARRAY['00000000-0000-4000-8000-000000000001'::uuid],false);
 IF public.patreon_creator_membership('00000000-0000-4000-8000-000000000001')->>'tier' IS DISTINCT FROM 'WANDERER' THEN RAISE EXCEPTION 'Paid-through cancellation lost entitlement'; END IF;
 IF (public.patreon_creator_membership('00000000-0000-4000-8000-000000000001')->>'observed_at')::timestamptz > scan_started_before THEN RAISE EXCEPTION 'Scan publication could override an in-flight authorization'; END IF;
 IF public.patreon_creator_membership('00000000-0000-4000-8000-000000000002')->>'enabled' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Pilot leaked to others'; END IF;
 PERFORM public.patreon_creator_configure('{}',true);
 IF public.patreon_creator_membership('00000000-0000-4000-8000-000000000002')->>'available' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Absent identity falsely treated as cancelled'; END IF;
 PERFORM public.patreon_creator_publish(a,'{}',true);
 IF public.patreon_creator_membership('00000000-0000-4000-8000-000000000002')->>'available' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Unidentified member treated as absent'; END IF;
 PERFORM public.patreon_creator_release(a);
 IF public.patreon_creator_acquire(b)->>'refresh_token' IS DISTINCT FROM 'rotated-refresh' THEN RAISE EXCEPTION 'Rotation not durable'; END IF;
 PERFORM public.patreon_creator_begin_refresh(b);
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.patreon_creator_acquire(gen_random_uuid()); RAISE EXCEPTION 'Anon acquired creator'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.patreon_creator_membership('00000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'Anon read membership'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM wg_patreon_private.creator; RAISE EXCEPTION 'Anon read private state'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.patreon_creator_acquire(gen_random_uuid()); RAISE EXCEPTION 'User acquired creator'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.patreon_creator_configure('{}',true); RAISE EXCEPTION 'User enabled rollout'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE wg_patreon_private.creator SET lease_until=now()-interval '1 minute';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF public.patreon_creator_acquire('10000000-0000-4000-8000-000000000003') IS NOT NULL THEN RAISE EXCEPTION 'Ambiguous exchange retried after expiry'; END IF;
 IF NOT public.patreon_creator_save('10000000-0000-4000-8000-000000000002','{"client_id":"fixture-v2","access_token":"late-rotated","refresh_token":"late-refresh"}') THEN RAISE EXCEPTION 'Delayed rotation lost'; END IF;
END $$;
RESET ROLE;
UPDATE wg_patreon_private.creator SET observed_at=now()-interval '2 hours';
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF public.patreon_creator_membership('00000000-0000-4000-8000-000000000001')->>'available' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Stale snapshot trusted'; END IF;
END $$;
RESET ROLE;
DO $$ DECLARE f record; role_name text; BEGIN
 IF EXISTS(SELECT 1 FROM previous_profiles p JOIN public.public_user u USING(user_id) WHERE p.patreon IS DISTINCT FROM u.patreon) THEN RAISE EXCEPTION 'Personal connection changed'; END IF;
 FOR f IN SELECT oid FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'patreon_creator_%' LOOP
   FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
     IF has_function_privilege(role_name,f.oid,'EXECUTE') THEN RAISE EXCEPTION 'Exposed creator RPC'; END IF;
   END LOOP;
 END LOOP;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_schema_privilege(role_name,'wg_patreon_private','USAGE') OR has_table_privilege(role_name,'wg_patreon_private.creator','SELECT') THEN RAISE EXCEPTION 'Creator state directly exposed'; END IF;
 END LOOP;
END $$;
ROLLBACK;
