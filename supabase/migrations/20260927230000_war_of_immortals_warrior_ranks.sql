do $repair$
declare
  repairs constant jsonb := $scoped$
  [
    {
      "prev_id": 20764,
      "name": "Fighter Weapon Mastery",
      "old_group_operations": [
        {"id":"bdb35161-81a9-4380-9441-18f2beeb1377","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR","value":{"value":"M"}}},
        {"id":"a340563f-b11b-4a7f-8ebb-f83312195c8e","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM","value":{"value":"M"}}}
      ],
      "scoped_operations": [
        {"id":"7b2ab962-eb1b-4a4c-adb9-feaf4b76682c","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_SIMPLE","value":{"value":"M"}}},
        {"id":"de0ab549-bff3-478b-a9c9-06c501b157b4","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_MARTIAL","value":{"value":"M"}}},
        {"id":"266f14b5-2aba-4895-973a-a2405c124195","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_ADVANCED","value":{"value":"E"}}},
        {"id":"64a95f6d-f6ee-44e1-b8cd-46b4909e0edb","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_UNARMED_ATTACK","value":{"value":"M"}}},
        {"id":"af2cd211-b570-4d9c-807b-0b9c37fd3820","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_SIMPLE","value":{"value":"M"}}},
        {"id":"7f4c261c-7d6d-4ee4-91ab-18072d73b007","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_MARTIAL","value":{"value":"M"}}},
        {"id":"af3a85f7-eb20-40bd-aaf7-9cd5b45e8f11","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_ADVANCED","value":{"value":"E"}}},
        {"id":"c5da8516-537e-4aff-9150-4d4d658388a1","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_UNARMED_ATTACK","value":{"value":"M"}}}
      ]
    },
    {
      "prev_id": 19270,
      "name": "Weapon Legend",
      "old_group_operations": [
        {"id":"2ff7b5d6-5296-44c2-bb4f-cb42eacc5f79","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR","value":{"value":"L"}}},
        {"id":"a5a24742-e400-42e9-ab68-41c594325ec7","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM","value":{"value":"L"}}}
      ],
      "scoped_operations": [
        {"id":"b8860303-4c3b-4a90-889e-3dabb4fdf8cd","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_SIMPLE","value":{"value":"L"}}},
        {"id":"77f9c867-7c4f-4578-85b7-342db31a7593","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_MARTIAL","value":{"value":"L"}}},
        {"id":"692f70f3-ae7e-43bb-b45d-b451cfeca006","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_ADVANCED","value":{"value":"M"}}},
        {"id":"e623891b-cb03-4337-89fd-50b942b07940","type":"adjValue","data":{"variable":"WEAPON_GROUP_SPEAR_UNARMED_ATTACK","value":{"value":"L"}}},
        {"id":"975705e5-f08e-4138-b3f6-f273eac03bad","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_SIMPLE","value":{"value":"L"}}},
        {"id":"a0ffc289-01b6-4f4f-8164-8855e5fde6ef","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_MARTIAL","value":{"value":"L"}}},
        {"id":"502af567-8937-403e-9587-387f9db67a50","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_ADVANCED","value":{"value":"M"}}},
        {"id":"4b479fd2-5ff2-46bd-a909-e26b91f10142","type":"adjValue","data":{"variable":"WEAPON_GROUP_POLEARM_UNARMED_ATTACK","value":{"value":"L"}}}
      ]
    }
  ]
  $scoped$::jsonb;
  archetype public.class_archetype%rowtype;
  repair jsonb;
  feature jsonb;
  feature_index integer;
  operations jsonb;
  general_operations jsonb;
  group_operations jsonb;
  desired_operations jsonb;
  original_feature_count integer;
  changed boolean := false;
begin
  select * into archetype from public.class_archetype
   where id = 36 and name = 'Warrior of Legend' and class_id = 20 and content_source_id = 400
   for update;
  if not found then raise exception 'Missing or changed Warrior of Legend class archetype'; end if;
  original_feature_count := cardinality(archetype.feature_adjustments);

  for repair in select value from jsonb_array_elements(repairs) loop
    if (select count(*) from unnest(archetype.feature_adjustments) entry
         where entry->>'type' = 'REPLACE'
           and (entry->>'prev_id')::bigint = (repair->>'prev_id')::bigint
           and entry #>> '{data,name}' = repair->>'name') <> 1 then
      raise exception 'Missing or duplicate Warrior of Legend feature: %', repair->>'name';
    end if;
    select entry::jsonb, ordinal::integer into feature, feature_index
      from unnest(archetype.feature_adjustments) with ordinality as features(entry, ordinal)
     where entry->>'type' = 'REPLACE'
       and (entry->>'prev_id')::bigint = (repair->>'prev_id')::bigint
       and entry #>> '{data,name}' = repair->>'name';
    operations := feature #> '{data,operations}';
    select coalesce(jsonb_agg(operation order by ordinal), '[]'::jsonb)
      into general_operations
      from jsonb_array_elements(operations) with ordinality as entries(operation, ordinal)
     where not starts_with(operation #>> '{data,variable}', 'WEAPON_GROUP_');
    select coalesce(jsonb_agg(operation order by ordinal), '[]'::jsonb)
      into group_operations
      from jsonb_array_elements(operations) with ordinality as entries(operation, ordinal)
     where starts_with(operation #>> '{data,variable}', 'WEAPON_GROUP_');
    desired_operations := general_operations || (repair->'scoped_operations');
    if desired_operations is null
       or jsonb_array_length(desired_operations) <> jsonb_array_length(general_operations) + 8 then
      raise exception 'Invalid scoped Warrior of Legend operations: %', repair->>'name';
    end if;
    if operations = desired_operations then continue; end if;
    if group_operations <> repair->'old_group_operations'
       or jsonb_array_length(operations) <> jsonb_array_length(general_operations) + 2
       or jsonb_array_length(general_operations) <> (case when repair->>'name' = 'Weapon Legend' then 4 else 0 end) then
      raise exception 'Changed Warrior of Legend operations: %', repair->>'name';
    end if;
    archetype.feature_adjustments[feature_index] :=
      jsonb_set(feature, '{data,operations}', desired_operations, false)::json;
    changed := true;
  end loop;

  if cardinality(archetype.feature_adjustments) is distinct from original_feature_count
     or exists (
       select 1 from unnest(archetype.feature_adjustments) as entries(entry)
        where entries.entry is null
     ) then
    raise exception 'Warrior of Legend feature adjustments became incomplete';
  end if;

  if changed then
    if exists (select 1 from public.content_update
      where type = 'class-archetype' and ref_id = 36 and status->>'state' = 'PENDING') then
      raise exception 'Warrior of Legend has a pending curator submission';
    end if;
    update public.class_archetype
       set feature_adjustments = archetype.feature_adjustments
     where id = 36;
  end if;
end
$repair$;
