do $repair$
declare
  targets constant jsonb := $targets$[
    {"table":"item","id":6693,"type":"item","name":"Alchemist's Lab","uuid":"981315748264688","source":1},
    {"table":"ability_block","id":38707,"type":"feat","name":"Crafter in the Vault","uuid":"5805084005545995","source":400},
    {"table":"trait","id":2938,"type":"trait","name":"Plant","uuid":"339889839350251","source":3},
    {"table":"trait","id":4075,"type":"trait","name":"Apparition","uuid":"8054066192161682","source":400},
    {"table":"spell","id":4687,"type":"spell","name":"Interplanar Teleport","uuid":"7609947194314161","source":3},
    {"table":"spell","id":7318,"type":"spell","name":"Imprisonment","uuid":"3996631344551247","source":400},
    {"table":"spell","id":7317,"type":"spell","name":"Freedom","uuid":"2578725875317887","source":400},
    {"table":"ability_block","id":20769,"type":"sense","name":"Darkvision","uuid":"990708369957964","source":3},
    {"table":"spell","id":4699,"type":"spell","name":"Light","uuid":"2956398977648258","source":3}
  ]$targets$;
  repairs constant jsonb := $repairs$[
    {"id":7268,"name":"Traveling Workshop","uuid":"6560926359615486","url":"https://2e.aonprd.com/Spells.aspx?ID=2137","before":"a36844829a117470e024b7a4b7145733","after":"816395781801df4b23c36c3b20d01be9","replacements":[
      {"from":"alchemist’s lab","to":"[alchemist’s lab](link_item_6693)","count":1},
      {"from":"crafter in the vault","to":"[crafter in the vault](link_feat_38707)","count":2}
    ]},
    {"id":7285,"name":"Garden of the Green Man's Growth","uuid":"5894872194542704","url":"https://2e.aonprd.com/MythicSpells.aspx?ID=2156","before":"68cdd71614ea727df219624ef871c068","after":"39681f3a2b6ac3a4d4a93bbfd66d5061","replacements":[
      {"from":"(plant)","to":"([plant](link_trait_2938))","count":2}
    ]},
    {"id":7278,"name":"Embodiment of Battle","uuid":"8286863436103064","url":"https://2e.aonprd.com/Spells.aspx?ID=2146","before":"6dc0b041809b36bb5e901420629912f2","after":"1914504f72aad1a08e07b913c0a2c224","replacements":[
      {"from":"apparition trait","to":"[apparition](link_trait_4075) trait","count":1}
    ]},
    {"id":7315,"name":"Create Demiplane","uuid":"3084503812004038","url":"https://2e.aonprd.com/MythicRituals.aspx?ID=191","before":"a1893a3b5fede131f11e61a5e6a6c678","after":"05b17f4d029cf7270ab1cbcf6aea674b","replacements":[
      {"from":"interplanar teleport or similar","to":"[interplanar teleport](link_spell_4687) or similar","count":1},
      {"from":"interplanar teleport locus","to":"[interplanar teleport](link_spell_4687) locus","count":1}
    ]},
    {"id":7317,"name":"Freedom","uuid":"2578725875317887","url":"https://2e.aonprd.com/MythicRituals.aspx?ID=193","before":"4561d17052a94de7752d4d7d8dd8c32a","after":"eb4c5935f99664356461bdcea53a0f97","replacements":[
      {"from":"imprisonment","to":"[imprisonment](link_spell_7318)","count":2}
    ]},
    {"id":7318,"name":"Imprisonment","uuid":"3996631344551247","url":"https://2e.aonprd.com/MythicRituals.aspx?ID=194","before":"79d9f217fb981a942408cd1e2a2d6b70","after":"806ce4a64c3f9a9ead1ddf6640462a03","replacements":[
      {"from":"freedom","to":"[freedom](link_spell_7317)","count":3}
    ]},
    {"id":7324,"name":"World in Shadow","uuid":"7448948841209054","url":"https://2e.aonprd.com/MythicRituals.aspx?ID=200","before":"cd827de32ee3aa8c4a2d38f588429aea","after":"791d18a5d348b902a5a7152d03d65d45","replacements":[
      {"from":"Casters with darkvision","to":"Casters with [darkvision](link_sense_20769)","count":1},
      {"from":"for a light spell","to":"for a [light](link_spell_4699) spell","count":1}
    ]}
  ]$repairs$;
  target jsonb;
  repair jsonb;
  reference jsonb;
  current_name text;
  current_uuid bigint;
  current_source bigint;
  current_type text;
  current_metadata jsonb;
  current_description text;
  corrected text;
  changed_rows integer;
begin
  -- Pin each resolved target, including ability-block subtypes, before adding links.
  for target in select value from jsonb_array_elements(targets)
  loop
    if target->>'table' not in ('item', 'ability_block', 'trait', 'spell') then
      raise exception 'Unexpected War spell reference table';
    end if;
    execute format(
      'select name, uuid, content_source_id, %s from public.%I where id = $1 for share',
      case when target->>'table' = 'ability_block' then 'type' else quote_literal(target->>'table') end,
      target->>'table'
    ) into current_name, current_uuid, current_source, current_type using (target->>'id')::bigint;
    if current_name is distinct from target->>'name'
      or current_uuid is distinct from (target->>'uuid')::bigint
      or current_source is distinct from (target->>'source')::bigint
      or current_type is distinct from target->>'type' then
      raise exception 'Missing or changed War spell reference target: %', target->>'name';
    end if;
  end loop;

  for repair in select value from jsonb_array_elements(repairs)
  loop
    select name, uuid, content_source_id, meta_data, description
      into current_name, current_uuid, current_source, current_metadata, current_description
      from public.spell where id = (repair->>'id')::bigint for update;
    if current_name is distinct from repair->>'name'
      or current_uuid is distinct from (repair->>'uuid')::bigint
      or current_source is distinct from 400
      or current_metadata #>> '{source,url}' is distinct from repair->>'url' then
      raise exception 'Missing or changed War spell reference entry: %', repair->>'name';
    end if;
    if exists (select 1 from public.content_update
      where type = 'spell' and ref_id = (repair->>'id')::bigint and status->>'state' = 'PENDING') then
      raise exception 'War spell has a pending curator submission: %', repair->>'name';
    end if;
    if md5(current_description) = repair->>'after' then
      continue;
    end if;
    if md5(current_description) is distinct from repair->>'before' then
      raise exception 'War spell reference text differs from the reviewed entry: %', repair->>'name';
    end if;
    corrected := current_description;
    for reference in select value from jsonb_array_elements(repair->'replacements')
    loop
      if (length(corrected) - length(replace(corrected, reference->>'from', '')))
        / length(reference->>'from') is distinct from (reference->>'count')::integer then
        raise exception 'Changed War spell reference count: %', repair->>'name';
      end if;
      corrected := replace(corrected, reference->>'from', reference->>'to');
    end loop;
    if md5(corrected) is distinct from repair->>'after' then
      raise exception 'War spell reference repair did not match the reviewed result: %', repair->>'name';
    end if;

    update public.spell set description = corrected
      where id = (repair->>'id')::bigint and description = current_description;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then
      raise exception 'War spell reference text was not updated: %', repair->>'name';
    end if;
  end loop;
end
$repair$;
