import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLoaderData } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Provider, createStore, useSetAtom } from 'jotai';
import { characterState } from '@atoms/characterAtoms';
import { npcsState, sessionIdeasState } from '@atoms/campaignAtoms';
import { drawerState, creatureDrawerState } from '@atoms/navAtoms';
import { mapToDrawerData } from '@drawers/drawer-utils';
import { DrawerTypeSchema } from '@schemas/index';
import { Box, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { CharacterDetailedInfo } from '@common/CharacterInfo';
import { ContentSourceInfo } from '@common/ContentSourceInfo';
import { EllipsisText } from '@common/EllipsisText';
import { GroupLinkSwitch, LinkSwitch } from '@common/LinksGroup';
import { AvailabilityDisplay, BrokenDisplay, FormulaDisplay, ShoddyDisplay } from '@common/TraitsDisplay';
import {
  displayFinalProfValue,
  displayFinalSpeedValue,
  displayFinalVariableValue,
} from '../../src/process/variables/variable-display';
import { modals, openContextModal } from '@mantine/modals';
import { notifications, showNotification } from '@mantine/notifications';
import { Component as CharacterSheet } from '@pages/character_sheet/CharacterSheetPage';
import { defineDefaultSources, getCachedContent } from '@content/content-store';
import { getConditionByName } from '../../src/process/conditions/condition-handler';
import { getAllBackgroundImages } from '@utils/background-images';
import {
  AbilityBlockSchema,
  ItemSchema,
  CharacterSchema,
  CampaignSchema,
  CreatureSchema,
  HazardSchema,
  ContentSourceSchema,
  EncounterSchema,
  SpellSchema,
  AbilityBlockTypeSchema,
  SocietyAdventureEntrySchema,
  ContentTypeSchema,
  type LivingEntity,
  type Creature,
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
import InspirationPanel from '@pages/campaign/panels/InspirationPanel';
import OperationsModal from '@modals/OperationsModal';
import ViewOperationsModal from '@modals/ViewOperationsModal';
import ManageSpellsModal from '@modals/ManageSpellsModal';
import ModesDrawer from '@common/modes/ModesDrawer';
import DetailsPanel from '@pages/character_sheet/panels/DetailsPanel';
import FeatsFeaturesPanel from '@pages/character_sheet/panels/FeatsFeaturesPanel';
import CreatureDetailsPanel from '@pages/character_sheet/panels/CreatureDetailsPanel';
import CreatureAbilitiesPanel from '@pages/character_sheet/panels/CreatureAbilitiesPanel';
import {
  addVariable,
  addVariableBonus,
  exportVariableStore,
  getAllAncestryTraitVariables,
  getAllClassTraitVariables,
  getVariable,
  importVariableStore,
  resetVariables,
  setVariable,
} from '@variables/variable-manager';
import type { VariableBool, VariableListStr } from '@schemas/variables';
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

/** Existing local catalog entries exercise native rune and upgrade sections without saving equipment. */
function equipmentSample(
  fixture: Fixture,
  item: z.infer<typeof ItemSchema>,
  state?: string
): z.infer<typeof ItemSchema> {
  if (state === 'shield')
    return sample(
      ItemSchema,
      fixture.characters.casterId.inventory?.items
        .filter((entry) => entry.item.group === 'SHIELD')
        .map((entry) => entry.item)
    );
  if (state === 'upgrades') {
    const armor = sample(
      ItemSchema,
      fixture.characters.casterId.inventory?.items
        .filter((entry) => entry.item.group === 'ARMOR')
        .map((entry) => entry.item)
    );
    const upgrade = sample(
      ItemSchema,
      fixture.catalog.item?.filter((row) => z.object({ id: z.number() }).parse(row).id === 19755)
    );
    return ItemSchema.parse({
      ...armor,
      meta_data: {
        ...armor.meta_data,
        starfinder: { grade: 'TACTICAL', slots: [{ id: upgrade.id, name: upgrade.name, upgrade }] },
      },
    });
  }
  if (state === 'runes' || state === 'extra') {
    const rune = sample(
      ItemSchema,
      fixture.catalog.item?.filter((row) => z.object({ id: z.number() }).parse(row).id === 6961)
    );
    return ItemSchema.parse({
      ...item,
      meta_data: {
        ...item.meta_data,
        runes: { potency: 2, striking: 1, property: [{ id: rune.id, name: rune.name, rune }] },
        ...(state === 'extra' ? { damage: { ...item.meta_data?.damage, extra: '1d4 fire' } } : {}),
      },
    });
  }
  return item;
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
  if (caseId === 'scene:notifications') return <NotificationScene />;
  if (caseId === 'scene:inspiration') return <InspirationScene fixture={fixture} onClose={onClose} />;
  if (caseId === 'scene:conditional-hints') return <ConditionalHintsScene fixture={fixture} onClose={onClose} />;
  if (caseId === 'scene:creature-live') return <CreatureScene fixture={fixture} />;
  if (caseId === 'scene:creature-source') return <CreatureScene fixture={fixture} includeSourceId />;
  if (caseId.startsWith('panel:')) return <ConditionalPanelScene fixture={fixture} caseId={caseId} onClose={onClose} />;
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
    case 'editor:society-existing':
      return (
        <CreateSocietyAdventureEntryModal
          {...common}
          editEntry={SocietyAdventureEntrySchema.parse({
            id: 'local-review-record',
            name: 'The Sapphire Archive',
            event: 'Local visual review',
            items_snapshot: [],
            conditions_snapshot: [],
            items_sold: [],
            items_bought: [],
            conditions_gained: [],
            conditions_cleared: [],
          })}
          onDelete={onClose}
        />
      );
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
      const [, requestedType, state] = caseId.split(':');
      const abilityType = AbilityBlockTypeSchema.safeParse(requestedType);
      const traitIds =
        state === 'tabs'
          ? (requestedType === 'feat'
              ? getAllClassTraitVariables('CHARACTER')
              : getAllAncestryTraitVariables('CHARACTER')
            ).map((variable) => variable.value)
          : [];
      const overrideOptions =
        state === 'tabs'
          ? (fixture.catalog.ability_block ?? [])
              .flatMap((row) => {
                const parsed = AbilityBlockSchema.safeParse(row);
                return parsed.success &&
                  parsed.data.type === requestedType &&
                  parsed.data.traits?.some((id) => traitIds.includes(id))
                  ? [
                      {
                        ...parsed.data,
                        _select_uuid: String(parsed.data.id),
                        _content_type: 'ability-block' as const,
                        _source_level: 20,
                      },
                    ]
                  : [];
              })
              .slice(0, 8)
          : undefined;
      if (state === 'tabs' && !overrideOptions?.length)
        throw new Error('Conditional picker fixture is missing matching catalog options.');
      openContextModal({
        ...base,
        modal: 'selectContent',
        title: 'Select Content',
        innerProps: {
          type: abilityType.success ? 'ability-block' : ContentTypeSchema.or(z.literal('hazard')).parse(requestedType),
          options: {
            ...(abilityType.success ? { abilityBlockType: abilityType.data } : {}),
            ...(overrideOptions ? { overrideOptions } : {}),
            ...(state === 'change'
              ? { selectedId: z.object({ id: z.number() }).parse(fixture.catalog[requestedType]?.[0]).id }
              : {}),
          },
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
          innerProps: {
            spell: spells.find((spell) => spell.rank === 1) ?? spells[0],
            canCastNormally: true,
            onSelect: onClose,
          },
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
  const character = fixture.characters.casterId;
  const reviewStoreId = 'VISUAL_REVIEW_STATS';
  // Keep conditional review state independent of the sheet's asynchronous recalculation.
  useEffect(() => () => resetVariables(reviewStoreId), []);
  useEffect(() => {
    const [, rawType, state] = caseId.split(':');
    const type = DrawerTypeSchema.parse(rawType);
    const inventory = character.inventory?.items ?? [];
    const spell = sample(SpellSchema, fixture.catalog.spell);
    const item = equipmentSample(
      fixture,
      sample(
        ItemSchema,
        inventory.filter((entry) => entry.item.group === 'WEAPON').map((entry) => entry.item)
      ),
      state
    );
    const base = { id: 'CHARACTER' as const };
    if (type.startsWith('stat-')) {
      importVariableStore(reviewStoreId, exportVariableStore('CHARACTER'));
      if (state === 'bonuses') {
        for (const name of ['AC_BONUS', 'MAX_HEALTH_BONUS', 'SPEED', 'PERCEPTION', 'SKILL_ARCANA']) {
          addVariableBonus(reviewStoreId, name, 2, 'status', '', 'Local review bonus');
          addVariableBonus(
            reviewStoreId,
            name,
            1,
            'circumstance',
            'A situational modifier from the local review fixture.',
            'Local review condition'
          );
        }
        setVariable(reviewStoreId, 'AC_BONUS', 1, 'Local review base modifier');
      }
      if (state === 'base-hp') setVariable(reviewStoreId, 'MAX_HEALTH_BONUS', 2, 'Local review base modifier');
      if (type === 'stat-hp' && state === 'stamina')
        setVariable(reviewStoreId, 'STAMINA_VARIANT', true, 'Local visual review');
      openDrawer({
        type,
        data: {
          id: reviewStoreId,
          item,
          variableName: state === 'bonuses' ? 'SKILL_ARCANA' : (state ?? 'SKILL_ARCANA'),
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
      if (state === 'upgrades') {
        const invItem = { ...inventory.find((entry) => entry.item.group === 'ARMOR')!, item };
        openDrawer({
          type,
          data: { storeId: 'CHARACTER', invItem, onItemUpdate: () => {}, onItemDelete: () => {}, onItemMove: () => {} },
        });
        return;
      }
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
      if (state === 'runes' || state === 'upgrades') {
        openDrawer({ type, data: { item, readOnly: true, showOperations: true } });
        return;
      }
      openDrawer(mapToDrawerData('item', item, { id: item.id, readOnly: true, showOperations: true }));
      return;
    }
    if (type === 'spell') {
      openDrawer(mapToDrawerData('spell', spell, { id: spell.id, readOnly: true, showOperations: true }));
      return;
    }
    const table = type.replaceAll('-', '_');
    if (type === 'versatile-heritage' && state === 'feats') {
      const heritage = z.object({ id: z.number() }).passthrough().parse(fixture.catalog[table]?.[0]);
      const feat = sample(
        AbilityBlockSchema,
        fixture.catalog.ability_block?.filter((row) => z.object({ name: z.string() }).parse(row).name === 'Nimble Elf')
      );
      const reviewHeritage = { ...heritage, trait_id: feat.traits?.[0] };
      openDrawer(
        mapToDrawerData('versatile-heritage', reviewHeritage, {
          id: heritage.id,
          readOnly: true,
          showOperations: true,
        })
      );
      return;
    }
    const row = z
      .object({ id: z.number() })
      .passthrough()
      .parse(
        state
          ? fixture.catalog[table]?.find((entry) => z.object({ id: z.number() }).parse(entry).id === Number(state))
          : fixture.catalog[table]?.[0]
      );
    openDrawer(
      mapToDrawerData(ContentTypeSchema.parse(type), row, { id: row.id, readOnly: true, showOperations: true })
    );
  }, [caseId, character, fixture.catalog, openDrawer]);
  return null;
}

/** Populate the native inspiration cards without calling generation or storing campaign changes. */
function InspirationScene({ fixture, onClose }: { fixture: Fixture; onClose: () => void }): ReactNode {
  const [store] = useState(() => {
    const reviewStore = createStore();
    reviewStore.set(sessionIdeasState, [
      {
        name: 'The Keeper’s Invitation',
        outline: 'The party returns to the observatory and discovers a sealed letter beside the sapphire archive.',
        actions: [
          { name: 'The Keeper', description: 'A patient scholar with an unfinished star chart.', type: 'NPC' },
          {
            name: 'The Sealed Archive',
            description: 'An encounter at the observatory’s eastern gate.',
            type: 'ENCOUNTER',
          },
        ],
      },
    ]);
    reviewStore.set(npcsState, [
      {
        name: 'Eliara, Keeper of the Archive',
        description: 'A patient scholar carrying a silver lantern and an unfinished star chart.',
        level: 3,
        class: 'Wizard',
        background: 'Scholar',
        ancestry: 'Elf',
      },
    ]);
    return reviewStore;
  });
  return (
    <Modal opened title='Campaign Inspiration' onClose={onClose} size={1100}>
      <Provider store={store}>
        <InspirationPanel
          panelHeight={540}
          panelWidth={Math.min(window.innerWidth - 80, 1000)}
          campaign={CampaignSchema.parse(fixture.campaign)}
          players={[fixture.characters.playerId]}
          setCampaign={() => {}}
        />
      </Provider>
    </Modal>
  );
}

/** Preview the existing action-notification template without invoking imports, generation, or recovery. */
function NotificationScene(): null {
  useEffect(() => {
    showNotification({
      id: 'review-import-success',
      title: 'Success',
      message: 'Imported "Merisiel, Keeper of the Archive"',
      color: 'green',
      autoClose: false,
    });
    showNotification({
      id: 'review-import-error',
      title: 'Import failed',
      message: 'Invalid JSON file',
      color: 'red',
      autoClose: false,
    });
    showNotification({
      id: 'review-coming-soon',
      title: 'Coming Soon',
      message: 'This feature is coming soon!',
      color: 'blue',
      autoClose: false,
    });
    showNotification({
      id: 'review-action-loading',
      title: 'Creating random character',
      message: 'This may take a minute…',
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });
    return () => notifications.clean();
  }, []);
  return null;
}

/** Native helpers whose condition-dependent hints are absent from ordinary empty review records. */
function ConditionalHintsScene({ fixture, onClose }: { fixture: Fixture; onClose: () => void }): ReactNode {
  const id = 'VISUAL_REVIEW_HINTS';
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const organizedPlay = getVariable<VariableBool>('CHARACTER', 'ORGANIZED_PLAY')?.value ?? false;
    setVariable('CHARACTER', 'ORGANIZED_PLAY', true, 'Local visual review');
    importVariableStore(id, exportVariableStore('CHARACTER'));
    for (const variable of ['SKILL_ARCANA', 'MAX_HEALTH_BONUS', 'SPEED'])
      addVariableBonus(id, variable, 1, 'circumstance', 'A situational modifier.', 'Local review');
    setReady(true);
    return () => {
      resetVariables(id);
      setVariable('CHARACTER', 'ORGANIZED_PLAY', organizedPlay, 'Local visual review');
    };
  }, []);
  const character = CharacterSchema.parse({
    ...fixture.characters.casterId,
    details: {
      ...fixture.characters.casterId.details,
      conditions: [{ ...getConditionByName('Frightened'), value: 1 }],
    },
  });
  return (
    <Modal opened onClose={onClose} title='Conditional display helpers' size='lg'>
      <Stack>
        <Group wrap='wrap'>
          <FormulaDisplay interactable />
          <BrokenDisplay interactable />
          <ShoddyDisplay interactable />
          <AvailabilityDisplay availability='LIMITED' interactable />
          <AvailabilityDisplay availability='RESTRICTED' interactable />
        </Group>
        <Box w={180}>
          <EllipsisText>A very long character equipment name for the local visual review</EllipsisText>
        </Box>
        <GroupLinkSwitch label='Player Core' id={1} url={null} enabled onLinkChange={() => {}} />
        <LinkSwitch label='Optional rule' info='Information about this rule.' enabled onLinkChange={() => {}} />
        <CharacterDetailedInfo character={character} />
        <ContentSourceInfo source={sample(ContentSourceSchema, fixture.catalog['content-source'])} />
        {ready && (
          <Group gap='xl'>
            <Text>Arcana {displayFinalProfValue(id, 'SKILL_ARCANA')}</Text>
            <Text>Hit point bonus {displayFinalVariableValue(id, 'MAX_HEALTH_BONUS')}</Text>
            <Text>Speed {displayFinalSpeedValue(id, 'SPEED', character)}</Text>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}

/** Review conditional native panels in an isolated atom store; no entity setter reaches the sheet. */
function ConditionalPanelScene({
  fixture,
  caseId,
  onClose,
}: {
  fixture: Fixture;
  caseId: string;
  onClose: () => void;
}): ReactNode {
  const [content] = useState(() =>
    ContentPackageSchema.parse({
      ancestries: fixture.catalog.ancestry,
      backgrounds: fixture.catalog.background,
      classes: fixture.catalog.class,
      abilityBlocks: fixture.catalog.ability_block,
      items: [
        ...(fixture.characters.casterId.inventory?.items.map((entry) => entry.item) ?? []),
        ...(fixture.catalog.item ?? []),
      ],
      languages: fixture.catalog.language,
      spells: fixture.catalog.spell,
      traits: fixture.catalog.trait,
      creatures: (fixture.catalog.creature ?? []).filter((row) => CreatureSchema.safeParse(row).success),
      archetypes: fixture.catalog.archetype,
      versatileHeritages: fixture.catalog.versatile_heritage,
      classArchetypes: fixture.catalog.class_archetype,
      defaultSources: { PAGE: [1, 3, 4, 8, 400], INFO: [1, 3, 4, 8, 400] },
    })
  );
  const [atomStore] = useState(() => {
    const store = createStore();
    const character = fixture.characters.casterId;
    store.set(
      characterState,
      CharacterSchema.parse({
        ...character,
        level: 20,
        details: {
          ...character.details,
          info: {
            ...character.details?.info,
            organized_play_adventures: [
              SocietyAdventureEntrySchema.parse({
                id: 'local-review',
                name: 'The Sapphire Archive',
                event: 'Local review',
                event_code: 'WG-001',
                character_level: 20,
                xp_gained: 4,
                rep_gained: 2,
                date: 1791374400,
                items_snapshot: [],
                conditions_snapshot: [],
                items_sold: [],
                items_bought: [],
                conditions_gained: [],
                conditions_cleared: [],
              }),
            ],
          },
        },
      })
    );
    return store;
  });
  const [client] = useState(() => new QueryClient());
  const previousStore = useRef(exportVariableStore('CHARACTER'));
  const [ready, setReady] = useState(false);
  const id = caseId.startsWith('panel:creature-') ? 'VISUAL_REVIEW_PANEL' : 'CHARACTER';
  const [creature, setCreature] = useState<Creature | null>(() => {
    const actions = content.abilityBlocks.filter((ability) => ability.type === 'action');
    return CreatureSchema.parse({
      ...sample(CreatureSchema, fixture.catalog.creature),
      abilities_base: actions.slice(0, 1),
      abilities_added: actions.slice(1, 2).map((ability) => ability.id),
    });
  });
  useEffect(() => {
    importVariableStore(id, previousStore.current);
    setVariable(id, 'LEVEL', 20, 'Local review');
    addVariable(id, 'prof', 'WEAPON_SPEAR', { value: 'T' }, 'Local review');
    addVariable(id, 'prof', 'ARMOR_LEATHER_ARMOR', { value: 'T' }, 'Local review');
    for (const name of ['WEAPON_GROUP_SPEAR', 'ARMOR_GROUP_LEATHER', 'LIGHT_BARDING'])
      setVariable(id, name, { value: 'T' }, 'Local review');
    const names = ['Superior Bond', 'Nimble Elf', 'Toughness', 'Debilitating Strike'];
    setVariable(
      id,
      'FEAT_IDS',
      content.abilityBlocks
        .filter((ability) => ability.type === 'feat' && names.includes(ability.name))
        .map((ability) => String(ability.id)),
      'Local review'
    );
    for (const [type, variable] of [
      ['class-feature', 'CLASS_FEATURE_IDS'],
      ['heritage', 'HERITAGE_IDS'],
      ['physical-feature', 'PHYSICAL_FEATURE_IDS'],
    ])
      setVariable(
        id,
        variable,
        content.abilityBlocks
          .filter(
            (ability) =>
              ability.type === type &&
              !['Attribute Boosts', 'Skill Feat', 'Skill Increase', 'General Feat'].includes(ability.name)
          )
          .slice(0, 2)
          .map((ability) => String(ability.id)),
        'Local review'
      );
    setReady(true);
    return () => {
      if (id === 'CHARACTER') importVariableStore(id, previousStore.current);
      else resetVariables(id);
    };
  }, [content, id]);
  const panelHeight = Math.min(640, window.innerHeight - 160);
  const phone = window.innerWidth < 600;
  const panelWidth = Math.min(1100, window.innerWidth - (phone ? 24 : 48));
  return (
    <Modal
      opened
      onClose={onClose}
      title='Conditional panel review'
      size={phone ? '100%' : '90vw'}
      xOffset={phone ? 0 : undefined}
      padding={phone ? 12 : undefined}
    >
      <Provider store={atomStore}>
        <QueryClientProvider client={client}>
          {ready && caseId === 'panel:details' && (
            <DetailsPanel content={content} panelHeight={panelHeight} panelWidth={panelWidth} />
          )}
          {ready && caseId === 'panel:feats' && (
            <FeatsFeaturesPanel panelHeight={panelHeight} panelWidth={panelWidth} />
          )}
          {ready && caseId === 'panel:creature-details' && (
            <CreatureDetailsPanel
              id={id}
              creature={creature}
              content={content}
              panelHeight={panelHeight}
              panelWidth={panelWidth}
            />
          )}
          {ready && caseId === 'panel:creature-abilities' && (
            <CreatureAbilitiesPanel
              id={id}
              creature={creature}
              setCreature={setCreature}
              content={content}
              panelHeight={panelHeight}
              panelWidth={panelWidth}
            />
          )}
        </QueryClientProvider>
      </Provider>
    </Modal>
  );
}

/** Use the same live creature preview as companions and encounter combatants. */
function CreatureScene({ fixture, includeSourceId = false }: { fixture: Fixture; includeSourceId?: boolean }): null {
  const open = useSetAtom(creatureDrawerState);
  useEffect(() => {
    open({
      data: {
        id: includeSourceId ? sample(CreatureSchema, fixture.catalog.creature).id : undefined,
        creature: sample(CreatureSchema, fixture.catalog.creature),
        STORE_ID: 'CREATURE_LOCAL_VISUAL',
        updateCreature: () => {},
      },
    });
    return () => open(null);
  }, [fixture, includeSourceId, open]);
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
