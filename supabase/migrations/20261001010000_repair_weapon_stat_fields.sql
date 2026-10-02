-- Restore mundane weapon stat blocks: Hands is separate from Usage.
-- Verified source URLs are recorded per item; preserve all other fields and saved IDs.
-- Thrown javelin reload is the printed em dash convention (Core rules, Reload):
-- https://2e.aonprd.com/Rules.aspx?ID=218
-- Keep real Usage values on magical/alchemical weapons.
do $repair$
declare
  patches constant jsonb := $patches$
[
  {
    "id": 6714,
    "name": "Arbalest",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=432",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6736,
    "name": "Bastard Sword",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=370",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6748,
    "name": "Blowgun",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=424",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6749,
    "name": "Bo Staff",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=372",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6796,
    "name": "Clan Dagger",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=368",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6820,
    "name": "Club",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=357",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6841,
    "name": "Crossbow",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=425",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6910,
    "name": "Elven Curve Blade",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=406",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6959,
    "name": "Flail",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=374",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 6995,
    "name": "Glaive",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=375",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7008,
    "name": "Greatclub",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=377",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7015,
    "name": "Halberd",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=381",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7019,
    "name": "Hand Crossbow",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=427",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7042,
    "name": "Horsechopper",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=409",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7056,
    "name": "Javelin",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=429",
    "before": {
      "usage": "held in one hand",
      "reload": "-"
    },
    "after": {
      "usage": "",
      "reload": "—"
    }
  },
  {
    "id": 7058,
    "name": "Kama",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=410",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7059,
    "name": "Katana",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=411",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7060,
    "name": "Katar",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=369",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7063,
    "name": "Kukri",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=413",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7074,
    "name": "Light Hammer",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=384",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7075,
    "name": "Light Mace",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=360",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7076,
    "name": "Light Pick",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=385",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7088,
    "name": "Longbow",
    "source": 1,
    "hands": "1+",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=436",
    "before": {
      "usage": "held in one plus hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7089,
    "name": "Longspear",
    "source": 1,
    "hands": "2",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=361",
    "before": {
      "usage": "held in two hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7090,
    "name": "Longsword",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=386",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7092,
    "name": "Mace",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=362",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7598,
    "name": "Morningstar",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=363",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7609,
    "name": "Nunchaku",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=414",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7631,
    "name": "Orc Knuckle Dagger",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=415",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7685,
    "name": "Rapier",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=391",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7719,
    "name": "Sai",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=416",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7722,
    "name": "Sap",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=392",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7724,
    "name": "Sawtooth Saber",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=423",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7728,
    "name": "Scimitar",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=393",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7763,
    "name": "Shortbow",
    "source": 1,
    "hands": "1+",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=437",
    "before": {
      "usage": "held in one plus hands"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7764,
    "name": "Shortsword",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=398",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7853,
    "name": "Staff",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=367",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7873,
    "name": "Sword Cane",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=400",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7906,
    "name": "Trident",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=401",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 7947,
    "name": "Warhammer",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=403",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 13070,
    "name": "Hand Adze (legacy)",
    "source": 18,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=144",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 13562,
    "name": "Pick",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=389",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  },
  {
    "id": 17158,
    "name": "Khakkara",
    "source": 1,
    "hands": "1",
    "url": "https://2e.aonprd.com/Weapons.aspx?ID=412",
    "before": {
      "usage": "held in one hand"
    },
    "after": {
      "usage": ""
    }
  }
]
  $patches$::jsonb;
  patch jsonb;
  original public.item%rowtype;
  current_fields jsonb;
begin
  for patch in select value from jsonb_array_elements(patches) loop
    select * into original from public.item where id = (patch->>'id')::bigint for update;
    if not found or original.name is distinct from patch->>'name'
      or original.content_source_id is distinct from (patch->>'source')::bigint
      or original.group is distinct from 'WEAPON'
      or original.hands is distinct from patch->>'hands' then
      raise exception 'Weapon % identity or Hands changed; review before repair', patch->>'id';
    end if;
    current_fields := jsonb_build_object('usage', original.usage);
    if patch->'before' ? 'reload' then
      current_fields := current_fields || jsonb_build_object('reload', original.meta_data::jsonb->'reload');
    end if;
    if current_fields = patch->'after' then continue; end if;
    if current_fields is distinct from patch->'before' then
      raise exception 'Weapon % fields changed; review before repair', patch->>'id';
    end if;
    if exists (select 1 from public.content_update where type = 'item'
      and ref_id = original.id
      and coalesce(status->>'state', 'PENDING') not in ('APPROVED', 'REJECTED')) then
      raise exception 'Weapon % has a pending curator submission', patch->>'id';
    end if;
    update public.item set usage = patch #>> '{after,usage}',
      meta_data = case when patch->'after' ? 'reload'
        then jsonb_set(original.meta_data::jsonb, '{reload}', patch #> '{after,reload}')
        else original.meta_data::jsonb end
      where id = original.id;
  end loop;
end
$repair$;
