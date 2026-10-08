import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLoaderData } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useSetAtom } from 'jotai';
import { drawerState, creatureDrawerState } from '@atoms/navAtoms';
import { mapToDrawerData } from '@drawers/drawer-utils';
import { DrawerTypeSchema } from '@schemas/index';
import { Box, Button, Group, TextInput } from '@mantine/core';
import { modals, openContextModal } from '@mantine/modals';
import { Component as CharacterSheet } from '@pages/character_sheet/CharacterSheetPage';
import { defineDefaultSources, getCachedContent } from '@content/content-store';
import { getConditionByName } from '../../src/process/conditions/condition-handler';
import { getAllBackgroundImages } from '@utils/background-images';
import {
  AbilityBlockSchema,
  ItemSchema,
  CharacterSchema,
  CreatureSchema,
  HazardSchema,
  ContentSourceSchema,
  EncounterSchema,
  SpellSchema,
  AbilityBlockTypeSchema,
  ContentTypeSchema,
  type LivingEntity,
  type Spell,
} from '@schemas/content';
import { createDefaultOperation } from '@operations/operation-utils';
import { OperationTypeSchema } from '@schemas/operations';
import { CreateAbilityBlockModal } from '@modals/CreateAbilityBlockModal';
import PathbuilderInputModal from '@import/pathbuilder/PathbuilderInputModal';
import { CreateAncestryModal } from '@modals/CreateAncestryModal';
import { CreateArchetypeModal } from '@modals/CreateArchetypeModal';
import { CreateBackgroundModal } from '@modals/CreateBackgroundModal';
import { CreateClassModal } from '@modals/CreateClassModal';
import { CreateClassArchetypeModal } from '@modals/CreateClassArchetypeModal';
import { CreateVersatileHeritageModal } from '@modals/CreateVersatileHeritageModal';
import {
  CreateContentSourceModal,
  CreateContentSourceOnlyModal,
  ContentSourceEditor,
} from '@modals/CreateContentSourceModal';
import { CreateCreatureModal } from '@modals/CreateCreatureModal';
import { CreateCombatantModal } from '@modals/CreateCombatantModal';
import { CreateItemModal } from '@modals/CreateItemModal';
import { CreateLanguageModal } from '@modals/CreateLanguageModal';
import { CreateSpellModal } from '@modals/CreateSpellModal';
import { CreateTraitModal } from '@modals/CreateTraitModal';
import { CreateSocietyAdventureEntryModal } from '@modals/CreateSocietyAdventureEntryModal';
import { EditHazardModal } from '@modals/EditHazardModal';
import { AdvancedSearchModal } from '@modals/AdvancedSearchModal';
import ContentFeedbackModal from '@modals/ContentFeedbackModal';
import UnlockHomebrewModal from '@modals/UnlockHomebrewModal';
import CampaignDrawer from '@pages/campaign/CampaignDrawer';
import OperationsModal from '@modals/OperationsModal';
import ViewOperationsModal from '@modals/ViewOperationsModal';
import ManageSpellsModal from '@modals/ManageSpellsModal';
import ModesDrawer from '@common/modes/ModesDrawer';
import { getVariable, setVariable } from '@variables/variable-manager';
import type { VariableListStr } from '@schemas/variables';
import { ContentPackageSchema } from '@schemas/content';

const LoaderSchema = z.object({ caseId: z.string(), characterId: z.string() });
const FixtureSchema = z.object({
  characters: z.record(z.string(), CharacterSchema),
  campaign: z.unknown(),
  encounter: EncounterSchema,
  catalog: z.record(z.string(), z.array(z.unknown())),
});
type Fixture = z.infer<typeof FixtureSchema>;

/** Select a real catalog sample accepted by the same contract as its production surface. */
function sample<T>(schema: z.ZodType<T>, rows: unknown[] | undefined): T {
  for (const row of rows ?? []) {
    const parsed = schema.safeParse(row);
    if (parsed.success) return parsed.data;
  }
  throw new Error('The local review fixture is missing a valid catalog sample.');
}

