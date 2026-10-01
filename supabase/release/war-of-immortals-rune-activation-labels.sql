select 'war-rune-activation-labels' as id,
  (select count(*) = 4
    from (values
      (16924, 'Armor Potency (Mythic)', 'Survive Devastation', 'https://2e.aonprd.com/Equipment.aspx?ID=3498'),
      (16925, 'Resilient (Mythic)', 'Defy Obliteration', 'https://2e.aonprd.com/Equipment.aspx?ID=3499'),
      (16926, 'Striking (Mythic)', 'Unstoppable Devastation', 'https://2e.aonprd.com/Equipment.aspx?ID=3500'),
      (16927, 'Weapon Potency (Mythic)', 'Unerring Blow', 'https://2e.aonprd.com/Equipment.aspx?ID=3501')
    ) expected(id, name, activation, url)
    join public.item item_row on item_row.id = expected.id
    where item_row.name = expected.name and item_row.content_source_id = 400
      and item_row.meta_data #>> '{source,url}' = expected.url
      and position(format('**Activate—%s** <abbr cost="REACTION" class="action-symbol">5</abbr> ([concentrate](link_trait_1432))', expected.activation)
        in item_row.description) > 0
      and position('[concentration](link_trait_1432)' in item_row.description) = 0) as passed;
