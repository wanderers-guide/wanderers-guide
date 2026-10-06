do $repair$
declare
  from_text constant text := 'gains the [arcane](link_trait_1459) trait';
  to_text constant text := 'gains the [arcane](link_trait_1459) or [divine](link_trait_1475) trait matching your bloodrager spellcasting tradition';
  before_md5 constant text := 'db6fb7cda1e9da511159acb17e9622a7';
  after_md5 constant text := '6bc8441098606f315ea12e4e983de326';
  existing public.ability_block%rowtype;
  corrected text;
  changed_rows integer;
begin
  select * into existing from public.ability_block where id = 39157 for update;
  if not found
     or existing.uuid is distinct from 5320033208115637
     or existing.name is distinct from 'Bespell Strikes'
     or existing.type is distinct from 'feat'
     or existing.level is distinct from 8
     or existing.content_source_id is distinct from 400 then
    raise exception 'Missing or changed Bloodrager Bespell Strikes';
  end if;
  if exists (select 1 from public.content_update
    where type = 'ability-block' and ref_id = 39157 and status->>'state' = 'PENDING') then
    raise exception 'Bloodrager Bespell Strikes has a pending curator submission';
  end if;

  if md5(existing.description) = after_md5 then
    return;
  end if;
  if md5(existing.description) is distinct from before_md5 then
    raise exception 'Bloodrager Bespell Strikes text differs from the reviewed entry';
  end if;
  corrected := replace(existing.description, from_text, to_text);
  if md5(corrected) is distinct from after_md5 then
    raise exception 'Bloodrager Bespell Strikes did not match the reviewed result';
  end if;
  update public.ability_block set description = corrected
    where id = 39157 and description = existing.description;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Bloodrager Bespell Strikes text was not updated';
  end if;
end
$repair$;