/** A dev-only host for actual app components; no alternate styling or save implementation. */
export function Component(): ReactNode {
  const { caseId } = LoaderSchema.parse(useLoaderData());
  const [opened, setOpened] = useState(false);
  const [requestedCase, setRequestedCase] = useState(caseId);
  const [activeCase, setActiveCase] = useState(caseId);
  const [revision, setRevision] = useState(0);
  const closeDrawer = useSetAtom(drawerState);
  const closeCreature = useSetAtom(creatureDrawerState);
  const { data, error } = useQuery({
    queryKey: ['visual-fixtures'],
    queryFn: async (): Promise<Fixture> => FixtureSchema.parse(await (await fetch('/__visual-fixtures.json')).json()),
  });
  const close = (): void => setOpened(false);
  const openReview = (): void => {
    modals.closeAll();
    closeDrawer(null);
    closeCreature(null);
    defineDefaultSources('INFO', [1, 3, 4, 8, 400]);
    setActiveCase(requestedCase);
    setRevision((value) => value + 1);
    setOpened(true);
  };
  return (
    <>
      <CharacterSheet />
      {error && (
        <Box pos='fixed' top={54} left={8} style={{ zIndex: 9500 }}>
          <Button color='red'>Review fixture error: {error.message}</Button>
        </Box>
      )}
      {data && (
        <Box data-visual-dock pos='fixed' top={54} left={8} style={{ zIndex: 10000 }}>
          <Group>
            <TextInput
              aria-label='Review case'
              data-testid='review-case'
              value={requestedCase}
              onChange={(event) => setRequestedCase(event.currentTarget.value)}
            />
            <Button data-testid='open-review-surface' onClick={openReview}>
              Open review surface
            </Button>
          </Group>
        </Box>
      )}
      {data && opened && <ReviewSurface key={revision} fixture={data} caseId={activeCase} onClose={close} />}
    </>
  );
}

/** Modal forms render unchanged against local records, with writes left to the app's normal handlers. */
function ReviewSurface({
  fixture,
  caseId,
  onClose,
}: {
  fixture: Fixture;
  caseId: string;
  onClose: () => void;
}): ReactNode {
  const character = fixture.characters.casterId;
  const [entity, setEntity] = useState<LivingEntity | null>(character);
  const common = { opened: true, onCancel: onClose, onComplete: onClose };
  const source = sample(ContentSourceSchema, fixture.catalog.content_source);
  const item = character.inventory?.items[0]?.item;
  const [operations, setOperations] = useState(character.details?.class?.operations ?? []);
  const [reviewOperations, setReviewOperations] = useState(() =>
    caseId.startsWith('operation:') ? [createDefaultOperation(OperationTypeSchema.parse(caseId.slice(10)))] : []
  );
  if (caseId.startsWith('operation:'))
    return (
      <OperationsModal
        opened
        title='Character Operations'
        operations={reviewOperations}
        onChange={setReviewOperations}
        onClose={onClose}
      />
    );
  if (caseId === 'scene:modes') return <ModesScene fixture={fixture} onClose={onClose} />;
  if (caseId === 'scene:creature-live') return <CreatureScene fixture={fixture} />;
  if (caseId === 'scene:campaign-party')
    return (
      <CampaignDrawer opened onClose={onClose} campaignId={z.object({ id: z.number() }).parse(fixture.campaign).id} />
    );
  if (caseId.startsWith('drawer:')) return <DrawerSurface fixture={fixture} caseId={caseId} onClose={onClose} />;
  if (caseId.startsWith('context:') || caseId.startsWith('picker:'))
    return <ContextSurface fixture={fixture} caseId={caseId} onClose={onClose} />;
  if (caseId.startsWith('editor:ability:'))
    return (
      <CreateAbilityBlockModal
        {...common}
        type={AbilityBlockTypeSchema.parse(caseId.slice('editor:ability:'.length))}
      />
    );
  switch (caseId) {
    case 'editor:ancestry':
      return <CreateAncestryModal {...common} />;
    case 'editor:archetype':
      return <CreateArchetypeModal {...common} />;
    case 'editor:background':
      return <CreateBackgroundModal {...common} />;
    case 'editor:class':
      return <CreateClassModal {...common} />;
    case 'editor:class-archetype':
      return <CreateClassArchetypeModal {...common} />;
    case 'editor:versatile-heritage':
      return <CreateVersatileHeritageModal {...common} />;
    case 'editor:creature':
      return <CreateCreatureModal {...common} />;
    case 'editor:creature-populated':
      return <CreateCreatureModal {...common} editCreature={sample(CreatureSchema, fixture.catalog.creature)} />;
    case 'editor:combatant':
      return <CreateCombatantModal {...common} />;
    case 'editor:item':
      return <CreateItemModal {...common} />;
    case 'editor:item-populated':
      return <CreateItemModal {...common} editItem={item} />;
    case 'editor:language':
      return <CreateLanguageModal {...common} />;
    case 'editor:spell':
      return <CreateSpellModal {...common} />;
    case 'editor:trait':
      return <CreateTraitModal {...common} />;
    case 'editor:hazard':
      return <EditHazardModal {...common} hazard={sample(HazardSchema, fixture.catalog.creature)} />;
    case 'editor:source':
      return <CreateContentSourceOnlyModal {...common} editId={source.id} />;
    case 'editor:source-bundle':
      return <CreateContentSourceModal opened sourceId={source.id} onClose={onClose} />;
    case 'editor:source-contents':
      return <CreateContentSourceOnlyModal {...common} editId={source.id} />;
    case 'editor:society':
      return <CreateSocietyAdventureEntryModal {...common} onDelete={onClose} />;
    case 'import:pathbuilder':
      return <PathbuilderInputModal open onConfirm={onClose} onClose={onClose} />;
    case 'search:advanced':
      return <AdvancedSearchModal opened onClose={onClose} />;
    case 'feedback':
      return (
        <ContentFeedbackModal
          opened
          type='item'
          data={{ id: item?.id }}
          onCancel={onClose}
          onStartFeedback={onClose}
          onCompleteFeedback={onClose}
        />
      );
    case 'unlock-homebrew':
      return <UnlockHomebrewModal opened source={source} onSuccess={onClose} onClose={onClose} />;
    case 'operations:edit':
      return (
        <OperationsModal
          opened
          title='Character Operations'
          operations={operations}
          onChange={setOperations}
          onClose={onClose}
        />
      );
    case 'operations:view':
      return <ViewOperationsModal opened title='Character Operations' operations={operations} onClose={onClose} />;
    case 'spells:slots':
      return (
        <ManageSpellsModal
          id='CHARACTER'
          opened
          entity={entity}
          setEntity={setEntity}
          source='WIZARD'
          type='SLOTS-ONLY'
          onClose={onClose}
        />
      );
    case 'spells:prepared':
      return (
        <ManageSpellsModal
          id='CHARACTER'
          opened
          entity={entity}
          setEntity={setEntity}
          source='WIZARD'
          type='SLOTS-AND-LIST'
          onClose={onClose}
        />
      );
    case 'spells:list':
      return (
        <ManageSpellsModal
          id='CHARACTER'
          opened
          entity={entity}
          setEntity={setEntity}
          source='WIZARD'
          type='LIST-ONLY'
          onClose={onClose}
        />
      );
    default:
      throw new Error('Unknown local visual review surface.');
  }
}

