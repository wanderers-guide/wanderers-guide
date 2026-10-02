select 'war-spell-emphasis' as id, count(*) = 1 as passed
from public.spell
where id = 7282
  and name = 'Beseech Arcanotheign'
  and uuid = 4591751933917325
  and content_source_id = 400
  and meta_data #>> '{source,book}' = 'War of Immortals'
  and meta_data #>> '{source,page}' = '154'
  and meta_data #>> '{source,url}' = 'https://2e.aonprd.com/MythicSpells.aspx?ID=2153'
  and md5(description) = '0a761e733db000059b4ffb760bff3e98'
  and (length(description) - length(replace(description, '_Flash of Brilliance Arcanotheign_', '')))
    / length('_Flash of Brilliance Arcanotheign_') = 0
  and (length(description) - length(replace(description, '_Flash of Brilliance_ Arcanotheign', '')))
    / length('_Flash of Brilliance_ Arcanotheign') = 1;
