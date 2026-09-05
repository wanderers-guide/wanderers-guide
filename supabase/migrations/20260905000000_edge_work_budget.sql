-- Shared admission for paid external work. No caller-controlled quota parameters.
CREATE TABLE IF NOT EXISTS public.edge_work_budget (
  resource text NOT NULL CHECK (resource IN ('ai', 'vector-query', 'vector-populate')),
  actor text NOT NULL CHECK (length(actor) BETWEEN 1 AND 80),
  window_start date NOT NULL,
  used bigint NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (resource, actor)
);
CREATE INDEX IF NOT EXISTS edge_work_budget_window_idx ON public.edge_work_budget (window_start);
ALTER TABLE public.edge_work_budget ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_work_budget FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edge_work_budget TO service_role;

CREATE OR REPLACE FUNCTION public.consume_edge_work_budget(p_resource text, p_actor text, p_units integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  today date;
  actor_limit bigint;
  global_limit bigint;
BEGIN
  IF p_actor IS NULL OR length(p_actor) NOT BETWEEN 1 AND 80 OR p_actor = '*'
     OR p_units IS NULL OR p_units < 1 OR p_units > 100000 THEN
    RAISE EXCEPTION 'Invalid work budget request' USING ERRCODE = '22023';
  END IF;
  CASE p_resource
    WHEN 'ai' THEN actor_limit := 100; global_limit := 5000;
    WHEN 'vector-query' THEN actor_limit := 1000; global_limit := 20000;
    WHEN 'vector-populate' THEN actor_limit := 100000; global_limit := 200000;
    ELSE RAISE EXCEPTION 'Invalid work resource' USING ERRCODE = '22023';
  END CASE;

  -- Serialize the two counters as one decision. Denied calls consume neither.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('edge-work:' || p_resource));
  -- Capture wall time after waiting. A transaction started before midnight must
  -- never reset counters back to yesterday after a newer request has renewed them.
  today := (pg_catalog.clock_timestamp() AT TIME ZONE 'UTC')::date;
  -- Cleanup follows the same lock scope. An idle resource is pruned when it is
  -- next used; unrelated resource reservations never acquire each other's rows.
  DELETE FROM public.edge_work_budget WHERE resource = p_resource AND window_start < today - 1;
  INSERT INTO public.edge_work_budget(resource, actor, window_start, used)
    VALUES (p_resource, '*', today, 0), (p_resource, p_actor, today, 0)
    ON CONFLICT (resource, actor) DO UPDATE SET window_start = EXCLUDED.window_start, used = 0
    WHERE edge_work_budget.window_start <> EXCLUDED.window_start;

  IF EXISTS (SELECT 1 FROM public.edge_work_budget
    WHERE resource = p_resource AND actor IN ('*', p_actor)
      AND used + p_units > CASE WHEN actor = '*' THEN global_limit ELSE actor_limit END) THEN
    RETURN false;
  END IF;
  UPDATE public.edge_work_budget SET used = used + p_units
    WHERE resource = p_resource AND actor IN ('*', p_actor);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_edge_work_budget(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_work_budget(text, text, integer) TO service_role;
