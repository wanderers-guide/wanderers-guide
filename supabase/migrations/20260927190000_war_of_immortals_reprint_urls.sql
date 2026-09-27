do $repair$
declare
  citations constant jsonb := $citations$
  [
    {"id":38746,"name":"Conceal Spell","level":2,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4997"}},
    {"id":38792,"name":"Reactive Strike","level":6,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=5832"}},
    {"id":39146,"name":"Twin Riposte","level":12,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4831"}},
    {"id":39271,"name":"Inviolable","level":18,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4701"}},
    {"id":39270,"name":"Premonition of Clarity","level":16,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4691"}},
    {"id":39277,"name":"Instructive Strike","level":4,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=8364"}},
    {"id":38785,"name":"Lightning Swap","level":2,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4783"}},
    {"id":39148,"name":"Improved Twin Riposte","level":16,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4844"}},
    {"id":39145,"name":"Twin Parry","level":6,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4796"}},
    {"id":39144,"name":"Twin Takedown","level":4,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4864"}},
    {"id":39147,"name":"Second Sting","level":14,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4895"}},
    {"id":39158,"name":"Energy Ward","level":12,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=6101"}},
    {"id":39278,"name":"Ongoing Investigation","level":4,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=5949"}},
    {"id":39269,"name":"Martyr","level":10,"cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4669"}}
  ]
  $citations$::jsonb;
  citation jsonb;
  current_name text;
  current_type text;
  current_level integer;
  current_source bigint;
  current_metadata jsonb;
  existing jsonb;
begin
  for citation in select value from jsonb_array_elements(citations) loop
    select name, type, level, content_source_id, meta_data
      into current_name, current_type, current_level, current_source, current_metadata
      from public.ability_block where id = (citation->>'id')::bigint for update;

    if current_name is distinct from citation->>'name'
      or current_type is distinct from 'feat'
      or current_level is distinct from (citation->>'level')::integer
      or current_source is distinct from 400 then
      raise exception 'Missing or changed War feat: %', citation->>'name';
    end if;

    existing := current_metadata->'source';
    if existing = citation->'cite' then
      continue;
    end if;
    if existing is not null and existing <> 'null'::jsonb then
      raise exception 'Changed source citation; review before repair: %', citation->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = (citation->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Entry has a pending curator submission: %', citation->>'name';
    end if;

    update public.ability_block
      set meta_data = jsonb_set(coalesce(meta_data, '{}'::jsonb), '{source}', citation->'cite', true)
      where id = (citation->>'id')::bigint;
  end loop;
end
$repair$;
