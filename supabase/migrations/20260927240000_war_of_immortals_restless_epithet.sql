do $repair$
declare
  original json[];
  operation jsonb;
  choice jsonb;
  injected jsonb;
  before_label constant text := 'Restless as the Tide';
  after_label constant text := 'Restless as the Tides';
  before_heading constant text := '**Dominion Epithet—Restless as the Tide**';
  after_heading constant text := '**Dominion Epithet—Restless as the Tides**';
  heading text;
begin
  select operations into original from public.ability_block
   where id = 38691 and name = 'Dominion Epithet'
     and type = 'class-feature' and content_source_id = 400
   for update;
  if not found or array_length(original, 1) is distinct from 1 then
    raise exception 'War of Immortals Dominion Epithet is missing or changed';
  end if;

  operation := original[1]::jsonb;
  if operation->>'id' is distinct from '0ce089ed-74cb-4051-b24b-eec5a5070614'
     or operation->>'type' is distinct from 'select'
     or operation #>> '{data,modeType}' is distinct from 'PREDEFINED'
     or operation #>> '{data,optionType}' is distinct from 'CUSTOM'
     or jsonb_array_length(operation #> '{data,optionsPredefined}') is distinct from 6 then
    raise exception 'Dominion Epithet selection has changed';
  end if;

  choice := operation #> '{data,optionsPredefined,4}';
  injected := choice #> '{operations,1}';
  heading := injected #>> '{data,text}';
  if choice->>'id' is distinct from '18a731d1-6507-461d-9f40-3081ee17e04c'
     or choice->>'type' is distinct from 'CUSTOM'
     or jsonb_array_length(choice->'operations') is distinct from 2
     or injected->>'id' is distinct from '6b05ec0d-238b-45b7-bebc-27f25dc460f1'
     or injected->>'type' is distinct from 'injectText'
     or injected #>> '{data,type}' is distinct from 'feat'
     or injected #>> '{data,id}' is distinct from '38705' then
    raise exception 'Restless epithet option has changed';
  end if;

  if choice->>'title' = after_label and left(heading, length(after_heading)) = after_heading then
    return;
  end if;
  if choice->>'title' is distinct from before_label
     or left(heading, length(before_heading)) is distinct from before_heading
     or length(heading) - length(replace(heading, before_heading, '')) <> length(before_heading) then
    raise exception 'Restless epithet wording has changed';
  end if;
  if exists (
    select 1 from public.content_update
    where type = 'ability-block' and ref_id = 38691 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Dominion Epithet has a pending curator submission';
  end if;

  operation := jsonb_set(
    operation, '{data,optionsPredefined,4,title}', to_jsonb(after_label), false
  );
  operation := jsonb_set(
    operation, '{data,optionsPredefined,4,operations,1,data,text}',
    to_jsonb(replace(heading, before_heading, after_heading)), false
  );
  update public.ability_block
     set operations[1] = operation::json
   where id = 38691 and content_source_id = 400;
end
$repair$;
