select 'war-bespell-tradition' as id, count(*) = 1 as passed
from public.ability_block
where id = 39157
  and uuid = 5320033208115637
  and name = 'Bespell Strikes'
  and type = 'feat'
  and level = 8
  and content_source_id = 400
  and md5(description) = '6bc8441098606f315ea12e4e983de326';
