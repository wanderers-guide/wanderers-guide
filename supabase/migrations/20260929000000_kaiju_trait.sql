do $kaiju$
declare
  existing public.trait;
  trait_metadata constant jsonb := '{"important":false,"class_trait":false,"unselectable":false,"ancestry_trait":false,"creature_trait":true,"archetype_trait":false,"versatile_heritage_trait":false,"companion_type_trait":false,"source":{"book":"Pathfinder #167: Ready? Fight!","page":"89","url":"https://2e.aonprd.com/Traits.aspx?ID=383"}}'::jsonb;
begin
  if not exists (
    select 1 from public.content_source
    where id = 3 and name = 'Common Core' and is_published
  ) then
    raise exception 'Common Core source changed; review before importing Kaiju';
  end if;

  select * into existing from public.trait
  where uuid = 7063249107400705 for update;

  if found then
    if existing.name is distinct from 'Kaiju'
      or existing.content_source_id is distinct from 3
      or existing.description is distinct from ''
      or existing.meta_data is distinct from trait_metadata then
      raise exception 'Existing Kaiju trait changed; review before importing';
    end if;
    return;
  end if;

  if exists (
    select 1 from public.trait
    where name = 'Kaiju' and content_source_id = 3
  ) then
    raise exception 'Common Core Kaiju trait name is already occupied';
  end if;

  insert into public.trait (name, description, meta_data, content_source_id, uuid)
  values ('Kaiju', '', trait_metadata, 3, 7063249107400705);
end
$kaiju$;