/** Use the production context-modal registry, including its focus, portal and close behavior. */
function ContextSurface({ fixture, caseId, onClose }: { fixture: Fixture; caseId: string; onClose: () => void }): null {
  const opened = useRef(false);
  const character = fixture.characters.casterId;
  // Open only once after the real sheet and its variable store are ready.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const base = { onClose, size: 'lg' };
    const item = character.inventory?.items[0]?.item;
    const spells: Spell[] = getCachedContent<Spell>('spell').flatMap((row) => {
      const parsed = SpellSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
    if (caseId.startsWith('picker:')) {
      const requestedType = caseId.slice(7);
      const abilityType = AbilityBlockTypeSchema.safeParse(requestedType);
      openContextModal({
        ...base,
        modal: 'selectContent',
        title: 'Select Content',
        innerProps: {
          type: abilityType.success ? 'ability-block' : ContentTypeSchema.or(z.literal('hazard')).parse(requestedType),
          options: abilityType.success ? { abilityBlockType: abilityType.data } : undefined,
          onClick: onClose,
        },
      });
      return;
    }
    switch (caseId) {
      case 'context:lore':
        openContextModal({ ...base, modal: 'addNewLore', title: 'Add Lore', innerProps: { onConfirm: onClose } });
        break;
      case 'context:dice':
        openContextModal({
          ...base,
          modal: 'createDicePreset',
          title: 'Dice Preset',
          innerProps: { onConfirm: onClose },
        });
        break;
      case 'context:icon':
        openContextModal({ ...base, modal: 'selectIcon', title: 'Select Icon', innerProps: { onSelect: onClose } });
        break;
      case 'context:image':
        openContextModal({
          ...base,
          modal: 'selectImage',
          title: 'Background Artwork',
          innerProps: { category: 'Background Artwork', options: getAllBackgroundImages(), onSelect: onClose },
        });
        break;
      case 'context:portrait':
        openContextModal({
          ...base,
          modal: 'updateCharacterPortrait',
          title: 'Character Portrait',
          innerProps: { character, updatePortrait: onClose },
        });
        break;
      case 'context:note':
        openContextModal({
          ...base,
          modal: 'updateNotePage',
          title: 'Note Settings',
          innerProps: { page: character.notes?.pages[0], isInCampaign: true, onUpdate: onClose, onDelete: onClose },
        });
        break;
      case 'context:condition': {
        const condition = getConditionByName('Frightened');
        if (!condition) throw new Error('Local review condition is missing.');
        openContextModal({
          ...base,
          modal: 'condition',
          title: 'Frightened',
          innerProps: { condition, onValueChange: onClose },
        });
        break;
      }
      case 'context:items':
        openContextModal({
          ...base,
          modal: 'addItems',
          title: 'Add Items',
          size: 'xl',
          innerProps: { onAddItem: onClose },
        });
        break;
      case 'context:buy':
        openContextModal({
          ...base,
          modal: 'buyItem',
          title: 'Buy Item',
          innerProps: { item, inventory: character.inventory, onConfirm: onClose },
        });
        break;
      case 'context:spell-slot':
        openContextModal({
          ...base,
          modal: 'selectSpellSlot',
          title: 'Choose Spell Slot',
          innerProps: { allSpells: spells, onSelect: onClose },
        });
        break;
      case 'context:staff':
        openContextModal({
          ...base,
          modal: 'selectStaffCasting',
          title: 'Cast Staff Spell',
          innerProps: { spell: spells[0], canCastNormally: true, onSelect: onClose },
        });
        break;
      case 'context:initiative':
        openContextModal({
          ...base,
          modal: 'initiativeRoll',
          title: 'Roll Initiative',
          innerProps: {
            combatants: (fixture.encounter.combatants?.list ?? []).map((combatant) =>
              combatant.type === 'HAZARD'
                ? combatant
                : {
                    ...combatant,
                    data: combatant.type === 'CREATURE' ? combatant.creature : fixture.characters.playerId,
                  }
            ),
            onConfirm: onClose,
          },
        });
        break;
      case 'context:encounter':
        openContextModal({
          ...base,
          modal: 'updateEncounter',
          title: 'Encounter Settings',
          innerProps: { encounter: fixture.encounter, onUpdate: onClose, onDelete: onClose },
        });
        break;
      case 'context:generate':
        openContextModal({
          ...base,
          modal: 'generateEncounter',
          title: 'Generate Encounter',
          size: 'xl',
          innerProps: { partyLevel: 1, partySize: 4, onComplete: onClose },
        });
        break;
      case 'context:api-client':
        openContextModal({
          ...base,
          modal: 'updateApiClient',
          title: 'Application Settings',
          innerProps: {
            client: {
              id: 'local-review',
              name: 'Observatory Journal',
              description: 'Synthetic application for visual review',
              api_key: 'LOCAL-REVIEW-PLACEHOLDER',
            },
            onUpdate: onClose,
            onDelete: onClose,
          },
        });
        break;
      default:
        throw new Error('Unknown local context-modal case.');
    }
  }, [caseId, character, fixture, onClose]);
  return null;
}

