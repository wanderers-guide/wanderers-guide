-- Restrict Winter's Kiss to its printed resistance sources; preserve existing feat and saved data.
do $repair$
declare
  spec constant jsonb := $winter$
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
$winter$::jsonb;
  source_body jsonb;
  dependency_body jsonb;
  body jsonb;
  captured jsonb;
  expected_after jsonb;
  stored public.ability_block%rowtype;
  changed integer;
begin
  lock table public.content_update in share mode;
  if spec#>>'{owner,expected,id}' is distinct from '51111'
    or spec#>>'{owner,expected,uuid}' is distinct from '2502113980657498'
    or spec#>>'{owner,expected,content_source_id}' is distinct from '16'
    or spec#>>'{dependency,expected,id}' is distinct from '3295'
    or spec#>>'{source,expected,id}' is distinct from '16'
    or jsonb_array_length(spec->'targets')<>3
    or spec#>'{owner,after,operations}' is distinct from jsonb_set(
      spec#>'{owner,before,operations}',
      '{0,data,contributionChecks}',
      '{"a1c82e23-3f93-4fe3-ab5c-7b4c7fdbcd85":{"categories":["heritage","ancestry-feat","class-feat","archetype-feat"],"excludeCurrentContent":true,"match":"typed-amount"}}'::jsonb,true
    )
    or spec#>'{owner,after,source}' is distinct from
      '{"url":"https://2e.aonprd.com/Feats.aspx?ID=4102","book":"Treasure Vault (Remastered)","page":"185"}'::jsonb then raise exception 'Invalid Winter resistance repair scope'; end if;

  select to_jsonb(s) into source_body from public.content_source s where id=16 for update;
  if not found or exists (
    select 1 from jsonb_each(spec#>'{source,expected}') e
    where source_body->e.key is distinct from e.value
  ) then
    raise exception 'Winter official source identity/publication changed';
  end if;
  select to_jsonb(t) into dependency_body from public.trait t where id=3295 for share;
  if not found or exists (
    select 1 from jsonb_each(spec#>'{dependency,expected}') e
    where (dependency_body||jsonb_build_object('uuid',dependency_body->>'uuid'))->e.key is distinct from e.value
  ) or jsonb_typeof(dependency_body->'meta_data') is distinct from 'object'
  or exists (
    select 1 from jsonb_each(spec#>'{dependency,metadata}') e
    where (dependency_body->'meta_data')->e.key is distinct from e.value
  ) or exists (
    select 1 from jsonb_array_elements_text(spec#>'{dependency,metadata_absent}') k(key)
    where (dependency_body->'meta_data') ? k.key
  ) then
    raise exception 'Winter archetype trait identity/classification changed';
  end if;
  if exists (
    select 1 from public.content_update u
    cross join jsonb_array_elements(spec->'targets') t
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
  ) then raise exception 'Winter content has a pending or malformed curator submission'; end if;

  select * into stored from public.ability_block where id=51111 for update;
  if not found then raise exception 'Winter resistance feat is missing'; end if;
  body:=to_jsonb(stored);
  if exists (
    select 1 from jsonb_each(spec#>'{owner,expected}') e
    where (body||jsonb_build_object('uuid',body->>'uuid'))->e.key is distinct from e.value
  ) or jsonb_typeof(body->'meta_data') is distinct from 'object'
  or exists (
    select 1 from jsonb_array_elements_text(spec#>'{owner,metadata_absent}') k(key)
    where (body->'meta_data') ? k.key
  ) then
    raise exception 'Winter feat identity/content/behavioral metadata changed';
  end if;
  if not ((body->'operations' is not distinct from spec#>'{owner,before,operations}'
      and body#>'{meta_data,source}' is not distinct from spec#>'{owner,before,source}') or (body->'operations' is not distinct from spec#>'{owner,after,operations}'
      and body#>'{meta_data,source}' is not distinct from spec#>'{owner,after,source}')) then
    raise exception 'Winter operations and citation are not a complete reviewed state';
  end if;
  captured:=body-'updated_at'-'search_tsv';
  expected_after:=jsonb_set(jsonb_set(captured,'{operations}',spec#>'{owner,after,operations}',false),
    '{meta_data,source}',spec#>'{owner,after,source}',false);
  if body->'operations' is not distinct from spec#>'{owner,after,operations}'
      and body#>'{meta_data,source}' is not distinct from spec#>'{owner,after,source}' then return; end if;

  update public.ability_block a set
    operations=array(select value::json from jsonb_array_elements(spec#>'{owner,after,operations}')
      with ordinality as entries(value,position) order by position),
    meta_data=jsonb_set(a.meta_data::jsonb,'{source}',spec#>'{owner,after,source}',false)::json
    where a.id=51111 and (to_jsonb(a)-'updated_at'-'search_tsv') is not distinct from captured;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Winter full-row compare-and-set failed'; end if;
  select to_jsonb(a)-'updated_at'-'search_tsv' into body from public.ability_block a where id=51111;
  if not found or body is distinct from expected_after then
    raise exception 'Winter final readback changed an unrelated field or failed its terminal state';
  end if;
  select to_jsonb(s)-'updated_at'-'search_tsv' into body from public.content_source s where id=16;
  if not found or body is distinct from (source_body-'updated_at'-'search_tsv') then
    raise exception 'Winter write changed an unrelated source field';
  end if;
  select to_jsonb(t)-'updated_at'-'search_tsv' into body from public.trait t where id=3295;
  if not found or body is distinct from (dependency_body-'updated_at'-'search_tsv') then
    raise exception 'Winter write changed an unrelated dependency field';
  end if;
end
$repair$;
