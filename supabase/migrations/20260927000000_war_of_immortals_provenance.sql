do $repair$
declare
  patches constant jsonb := $patches$
  [
    {"table":"ability_block","id":38754,"name":"Apparition Stabiliization","renamed":"Apparition Stabilization","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7130","book":"War of Immortals","page":"24"}},
    {"table":"ability_block","id":51663,"name":"Avenger Racket","cite":{"url":"https://2e.aonprd.com/Rackets.aspx?ID=10","book":"War of Immortals","page":"58"}},
    {"table":"ability_block","id":51667,"name":"Bloodrager Instinct","cite":{"url":"https://2e.aonprd.com/Instincts.aspx?ID=14","book":"War of Immortals","page":"60"}},
    {"table":"ability_block","id":51526,"name":"Decree of Banishment","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7405","book":"War of Immortals","page":"135"}},
    {"table":"ability_block","id":38748,"name":"Enhanced Familiar","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4717","book":"War of Immortals","page":"23"}},
    {"table":"ability_block","id":39204,"name":"Exemplar Resiliency","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7228","book":"War of Immortals","page":"57"}},
    {"table":"ability_block","id":51495,"name":"Faultless Defense","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7377","book":"War of Immortals","page":"127"}},
    {"table":"ability_block","id":38765,"name":"Incredible Familiar","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=9420","book":"War of Immortals","page":"26"}},
    {"table":"ability_block","id":38503,"name":"Irrepressible","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7201","book":"War of Immortals","page":"53"}},
    {"table":"ability_block","id":39141,"name":"Silence the Profane","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7234","book":"War of Immortals","page":"59"}},
    {"table":"ability_block","id":38745,"name":"Spirit Familiar","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7123","book":"War of Immortals","page":"23"}},
    {"table":"ability_block","id":39274,"name":"Vindicator's Judgment","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7259","book":"War of Immortals","page":"65"}},
    {"table":"ability_block","id":43769,"name":"Vindication Edge","cite":{"url":"https://2e.aonprd.com/HuntersEdge.aspx?ID=7","book":"War of Immortals","page":"64"}},
    {"table":"ability_block","id":38768,"name":"Whispers of Warning","renamed":"Whisper of Warning","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=7143","book":"War of Immortals","page":"26"}},
    {"table":"spell","id":7271,"name":"Discomfiting Whispers","cite":{"url":"https://2e.aonprd.com/Spells.aspx?ID=2139","book":"War of Immortals","page":"18"}},
    {"table":"spell","id":7280,"name":"Vindicator's Judgment","cite":{"url":"https://2e.aonprd.com/Spells.aspx?ID=2149","book":"War of Immortals","page":"65"}},
    {"table":"item","id":16924,"name":"Armor Potency (Mythic)","cite":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=3498","book":"War of Immortals","page":"148"}},
    {"table":"item","id":16925,"name":"Resilient (Mythic)","cite":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=3499","book":"War of Immortals","page":"149"}},
    {"table":"item","id":16926,"name":"Striking (Mythic)","cite":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=3500","book":"War of Immortals","page":"149"}},
    {"table":"item","id":16927,"name":"Weapon Potency (Mythic)","cite":{"url":"https://2e.aonprd.com/Equipment.aspx?ID=3501","book":"War of Immortals","page":"149"}},
    {"table":"archetype","id":289,"name":"Seneschal Witch","cite":{"url":"https://2e.aonprd.com/Archetypes.aspx?ID=284","book":"War of Immortals","page":"62"}},
    {"table":"ability_block","id":39156,"name":"Split Shot","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=6098"}},
    {"table":"ability_block","id":39276,"name":"Domain Initiate","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4644"}},
    {"table":"ability_block","id":39279,"name":"Thorough Research","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=5954"}},
    {"table":"ability_block","id":39280,"name":"Advanced Domain","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=4666"}},
    {"table":"ability_block","id":39287,"name":"Clear the Way","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=6369"}},
    {"table":"ability_block","id":39288,"name":"Unbalancing Sweep","cite":{"url":"https://2e.aonprd.com/Feats.aspx?ID=5861"}}
  ]
  $patches$::jsonb;
  patch jsonb;
  original jsonb;
  existing jsonb;
  content_type text;
  matched_count integer;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    if patch->>'table' not in ('ability_block', 'spell', 'item', 'archetype') then
      raise exception 'Unexpected content table: %', patch->>'table';
    end if;
    execute format('select meta_data from public.%I where id = $1 and name in ($2, $3) and content_source_id = 400 for update', patch->>'table')
      into original using (patch->>'id')::bigint, patch->>'name', coalesce(patch->>'renamed', patch->>'name');
    get diagnostics matched_count = row_count;
    if matched_count <> 1 then
      raise exception 'Missing or changed War of Immortals entry: %', patch->>'name';
    end if;
    existing := original->'source';
    if existing = patch->'cite' then
      continue;
    end if;
    if existing is not null and existing <> 'null'::jsonb then
      raise exception 'Changed source citation; review before repair: %', patch->>'name';
    end if;
    content_type := replace(patch->>'table', '_', '-');
    if exists (select 1 from public.content_update
      where type = content_type and ref_id = (patch->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'Entry has a pending curator submission: %', patch->>'name';
    end if;
    execute format('update public.%I set meta_data = jsonb_set(coalesce(meta_data, ''{}''::jsonb), ''{source}'', $1, true) where id = $2', patch->>'table')
      using patch->'cite', (patch->>'id')::bigint;
  end loop;
end
$repair$;
