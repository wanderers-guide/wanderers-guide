with spec as (select $winter$
{
  "owner": {
    "expected": {
      "id": 51111,
      "name": "Winter's Kiss",
      "actions": null,
      "level": 14,
      "rarity": "COMMON",
      "prerequisites": [
        "Winter's Embrace"
      ],
      "frequency": "",
      "cost": "",
      "trigger": "",
      "requirements": "",
      "access": "",
      "description": "Whether in the heart of a volcanic passageway or the glacial tundras of the Crown of the World, the only temperature you ever personally experience is an oddly comfortable chill. You are now protected from extreme cold and extreme heat, and you gain resistance to fire equal to half your level. If you would already have resistance to fire equal to half your level from a heritage, ancestry feat, class feat, or another archetype feat, you instead gain resistance to fire equal to your level.",
      "special": "",
      "type": "feat",
      "traits": [
        3295
      ],
      "content_source_id": 16,
      "version": null,
      "uuid": "2502113980657498",
      "availability": null
    },
    "metadata_absent": [
      "unselectable",
      "deprecated",
      "can_select_multiple_times",
      "skill"
    ],
    "before": {
      "operations": [
        {
          "id": "174d1f63-c667-426b-8f34-690751fcbebe",
          "type": "conditional",
          "data": {
            "conditions": [
              {
                "id": "a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85",
                "name": "RESISTANCES",
                "data": {
                  "name": "RESISTANCES",
                  "type": "list-str",
                  "value": []
                },
                "type": "list-str",
                "operator": "INCLUDES",
                "value": "fire, {{level/2}}"
              }
            ],
            "trueOperations": [
              {
                "id": "5a39d98e-ee5f-454d-a318-95fdf2a40864",
                "type": "adjValue",
                "data": {
                  "variable": "RESISTANCES",
                  "value": "fire, {{level}}"
                }
              }
            ],
            "falseOperations": [
              {
                "id": "1b05397e-dee5-43d2-8e41-5dc0e95c78c4",
                "type": "adjValue",
                "data": {
                  "variable": "RESISTANCES",
                  "value": "fire, {{level/2}}"
                }
              }
            ]
          }
        }
      ],
      "source": {
        "url": "https://2e.aonprd.com/Feats.aspx?ID=8966",
        "book": "Treasure Vault",
        "page": "185"
      }
    },
    "after": {
      "operations": [
        {
          "id": "174d1f63-c667-426b-8f34-690751fcbebe",
          "type": "conditional",
          "data": {
            "conditions": [
              {
                "id": "a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85",
                "name": "RESISTANCES",
                "data": {
                  "name": "RESISTANCES",
                  "type": "list-str",
                  "value": []
                },
                "type": "list-str",
                "operator": "INCLUDES",
                "value": "fire, {{level/2}}"
              }
            ],
            "trueOperations": [
              {
                "id": "5a39d98e-ee5f-454d-a318-95fdf2a40864",
                "type": "adjValue",
                "data": {
                  "variable": "RESISTANCES",
                  "value": "fire, {{level}}"
                }
              }
            ],
            "falseOperations": [
              {
                "id": "1b05397e-dee5-43d2-8e41-5dc0e95c78c4",
                "type": "adjValue",
                "data": {
                  "variable": "RESISTANCES",
                  "value": "fire, {{level/2}}"
                }
              }
            ],
            "contributionChecks": {
              "a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85": {
                "categories": [
                  "heritage",
                  "ancestry-feat",
                  "class-feat",
                  "archetype-feat"
                ],
                "excludeCurrentContent": true,
                "match": "typed-amount"
              }
            }
          }
        }
      ],
      "source": {
        "url": "https://2e.aonprd.com/Feats.aspx?ID=4102",
        "book": "Treasure Vault (Remastered)",
        "page": "185"
      }
    }
  },
  "dependency": {
    "expected": {
      "id": 3295,
      "name": "Gelid Shard Archetype",
      "description": "This indicates content from the gelid shard archetype.",
      "content_source_id": 16,
      "uuid": "1200181923993124"
    },
    "metadata": {
      "archetype_trait": true
    },
    "metadata_absent": [
      "ancestry_trait",
      "class_trait",
      "versatile_heritage_trait",
      "companion_type_trait",
      "creature_trait",
      "unselectable",
      "deprecated"
    ]
  },
  "source": {
    "expected": {
      "id": 16,
      "name": "Treasure Vault",
      "user_id": null,
      "require_key": false,
      "is_published": true,
      "required_content_sources": [
        1
      ],
      "group": "pathfinder-core",
      "deprecated": null
    }
  },
  "targets": [
    {
      "type": "ability-block",
      "id": 51111,
      "uuid": "2502113980657498",
      "name": "Winter's Kiss",
      "source": 16
    },
    {
      "type": "trait",
      "id": 3295,
      "uuid": "1200181923993124",
      "name": "Gelid Shard Archetype",
      "source": 16
    },
    {
      "type": "content-source",
      "id": 16,
      "name": "Treasure Vault",
      "source": 16
    }
  ]
}
$winter$::jsonb value)
select 'treasure-vault-winter-resistance'::text id,
coalesce((select
  not (spec.value#>>'{owner,expected,id}' is distinct from '51111'
    or spec.value#>>'{owner,expected,uuid}' is distinct from '2502113980657498'
    or spec.value#>>'{owner,expected,content_source_id}' is distinct from '16'
    or spec.value#>>'{dependency,expected,id}' is distinct from '3295'
    or spec.value#>>'{source,expected,id}' is distinct from '16'
    or jsonb_array_length(spec.value->'targets')<>3
    or spec.value#>'{owner,after,operations}' is distinct from jsonb_set(
      spec.value#>'{owner,before,operations}',
      '{0,data,contributionChecks}',
      '{"a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85":{"categories":["heritage","ancestry-feat","class-feat","archetype-feat"],"excludeCurrentContent":true,"match":"typed-amount"}}'::jsonb,true
    )
    or spec.value#>'{owner,after,source}' is distinct from
      '{"url":"https://2e.aonprd.com/Feats.aspx?ID=4102","book":"Treasure Vault (Remastered)","page":"185"}'::jsonb)
  and not exists (
    select 1 from public.content_source s
    right join (select 16::bigint id) wanted on s.id=wanted.id
    where s.id is null or exists (
    select 1 from jsonb_each(spec.value#>'{source,expected}') e
    where to_jsonb(s)->e.key is distinct from e.value
  )
  )
  and not exists (
    select 1 from public.trait t
    right join (select 3295::bigint id) wanted on t.id=wanted.id
    where t.id is null or exists (
    select 1 from jsonb_each(spec.value#>'{dependency,expected}') e
    where (to_jsonb(t)||jsonb_build_object('uuid',to_jsonb(t)->>'uuid'))->e.key is distinct from e.value
  ) or jsonb_typeof(to_jsonb(t)->'meta_data') is distinct from 'object'
  or exists (
    select 1 from jsonb_each(spec.value#>'{dependency,metadata}') e
    where (to_jsonb(t)->'meta_data')->e.key is distinct from e.value
  ) or exists (
    select 1 from jsonb_array_elements_text(spec.value#>'{dependency,metadata_absent}') k(key)
    where (to_jsonb(t)->'meta_data') ? k.key
  )
  )
  and not exists (
    select 1 from public.ability_block a
    right join (select 51111::bigint id) wanted on a.id=wanted.id
    where a.id is null or exists (
    select 1 from jsonb_each(spec.value#>'{owner,expected}') e
    where (to_jsonb(a)||jsonb_build_object('uuid',to_jsonb(a)->>'uuid'))->e.key is distinct from e.value
  ) or jsonb_typeof(to_jsonb(a)->'meta_data') is distinct from 'object'
  or exists (
    select 1 from jsonb_array_elements_text(spec.value#>'{owner,metadata_absent}') k(key)
    where (to_jsonb(a)->'meta_data') ? k.key
  )
      or to_jsonb(a.operations) is distinct from spec.value#>'{owner,after,operations}'
      or a.meta_data::jsonb->'source' is distinct from spec.value#>'{owner,after,source}'
  )
  and not exists (
    select 1 from public.content_update u
    cross join jsonb_array_elements(spec.value->'targets') t
    where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED')
      and u.type=t->>'type' and (
        u.ref_id=(t->>'id')::bigint or u.data->>'id'=t->>'id'
        or (t ? 'uuid' and u.data->>'uuid'=t->>'uuid')
        or (u.data->>'name'=t->>'name' and (
          t->>'type'='content-source'
          or u.content_source_id=(t->>'source')::bigint
          or u.data->>'content_source_id'=t->>'source'
        ))
      )
  )
  from spec),false) passed;
