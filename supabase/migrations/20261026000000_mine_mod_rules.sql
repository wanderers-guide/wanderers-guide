-- Preserve the printed Mine Exocortex mods in Modify's calculated rules.
DO $repair$
DECLARE
  entry jsonb;
  current_row public.ability_block%ROWTYPE;
BEGIN
  -- Older installations can contain only Tech Core spells. Activate this repair
  -- only when the Mechanic rules or either mine feat have been imported.
  IF NOT EXISTS (SELECT 1 FROM public.ability_block WHERE content_source_id = 900 AND id IN (59021,59580,59691)) THEN
    RETURN;
  END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements($entries$[{"id": 59580, "name": "Maneuvering Mines", "description": "Your mines push or pull creatures away from them. You gain the following new mods.\n\n- **Big Bang (mine exocortex):** Your mines blow enemies away. Creatures that fail their saving throw against the mine are pushed 5 feet directly away from the mine (or pushed 10 feet directly away from the mine and knocked prone on a critical failure). This is forced movement.\n- **Black Hole (mine exocortex):** Your mines harness gravity-bending technology. Creatures that fail their saving throw against the mine are pulled 5 feet toward the mine (or pulled 10 feet toward the mine and slowed 1 on a critical failure). This is forced movement.", "operation": {"id": "39ac8a40-bc4a-40d4-a8de-50e3b4a8f4a1", "type": "injectText", "data": {"type": "feat", "id": 59021, "text": "**Maneuvering Mines**\n\nYour mines push or pull creatures away from them. You gain the following new mods.\n\n- **Big Bang (mine exocortex):** Your mines blow enemies away. Creatures that fail their saving throw against the mine are pushed 5 feet directly away from the mine (or pushed 10 feet directly away from the mine and knocked prone on a critical failure). This is forced movement.\n- **Black Hole (mine exocortex):** Your mines harness gravity-bending technology. Creatures that fail their saving throw against the mine are pulled 5 feet toward the mine (or pulled 10 feet toward the mine and slowed 1 on a critical failure). This is forced movement."}}}, {"id": 59691, "name": "Healing Mines", "description": "You've designed a mine that explodes with healing medicine. You gain the following new mod.\n\n**Healing Mines (mine exocortex):** Your mine uses tiny four-sided syringes full of concentrated medicine. Instead of dealing damage, your healing mine causes creatures to regain a number of Hit Points equal to the mine's number of damage dice. Unlike your usual mines, creatures in the area don't attempt a saving throw. At 8th level, add your Intelligence modifier to the number of Hit Points regained.", "operation": {"id": "e1b1f163-1d53-44ff-8f73-0bf5187e5c2a", "type": "injectText", "data": {"type": "feat", "id": 59021, "text": "**Healing Mines**\n\nYou've designed a mine that explodes with healing medicine. You gain the following new mod.\n\n**Healing Mines (mine exocortex):** Your mine uses tiny four-sided syringes full of concentrated medicine. Instead of dealing damage, your healing mine causes creatures to regain a number of Hit Points equal to the mine's number of damage dice. Unlike your usual mines, creatures in the area don't attempt a saving throw. At 8th level, add your Intelligence modifier to the number of Hit Points regained."}}}]$entries$::jsonb)
  LOOP
    SELECT * INTO STRICT current_row FROM public.ability_block WHERE id = (entry->>'id')::bigint FOR UPDATE;
    IF current_row.content_source_id <> 900 OR current_row.name <> entry->>'name'
       OR current_row.description IS DISTINCT FROM entry->>'description' THEN
      RAISE EXCEPTION 'Mine mod content changed: %', entry->>'id';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(current_row.operations) op WHERE op::jsonb = entry->'operation') THEN
      CONTINUE;
    END IF;
    IF coalesce(cardinality(current_row.operations), 0) <> 0 THEN
      RAISE EXCEPTION 'Mine mod operations changed: %', entry->>'id';
    END IF;
    IF EXISTS (SELECT 1 FROM public.content_update WHERE ref_id = current_row.id AND type = 'ability-block'
      AND (status->>'state' IS NULL OR status->>'state' NOT IN ('APPROVED', 'REJECTED'))) THEN
      RAISE EXCEPTION 'Mine mod has a pending curator submission: %', entry->>'id';
    END IF;
    UPDATE public.ability_block SET operations = ARRAY[(entry->'operation')::json] WHERE id = current_row.id;
  END LOOP;
END;
$repair$;
