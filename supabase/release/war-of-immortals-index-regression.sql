-- Run after war-of-immortals-index.sql in the same psql session.
-- Each mutation is rolled back; these probes must show that the inventory gate
-- rejects a missing indexed row and an unrelated citation.

begin;
delete from public.ability_block where id = 39151 and content_source_id = 400;
select 'war-index-rejects-deleted-feat' as id,
  not (select passed from war_index_checks where id = 'war-index-standalone')
  and not exists (select 1 from public.ability_block where id = 39151 and content_source_id = 400) as passed;
rollback;

begin;
update public.ability_block
set meta_data = jsonb_set(meta_data, '{source,url}', to_jsonb('https://2e.aonprd.com/Feats.aspx?ID=1'::text), true)
where id = 39151 and content_source_id = 400;
select 'war-index-rejects-swapped-url' as id,
  not (select passed from war_index_checks where id = 'war-index-standalone')
  and exists (select 1 from public.ability_block where id = 39151 and content_source_id = 400
    and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/Feats.aspx?ID=1') as passed;
rollback;
