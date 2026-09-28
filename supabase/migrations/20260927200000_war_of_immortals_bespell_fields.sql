do $repair$
declare
  existing public.ability_block%rowtype;
  updated_count integer;
begin
  select * into existing
    from public.ability_block
   where id = 39157
   for update;

  if not found
     or existing.name is distinct from 'Bespell Strikes'
     or existing.type is distinct from 'feat'
     or existing.level is distinct from 8
     or existing.content_source_id is distinct from 400 then
    raise exception 'Missing or changed Bloodrager Bespell Strikes';
  end if;

  if existing.actions = 'FREE-ACTION'
     and existing.frequency = 'once per turn'
     and existing.requirements = 'Your most recent action was to cast a non-cantrip spell' then
    null;
  elsif existing.actions is null
     and existing.frequency = ''
     and existing.requirements = '' then
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = 39157 and status->>'state' = 'PENDING') then
      raise exception 'Bloodrager Bespell Strikes has a pending curator submission';
    end if;

    update public.ability_block
       set actions = 'FREE-ACTION',
           frequency = 'once per turn',
           requirements = 'Your most recent action was to cast a non-cantrip spell'
     where id = 39157
       and name = 'Bespell Strikes'
       and type = 'feat'
       and level = 8
       and content_source_id = 400
       and actions is null
       and frequency = ''
       and requirements = '';
    get diagnostics updated_count = row_count;
    if updated_count <> 1 then
      raise exception 'Bloodrager Bespell Strikes changed during repair';
    end if;
  else
    raise exception 'Changed Bloodrager Bespell Strikes fields; review before repair';
  end if;
end
$repair$;
