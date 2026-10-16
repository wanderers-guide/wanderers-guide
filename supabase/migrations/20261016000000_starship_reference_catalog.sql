-- Keep starship references in the existing catalog, outside living-entity readers.
BEGIN;
ALTER TABLE public.creature DROP CONSTRAINT creature_type_check;
ALTER TABLE public.creature ADD CONSTRAINT creature_type_check
  CHECK (type IN ('creature', 'hazard', 'starship'));
COMMIT;
