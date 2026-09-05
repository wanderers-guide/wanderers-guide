/** Local-only release-gate regression. All database/catalog changes roll back. */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const gate = await readFile(new URL('../release/edge-work-budget.sql', import.meta.url), 'utf8');
const sql = `
BEGIN;
CREATE TEMP VIEW quota_release_gate AS ${gate}
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM quota_release_gate WHERE NOT passed) THEN
    RAISE EXCEPTION 'Valid quota must pass release gate';
  END IF;
END $$;
ALTER FUNCTION public.consume_edge_work_budget(text,text,integer) STABLE;
DO $$ BEGIN
  IF (SELECT passed FROM quota_release_gate WHERE id = 'budget-rpc') THEN
    RAISE EXCEPTION 'Read-only volatility must fail release gate';
  END IF;
END $$;
ALTER FUNCTION public.consume_edge_work_budget(text,text,integer) VOLATILE;
CREATE ROLE wg_quota_test_definer NOINHERIT NOBYPASSRLS;
GRANT wg_quota_test_definer TO postgres;
GRANT CREATE ON SCHEMA public TO wg_quota_test_definer;
ALTER FUNCTION public.consume_edge_work_budget(text,text,integer) OWNER TO wg_quota_test_definer;
DO $$ BEGIN
  IF (SELECT passed FROM quota_release_gate WHERE id = 'budget-rpc') THEN
    RAISE EXCEPTION 'Definer without table/RLS authority must fail release gate';
  END IF;
END $$;
ROLLBACK;
`;
execFileSync('docker', ['exec', '-i', 'wanderers-guide-db-1', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
  input: sql,
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe'],
});
console.log('PASS release gate accepts the migrated quota and rejects non-writable/unauthorized RPC metadata');
