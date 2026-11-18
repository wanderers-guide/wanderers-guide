-- Stage immediately before publishing the frontend that reads and writes skillChoice.
-- Keep the original operations and their evaluation order. Give each pair one saved identity.
DO $repair$
DECLARE
  expected jsonb;
  choice jsonb;
  operations_before jsonb;
  operations_after jsonb;
  current_hash text;
  target_hash text;
  branch text;
  operation_path text[];
BEGIN
  FOR expected IN SELECT value FROM jsonb_array_elements($skill_choices$[
  {
    "id": 20753,
    "name": "Skilled Human",
    "type": "heritage",
    "source": 3,
    "gate": "c00efdb5-b8d5-47cf-8e6c-d075396a56b4",
    "choices": [
      {
        "index": 0,
        "identity": {
          "id": "0d31cd5c-65df-437e-91d6-5151fc67c5bc",
          "previousIds": [
            "756bd886-c321-4dec-8ea9-112568382526",
            "b00d9373-98fe-45a0-83a1-c8be11076851"
          ]
        }
      }
    ],
    "beforeHash": "86947bcacf173ce860f3dba950376913",
    "afterHash": "757d4e8c78aaedb1974cfbbd8f20e50f",
    "historical": {
      "beforeHash": "43f68a3a3c156a2059d3f93a9e327887",
      "afterHash": "2d84e5e279b1ff6cee860df69a478fdc"
    }
  },
  {
    "id": 22505,
    "name": "Dual Studies",
    "type": "feat",
    "source": 842,
    "gate": "26285d20-f0ea-4976-9f37-34b264edd023",
    "choices": [
      {
        "index": 0,
        "identity": {
          "id": "7e86ae09-d4dd-4663-8fcd-a77217ec06e2",
          "previousIds": [
            "30a40a46-71cb-4064-9705-74c5b496ed29",
            "dbf77a5e-9c04-433a-8cee-b6e718d684e7"
          ]
        }
      }
    ],
    "beforeHash": "5c04e152755fec959f8a8178363b0c0e",
    "afterHash": "ce3fb02bd997c0a7766401443567562a"
  },
  {
    "id": 26793,
    "name": "Lorekeeper Shisk",
    "type": "heritage",
    "source": 28,
    "gate": "91cc1756-787c-4a2c-ad8b-d8ead9254e2a",
    "choices": [
      {
        "index": 0,
        "identity": {
          "id": "9af57091-96e0-4587-aca8-ca7fb2eac7b4",
          "previousIds": [
            "e40c0b42-bef1-40fe-9c5a-3167725dc81c",
            "97e55f56-29c9-4b57-bf00-ae19b74db37f"
          ]
        }
      },
      {
        "index": 1,
        "identity": {
          "id": "186b2873-43b9-466b-b633-f06482401cce",
          "previousIds": [
            "8dd279a0-8320-4268-8c8a-15262fc6bb0b",
            "3d2a800b-6ec5-49cf-b506-4a53b83dd9f0"
          ],
          "previousOptions": {
            "ec8259de-befa-4542-82ca-ef29974fb0a9": "SKILL_ARCANA",
            "0952c398-640d-4b19-9c8d-46782a2968a8": "SKILL_CRAFTING",
            "2de4a06c-43cd-4810-8137-0b2c7744677e": "SKILL_MEDICINE",
            "bc07b2de-fcf0-4c8f-bb4a-2f771317ef77": "SKILL_NATURE",
            "69722fae-a118-4c84-9da6-f7523e9099fc": "SKILL_OCCULTISM",
            "9f5af551-a167-488b-b177-3f7e4e04fa2e": "SKILL_RELIGION",
            "218184ba-0c84-4638-92b1-18d3ed4c15c9": "SKILL_SOCIETY",
            "6dc2639a-9279-41c1-86c8-ea3865ca4f84": "SKILL_SURVIVAL",
            "b69caf4b-f017-45dc-b63a-b96b13281696": "SKILL_ARCANA",
            "4199b6f9-0ea3-425f-9c83-9a15e7bc91d9": "SKILL_CRAFTING",
            "71619ae4-db45-493c-9943-b83571c2691b": "SKILL_MEDICINE",
            "8b393979-fbe2-4df2-80f9-30716694d7f4": "SKILL_NATURE",
            "5fafe6e5-35a0-4de6-a1e6-617f4983439e": "SKILL_OCCULTISM",
            "0a4b6b9e-4b05-4027-881c-2af4426a1c08": "SKILL_RELIGION",
            "484fb0d8-c33c-4440-b1c5-888f662ddb97": "SKILL_SOCIETY",
            "28bb0511-eb5a-4204-893b-67e4efe489b8": "SKILL_SURVIVAL"
          }
        }
      }
    ],
    "beforeHash": "c643bf0a0a9413752d13baef8a696dfe",
    "afterHash": "7e3b2756ee16b2ec9d293bed8b4dfa85"
  }
]$skill_choices$::jsonb)
  LOOP
    SELECT to_jsonb(b.operations) INTO operations_before FROM public.ability_block b
    WHERE b.id = (expected->>'id')::bigint AND b.content_source_id = (expected->>'source')::bigint
      AND b.type::text = expected->>'type' AND b.name = expected->>'name'
    FOR UPDATE;

    current_hash := md5(operations_before::text);
    IF current_hash = expected->>'afterHash' OR current_hash = expected #>> '{historical,afterHash}' THEN
      CONTINUE;
    END IF;
    IF current_hash = expected->>'beforeHash' THEN
      target_hash := expected->>'afterHash';
    ELSIF current_hash = expected #>> '{historical,beforeHash}' THEN
      -- The immutable catalog uses the numeric 4 where the live rule uses the string "4".
      target_hash := expected #>> '{historical,afterHash}';
    ELSE
      RAISE EXCEPTION 'Shared skill choice input changed for ability block %', expected->>'id';
    END IF;
    IF operations_before #>> '{0,id}' IS DISTINCT FROM expected->>'gate' THEN
      RAISE EXCEPTION 'Shared skill choice condition changed for ability block %', expected->>'id';
    END IF;

    operations_after := operations_before;
    FOR choice IN SELECT value FROM jsonb_array_elements(expected->'choices')
    LOOP
      FOREACH branch IN ARRAY ARRAY['trueOperations', 'falseOperations']
      LOOP
        operation_path := ARRAY['0', 'data', branch, choice->>'index', 'data', 'skillChoice'];
        operations_after := jsonb_set(operations_after, operation_path, choice->'identity');
      END LOOP;
    END LOOP;
    IF md5(operations_after::text) IS DISTINCT FROM target_hash THEN
      RAISE EXCEPTION 'Shared skill choice output differs from the review for ability block %', expected->>'id';
    END IF;

    UPDATE public.ability_block
    SET operations = ARRAY(SELECT entry.value::json FROM jsonb_array_elements(operations_after) AS entry(value))
    WHERE id = (expected->>'id')::bigint;
  END LOOP;
END;
$repair$;
