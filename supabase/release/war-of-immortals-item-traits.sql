with expected(id, uuid, name, level, url, traits) as (
  values
    (17481::bigint, 6490041854253359::bigint, 'Gut-Ripper', 7,
      'https://2e.aonprd.com/Equipment.aspx?ID=3512', array[1504,4072,1706,1537]::bigint[]),
    (17480::bigint, 1893225331339800::bigint, 'Dreamweb Bolt', 0,
      'https://2e.aonprd.com/Equipment.aspx?ID=3517', array[1533]::bigint[])
)
select 'war-item-traits-' || expected.name as id, exists (
  select 1 from public.item actual
  where actual.id = expected.id and actual.uuid = expected.uuid
    and actual.name = expected.name and actual.level = expected.level
    and actual.content_source_id = 400
    and actual.meta_data #>> '{source,url}' = expected.url
    and actual.traits = expected.traits
) as passed from expected
union all
select 'war-item-trait-identities', not exists (
  select 1 from (values
    (1706::bigint, 'Deadly d10'), (1537::bigint, 'Trip'), (1533::bigint, 'Precious')
  ) expected(id, name)
  left join public.trait actual on actual.id = expected.id
  where actual.id is null or actual.name is distinct from expected.name
    or actual.content_source_id is distinct from 3
);
