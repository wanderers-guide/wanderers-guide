do $repair$
declare
  from_text constant text := '_Flash of Brilliance Arcanotheign_';
  to_text constant text := '_Flash of Brilliance_ Arcanotheign';
  before_md5 constant text := 'a1b1f5454184cb6f2e20feb77ff608b7';
  after_md5 constant text := '0a761e733db000059b4ffb760bff3e98';
  current_name text;
  current_uuid bigint;
  current_source bigint;
  current_metadata jsonb;
  current_description text;
  corrected text;
  changed_rows integer;
begin
  select name, uuid, content_source_id, meta_data, description
    into current_name, current_uuid, current_source, current_metadata, current_description
    from public.spell where id = 7282 for update;
  if current_name is distinct from 'Beseech Arcanotheign'
    or current_uuid is distinct from 4591751933917325
    or current_source is distinct from 400
    or current_metadata #>> '{source,book}' is distinct from 'War of Immortals'
    or current_metadata #>> '{source,page}' is distinct from '154'
    or current_metadata #>> '{source,url}' is distinct from 'https://2e.aonprd.com/MythicSpells.aspx?ID=2153' then
    raise exception 'Missing or changed Beseech Arcanotheign spell';
  end if;
  if exists (select 1 from public.content_update
    where type = 'spell' and ref_id = 7282 and status->>'state' = 'PENDING') then
    raise exception 'Beseech Arcanotheign has a pending curator submission';
  end if;

  if md5(current_description) = after_md5 then
    if (length(current_description) - length(replace(current_description, from_text, ''))) / length(from_text) <> 0
      or (length(current_description) - length(replace(current_description, to_text, ''))) / length(to_text) <> 1 then
      raise exception 'Beseech Arcanotheign emphasis count changed';
    end if;
  else
    if md5(current_description) is distinct from before_md5 then
      raise exception 'Beseech Arcanotheign text differs from the reviewed entry';
    end if;
    if (length(current_description) - length(replace(current_description, from_text, ''))) / length(from_text) <> 1
      or (length(current_description) - length(replace(current_description, to_text, ''))) / length(to_text) <> 0 then
      raise exception 'Beseech Arcanotheign emphasis count changed';
    end if;
    corrected := replace(current_description, from_text, to_text);
    if md5(corrected) is distinct from after_md5 then
      raise exception 'Beseech Arcanotheign emphasis did not match the reviewed result';
    end if;
    update public.spell set description = corrected
      where id = 7282 and description = current_description;
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then
      raise exception 'Beseech Arcanotheign text was not updated';
    end if;
  end if;
end
$repair$;
