do $repair$
declare
  entry public.item%rowtype;
  corrected text;
  link record;
begin
  select * into entry from public.item
   where id = 11940 and name = 'Dragonprism Staff' and content_source_id = 16
   for update;
  if not found
     or entry.uuid is distinct from 982148341471611
     or entry.meta_data #>> '{source,url}' is distinct from 'https://2e.aonprd.com/Equipment.aspx?ID=4784' then
    raise exception 'Treasure Vault Dragonprism Staff is missing or changed';
  end if;

  if md5(entry.description) = '8098f54e420d89eadfb852aae690b8c3' then
    return;
  end if;
  if md5(entry.description) is distinct from 'b4b3e5ee7a8b92e7eea230368d3571f3' then
    raise exception 'Dragonprism Staff description differs from the reviewed record';
  end if;
  if exists (
    select 1 from public.content_update
    where type = 'item' and ref_id = 11940 and status->>'state' = 'PENDING'
  ) then
    raise exception 'Dragonprism Staff has a pending item submission';
  end if;

  corrected := entry.description;
  for link in
    select * from (values
      ('Demoralize', '[Demoralize](link_action_19624)'),
      ('Gouging Claw', '[Gouging Claw](link_spell_4645)'),
      ('Puff of Poison', '[Puff of Poison](link_spell_6760)'),
      ('Breathe Fire', '[Breathe Fire](link_spell_4423)'),
      ('Fear', '[Fear](link_spell_4616)'),
      ('Acid Arrow', '[Acid Arrow](link_spell_6347)'),
      ('Resist Energy', '[Resist Energy](link_spell_4801)'),
      ('Lightning Bolt', '[Lightning Bolt](link_spell_4700)'),
      ('Fly', '[Fly](link_spell_4628)'),
      ('Reflective Scales', '[Reflective Scales](link_spell_6197)'),
      ('Cone of Cold', 'Cone of Cold'),
      ('Summon Dragon', '[Summon Dragon](link_spell_4869)'),
      ('Dragon Form', '[Dragon Form](link_spell_4583)')
    ) as links(name, replacement)
  loop
    corrected := replace(corrected, '\[\[' || link.name || '\]\]', link.replacement);
  end loop;
  if md5(corrected) is distinct from '8098f54e420d89eadfb852aae690b8c3' then
    raise exception 'Dragonprism Staff token cleanup did not match the reviewed result';
  end if;

  update public.item
     set description = corrected
   where id = 11940 and content_source_id = 16 and description = entry.description;
  if not found then
    raise exception 'Dragonprism Staff description was not updated';
  end if;
end
$repair$;