/** Open the same production drawer atom used by sheet controls and content links. */
function DrawerSurface({ fixture, caseId, onClose }: { fixture: Fixture; caseId: string; onClose: () => void }): null {
  const openDrawer = useSetAtom(drawerState);
  const opened = useRef(false);
  const character = fixture.characters.casterId;
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const [, rawType, state] = caseId.split(':');
    const type = DrawerTypeSchema.parse(rawType);
    const inventory = character.inventory?.items ?? [];
    const spell = sample(SpellSchema, fixture.catalog.spell);
    const item = sample(
      ItemSchema,
      inventory.filter((entry) => entry.item.group === 'WEAPON').map((entry) => entry.item)
    );
    const base = { id: 'CHARACTER' as const };
    if (type.startsWith('stat-')) {
      openDrawer({
        type,
        data: {
          ...base,
          item,
          variableName: state ?? 'SKILL_ARCANA',
          attributeName: state,
          isDC: state === 'CLASS_DC',
        },
      });
      return;
    }
    if (type === 'condition') {
      openDrawer({ type, data: { id: 'Frightened' } });
      return;
    }
    if (type === 'generic') {
      openDrawer({
        type,
        data: {
          title: 'Arcane Thesis',
          description: 'A well-worn journal records observations about the sapphire archive.',
          showOperations: true,
          operations: character.details?.class?.operations ?? [],
        },
      });
      return;
    }
    if (type === 'manage-coins') {
      openDrawer({ type, data: { coins: character.inventory?.coins, onUpdate: () => {} } });
      return;
    }
    if (type === 'cast-spell') {
      openDrawer({
        type,
        data: {
          id: spell.id,
          spell,
          exhausted: state === 'exhausted',
          tradition: 'ARCANE',
          attribute: 'ATTRIBUTE_INT',
          onCastSpell: () => {},
          storeId: 'CHARACTER',
          entity: character,
        },
      });
      return;
    }
    if (type === 'inv-item') {
      const invItem =
        inventory.find((entry) =>
          state ? entry.item.name.toLowerCase().includes(state) : entry.item.name.includes('spear')
        ) ?? inventory[0];
      openDrawer({
        type,
        data: { storeId: 'CHARACTER', invItem, onItemUpdate: () => {}, onItemDelete: () => {}, onItemMove: () => {} },
      });
      return;
    }
    if (AbilityBlockTypeSchema.safeParse(type).success) {
      const ability = sample(
        AbilityBlockSchema,
        fixture.catalog.ability_block?.filter((row) => z.object({ type: z.string() }).parse(row).type === type)
      );
      openDrawer(mapToDrawerData('ability-block', ability, { id: ability.id, readOnly: true, showOperations: true }));
      return;
    }
    if (type === 'creature') {
      openDrawer(
        mapToDrawerData('creature', sample(CreatureSchema, fixture.catalog.creature), {
          id: sample(CreatureSchema, fixture.catalog.creature).id,
          readOnly: true,
          showOperations: true,
        })
      );
      return;
    }
    if (type === 'hazard') {
      openDrawer(
        mapToDrawerData('hazard', sample(HazardSchema, fixture.catalog.creature), {
          id: sample(HazardSchema, fixture.catalog.creature).id,
          readOnly: true,
          showOperations: true,
        })
      );
      return;
    }
    if (type === 'item') {
      openDrawer(mapToDrawerData('item', item, { id: item.id, readOnly: true, showOperations: true }));
      return;
    }
    if (type === 'spell') {
      openDrawer(mapToDrawerData('spell', spell, { id: spell.id, readOnly: true, showOperations: true }));
      return;
    }
    const table = type.replaceAll('-', '_');
    const row = z.object({ id: z.number() }).passthrough().parse(fixture.catalog[table]?.[0]);
    openDrawer(
      mapToDrawerData(ContentTypeSchema.parse(type), row, { id: row.id, readOnly: true, showOperations: true })
    );
  }, [caseId, character, fixture.catalog, openDrawer]);
  return null;
}

