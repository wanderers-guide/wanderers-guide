-- Run against a disposable/local database after 20260905000000. Everything rolls back.
BEGIN;
DO $$
DECLARE accepted boolean;
BEGIN
  IF has_function_privilege('anon', 'public.consume_edge_work_budget(text,text,integer)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.consume_edge_work_budget(text,text,integer)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.consume_edge_work_budget(text,text,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Incorrect quota function grants';
  END IF;
  IF has_table_privilege('anon', 'public.edge_work_budget', 'SELECT')
    OR has_table_privilege('authenticated', 'public.edge_work_budget', 'INSERT') THEN
    RAISE EXCEPTION 'Quota table is publicly accessible';
  END IF;
  DELETE FROM public.edge_work_budget WHERE resource = 'ai';
  INSERT INTO public.edge_work_budget(resource, actor, window_start, used)
    VALUES ('vector-query', 'test-expired-other-resource', '2000-01-01', 1)
    ON CONFLICT (resource, actor) DO UPDATE SET window_start = '2000-01-01', used = 1;
  INSERT INTO public.edge_work_budget(resource, actor, window_start, used)
    VALUES ('ai', '*', (now() AT TIME ZONE 'UTC')::date, 4999);
  accepted := public.consume_edge_work_budget('ai', 'test-sql', 2);
  IF NOT EXISTS (SELECT 1 FROM public.edge_work_budget
      WHERE resource = 'vector-query' AND actor = 'test-expired-other-resource') THEN
    RAISE EXCEPTION 'Quota cleanup must not acquire rows outside its resource lock';
  END IF;
  IF accepted OR (SELECT used FROM public.edge_work_budget WHERE resource='ai' AND actor='*') <> 4999 THEN
    RAISE EXCEPTION 'Global ceiling was not atomic';
  END IF;
  IF NOT public.consume_edge_work_budget('ai', 'test-sql', 1) THEN
    RAISE EXCEPTION 'Last available global unit should succeed';
  END IF;
  IF public.consume_edge_work_budget('ai', 'test-other', 1) THEN
    RAISE EXCEPTION 'A new actor must not bypass the global ceiling';
  END IF;
END $$;
ROLLBACK;
