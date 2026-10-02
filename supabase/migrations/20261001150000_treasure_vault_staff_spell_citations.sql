-- Add only reviewed Impossible Magic citation leaves; retain spell content and unrelated metadata.
do $repair$
declare
  spec constant jsonb := $staffcite$
{
  "spells": [
    {
      "id": 9000,
      "expected": {
        "id": 9000,
        "name": "Phantom Crowd",
        "rank": 2,
        "traditions": [
          "arcane",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1432,
          1447,
          1433,
          1479
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "60 feet",
        "area": "10-foot-by-10-foot square",
        "targets": "",
        "duration": "sustained up to 10 minutes",
        "description": "A tightly packed crowd of humanoids appropriate to the area appear, facing you and agreeing loudly with anything you say. A creature that touches a member of the crowd or attempts a [Seek](link_action_19845) action to examine the crowd can attempt to disbelieve your illusion. The crowd is difficult terrain for anyone who hasn’t disbelieved the illusion.\n\nWhen you spend 1 or more actions to cast a [composition](link_trait_1895) spell or to perform an activity that includes a Performance check, you can also [Sustain](link_action_19858) this Spell as part of that action.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "4197355284093809",
        "heightened": {
          "text": [
            {
              "amount": "(+1)",
              "text": "The crowd occupies an additional 10-foot-by-10- foot square in range. The additional square doesn’t need to be adjacent to any other square. It can overlap, but there’s no additional effect in the overlapped squares."
            }
          ],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2787",
            "book": "Impossible Magic",
            "page": "157"
          }
        }
      }
    },
    {
      "id": 9010,
      "expected": {
        "id": 9010,
        "name": "Quick Sort",
        "rank": 1,
        "traditions": [
          "arcane",
          "divine",
          "occult",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "THREE-ACTIONS",
        "traits": [
          1432,
          1433
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "10 feet",
        "area": "",
        "targets": "up to 200 unattended objects in range, each of light Bulk or less",
        "duration": "up to 1 minute",
        "description": "You magically sort a group of objects into neat stacks or piles. You can sort the objects in two different ways. The first option is to separate them into different piles depending on an easily observed factor, such as color or shape. Alternatively, you can sort the objects into ordered stacks depending on a clearly indicated notation, such as a page number, title, or date. The objects sort themselves throughout the duration, though it takes less time per object to sort a smaller number of objects, down to a single round for 30 or fewer objects.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "6236332801290631",
        "heightened": {
          "text": [
            {
              "amount": "(3rd)",
              "text": "The spell can sort up to 500 objects in a minute, or 75 objects in a round."
            }
          ],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2797",
            "book": "Impossible Magic",
            "page": "158"
          }
        }
      }
    },
    {
      "id": 9011,
      "expected": {
        "id": 9011,
        "name": "Read the Air",
        "rank": 0,
        "traditions": [
          "divine",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "TWO-ACTIONS",
        "traits": [
          1858,
          1432,
          1433,
          1899
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "",
        "area": "",
        "targets": "",
        "duration": "1 minute",
        "description": "You survey a social situation, showing courtesy to all around you as your intuition swiftly picks up clues about social contexts and unspoken assumptions of behavior. Your body language subconsciously changes to take advantage of this information and use it in your own interactions with those creatures.\n\nAs part of [Casting this Spell](link_action_19611), you [Recall Knowledge](link_action_19753) using Society to gain information about the social situation. You also gain a +1 status bonus to your next Diplomacy check to [Make an Impression](link_action_19739) on those creatures present when you [Cast this Spell](link_action_19611), as long as the check occurs during the duration of the spell. You can _read the air_ only once in a given social situation; casting it again has no effect.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "2151504166891879",
        "heightened": {
          "text": [],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2798",
            "book": "Impossible Magic",
            "page": "159"
          }
        }
      }
    },
    {
      "id": 9015,
      "expected": {
        "id": 9015,
        "name": "Restyle",
        "rank": 1,
        "traditions": [
          "arcane",
          "divine",
          "occult",
          "primal"
        ],
        "rarity": "COMMON",
        "cast": "1 minute",
        "traits": [
          1432,
          1433
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "touch",
        "area": "",
        "targets": "1 piece of clothing currently worn by you or an ally",
        "duration": "unlimited",
        "description": "You permanently change the appearance of one piece of clothing currently worn by you or an ally to better fit your aesthetic sensibilities. You can change its color, texture, pattern, and other minor parts of its design, but the changes can’t alter the clothing’s overall shape, size, or purpose. The changes can’t increase the quality of the craftsmanship or artistry of the piece of clothing, but particularly gauche choices for the new color and pattern might decrease its aesthetic appeal. This spell transforms existing materials into the desired appearance and never alters the material or creates more material than what’s originally part of the object. The object’s statistics also remain unchanged.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "2689375792704345",
        "heightened": {
          "text": [],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2803",
            "book": "Impossible Magic",
            "page": "160"
          }
        }
      }
    },
    {
      "id": 9053,
      "expected": {
        "id": 9053,
        "name": "Timely Tutor",
        "rank": 2,
        "traditions": [
          "arcane",
          "occult"
        ],
        "rarity": "COMMON",
        "cast": "ONE-ACTION",
        "traits": [
          1433,
          1448
        ],
        "defense": "",
        "cost": "",
        "trigger": "",
        "requirements": "",
        "range": "touch",
        "area": "",
        "targets": "your eidolon or familiar",
        "duration": "sustained up to 1 minute",
        "description": "You serve as an astral connection between your eidolon or familiar and the Akashic Record—a demiplane consisting of a comprehensive psychic library. If you [Cast this Spell](link_action_19611) on your [familiar](link_trait_3843), your [familiar](link_trait_3843) adds your spellcasting attribute modifier on checks to [Recall Knowledge](link_action_19753) with the Lore skill of your choice, much like they do for Acrobatics and Stealth. Your familiar must have the [speech](link_feat_40567) familiar ability in order to share any information they learn with you. If you [Cast this Spell](link_action_19611) on your [eidolon](link_trait_2937), they instead become trained in the Lore skill of your choice.\n\nIf you lose physical contact with the target, their connection to the Akashic Record is severed, and the spell immediately ends.",
        "content_source_id": 842,
        "version": "1.0",
        "uuid": "3548619550253440",
        "heightened": {
          "text": [],
          "data": {}
        },
        "availability": null
      },
      "metadata": {
        "before": {},
        "after": {
          "source": {
            "url": "https://2e.aonprd.com/Spells.aspx?ID=2845",
            "book": "Impossible Magic",
            "page": "167"
          }
        }
      }
    }
  ],
  "source": {
    "expected": {
      "id": 842,
      "name": "Impossible Magic",
      "user_id": null,
      "is_published": true,
      "require_key": false,
      "deprecated": null,
      "group": "pathfinder-core",
      "required_content_sources": [
        1
      ]
    }
  }
}
$staffcite$::jsonb;
  patch jsonb;
  actual jsonb;
  actual_metadata jsonb;
  citation_state jsonb;
  property record;
  affected integer;
begin
  lock table public.content_update in share mode;
  perform id from public.content_source where id=842 order by id for share;
  select to_jsonb(s) into actual from public.content_source s where s.id=842;
  if actual is null or exists (
    select 1 from jsonb_each(spec #> '{source,expected}') p
    where actual->p.key is distinct from p.value
  ) then raise exception 'Staff spell citation official source identity/publication changed'; end if;

  -- ref_id is authoritative for UPDATE/DELETE with empty data; unknown relevant status fails closed.
  if exists (select 1 from public.content_update u where coalesce(u.status->>'state','PENDING') not in ('APPROVED','REJECTED') and (
    (u.type='spell' and (
      u.ref_id in (9000,9010,9011,9015,9053)
      or ((u.content_source_id=842 or u.data->>'content_source_id'='842')
        and exists (select 1 from jsonb_array_elements(spec->'spells') p
          where u.data->>'name'=p #>> '{expected,name}'))
    ))
    or (u.type='content-source' and (
      u.ref_id=842 or u.data->>'id'='842' or u.data->>'name'='Impossible Magic'
    ))
  )) then
    raise exception 'Staff spell citation repair has a pending or malformed owner/source submission';
  end if;
  perform id from public.spell where id in (9000,9010,9011,9015,9053) order by id for update;

  -- Validate every row before the first write, including exact reviewed mechanics and prose.
  for patch in select value from jsonb_array_elements(spec->'spells') loop
    select to_jsonb(s) into actual from public.spell s where s.id=(patch->>'id')::bigint;
    if actual is null then raise exception 'Missing staff spell citation row %',patch->>'id'; end if;
    for property in select key,value from jsonb_each(patch->'expected') loop
      if (case when property.key='uuid' then
          actual->>property.key is distinct from property.value #>> '{}'
        else actual->property.key is distinct from property.value end) then
        raise exception 'Staff spell citation % field % changed',patch->>'id',property.key;
      end if;
    end loop;
    actual_metadata := actual->'meta_data';
    if jsonb_typeof(actual_metadata) is distinct from 'object' then
      raise exception 'Staff spell citation % metadata is not an object',patch->>'id';
    end if;
    citation_state := case when actual_metadata ? 'source'
      then jsonb_build_object('source',actual_metadata->'source') else '{}'::jsonb end;
    if citation_state is distinct from patch #> '{metadata,before}'
        and citation_state is distinct from patch #> '{metadata,after}' then
      raise exception 'Staff spell citation % source differs from reviewed pair',patch->>'id';
    end if;
  end loop;

  for patch in select value from jsonb_array_elements(spec->'spells') loop
    select s.meta_data::jsonb into actual_metadata from public.spell s where s.id=(patch->>'id')::bigint;
    if actual_metadata->'source' is not distinct from patch #> '{metadata,after,source}' then continue; end if;
    update public.spell s
      set meta_data=jsonb_set(s.meta_data::jsonb,'{source}',patch #> '{metadata,after,source}',true)::json
      where s.id=(patch->>'id')::bigint
        and s.uuid::text=patch #>> '{expected,uuid}'
        and s.content_source_id=(patch #>> '{expected,content_source_id}')::bigint
        and jsonb_typeof(s.meta_data::jsonb)='object'
        and not (s.meta_data::jsonb ? 'source');
    get diagnostics affected=row_count;
    if affected <> 1 then raise exception 'Staff spell citation % leaf compare-and-set failed',patch->>'id'; end if;
  end loop;
end
$repair$;
