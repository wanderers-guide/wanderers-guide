#!/bin/bash
set -euo pipefail

if [ "$#" -ne 1 ]; then echo 'Usage: clear-user-data.sh LOCAL_DATABASE_URI' >&2; exit 2; fi
user_data_tables=(ability_block ancestry archetype background class creature item language spell trait versatile_heritage class_archetype)

# Delete children before their sources, independently of cascading constraints.
{
  echo 'BEGIN;'
  for table in "${user_data_tables[@]}"; do
    echo "DELETE FROM public.${table} AS t USING public.content_source AS cs WHERE t.content_source_id = cs.id AND cs.user_id IS NOT NULL;"
  done
  echo 'DELETE FROM public.content_source WHERE user_id IS NOT NULL;'
  cat <<'SQL'
DO $verify_sanitized$
DECLARE table_name text; invalid boolean;
BEGIN
  IF EXISTS(SELECT 1 FROM public.content_source WHERE user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Snapshot still contains user-owned sources';
  END IF;
  FOREACH table_name IN ARRAY ARRAY['ability_block','ancestry','archetype','background','class','creature','item','language','spell','trait','versatile_heritage','class_archetype'] LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I r LEFT JOIN public.content_source s ON s.id=r.content_source_id WHERE r.content_source_id IS NOT NULL AND (s.id IS NULL OR s.user_id IS NOT NULL))',table_name) INTO invalid;
    IF invalid THEN RAISE EXCEPTION 'Snapshot has orphaned or private content in %',table_name; END IF;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['public_user','campaign','character','encounter','content_update','campaign_join_grant','edge_work_budget'] LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I)',table_name) INTO invalid;
    IF invalid THEN RAISE EXCEPTION 'Snapshot has private rows in %',table_name; END IF;
  END LOOP;
END $verify_sanitized$;
COMMIT;
SQL
} | psql -X -q --set=ON_ERROR_STOP=1 --set=VERBOSITY=sqlstate --set=SHOW_CONTEXT=never -d "$1"
