-- Deity's Domain can be taken through Basic Devotion without the champion class's
-- Devotion Spells feature. Its focus spell needs the same divine Charisma source.
UPDATE public.ability_block
SET operations = array_append(operations, $source$
{
  "id": "7c6a70fc-9a4b-4f78-9ab0-36caa4d24791",
  "type": "defineCastingSource",
  "data": {"variable": "CASTING_SOURCES", "value": "CHAMPION:::-:::DIVINE:::ATTRIBUTE_CHA"}
}
$source$::json)
WHERE id = 31855 AND name = 'Deity''s Domain' AND type = 'feat' AND content_source_id = 256
  AND NOT EXISTS (
    SELECT FROM unnest(operations) AS op
    WHERE op->>'type' = 'defineCastingSource'
      AND split_part(op->'data'->>'value', ':::', 1) = 'CHAMPION'
  );
