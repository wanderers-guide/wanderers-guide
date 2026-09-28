do $repair$
declare
  citations constant jsonb := $citations$
  [
    {"id":36,"name":"Warrior of Legend","class_id":20,"url":"https://2e.aonprd.com/Archetypes.aspx?ID=286","page":"66"},
    {"id":14,"name":"Seneschal","class_id":27,"url":"https://2e.aonprd.com/Archetypes.aspx?ID=284","page":"62"},
    {"id":32,"name":"Avenger","class_id":25,"url":"https://2e.aonprd.com/Archetypes.aspx?ID=282","page":"58"},
    {"id":34,"name":"Bloodrager","class_id":108,"url":"https://2e.aonprd.com/Archetypes.aspx?ID=283","page":"60"}
  ]
  $citations$::jsonb;
  citation jsonb;
  original jsonb;
  expected jsonb;
begin
  for citation in select value from jsonb_array_elements(citations) loop
    select meta_data into original from public.class_archetype
     where id = (citation->>'id')::bigint
       and name = citation->>'name'
       and class_id = (citation->>'class_id')::bigint
       and content_source_id = 400
     for update;
    if not found then
      raise exception 'Missing or changed War of Immortals class archetype: %', citation->>'name';
    end if;
    expected := jsonb_build_object(
      'url', citation->>'url', 'book', 'War of Immortals', 'page', citation->>'page'
    );
    if original->'source' = expected then continue; end if;
    if original->'source' is not null and original->'source' <> 'null'::jsonb then
      raise exception 'Changed source citation for %', citation->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'class-archetype'
        and ref_id = (citation->>'id')::bigint
        and status->>'state' = 'PENDING') then
      raise exception 'Class archetype has a pending curator submission: %', citation->>'name';
    end if;
    update public.class_archetype
       set meta_data = jsonb_set(coalesce(meta_data, '{}'::jsonb), '{source}', expected, true)
     where id = (citation->>'id')::bigint;
  end loop;
end
$repair$;