/** Use the same live creature preview as companions and encounter combatants. */
function CreatureScene({ fixture }: { fixture: Fixture }): null {
  const open = useSetAtom(creatureDrawerState);
  useEffect(() => {
    open({
      data: {
        creature: sample(CreatureSchema, fixture.catalog.creature),
        STORE_ID: 'CREATURE_LOCAL_VISUAL',
        updateCreature: () => {},
      },
    });
    return () => open(null);
  }, [fixture, open]);
  return null;
}

/** Populate the real mode drawer in memory without changing the local character record. */
function ModesScene({ fixture, onClose }: { fixture: Fixture; onClose: () => void }): ReactNode {
  const [content] = useState(() =>
    ContentPackageSchema.parse({
      ancestries: [],
      backgrounds: [],
      classes: [],
      abilityBlocks: (fixture.catalog.ability_block ?? [])
        .flatMap((row) => {
          const ability = AbilityBlockSchema.safeParse(row);
          return ability.success && ability.data.type === 'mode' ? [ability.data] : [];
        })
        .slice(0, 5),
      items: [],
      languages: [],
      spells: [],
      traits: [],
      creatures: [],
      archetypes: [],
      versatileHeritages: [],
      classArchetypes: [],
      defaultSources: { PAGE: [1, 3, 4, 8, 400], INFO: [1, 3, 4, 8, 400] },
    })
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previous = getVariable<VariableListStr>('CHARACTER', 'MODE_IDS')?.value ?? [];
    setVariable(
      'CHARACTER',
      'MODE_IDS',
      content.abilityBlocks.map((mode) => String(mode.id)),
      'Local visual review'
    );
    setReady(true);
    return () => setVariable('CHARACTER', 'MODE_IDS', previous, 'Local visual review');
  }, [content]);
  return ready ? <ModesDrawer opened onClose={onClose} content={content} /> : null;
}
