import type { OperationSelect } from '@schemas/operations';

/** The November 2026 domain conversion changed both the selector and its saved values. */
export const LEGACY_DOMAIN_SELECTOR_ID = '620cf16f-48c7-43d9-a5ab-3223d19b65f5';
const DOMAIN_SELECTOR_ID = 'e84bbcb8-7d6b-4b9d-a1a4-d5b98f65c34a';

/** Exact historical identities only; names never participate in saved-choice recovery. */
const LEGACY_DOMAIN_CHOICES: Readonly<Record<string, string>> = {
  '8a2adcea-be60-4f09-a4dd-1a9e5e79ba9f': '61092', // Air
  '391ed731-76dc-4693-a697-f482e0475bcf': '61093', // Ambition
  '6b7a8fbf-aaea-47d1-883d-f6fed90bbae8': '61095', // Cities
  '14e5f93c-1710-457e-81aa-1ce72ad45220': '61096', // Confidence
  'f1de490d-e278-44b2-adb8-5eb9673e90eb': '61097', // Creation
  'f9326db0-20fa-47c1-9f1c-1e3b3d85c392': '61098', // Darkness
  '5dfa80a4-7500-4896-a38c-7293253055c9': '61099', // Death
  '797f43fb-1870-4870-9c41-6cf041cf8e0e': '61101', // Destruction
  'e50dd539-5f28-40c5-9792-521dba10b3ed': '61104', // Dreams
  '81ea6eeb-7b6e-4021-a170-30435c70495e': '61107', // Earth
  'a5db702e-e771-4bb3-b6d6-2587074f3f28': '61108', // Family
  '3a64c6da-49d7-4feb-98b5-a55ea50c6a39': '61109', // Fate
  'b21d9c4f-c84c-4fe2-8bda-5c8ebfff5f11': '61110', // Fire
  '15e5fc9b-9a73-4a16-bffa-d6e5875a3717': '61111', // Freedom
  '147d38b8-0b15-424f-afc9-64f2e8ff3cdf': '61113', // Healing
  '97debb38-10fa-4c54-b14c-0214d359e782': '61114', // Indulgence
  '405d6c86-65a4-4061-abdd-a2850c838944': '61116', // Knowledge
  'def5af8b-8c0b-4b5b-be3e-1ae525c17440': '61118', // Luck
  'b19f75f5-a4f5-49c4-a778-e5d01bac0480': '61119', // Magic
  '1c546a0f-efb7-4adb-a756-61c1d63c68ac': '61121', // Might
  'a4bf13e8-17be-46e4-af1f-2f4af7d5ea56': '61122', // Moon
  '6b3b3ade-30d3-4ebe-a6ef-a1b0b1242821': '61124', // Nature
  'f2f8d79f-cf1d-4c77-b013-9ccfe19cf776': '61125', // Nightmares
  'f8cdfc7d-4177-4926-9aa3-bb65341e0294': '61127', // Pain
  'c713b9cf-244a-4f14-8e4f-b30664a9489b': '61128', // Passion
  'bc8281f7-bff0-41f9-95c2-126f9df50cce': '61129', // Perfection
  'd63a6fe4-2619-403d-bd2d-48e84c2920c7': '61131', // Protection
  '9302b8de-d59b-42d2-9a2f-0c4304934cd8': '61133', // Secrecy
  'ea647819-917c-4d3b-891c-691578c94118': '61137', // Sun
  '24531ce7-0c50-4277-a275-853b2f12db24': '61141', // Travel
  '566fbb30-5203-4ad3-9edb-66f4f135fdb3': '61142', // Trickery
  '2bf0c3a8-ffa6-47f1-ac65-65c3e1d74590': '61143', // Truth
  '739200ec-40aa-4029-ac12-6d9588cb652a': '61144', // Tyranny
  '3ca6e511-93e7-4d6f-9eee-fcb66d871920': '61145', // Undeath
  '6fb0b235-7a02-4043-ba11-2b5973e7e759': '61147', // Water
  '4ca92484-3f2b-4143-9b8a-dc9a570eaf8d': '61148', // Wealth
  '93eacb5f-f381-4f91-91e3-d611a48ebe8d': '61150', // Zeal
  'f6c0fbd7-a375-471f-af4d-697b6d6dd49a': '61091', // Abomination
  'b99207e0-664d-4956-9852-2721f819c7a2': '61094', // Change
  'c5d8b62b-a36b-4382-b7fb-8c5f217dda25': '61100', // Decay
  'e7be7ba6-85cf-4c15-a0da-0bd3bb7ab451': '61102', // Disorientation
  'e6f6e214-9d27-4e02-aebb-7992a17a48cd': '61103', // Dragon
  '1b64c46b-e837-425a-a86f-e70cd46e9363': '61105', // Dust
  '0340e221-6f3f-4481-a35f-25dc8d2a7885': '61106', // Duty
  '735d7bf3-4734-4e6b-b086-d42ce33e34ca': '61112', // Glyph
  '03499652-2aef-45f3-b9c2-9dcf23b44cea': '61115', // Introspection
  '4a466c58-5990-4cb7-9863-6fbaf5222605': '61117', // Lightning
  'cbac807d-4f60-428e-82ba-a7be76fecb8c': '61120', // Metal
  '8191cf11-b08d-4396-942d-2806b5fa44df': '61123', // Naga
  'aba192e4-a0f0-496c-94ae-a2dece5e1777': '61126', // Nothingness
  '63ee6f23-6d98-4440-89ba-0f3823babf5f': '61130', // Plague
  '100b9465-50cf-4c24-99bb-b802508c985d': '61132', // Repose
  '1365d942-2c45-4fdc-9dee-d6e18795d295': '61134', // Sorrow
  '087aed6c-f861-4182-87db-1c1575d1822d': '61135', // Soul
  '00d2712c-e082-407e-b850-e2045d7e6d78': '61136', // Star
  '58715833-4190-43d1-82d4-f1aeabdd2db3': '61138', // Swarm
  '04dbe7b1-c1a7-4496-94f9-e03d4de20378': '61139', // Time
  'de46d4e3-2ba4-499b-8135-4b52a61b555c': '61140', // Toil
  '321f7c25-f1bb-4871-8902-15efccf0b684': '61146', // Vigil
  '0b920249-5360-4794-ab4c-bd1e0ff10678': '61149', // Wood
  'eb295330-9218-4920-82c3-386dabc99f09': '61167', // Cold
};

/** Scope the compatibility read to the one converted domain selector. */
export function isConvertedDomainSelection(operation: OperationSelect): boolean {
  const filter: OperationSelect['data']['optionsFilters'] = operation.data.optionsFilters;
  return (
    operation.id === DOMAIN_SELECTOR_ID &&
    operation.data.modeType === 'FILTERED' &&
    operation.data.optionType === 'ABILITY_BLOCK' &&
    filter?.type === 'ABILITY_BLOCK' &&
    filter.abilityBlockType === 'feat' &&
    filter.traits?.length === 1 &&
    filter.traits[0] === 2520
  );
}

/** Read an old UUID as its catalog identity without changing the stored character. */
export function resolveDomainChoice(value: string | null): string | null {
  if (!value || /^[1-9]\d*$/.test(value)) return value;
  return Object.hasOwn(LEGACY_DOMAIN_CHOICES, value) ? LEGACY_DOMAIN_CHOICES[value] : null;
}
