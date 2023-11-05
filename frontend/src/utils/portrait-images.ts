import { ImageOption } from "@typing/index";
import _ from "lodash";

// TODO: Move this to the db?
const imageStore: Record<string, ImageOption[]> = {
  ai_generated: [
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/4A5D933E-BD66-4B30-A757-604450FEFB68.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/06A9B011-B71B-4E73-92B3-7CDB2F3EC817.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/4E5C69FC-9139-481D-B417-8113B5571A91.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/F43532E8-BE7B-42F9-B474-A632CFDD5490.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/8BC4F14B-B1AF-4BAB-983F-BD9CC4D2F115.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/7298B278-9F5A-4064-A378-1B0F84B22C04.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/74733B57-3B0A-4561-B01F-C1A107CFC55A.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/8CEF328A-7F5B-4895-ABDA-749C3F6C134F.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/A92CDB69-AAA5-4243-9D43-BE8EB3CD8409.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/E65E4D68-5DD4-431D-B4E6-0EAABC7FBC91.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/1FFD4BA9-5D30-4E03-9FCE-E424158C2658.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/6D8350F0-E9A3-4F2B-B443-0C39DD1FB9AB.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/67F56C09-F343-46A3-8B57-0FB512151DF4.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/2007FAE0-32C9-433A-A288-45B330993341.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/AFDF8DB1-78E9-4CE4-901B-FEF14D445DF8.jpeg',
    },
    {
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/414AA201-8794-4A57-AF04-A03027717198.jpeg',
    },
  ],
  pathfinder_iconics: [
    {
      name: 'Feiya',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Witch%20-%20Feiya.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Oloch',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Warpriest%20-%20Oloch.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Red Raven',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Vigilante%20-%20Red%20Raven.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Aric',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Vigilante%20-%20Aric.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Ezren',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Wizard%20-%20Ezren.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Zelhara',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Torturer%20-%20Zelhara.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Zadim',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Slayer%20-%20Zadim.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Shardra',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Shaman%20-%20Shardra.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Hayato',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Samurai%20-%20Hayato.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Hakon',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Skald%20-%20Hakon.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Seoni',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Sorcerer%20-%20Seoni.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Balazar',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Summoner%20-%20Balazar.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Zova',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Shifter%20-%20Zova.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Merisiel',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Rogue%20-%20Merisiel.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Estra',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Spiritualist%20-%20Estra.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Jirelle',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Swashbuckler%20-%20Jirelle.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Harsk',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Ranger%20-%20Harsk.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Meligaster',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Mesmerist%20-%20Meligaster.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Nyctessa',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Necromancer%20-%20Nyctessa.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Seelah',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Paladin%20-%20Seelah.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Alahazra',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Oracle%20-%20Alahazra.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Reiko',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Ninja%20-%20Reiko.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Mavaro',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Occultist%20-%20Mavaro.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Erasmus',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Medium%20-%20Erasmus.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Rivani',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Psychic%20-%20Rivani.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Sajan',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Monk%20-%20Sajan.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Lini',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Druid%20-%20Lini.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Yoon',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Kineticist%20-%20Yoon.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Seltyiel',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Magus%20-%20Seltyiel.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Imrijka',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Inquisitor%20-%20Imrijka.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Lirianne',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Gunslinger%20-%20Lirianne.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Adowyn',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Hunter%20-%20Adowyn.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Valeros',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Fighter%20-%20Valeros.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Quinn',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Investigator%20-%20Quinn.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Lazzero',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Cleric%20-%20Lazzero.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Linxia',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Hellknight%20-%20Linxia.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Urgraz',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Antipaladin%20-%20Urgraz.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Kyra',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Cleric%20-%20Kyra.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Lem',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Bard%20-%20Lem.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Damiel',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Alchemist%20-%20Damiel.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Alian',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Cavalier%20-%20Alian.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Crowe',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Bloodrager%20-%20Crowe.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Emil',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Assassin%20-%20Emil.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Kess',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Brawler%20-%20Kess.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Amiri',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Barbarian%20-%20Amiri.png',
      source: 'Paizo, Pathfinder',
    },
    {
      name: 'Enora',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Arcanist%20-%20Enora.png',
      source: 'Paizo, Pathfinder',
    },
  ],
  starfinder_iconics: [
    {
      name: 'Navasi',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Envoy%20-%20Navasi.png',
      source: 'Paizo, Starfinder',
    },
    {
      name: 'Quig',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Mechanic%20-%20Quig.png',
      source: 'Paizo, Starfinder',
    },
    {
      name: 'Keskodai',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Mystic%20-%20Keskodai.png',
      source: 'Paizo, Starfinder',
    },
    {
      name: 'Iseph',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Operative%20-%20Iseph.png',
      source: 'Paizo, Starfinder',
    },
    {
      name: 'Altronus',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Solarian%20-%20Altronus.png',
      source: 'Paizo, Starfinder',
    },
    {
      name: 'Obozaya',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Soldier%20-%20Obozaya.png',
      source: 'Paizo, Starfinder',
    },
    {
      name: 'Raia',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/portraits/default/Technomancer%20-%20Raia.png',
      source: 'Paizo, Starfinder',
    },
  ],
};


export function getPortraitImageStore() {
  return _.cloneDeep(imageStore);
}

export function getAllPortraitImages() {
  const images: ImageOption[] = [];
  for (const category of Object.keys(imageStore)) {
    images.push(...imageStore[category]);
  }
  return images;
}

