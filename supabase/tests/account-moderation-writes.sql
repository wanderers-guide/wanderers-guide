\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
SELECT set_config('test.actor', gen_random_uuid()::text, true),
  set_config('test.other', gen_random_uuid()::text, true);
INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT current_setting(setting)::uuid, 'wg-permission-' || current_setting(setting) || '@example.invalid',
  '{"display_name":"Permission fixture"}'::jsonb
FROM unnest(array['test.actor','test.other']) setting;

-- Signup must still create exactly one unprivileged profile through the Auth trigger.
DO $$ BEGIN
  IF (SELECT count(*) FROM public.public_user WHERE user_id = current_setting('test.actor')::uuid) <> 1 OR
    EXISTS (SELECT 1 FROM public.public_user WHERE user_id = current_setting('test.actor')::uuid
      AND (is_admin OR is_mod OR is_developer OR is_community_paragon)) THEN
    RAISE EXCEPTION 'Signup did not create one safe profile';
  END IF;
END $$;
INSERT INTO public.character (user_id, name, level, options)
VALUES (current_setting('test.other')::uuid, 'Private permission fixture', 1, '{"is_public":false}');
INSERT INTO public.content_update (user_id, type, action, data, content_source_id, upvotes, downvotes, status)
VALUES (current_setting('test.other')::uuid, 'spell', 'CREATE', '{"name":"Pending fixture"}', 1, '{}', '{}', '{"state":"PENDING"}');

CREATE FUNCTION pg_temp.expect_denied(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement;
  RAISE EXCEPTION 'Unauthorized statement was accepted: %', statement;
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.actor'), true);
DO $$ DECLARE field text; BEGIN
  FOREACH field IN ARRAY array['is_admin','is_mod','is_developer','is_community_paragon','deactivated'] LOOP
    PERFORM pg_temp.expect_denied(format('UPDATE public.public_user SET %I = true WHERE user_id = %L', field, current_setting('test.actor')));
    PERFORM pg_temp.expect_denied(format('INSERT INTO public.public_user (user_id,%I) VALUES (%L,true)', field, current_setting('test.actor')));
  END LOOP;
  PERFORM pg_temp.expect_denied('UPDATE public.public_user SET patreon = ''{"tier":"GAME-MASTER"}''');
  PERFORM pg_temp.expect_denied('UPDATE public.public_user SET api = ''{}''');
  PERFORM pg_temp.expect_denied('DELETE FROM public.public_user');
  PERFORM pg_temp.expect_denied('TRUNCATE public.public_user');
  PERFORM pg_temp.expect_denied('UPDATE public.content_update SET status = ''{"state":"APPROVED"}'', data = ''{"name":"Tampered"}''');
  PERFORM pg_temp.expect_denied('UPDATE public.content_update SET upvotes = ''{}'', discord_msg_id = ''tampered''');
  PERFORM pg_temp.expect_denied('DELETE FROM public.content_update');
  PERFORM pg_temp.expect_denied(format('INSERT INTO public.content_update (user_id,type,action,data,content_source_id) VALUES (%L,''spell'',''CREATE'',''{}'',1)', current_setting('test.actor')));
  PERFORM pg_temp.expect_denied(format('INSERT INTO public.character (user_id,name,level) VALUES (%L,''Forged owner'',1)', current_setting('test.other')));
  IF EXISTS (SELECT 1 FROM public.character WHERE user_id = current_setting('test.other')::uuid) THEN
    RAISE EXCEPTION 'Private character became visible';
  END IF;
END $$;
-- Existing caller-scoped creation remains permitted, including campaign trigger checks.
INSERT INTO public.character (user_id,name,level)
VALUES (current_setting('test.actor')::uuid, 'Owned permission fixture', 1);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect_denied('INSERT INTO public.public_user (is_admin) VALUES (true)');
SELECT pg_temp.expect_denied('UPDATE public.content_update SET status = ''{"state":"APPROVED"}''');
RESET ROLE;

-- Trusted handlers retain profile settings, entitlements and moderation writes.
SET LOCAL ROLE service_role;
UPDATE public.public_user SET display_name = 'Updated fixture', api = '{}', patreon = '{}'
WHERE user_id = current_setting('test.actor')::uuid;
UPDATE public.content_update SET status = '{"state":"APPROVED"}', discord_msg_id = 'trusted-fixture'
WHERE user_id = current_setting('test.other')::uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.public_user WHERE user_id = current_setting('test.actor')::uuid AND display_name = 'Updated fixture') OR
    NOT EXISTS (SELECT 1 FROM public.content_update WHERE user_id = current_setting('test.other')::uuid AND status->>'state' = 'APPROVED') THEN
    RAISE EXCEPTION 'Trusted writes failed';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
