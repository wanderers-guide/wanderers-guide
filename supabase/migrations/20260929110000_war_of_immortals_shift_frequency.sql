do $repair$
declare
  current_name text;
  current_type text;
  current_source bigint;
  current_actions text;
  current_frequency text;
  current_metadata jsonb;
begin
  select name, type, content_source_id, actions, frequency, meta_data
    into current_name, current_type, current_source, current_actions, current_frequency, current_metadata
    from public.ability_block where id = 38584 for update;
  if current_name is distinct from 'Shift Immanence'
    or current_type is distinct from 'feat'
    or current_source is distinct from 400
    or current_actions is distinct from 'ONE-ACTION'
    or current_metadata #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Actions.aspx?ID=3030' then
    raise exception 'Missing or changed War action: Shift Immanence';
  end if;
  if current_frequency is distinct from '' then
    if current_frequency is distinct from 'once per round' then
      raise exception 'Changed Shift Immanence frequency; review before repair';
    end if;
    if exists (select 1 from public.content_update
      where type = 'ability-block' and ref_id = 38584 and status->>'state' = 'PENDING') then
      raise exception 'Action has a pending curator submission: Shift Immanence';
    end if;
    update public.ability_block set frequency = ''
      where id = 38584 and frequency = 'once per round';
  end if;
end
$repair$;
