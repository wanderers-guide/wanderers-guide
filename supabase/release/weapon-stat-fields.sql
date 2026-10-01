with expected(id, name, source, hands) as (values
  (6714, 'Arbalest', 1, '2'),
  (6736, 'Bastard Sword', 1, '1'),
  (6748, 'Blowgun', 1, '1'),
  (6749, 'Bo Staff', 1, '2'),
  (6796, 'Clan Dagger', 1, '1'),
  (6820, 'Club', 1, '1'),
  (6841, 'Crossbow', 1, '2'),
  (6910, 'Elven Curve Blade', 1, '2'),
  (6959, 'Flail', 1, '1'),
  (6995, 'Glaive', 1, '2'),
  (7008, 'Greatclub', 1, '2'),
  (7015, 'Halberd', 1, '2'),
  (7019, 'Hand Crossbow', 1, '1'),
  (7042, 'Horsechopper', 1, '2'),
  (7056, 'Javelin', 1, '1'),
  (7058, 'Kama', 1, '1'),
  (7059, 'Katana', 1, '1'),
  (7060, 'Katar', 1, '1'),
  (7063, 'Kukri', 1, '1'),
  (7074, 'Light Hammer', 1, '1'),
  (7075, 'Light Mace', 1, '1'),
  (7076, 'Light Pick', 1, '1'),
  (7088, 'Longbow', 1, '1+'),
  (7089, 'Longspear', 1, '2'),
  (7090, 'Longsword', 1, '1'),
  (7092, 'Mace', 1, '1'),
  (7598, 'Morningstar', 1, '1'),
  (7609, 'Nunchaku', 1, '1'),
  (7631, 'Orc Knuckle Dagger', 1, '1'),
  (7685, 'Rapier', 1, '1'),
  (7719, 'Sai', 1, '1'),
  (7722, 'Sap', 1, '1'),
  (7724, 'Sawtooth Saber', 1, '1'),
  (7728, 'Scimitar', 1, '1'),
  (7763, 'Shortbow', 1, '1+'),
  (7764, 'Shortsword', 1, '1'),
  (7853, 'Staff', 1, '1'),
  (7873, 'Sword Cane', 1, '1'),
  (7906, 'Trident', 1, '1'),
  (7947, 'Warhammer', 1, '1'),
  (13070, 'Hand Adze (legacy)', 18, '1'),
  (13562, 'Pick', 1, '1'),
  (17158, 'Khakkara', 1, '1')
)
select 'mundane-weapon-stat-fields' as id,
  not exists (select 1 from expected e left join public.item i on i.id = e.id
    where i.id is null or i.name is distinct from e.name
      or i.content_source_id is distinct from e.source
      or i.group is distinct from 'WEAPON'
      or i.hands is distinct from e.hands or i.usage is distinct from '')
  and exists (select 1 from public.item where id = 7056 and name = 'Javelin'
    and meta_data::jsonb->>'reload' = '—') as passed;
