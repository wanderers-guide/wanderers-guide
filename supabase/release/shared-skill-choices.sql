-- Verify the three adopted records match the reviewed shared-choice operations.
WITH expected(id, source_id, type, name, operations_hashes) AS (VALUES
  (20753, 3, 'heritage', 'Skilled Human', ARRAY['757d4e8c78aaedb1974cfbbd8f20e50f', '2d84e5e279b1ff6cee860df69a478fdc']),
  (22505, 842, 'feat', 'Dual Studies', ARRAY['ce3fb02bd997c0a7766401443567562a']),
  (26793, 28, 'heritage', 'Lorekeeper Shisk', ARRAY['7e3b2756ee16b2ec9d293bed8b4dfa85'])
)
SELECT 'shared-skill-choices' AS id, count(*) = 3 AS passed
FROM expected e
JOIN public.ability_block b ON b.id = e.id AND b.content_source_id = e.source_id
  AND b.type::text = e.type AND b.name = e.name
  AND md5(to_jsonb(b.operations)::text) = ANY(e.operations_hashes);
