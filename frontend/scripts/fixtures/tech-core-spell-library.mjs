/** Source-faithful authoring draft. Native ID allocation and Spell Cache bindings remain required. */
export const spellLibraryDraft = {
  name: 'Spell Library',
  type: 'feat',
  level: 8,
  content_source_id: 900,
  uuid: 3210412362300885,
  rarity: 'COMMON',
  actions: null,
  traits: [5195],
  prerequisites: [],
  frequency: '',
  cost: '',
  trigger: '',
  requirements: '',
  access: '',
  special: '',
  availability: null,
  version: '1.0',
  meta_data: {
    foundry: {
      id: 'nNw5XjRpOJMmzSLR',
      path: 'packs/sf2e/feats/class/technomancer/level-8/spell-library.json',
      revision: '581c2bf2ca9734f4dd83f034fbcc93f8e4fd96eb',
      sha256: 'f8214ea4df6d657aed3c9798c454bae984f8c069600e15f5e7cd584068cab481',
      publication: { license: 'ORC', remaster: true, title: 'Starfinder Tech Core' },
    },
    source: { book: 'Tech Core', page: '59', url: 'https://2e.aonsrd.com/feats/2897-spell-library' },
  },
  description:
    'You’ve expanded your spell cache to store more spells than most. During your daily preparations, you can add one spell to your spell cache of each rank of spell you can cast, selecting from the spells in your spell database. The spells remain in your spell cache until your next daily preparations.',
  operations: [
    {
      id: 'e06303e6-d831-469d-bc3d-c68a96c05993',
      type: 'conditional',
      data: {
        conditions: [
          { id: '938a7c4d-7f42-4ec1-b7e8-a9c769a403dd', name: 'LEVEL', operator: 'GREATER_THAN_OR_EQUALS', value: '8' },
        ],
        falseOperations: [],
        trueOperations: [
          ['c88c1137-3254-4e86-a4f0-91bada2d5165', '52e092f3-9a66-43a3-a79c-ed6b004ad505'],
          ['948cc89b-e58c-42b9-b6eb-135936c488f2', 'cf6efc12-4584-4e19-8cf5-6330c3ca244a'],
          ['51d49309-a0e3-4569-a79b-6e031f3b91ce', 'c06bbc45-e439-4fd7-8043-041a18c601c0'],
          ['0a58ced1-b86f-4035-a247-00fc3d718057', '135dac1d-0b3b-45c0-8fd7-54446e13572c'],
          ['70f3f538-7127-4b86-9131-e36419452327', '8c9e8e7d-135f-4f8a-b99b-7938406a01e6'],
          ['e7f6134b-3a90-416b-80e2-1aba2aafb982', 'fd12170d-11f0-48ae-9610-ff202f3d1334'],
          ['aa7327bd-c8e2-45d3-ba89-18f53db2a9f6', '3e678ba4-3185-4cf9-a986-b7ec0250d642'],
          ['fad9e127-e7be-4a44-8108-f0e5dd382aaa', 'e19e8c6a-f454-48ad-9ec7-7f8c266fa859'],
          ['59cd0f17-4cfe-4247-9206-e145ea0a91da', '2e90d92c-f4d4-401a-92e4-d8e5bcc6b90e'],
          ['477fcf1c-4182-44b3-a88b-da8850b88a8f', '989cea05-0f21-4973-950e-8fc407337f2b'],
        ].map(([id, filterId], index) => ({
          id,
          type: 'select',
          data: {
            title: `Select a Rank ${index + 1} Spell`,
            modeType: 'FILTERED',
            optionType: 'SPELL',
            optionsFilters: {
              id: filterId,
              type: 'SPELL',
              level: { min: index + 1, max: index + 1 },
              knownSpellSource: 'TECHNOMANCER',
              dailyPreparation: true,
              spellData: { type: 'NORMAL', castingSource: 'TECHNOMANCER', listSources: ['TECHNOMANCER_CACHE'] },
            },
          },
        })),
      },
    },
  ],
};
