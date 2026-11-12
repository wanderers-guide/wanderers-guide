/**
 * Pathbuilder 2e -> Wanderer's Guide, 1:1 importer.
 *
 * Replaces the legacy `json.php` -> `convertPathbuilderToFTC()` -> `importFromFTC()`
 * chain. That chain was lossy by construction: the FTC intermediate can only
 * express an item as `{ name, level? }`, so every Custom File (custom weapons,
 * custom buffs, homebrew gear) was reduced to a name and then dropped when the
 * name did not match WG content.
 *
 * This importer works from the share payload directly:
 *
 *   POST /app/fetch_emailed.php {id}
 *     -> { characterData, listCustomFiles }
 *     -> resolveBuild()                  pure normalization, unit tested
 *     -> ensureCustomContent()           Custom Files become real WG Items
 *     -> buildCharacter()                identity, variants, selections, gear
 *     -> makeRequest('create-character')
 *     -> persistImportRow()              raw payload kept for re-translation
 *
 * Two invariants worth preserving:
 *
 *  1. Nothing is silently dropped. Anything that cannot be resolved is recorded
 *     in `unresolved`, persisted to `pathbuilder_import.unresolved`, and reported
 *     back to the caller as a warning.
 *  2. The raw payload is written *before* the character is created, and updated
 *     with the character id afterwards. An import that fails halfway still leaves
 *     a record of what Pathbuilder said, which is the whole point of keeping it.
 */

import { createPathbuilderContentSource, upsertItem, upsertSpell } from '@content/content-creation';
import { defineDefaultSources, fetchContent, fetchContentPackage, fetchContentSources } from '@content/content-store';
import { toMarkdown } from '@content/content-utils';
import { findFirstSelection, findMatchingOption } from '@import/ftc/import-from-ftc';
import { getBestArmor, isItemEquippable, isItemImplantable, isItemInvestable } from '@items/inv-utils';
import { getAcParts } from '@items/armor-handler';
import { hideNotification, showNotification } from '@mantine/notifications';
import { ObjectWithUUID } from '@operations/operation-utils';
import { executeOperations } from '@operations/operations.main';
import { makeRequest } from '@requests/request-manager';
import { Character, InventoryItem, Item, ItemMetaCategorySchema, ItemMetaGroupSchema, OperationCharacterResultPackage, Spell, Trait } from '@schemas/content';
import { Operation } from '@schemas/operations';
import { getFinalAcValue, getFinalVariableValue } from '@variables/variable-helpers';
import { getVariable } from '@variables/variable-manager';
import { compileProficiencyType, labelToVariable } from '@variables/variable-utils';
import { cloneDeep } from 'lodash-es';

import {
  findPathbuilderMatch,
  findPathbuilderMatches,
  pathbuilderNameCandidates,
} from './pathbuilder-aliases';
import { extractBuildId, fetchPathbuilderDerived, fetchPathbuilderShare, getPathbuilderDerivedFetchError } from './fetch-pathbuilder-share';
import { assertPathbuilderDerivedMatchesShare } from './pathbuilder-export-identity';
import { parseFeatSlotKey, pathbuilderAbilityLabel, resolveBuild } from './pathbuilder-resolve';
import { PathbuilderCustomFile, ResolvedBuild, ResolvedItemRef } from './types';
import {
  findFreeArchetypeBranch,
  getAbilityBoostOriginForPath,
  getPathbuilderAncestryFeatSelectorIndex,
  inferPathbuilderAncestryFeatLevel,
  inferPathbuilderOperationLevel,
} from './pathbuilder-selection-routing';

export type PathbuilderImportOptions = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Import the character but do not create homebrew Items for Custom Files. */
  skipCustomContent?: boolean;
  /** Calculated JSON supplied by Pathbuilder's official browser export flow. */
  derivedOverride?: import('@schemas/pathbuilder').PathbuilderDerivedBuild | null;
  /** Explicit JSON export ID. Never default this to the share ID. */
  derivedBuildId?: string;
  /** User-confirmed operation selection UUIDs, keyed by the stable operation-result path. */
  selectionOverrides?: Record<string, string>;
  /** Turn off the Mantine notifications (used by tests and bulk imports). */
  silent?: boolean;
};

export type PathbuilderSelectionPrompt = {
  /** Stable across operation-result paths that change when grants are rebuilt. */
  key: string;
  path: string;
  title: string;
  description?: string;
  level: number;
  options: Array<{ value: string; label: string; description?: string }>;
  /** Diagnostic trace used to verify nested selection reconstruction when preflight stalls. */
  diagnostics?: {
    selections: Record<string, string>;
    resolvedSelectionKeys: string[];
  };
};

export type PathbuilderTargetSummary = {
  name?: string;
  level?: number;
  abilities: Array<{ key: string; label: string; score: number; modifier: number }>;
  ac?: {
    total?: number;
    proficiency?: number;
    ability?: number;
    item?: number;
    shield?: number | string | null;
  };
  proficiencies: Array<{ name: string; value: number; rank: string }>;
  attributes: Array<{ name: string; value: number }>;
  armor: Array<{
    name: string;
    display?: string;
    worn?: boolean;
    proficiency?: string;
    potency?: number;
    resilience?: string;
    runes: string[];
  }>;
  resistances: string[];
};

export type PathbuilderCurrentSummary = {
  abilities: Array<{ key: string; label: string; modifier: number }>;
  acTotal: number | null;
};

export type PathbuilderPreflightSnapshot = {
  target?: PathbuilderTargetSummary;
  current: PathbuilderCurrentSummary;
};

export type PathbuilderSelectionPreflightOutcome =
  | { status: 'ready'; snapshot: PathbuilderPreflightSnapshot }
  | { status: 'selection-required'; selection: PathbuilderSelectionPrompt; snapshot: PathbuilderPreflightSnapshot }
  | { status: 'error'; error: string };

/**
 * A result type rather than a thrown error: the caller (the import modal) always
 * has something to show the user, and a rejected Pathbuilder id is the client's
 * fault, not an exceptional condition.
 */
export type PathbuilderImportOutcome =
  | {
      ok: true;
      character: Character;
      resolved: ResolvedBuild;
      /** Row id in `public.pathbuilder_import`. */
      importId: number | null;
      /** Content source created to hold the imported Custom Files, if any. */
      customSourceId: number | null;
      /** Human-readable summary of everything that could not be mapped. */
      warnings: string[];
    }
  | { ok: false; error: string; resolved?: ResolvedBuild; warnings: string[] };

const NOTIFICATION_ID = 'pathbuilder-import';

export async function importFromPathbuilderShare(
  input: string | number,
  options: PathbuilderImportOptions = {}
): Promise<PathbuilderImportOutcome> {
  const buildId = extractBuildId(input);
  if (!buildId) {
    return {
      ok: false,
      error: 'That does not look like a Pathbuilder build id or share link',
      warnings: [],
    };
  }

  const notify = (patch: Parameters<typeof showNotification>[0]) => {
    if (!options.silent) showNotification(patch);
  };
  const closeNotification = () => {
    if (!options.silent) hideNotification(NOTIFICATION_ID);
  };

  notify({
    id: NOTIFICATION_ID,
    title: `Importing Pathbuilder build ${buildId}`,
    message: 'Fetching the share payload...',
    autoClose: false,
    withCloseButton: false,
    loading: true,
  });

  try {
    // The derived payload is optional enrichment; it 403s for many shared builds
    // and must never be able to fail the import.
    const [shared, fetchedDerived] = await Promise.all([
      fetchPathbuilderShare(buildId, { fetchImpl: options.fetchImpl, signal: options.signal }),
      options.derivedOverride !== undefined
        ? Promise.resolve(options.derivedOverride)
        : options.derivedBuildId
          ? fetchPathbuilderDerived(options.derivedBuildId, { fetchImpl: options.fetchImpl, signal: options.signal })
          : Promise.resolve(null),
    ]);
    const derived = options.derivedOverride !== undefined ? options.derivedOverride : fetchedDerived;

    if (!shared.ok) {
      closeNotification();
      notify({ title: 'Import failed', message: shared.error, color: 'red', icon: null, autoClose: false });
      return { ok: false, error: shared.error, warnings: [] };
    }

    // An explicitly supplied official export ID is mandatory input. Never silently
    // continue with only the share payload when its calculated export was requested.
    if (options.derivedOverride === undefined && options.derivedBuildId && !fetchedDerived) {
      const detail = getPathbuilderDerivedFetchError(options.derivedBuildId);
      const error = `Pathbuilder JSON export ${options.derivedBuildId} could not be retrieved. ${detail ?? "Confirm that you used Pathbuilder's Export → Export JSON and copied the generated export ID."} No character was imported.`;
      closeNotification();
      notify({ title: 'Pathbuilder JSON export unavailable', message: error, color: 'red', icon: null, autoClose: false });
      return { ok: false, error, warnings: [] };
    }

    if (derived) {
      assertPathbuilderDerivedMatchesShare(shared.build.characterData, derived);
    }

    const resolved = resolveBuild(shared.build, {
      buildId,
      formatVersion: shared.formatVersion,
      derived,
    });

    // Provenance first: if character creation blows up, the payload is still saved.
    const importId = await insertImportRow(buildId, shared, derived, resolved);

    notify({
      id: NOTIFICATION_ID,
      title: `Importing "${resolved.identity.name}"`,
      message: 'This may take a minute...',
      autoClose: false,
      withCloseButton: false,
      loading: true,
    });

    const warnings = resolved.unresolved
      .filter((u) => u.kind !== 'spell-source')
      .map((u) =>
        u.kind === 'armor'
          ? `armor warning: Pathbuilder armor reference "${u.ref}" could not be resolved (${u.reason}). The character will still be created, but armor effects and AC may differ.`
          : `${u.kind}: ${u.ref} (${u.reason})`
      );
    const blockingUnresolvedWarnings = warnings.filter(
      (warning) => !warning.startsWith('armor warning:')
    );
    if (blockingUnresolvedWarnings.length > 0) {
      throw new Error(
        `Pathbuilder 1:1 import blocked by unresolved source data: ${blockingUnresolvedWarnings.join('; ')}`
      );
    }
    if (resolved.hints.length > 0) {
      console.info('Pathbuilder import notes:', resolved.hints);
      for (const hint of resolved.hints) {
        if (
          /^Armor: (?:Reconstructed the Automaton Reinforced Chassis|Pathbuilder JSON marks multiple armor rows|Pathbuilder JSON includes armor rows|Pathbuilder (?:JSON|share) resilience rune|Pathbuilder JSON did not provide a resilience rune rank)/i.test(
            hint
          )
        ) {
          warnings.push(`armor warning: ${hint}`);
        }
      }
    }
    if (importId === null) {
      warnings.push('provenance: the raw payload could not be saved, so this character cannot be re-imported later');
    }

    const sources = await fetchContentSources('ALL-USER-ACCESSIBLE');
    const enabledSourceIds = sources.map((source) => source.id);
    const sourceView = defineDefaultSources('PAGE', enabledSourceIds);
    const content = await fetchContentPackage(sourceView, { fetchSources: true });

    const custom = !options.skipCustomContent
      ? await ensureCustomContent(resolved, buildId, content, warnings)
      : { sourceId: null, byUuid: new Map<string, Item>(), fallbackSpellsByName: new Map<string, Spell>() };
    const customSourceId = custom.sourceId;
    const customItems = custom.byUuid;

    const character = await buildCharacter(
      resolved,
      content,
      customItems,
      custom.fallbackSpellsByName,
      customSourceId,
      warnings,
      derived,
      { selectionOverrides: options.selectionOverrides }
    );

    if (importId !== null && character?.id) {
      // Second call to the same endpoint: upsertData takes the update path when a
      // real id is supplied, and the handler only touches the columns we send.
      await makeRequest('create-pathbuilder-import', { id: importId, character_id: character.id }, false);
    }

    closeNotification();
    if (!character) {
      notify({
        title: 'Import failed',
        message: 'Wanderer\u2019s Guide rejected the character',
        color: 'red',
        icon: null,
        autoClose: false,
      });
      return { ok: false, error: 'Wanderer\u2019s Guide rejected the character', resolved, warnings };
    }

    const prioritizedWarnings = [
      ...warnings.filter((warning) => warning.startsWith('AC mismatch:')),
      ...warnings.filter((warning) => warning.startsWith('armor warning:')),
      ...warnings.filter(
        (warning) =>
          !warning.startsWith('AC mismatch:') && !warning.startsWith('armor warning:')
      ),
    ];
    const visibleWarnings = prioritizedWarnings.slice(0, 3);
    const remainingWarningCount = warnings.length - visibleWarnings.length;
    notify({
      title: 'Import complete',
      message:
        warnings.length > 0
          ? `Imported "${character.name}" with warnings: ${visibleWarnings.join(' • ')}${remainingWarningCount > 0 ? ` • and ${remainingWarningCount} more warning(s)` : ''}`
          : `Imported "${character.name}"`,
      icon: null,
      color: warnings.length > 0 ? 'yellow' : undefined,
      autoClose: warnings.length > 0 ? false : 3000,
    });

    return { ok: true, character, resolved, importId, customSourceId, warnings };
  } catch (error) {
    // Genuine unexpected failure (content fetch, operation engine). Logged, and
    // converted to the same result shape so callers have one thing to handle.
    console.error('Pathbuilder import failed:', error);
    closeNotification();
    notify({
      title: 'Import failed',
      message: error instanceof Error ? error.message : 'Error importing from Pathbuilder',
      color: 'red',
      icon: null,
      autoClose: false,
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error importing from Pathbuilder',
      warnings: [],
    };
  }
}

/**
 * Resolve missing mandatory operation choices before any import/provenance/custom-content
 * writes occur. This may be called repeatedly as the UI collects user selections.
 */
export async function preflightPathbuilderImport(
  input: string | number,
  options: Pick<PathbuilderImportOptions, 'signal' | 'fetchImpl' | 'derivedBuildId' | 'derivedOverride' | 'selectionOverrides'> = {}
): Promise<PathbuilderSelectionPreflightOutcome> {
  const buildId = extractBuildId(input);
  if (!buildId) return { status: 'error', error: 'Enter a valid Pathbuilder share ID or link.' };

  try {
    const [shared, fetchedDerived] = await Promise.all([
      fetchPathbuilderShare(buildId, { fetchImpl: options.fetchImpl, signal: options.signal }),
      options.derivedOverride !== undefined
        ? Promise.resolve(options.derivedOverride)
        : options.derivedBuildId
          ? fetchPathbuilderDerived(options.derivedBuildId, { fetchImpl: options.fetchImpl, signal: options.signal })
          : Promise.resolve(null),
    ]);

    if (!shared.ok) return { status: 'error', error: shared.error };

    const derived = options.derivedOverride !== undefined ? options.derivedOverride : fetchedDerived;
    if (options.derivedOverride === undefined && options.derivedBuildId && !fetchedDerived) {
      return {
        status: 'error',
        error: `Pathbuilder JSON export ${options.derivedBuildId} could not be retrieved. ${getPathbuilderDerivedFetchError(options.derivedBuildId) ?? 'Confirm the ID generated by Export → Export JSON.'} No character was imported.`,
      };
    }
    if (derived) assertPathbuilderDerivedMatchesShare(shared.build.characterData, derived);

    const resolved = resolveBuild(shared.build, {
      buildId,
      formatVersion: shared.formatVersion,
      derived,
    });
    const sources = await fetchContentSources('ALL-USER-ACCESSIBLE');
    const sourceView = defineDefaultSources('PAGE', sources.map((source) => source.id));
    const content = await fetchContentPackage(sourceView, { fetchSources: true });

    const preflight = await buildCharacter(
      resolved,
      content,
      new Map<string, Item>(),
      new Map<string, Spell>(),
      null,
      [],
      derived,
      { preflightOnly: true, selectionOverrides: options.selectionOverrides }
    );

    const snapshot: PathbuilderPreflightSnapshot = {
      target: derived ? summarizePathbuilderTargets(derived) : undefined,
      current: preflight.current,
    };
    return preflight.status === 'selection-required'
      ? { status: 'selection-required', selection: preflight.selection, snapshot }
      : { status: 'ready', snapshot };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Could not validate Pathbuilder selections.',
    };
  }
}

// ─── provenance ───────────────────────────────────────────────────────────────

async function insertImportRow(
  buildId: string,
  shared: { build: { characterData: unknown; listCustomFiles?: unknown } },
  derived: unknown,
  resolved: ResolvedBuild
): Promise<number | null> {
  try {
    // notifyFailure=false: a missing snapshot must not abort the import, and the
    // caller reports this as a warning instead of a red notification.
    const result = await makeRequest<{ id?: number } | true>(
      'create-pathbuilder-import',
      {
        id: -1,
        build_id: buildId,
        source_url: `https://pathbuilder2e.com/app.html?emailedBuildID=${buildId}`,
        format_version: resolved.formatVersion ?? null,
        character_data: shared.build.characterData,
        custom_files: shared.build.listCustomFiles ?? [],
        derived_data: derived ?? null,
        unresolved: resolved.unresolved,
      },
      false
    );
    // create-* endpoints answer `true` instead of the row on some paths.
    if (result && result !== true) return result.id ?? null;
    return null;
  } catch (error) {
    // Not fatal: the character import is still worth completing, and the raw
    // payload survives in the browser console via the returned `resolved`.
    console.warn('Could not record the Pathbuilder import snapshot:', error);
    return null;
  }
}

// ─── custom content ───────────────────────────────────────────────────────────

/**
 * Turn referenced Custom Files into real WG Items inside a per-import content
 * source, so they survive as items with stats instead of as dropped names.
 */
async function ensureCustomContent(
  resolved: ResolvedBuild,
  buildId: string,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  warnings: string[]
): Promise<{
  sourceId: number | null;
  byUuid: Map<string, Item>;
  fallbackSpellsByName: Map<string, Spell>;
}> {
  const byUuid = new Map<string, Item>();
  const fallbackSpellsByName = new Map<string, Spell>();

  const referenced = new Map<string, PathbuilderCustomFile>();
  const consider = (ref: ResolvedItemRef | undefined) => {
    if (ref?.kind === 'custom' && ref.uuid && ref.custom) referenced.set(ref.uuid.toLowerCase(), ref.custom);
  };
  resolved.weapons.forEach(consider);
  resolved.looseEquipment.forEach(consider);
  resolved.containers.forEach((container) => container.items.forEach(consider));
  consider(resolved.armor);
  consider(resolved.shield);

  const itemRefs = [
    ...resolved.weapons,
    ...resolved.looseEquipment,
    ...resolved.containers.flatMap((container) => container.items),
    ...(resolved.armor ? [resolved.armor] : []),
    ...(resolved.shield ? [resolved.shield] : []),
  ];

  const standardRefs = itemRefs.filter((ref) => ref.kind === 'standard');
  const unresolvedRefs = new Map<string, ResolvedItemRef>();
  for (const ref of itemRefs) {
    if (ref.kind === 'unresolved') unresolvedRefs.set(ref.raw.toLowerCase(), ref);
  }

  const missingItems = standardRefs.filter((ref) => !findImportedItem(content.items, ref.name) && !findImportedItem(content.items, ref.raw));
  const missingSpells = resolved.spells.filter(
    (spell) => !findPathbuilderMatch('spell', spell.name, content.spells, (item) => item.name)
  );

  if (referenced.size === 0 && unresolvedRefs.size === 0 && missingItems.length === 0 && missingSpells.length === 0) {
    return { sourceId: null, byUuid, fallbackSpellsByName };
  }

  const source = await createPathbuilderContentSource(buildId);
  const sourceId = source?.id ?? null;
  if (sourceId === null || sourceId < 0) {
    warnings.push(
      'custom content: could not create the Pathbuilder import source, so custom/reference content was not persisted'
    );
    return { sourceId, byUuid, fallbackSpellsByName };
  }

  // The source is intentionally reused across retries of the same user/build.
  // Reload its existing content so an interrupted/repeated import does not treat
  // deterministic UUID collisions as a rejection and then lose the custom item.
  let sourceItems: Item[] = [];
  let sourceSpells: Spell[] = [];
  try {
    // A newly-created private source is not part of the operation worker's posted
    // content package. fetchContentPackage([sourceId]) could therefore return an
    // empty worker-local package instead of hitting Supabase, causing duplicate
    // UUID inserts on repeated imports. Bypass the worker and global cache here
    // because this read is specifically about freshly-created source content.
    sourceItems = await fetchContent<Item>(
      'item',
      { content_sources: [sourceId] },
      true,
      true
    );
    sourceSpells = await fetchContent<Spell>(
      'spell',
      { content_sources: [sourceId] },
      true,
      true
    );
  } catch (error) {
    console.warn('Could not reload existing Pathbuilder source content:', error);
  }

  const traits = new Map<string, number>(
    (content.traits ?? []).map((trait) => [labelToVariable(trait.name), trait.id])
  );

  for (const [uuid, customFile] of referenced) {
    const existing = sourceItems.find(
      (item) => item.meta_data?.pathbuilder?.uniqueIdentifier?.toLowerCase() === uuid
    );
    if (existing) {
      byUuid.set(uuid, existing);
      continue;
    }

    const item = await createCustomItem(
      customFile,
      sourceId,
      traits,
      content,
      warnings,
      // A Custom File does not record a casting source. Class-granted focus
      // spells use the class name in WG; this is the only context available here.
      resolved.identity.className?.toUpperCase()
    );
    if (item) byUuid.set(uuid, item);
  }

  for (const ref of unresolvedRefs.values()) {
    const existing = sourceItems.find((item) => {
      if (item.meta_data?.pathbuilder?.source !== 'Pathbuilder Reference') return false;
      const raw = (item.meta_data?.pathbuilder as { raw?: unknown } | undefined)?.raw;
      return typeof raw === 'object' && raw !== null && 'raw' in raw && (raw as Record<string, unknown>).raw === ref.raw;
    });
    if (existing) {
      byUuid.set(`unresolved:${ref.raw.toLowerCase()}`, existing);
      continue;
    }

    const semanticKind = classifyReferenceSemanticKind(ref, resolved);
    const item = await createReferenceItem(ref, sourceId, warnings, semanticKind, traits, content.items);
    if (item) byUuid.set(`unresolved:${ref.raw.toLowerCase()}`, item);
  }

  for (const ref of missingItems) {
    const existing = sourceItems.find((item) => {
      if (item.meta_data?.pathbuilder?.source !== 'Pathbuilder Reference') return false;
      const raw = (item.meta_data?.pathbuilder as { raw?: unknown } | undefined)?.raw;
      return typeof raw === 'object' && raw !== null && 'raw' in raw && (raw as Record<string, unknown>).raw === ref.raw;
    });
    if (existing) {
      byUuid.set(`ref:${labelToVariable(ref.name)}`, existing);
      continue;
    }

    const semanticKind = classifyReferenceSemanticKind(ref, resolved);
    const item = await createReferenceItem(ref, sourceId, warnings, semanticKind, traits, content.items);
    if (item) byUuid.set(`ref:${labelToVariable(ref.name)}`, item);
  }

  for (const spell of missingSpells) {
    const existing = sourceSpells.find((candidate) => {
      const raw = (candidate.meta_data?.pathbuilder as { raw?: unknown } | undefined)?.raw;
      return typeof raw === 'object' && raw !== null && 'rawKey' in raw && (raw as Record<string, unknown>).rawKey === spell.rawKey;
    });
    if (existing) {
      fallbackSpellsByName.set(labelToVariable(spell.name), existing);
      continue;
    }

    const item = await createReferenceSpell(spell, sourceId);
    if (item) {
      warnings.push(
        `spell: WG has no spell matching "${spell.name}"; created a reference-only Pathbuilder spell so the spell is not lost`
      );
      fallbackSpellsByName.set(labelToVariable(spell.name), item);
    }
  }

  return { sourceId, byUuid, fallbackSpellsByName };
}

function findImportedItem(items: Item[], name: string): Item | undefined {
  return findPathbuilderMatch('item', name, items, (item) => item.name);
}

/**
 * Determine which WG equipment slot a Pathbuilder reference belongs to so the
 * materialized reference item gets weapon/armor/shield metadata when warranted.
 * Uses identity against the resolved build plus the raw-reference kind recorded
 * by the resolver as fallbacks (previously unresolvedRefs defaulted every
 * reference — including weapons — to 'equipment', skipping inheritance).
 */
function classifyReferenceSemanticKind(
  ref: ResolvedItemRef,
  resolved: Pick<ResolvedBuild, 'weapons' | 'armor' | 'shield'>
): 'weapon' | 'armor' | 'shield' | 'equipment' {
  if (resolved.weapons.some((weapon) => weapon === ref)) return 'weapon';
  if (resolved.armor === ref) return 'armor';
  if (resolved.shield === ref) return 'shield';
  const rawKind = ref.unresolvedKind ?? ref.custom?.type;
  if (rawKind === 1 || rawKind === 'Weapon' || rawKind === 'weapon') return 'weapon';
  if (rawKind === 2 || rawKind === 'Armor' || rawKind === 'armor') return 'armor';
  if (rawKind === 3 || rawKind === 'Shield' || rawKind === 'shield') return 'shield';
  return 'equipment';
}

/**
 * Materialize a Pathbuilder item that WG has no content record for.
 *
 * Exported for regression coverage (`scripts/pathbuilder-base-weapon.test.mjs`).
 * Fidelity policy (contract §3/§4): when the reference's prose names a WG weapon,
 * inherit that base weapon's proficiency category/group via `inferBaseWeapon`;
 * otherwise leave the category unset rather than fabricating 'simple', which
 * would silently import martial/advanced weapons at the wrong proficiency tier.
 */
export async function createReferenceItem(
  ref: ResolvedItemRef,
  sourceId: number,
  warnings: string[],
  semanticKind: 'weapon' | 'armor' | 'shield' | 'equipment' = 'equipment',
  traits: Map<string, number> = new Map(),
  catalogItems: Item[] = []
): Promise<Item | null> {
  const specialUnarmed = new RegExp('\\bSPECIAL\\s+UNARMED\\s*\\(\\s*\\d+d(?:4|6|8|10|12)\\s*\\)', 'i').test(ref.raw);
  const damageMatch = new RegExp('\\(\\s*(\\d+)d(4|6|8|10|12)\\s*\\)', 'i').exec(ref.raw);
  // Same inheritance rule as Custom Files (see inferBaseWeapon): when the
  // reference's prose names a WG weapon we know, adopt that weapon's category
  // and group instead of assuming 'simple'. A fabricated simple-category
  // weapon would silently import at the wrong proficiency tier.
  const inferredBase =
    semanticKind === 'weapon' && !specialUnarmed
      ? inferBaseWeapon(
          { name: ref.name, description: ref.raw, weaponTraits: null } as PathbuilderCustomFile,
          catalogItems
        )
      : undefined;
  const baseCategory = inferredBase?.meta_data?.category;
  const validBaseCategory =
    typeof baseCategory === 'string' && ItemMetaCategorySchema.safeParse(baseCategory).success
      ? (baseCategory as NonNullable<NonNullable<Item['meta_data']>['category']>)
      : undefined;
  if (semanticKind === 'weapon' && !specialUnarmed && !validBaseCategory) {
    console.info(
      `Pathbuilder reference weapon "${ref.name}" has no unique WG base-weapon match; importing with unset proficiency category`
    );
  }
  const specialUnarmedProfiles: Record<string, { damageType: string; displayTraits: string[] }> = {
    CLAW: {
      damageType: 'S',
      displayTraits: ['Agile', 'Finesse', 'Magical', 'Unarmed'],
    },
    PINCER: {
      damageType: 'P',
      displayTraits: ['Grapple', 'Magical', 'Unarmed'],
    },
  };
  const specialUnarmedProfile = specialUnarmed
    ? specialUnarmedProfiles[labelToVariable(ref.name)]
    : undefined;
  const displayTraits = semanticKind === 'weapon' && specialUnarmed
    ? specialUnarmedProfile?.displayTraits ?? ['Agile', 'Finesse', 'Magical', 'Nonlethal', 'Unarmed']
    : [];

  const traitIds = displayTraits
    .map((name) => traits.get(labelToVariable(name)))
    .filter((id): id is number => id !== undefined);

  const isWeapon = semanticKind === 'weapon';
  const item = {
    id: -1,
    created_at: '',
    name: ref.name,
    price: null,
    bulk: null,
    level: 0,
    rarity: 'COMMON',
    traits: traitIds,
    description:
      `Imported from Pathbuilder as a reference. Wanderer's Guide did not have a matching content record at import time. Original Pathbuilder reference: ${ref.raw}`,
    group:
      semanticKind === 'weapon'
        ? 'WEAPON'
        : semanticKind === 'armor'
          ? 'ARMOR'
          : semanticKind === 'shield'
            ? 'SHIELD'
            : 'GENERAL',
    hands: isWeapon && specialUnarmed ? '1' : null,
    size: 'MEDIUM',
    craft_requirements: null,
    usage: null,
    operations: [],
    content_source_id: sourceId,
    version: '1.0',
    meta_data: {
      bulk: {},
      ...(isWeapon
        ? {
            category: specialUnarmed ? 'unarmed_attack' : validBaseCategory,
            group: specialUnarmed
              ? 'brawling'
              : (mapMetaGroup(inferredBase?.meta_data?.group) ?? inferredBase?.meta_data?.group),
            damage: {
              dice: damageMatch ? Number(damageMatch[1]) : 1,
              die: damageMatch ? `d${damageMatch[2]}` : 'd4',
              damageType: specialUnarmedProfile?.damageType ?? 'B',
              extra: '',
            },
            display_traits: displayTraits,
          }
        : {}),
      pathbuilder: {
        uniqueIdentifier: crypto.randomUUID(),
        type: 0,
        source: 'Pathbuilder Reference',
        raw: {
          kind: ref.kind,
          semanticKind,
          name: ref.name,
          raw: ref.raw,
          quantity: ref.quantity,
        },
      },
    },
  } satisfies Item;

  try {
    const created = await upsertItem(item);
    return created;
  } catch (error) {
    console.warn(`Could not create Pathbuilder reference item "${ref.name}":`, error);
    warnings.push(
      semanticKind === 'armor'
        ? `armor warning: could not persist reference armor "${ref.name}"; the character will still be created, but armor effects and AC may be incomplete`
        : `item: failed to create Pathbuilder reference for "${ref.name}"`
    );
    return null;
  }
}

async function createReferenceSpell(
  spell: ResolvedBuild['spells'][number],
  sourceId: number
): Promise<Spell | null> {
  const keyParts = spell.rawKey.split('&');
  const rankHint = Number(keyParts[1]);
  const item = {
    id: -1,
    created_at: '',
    name: spell.name,
    rank: Number.isFinite(rankHint) && rankHint >= 0 ? rankHint : 0,
    traditions: [],
    rarity: 'COMMON',
    availability: null,
    cast: '',
    traits: [],
    defense: null,
    cost: null,
    trigger: null,
    requirements: null,
    range: null,
    area: null,
    targets: null,
    duration: null,
    description:
      `Imported from Pathbuilder as a reference. Wanderer's Guide did not have a matching spell record at import time. Original spell key: ${spell.rawKey}`,
    heightened: {},
    meta_data: {
      pathbuilder: {
        raw: {
          rawKey: spell.rawKey,
          spellListIndex: spell.spellListIndex,
          heighten: spell.heighten,
        },
      },
    },
    content_source_id: sourceId,
    version: '1.0',
  } satisfies Spell;

  try {
    const created = await upsertSpell(item);
    return created;
  } catch {
    return null;
  }
}

/** Convert one Pathbuilder Custom File to a WG Item while preserving the raw file in meta_data. */
/**
 * The Custom File discriminator is useful for identifying known Pathbuilder
 * file kinds, but it is not a stable contract. Keep the original value in
 * meta_data.pathbuilder.raw and only expose a numeric discriminator to the WG
 * metadata schema when Pathbuilder actually provided one.
 */
function numericPathbuilderType(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
  }
  return undefined;
}

async function createCustomItem(
  customFile: PathbuilderCustomFile,
  sourceId: number,
  traits: Map<string, number>,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  warnings: string[],
  castingSource?: string
): Promise<Item | null> {
  const rawTraits = (customFile.weaponTraits ?? customFile.traits ?? '')
    .split(',')
    .map((trait) => trait.trim())
    .filter(Boolean);

  const traitIds: number[] = [];
  const unresolvedTraits: string[] = [];
  for (const name of rawTraits) {
    const id = traits.get(labelToVariable(name));
    if (id !== undefined) traitIds.push(id);
    else unresolvedTraits.push(name);
  }
  // Unknown/homebrew traits are retained verbatim in meta_data.display_traits.
  // They are not an import failure and must not inflate the "unmapped" count.
  if (unresolvedTraits.length > 0) {
    console.info(
      `Pathbuilder custom item "${customFile.name}" has traits not present in WG content; preserved as display text:`,
      unresolvedTraits
    );
  }

  const isWeapon =
    typeof customFile.damage === 'number' ||
    (customFile.weaponTraits ?? '').length > 0 ||
    (typeof customFile.group === 'string' && customFile.group.trim().length > 0);

  // Custom weapons frequently describe their base weapon without repeating its
  // mechanical fields. Reuse a uniquely identifiable WG weapon as a mechanical
  // baseline, while preserving the Custom File's own identity and raw payload.
  const inferredBaseWeapon = isWeapon ? inferBaseWeapon(customFile, content.items) : undefined;
  const baseDamage = (inferredBaseWeapon?.meta_data?.damage ?? {}) as Record<string, any>;
  const inferredDamageType =
    mapDamageType(customFile.damageType) ??
    (typeof baseDamage.damageType === 'string' ? baseDamage.damageType : undefined) ??
    inferDamageTypeFromText(customFile.description);
  const inheritedTraits = inferredBaseWeapon?.traits?.filter((id) => !traitIds.includes(id)) ?? [];

  // Pathbuilder descriptions are HTML-ish (<br>, <br><br>); WG content is markdown.
  // toMarkdown is the same helper the custom-pack importer uses, so both Pathbuilder
  // entry points normalize prose identically.
  const description =
    toMarkdown([customFile.description, customFile.action0desc].filter(Boolean).join('<br><br>')) ?? '';

  const item = {
    id: -1,
    created_at: '',
    name: customFile.name ?? 'Unnamed Custom Item',
    price: typeof customFile.price === 'number' ? { gp: customFile.price } : null,
    bulk: customFile.bulk ?? inferredBaseWeapon?.bulk ?? null,
    level: customFile.itemLevel ?? inferredBaseWeapon?.level ?? 0,
    rarity: /\bunique\b/i.test(rawTraits.join(', ')) ? 'UNIQUE' : 'COMMON',
    traits: [...traitIds, ...inheritedTraits],
    description,
    group: isWeapon ? 'WEAPON' : 'GENERAL',
    hands: customFile.hands ?? null,
    size: 'MEDIUM',
    craft_requirements: null,
    usage: null,
    operations: customEffectOperations(customFile, 1, warnings, content, castingSource),
    content_source_id: sourceId,
    version: '1.0',
    meta_data: {
      bulk: {},
      // Kept as display text so nothing is lost when a trait has no WG id.
      display_traits: rawTraits,
      ...(isWeapon
        ? {
            damage: {
              ...(baseDamage ?? {}),
              dice: baseDamage.dice ?? 1,
              die:
                typeof customFile.damage === 'number'
                  ? `d${customFile.damage}`
                  : (baseDamage.die as string | null | undefined) ?? null,
              damageType: inferredDamageType,
            },
            category: (() => {
              const candidate =
                (customFile.group ?? '').toLowerCase().includes('brawling')
                  ? 'unarmed_attack'
                  : inferredBaseWeapon?.meta_data?.category ?? '';
              return ItemMetaCategorySchema.safeParse(candidate).success
                ? (candidate as NonNullable<NonNullable<Item['meta_data']>['category']>)
                : '';
            })(),
            group: mapMetaGroup(customFile.group) ?? inferredBaseWeapon?.meta_data?.group,
          }
        : {}),
      // The verbatim Custom File, so the PT-BR translation layer and any future
      // re-export can work from the original rather than from our mapping.
      pathbuilder: {
        uniqueIdentifier: customFile.uniqueIdentifier,
        type: numericPathbuilderType(customFile.type) ?? 0,
        source: customFile.src ?? 'Custom',
        raw: customFile,
      },
    },
  } satisfies Item;

  const created = await upsertItem(item);
  if (!created) {
    warnings.push(`custom item "${item.name}": WG rejected the item, so it was not added to the inventory`);
    return null;
  }
  if ((created.id ?? -1) < 0) {
    // create-item answered `true` instead of the row, so we have no real id.
    warnings.push(`custom item "${item.name}": created without a returned id; it may need a manual re-link`);
  }
  return created;
}
/**
 * Convert the subset of Pathbuilder custom effects whose targets are explicit in
 * the payload. Unknown numeric effect types stay preserved in raw metadata.
 *
 * Observed in the regression build:
 *   effectType 1 = Speed
 *   effectType 8 = Spell Attack
 */
const PATHBUILDER_EFFECT_VARIABLES: Record<number, string> = {
  1: 'SPEED',
  8: 'SPELL_ATTACK',
};

const PATHBUILDER_SKILL_NAMES = new Set([
  'ACROBATICS',
  'ARCANA',
  'ATHLETICS',
  'CRAFTING',
  'DECEPTION',
  'DIPLOMACY',
  'INTIMIDATION',
  'MEDICINE',
  'NATURE',
  'OCCULTISM',
  'PERFORMANCE',
  'RELIGION',
  'SOCIETY',
  'STEALTH',
  'SURVIVAL',
  'THIEVERY',
]);

function pathbuilderProficiencyVariable(name: string): string | undefined {
  const normalized = labelToVariable(name);
  if (PATHBUILDER_SKILL_NAMES.has(normalized)) return `SKILL_${normalized}`;
  return {
    SPELL_ATTACK: 'SPELL_ATTACK',
    SPELL_DC: 'SPELL_DC',
    CLASS_DC: 'CLASS_DC',
    PERCEPTION: 'PERCEPTION',
    FORTITUDE: 'SAVE_FORT',
    REFLEX: 'SAVE_REFLEX',
    WILL: 'SAVE_WILL',
  }[normalized];
}

export function customEffectOperations(
  customFile: PathbuilderCustomFile,
  stackMultiplier: number,
  warnings: string[],
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  castingSource?: string
): Operation[] {
  const operations: Operation[] = [];
  const emitted = new Set<string>();

  const addBonusOperation = (variable: string, amount: number) => {
    const key = `${variable}:${amount}`;
    if (emitted.has(key)) return;
    emitted.add(key);
    operations.push({
      id: crypto.randomUUID(),
      type: 'addBonusToValue',
      data: {
        variable,
        value: amount,
        type: 'item',
        // These numeric effects are active as represented by the Pathbuilder payload.
        // `text` is reserved for conditional modifiers and otherwise suppresses totals.
        text: '',
      },
    });
  };

  for (const [index, effect] of (customFile.listCustomEffects ?? []).entries()) {
    const amount =
      typeof effect.bonusAmount === 'number' && Number.isFinite(effect.bonusAmount)
        ? effect.bonusAmount * stackMultiplier
        : undefined;

    // A spell grant has no numeric bonus; `proficiencyName` names the spell
    // (observed on build 1609907, "Gloves of Immolation" → Combustion). Map it
    // only when WG has that spell; otherwise the generic unresolved-mechanics
    // warning below keeps the missing grant visible and blocks the import.
    if (effect.effectType === 10) {
      const spellName = effect.proficiencyName?.trim();
      const spell = spellName
        ? findPathbuilderMatch('spell', spellName, content.spells, (candidate) => candidate.name)
        : undefined;
      if (spell) {
        const key = `spell:${spell.id}`;
        if (!emitted.has(key)) {
          emitted.add(key);
          const focusTraitId = (content.traits ?? []).find(
            (trait) => labelToVariable(trait.name) === 'FOCUS'
          )?.id;
          const isFocus =
            focusTraitId !== undefined && (spell.traits ?? []).includes(focusTraitId);
          operations.push({
            id: crypto.randomUUID(),
            type: 'giveSpell',
            data: {
              spellId: spell.id,
              type: isFocus ? 'FOCUS' : 'NORMAL',
              ...(castingSource ? { castingSource } : {}),
              ...(spell.rank !== null && spell.rank !== undefined
                ? { rank: spell.rank }
                : {}),
            },
          });
        }
        continue;
      }
    }

    // A reference-only effect carries provenance for a Pathbuilder-side rule link but
    // no mechanical value. Preserve it in the raw Custom File without manufacturing
    // an "unmapped" warning for a non-numeric payload.
    if (amount === undefined || amount === 0) {
      if (effect.reference && Object.keys(effect).every((key) => key === 'reference')) continue;
      warnings.push(
        `custom effect "${customFile.name}": effect ${index + 1} has no directly executable bonus (reference ${effect.reference ?? 'unknown'})`
      );
      continue;
    }

    if (effect.proficiencyName) {
      const variable = pathbuilderProficiencyVariable(effect.proficiencyName);
      if (variable) {
        addBonusOperation(
          variable,
          amount
        );
      } else {
        warnings.push(
          `custom effect "${customFile.name}": unsupported proficiency target "${effect.proficiencyName}"`
        );
      }
    }

    if (effect.effectType !== undefined && effect.effectType !== null) {
      const variable = PATHBUILDER_EFFECT_VARIABLES[effect.effectType];
      if (variable) {
        addBonusOperation(
          variable,
          amount
        );
      } else if (!effect.proficiencyName) {
        warnings.push(
          `custom effect "${customFile.name}": unsupported effectType ${effect.effectType} (reference ${effect.reference ?? 'unknown'})`
        );
      }
    }
  }

  // Some Pathbuilder Custom Files contain effects in prose as well as in
  // listCustomEffects. Replay explicit numeric item bonuses from the prose so the
  // character sheet keeps the same currently-active totals.
  const description = customFile.description ?? '';
  for (const match of description.matchAll(/\\+(\\d+)\\s*item[- ]bonus\\s+to\\s+([^.]*(?:\\.)?)/gi)) {
    const amount = Number(match[1]) * stackMultiplier;
    const targets = match[2];
    for (const skill of [
      'Acrobatics','Arcana','Athletics','Crafting','Deception','Diplomacy',
      'Intimidation','Medicine','Nature','Occultism','Performance','Religion',
      'Society','Stealth','Survival','Thievery',
    ]) {
      if (targets.toLowerCase().includes(skill.toLowerCase())) {
        addBonusOperation(
          `SKILL_${labelToVariable(skill)}`,
          amount
        );
      }
    }
    if (targets.toLowerCase().includes('speed')) {
      addBonusOperation(
        'SPEED',
        amount
      );
    }
  }

  const speedMatch = /\\+(\\d+)\\s*(?:ft|feet)\\s*item[- ]bonus\\s+to\\s+speed/i.exec(description);
  if (speedMatch) {
    addBonusOperation(
      'SPEED',
      Number(speedMatch[1]) * stackMultiplier
    );
  }

  return operations;
}

/**
 * Match a Custom File's prose to the WG weapon it is built from.
 *
 * Exported for regression coverage (`scripts/pathbuilder-base-weapon.test.mjs`):
 * this is the single point where a custom weapon inherits its proficiency
 * category, damage die, and group from base content, so its ambiguity rules must
 * stay under test even when the full golden-parity suite cannot run.
 *
 * Ambiguity policy: a match counts only when exactly one *distinct weapon name*
 * is longest among the candidates. Two different weapons sharing the longest
 * matched name (e.g. "Bastard Sword" as printed in two sources) are the same
 * logical weapon and remain deterministic because the candidate list preserves
 * catalog order; but a genuine tie between different names returns `undefined`
 * rather than guessing.
 */
export function inferBaseWeapon(customFile: PathbuilderCustomFile, items: Item[]): Item | undefined {
  const haystack = labelToVariable(
    [customFile.name, customFile.description, customFile.weaponTraits].filter(Boolean).join(' ')
  );
  const candidates = items
    .filter((item) => item.group === 'WEAPON')
    .filter((item) => haystack.includes(labelToVariable(item.name)));

  if (candidates.length === 0) return undefined;
  const longest = Math.max(...candidates.map((item) => item.name.length));
  const winners = candidates.filter((item) => item.name.length === longest);
  const distinctNames = new Set(winners.map((item) => item.name));
  if (distinctNames.size !== 1) return undefined;
  return winners[0];
}

function inferDamageTypeFromText(description: string | null | undefined): string | undefined {
  const textValue = labelToVariable(description ?? '');
  if (/\b(?:SWORD|AXE|SLASH|SLASHING)\b/.test(textValue)) return 'slashing';
  if (/\b(?:SPEAR|PIKE|RAPIER|PIERCING)\b/.test(textValue)) return 'piercing';
  if (/\b(?:CLUB|HAMMER|MACE|BLUDGEON|BLUDGEONING)\b/.test(textValue)) return 'bludgeoning';
  return undefined;
}

/** Map Pathbuilder's free-form weapon group to WG's finite ItemMetaGroup vocabulary. */
function mapMetaGroup(value: string | null | undefined): NonNullable<Item['meta_data']>['group'] {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  return ItemMetaGroupSchema.safeParse(normalized).success
    ? (normalized as NonNullable<NonNullable<Item['meta_data']>['group']>)
    : undefined;
}

/** Pathbuilder uses single-letter damage types ("P"); WG spells them out. */
function mapDamageType(value: string | null | undefined): string | undefined {
  switch ((value ?? '').toUpperCase()) {
    case 'P':
      return 'piercing';
    case 'S':
      return 'slashing';
    case 'B':
      return 'bludgeoning';
    default:
      return value ? value.toLowerCase() : undefined;
  }
}

// ─── character construction ───────────────────────────────────────────────────

/**
 * Build the WG Character from the resolved payload.
 *
 * Selection resolution reuses the same operation-loop helpers as the FTC
 * importer: WG's character model is derived by *running operations*, so there is
 * no way to write feats/boosts directly. You feed the builder the choices and
 * let `executeOperations` converge.
 */
export function buildCharacter(
  resolved: ResolvedBuild,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  customItems: Map<string, Item>,
  fallbackSpellsByName: Map<string, Spell>,
  customSourceId: number | null,
  warnings: string[],
  derived?: import('@schemas/pathbuilder').PathbuilderDerivedBuild | null,
  buildOptions?: { preflightOnly?: false; selectionOverrides?: Record<string, string> }
): Promise<Character | null>;
export function buildCharacter(
  resolved: ResolvedBuild,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  customItems: Map<string, Item>,
  fallbackSpellsByName: Map<string, Spell>,
  customSourceId: number | null,
  warnings: string[],
  derived: import('@schemas/pathbuilder').PathbuilderDerivedBuild | null,
  buildOptions: { preflightOnly: true; selectionOverrides?: Record<string, string> }
): Promise<
  | { status: 'ready'; current: PathbuilderCurrentSummary }
  | { status: 'selection-required'; selection: PathbuilderSelectionPrompt; current: PathbuilderCurrentSummary }
>;
export async function buildCharacter(
  resolved: ResolvedBuild,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  customItems: Map<string, Item>,
  fallbackSpellsByName: Map<string, Spell>,
  customSourceId: number | null,
  warnings: string[],
  derived?: import('@schemas/pathbuilder').PathbuilderDerivedBuild | null,
  buildOptions: { preflightOnly?: boolean; selectionOverrides?: Record<string, string> } = {}
): Promise<
  | Character
  | null
  | { status: 'ready'; current: PathbuilderCurrentSummary }
  | { status: 'selection-required'; selection: PathbuilderSelectionPrompt; current: PathbuilderCurrentSummary }
> {
  const character = {
    id: -1,
    created_at: '',
    user_id: '',
    name: resolved.identity.name,
    level: resolved.identity.level,
    experience: 0,
    hp_current: 0,
    hp_temp: 0,
    hero_points: 1,
    stamina_current: -1,
    resolve_current: -1,
    details: {
      class: undefined,
      background: undefined,
      ancestry: undefined,
      info: {
        appearance: '',
        personality: '',
        alignment: resolved.identity.alignment ?? '',
        beliefs: resolved.identity.deity ?? '',
        age: resolved.identity.age ?? '',
        height: '',
        weight: '',
        gender: resolved.identity.gender ?? '',
        pronouns: '',
        faction: '',
        reputation: 0,
        ethnicity: '',
        nationality: '',
        birthplace: '',
        organized_play_id: '',
      },
    },
    notes: resolved.notes
      ? {
          pages: [
            {
              name: 'Imported Notes',
              icon: 'notes',
              color: '#ffffff',
              contents: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'left' },
                    content: [{ type: 'text', text: resolved.notes }],
                  },
                ],
              },
            },
          ],
        }
      : null,
    options: {
      is_public: false,
      auto_detect_prerequisites: true,
      auto_heighten_spells: false,
      class_archetypes: false,
      custom_operations: false,
      dice_roller: true,
      ignore_bulk_limit: false,
      alternate_ancestry_boosts: false,
      voluntary_flaws: false,
    },
    variants: {
      ancestry_paragon: resolved.variants.ancestry_paragon,
      proficiency_without_level: false,
      proficiency_half_level: false,
      stamina: false,
      free_archetype: resolved.variants.free_archetype,
      dual_class: false,
      gradual_attribute_boosts: resolved.variants.gradual_attribute_boosts,
    },
    content_sources: { enabled: [] },
    operation_data: { selections: {} },
    // Cast justified, and the same one importFromFTC makes: this is a partial
    // skeleton. details.class/background/ancestry, inventory, spells and
    // operation_data.selections are filled in below once the content package has
    // been fetched, so the object cannot satisfy Character at this point.
  } as unknown as Character;

  const importedOperations = buildPathbuilderCustomOperations(resolved, content, warnings);
  if (importedOperations.length > 0) {
    character.options = {
      ...(character.options ?? {}),
      custom_operations: true,
    };
    character.custom_operations = importedOperations;
  }

  character.content_sources!.enabled = [
    ...(content.sources?.map((source) => source.id) ?? []),
    ...(customSourceId !== null ? [customSourceId] : []),
  ];

  character.details!.class = findPathbuilderMatch(
    'class',
    resolved.identity.className ?? '',
    content.classes,
    (c) => c.name
  );
  character.details!.background = findPathbuilderMatch(
    'background',
    resolved.identity.background ?? '',
    content.backgrounds,
    (b) => b.name
  );
  character.details!.ancestry = findPathbuilderMatch(
    'ancestry',
    resolved.identity.ancestry ?? '',
    content.ancestries,
    (a) => a.name
  );
  for (const [field, value] of [
    ['class', resolved.identity.className],
    ['background', resolved.identity.background],
    ['ancestry', resolved.identity.ancestry],
  ] as const) {
    if (!value) {
      throw new Error(`Pathbuilder 1:1 identity mapping failed: missing ${field}`);
    }
    if (!character.details?.[field]) {
      throw new Error(`Pathbuilder 1:1 identity mapping failed: WG has no ${field} matching "${value}"`);
    }
  }

  const missingSelection = await resolveSelections(
    character,
    content,
    resolved,
    warnings,
    buildOptions.selectionOverrides
  );
  if (buildOptions.preflightOnly) {
    const current = await calculatePathbuilderCurrentSummary(character, resolved, content, customItems);
    return missingSelection
      ? { status: 'selection-required', selection: missingSelection, current }
      : { status: 'ready', current };
  }
  if (missingSelection) {
    throw new Error(
      `Pathbuilder 1:1 selection mapping failed: level ${missingSelection.level}; requested: none; available: ${missingSelection.options.map((option) => option.label).join(', ') || 'none'}; selection path: ${missingSelection.path}; selector: ${missingSelection.title}`
    );
  }

  character.inventory = {
    coins: { ...resolved.coins },
    items: buildInventory(resolved, content, customItems, warnings),
  };

  character.spells = {
    slots: [],
    list: [],
    focus_point_current: 0,
    innate_casts: [],
  };
  for (const spell of resolved.spells) {
    const found = findPathbuilderMatch('spell', spell.name, content.spells, (s) => s.name);
    const resolvedSpell = found ?? fallbackSpellsByName.get(labelToVariable(spell.name));
    if (resolvedSpell) {
      character.spells.list.push({
        spell_id: resolvedSpell.id,
        rank: Math.max(spell.heighten, resolvedSpell.rank ?? 0),
        source: spell.source ? labelToVariable(spell.source) : '',
      });
    } else {
      warnings.push(`spell: could not resolve "${spell.name}" and it was not added to the character`);
    }
  }

  character.details!.conditions = [];

  if (derived) {
    await validatePathbuilderDerived(character, content, derived, resolved, warnings);
  }

  const mechanicalWarnings = warnings.filter(
    (warning) =>
      !warning.startsWith('provenance:') &&
      !warning.startsWith('armor warning:')
  );
  if (mechanicalWarnings.length > 0) {
    throw new Error(
      `Pathbuilder 1:1 import blocked by unresolved mechanics: ${mechanicalWarnings.join('; ')}`
    );
  }

  return await makeRequest<Character>('create-character', {
    ...character,
    id: undefined, // remove the sentinel so the API creates a new row
  });
}

const PATHBUILDER_ABILITY_LABELS: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const PATHBUILDER_PROFICIENCY_RANKS: Record<number, string> = {
  0: 'Untrained',
  2: 'Trained',
  4: 'Expert',
  6: 'Master',
  8: 'Legendary',
};

function summarizePathbuilderTargets(
  derived: import('@schemas/pathbuilder').PathbuilderDerivedBuild
): PathbuilderTargetSummary {
  const abilities = Object.entries(derived.abilities ?? {})
    .filter(
      (entry): entry is [string, number] =>
        entry[0] in PATHBUILDER_ABILITY_LABELS && typeof entry[1] === 'number'
    )
    .map(([key, score]) => ({
      key,
      label: PATHBUILDER_ABILITY_LABELS[key],
      score,
      modifier: Math.floor((score - 10) / 2),
    }));

  const acSource = derived.acTotal;
  const ac = acSource
    ? {
        total: acSource.acTotal,
        proficiency: acSource.acProfBonus,
        ability: acSource.acAbilityBonus,
        item: acSource.acItemBonus,
        shield: acSource.shieldBonus,
      }
    : undefined;

  const proficiencies = Object.entries(derived.proficiencies ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([name, value]) => ({
      name,
      value,
      rank: PATHBUILDER_PROFICIENCY_RANKS[value] ?? `Pathbuilder value ${value}`,
    }));

  const attributes = Object.entries(derived.attributes ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([name, value]) => ({ name, value }));

  const armor = (derived.armor ?? [])
    .filter((item) => typeof item.name === 'string' && item.name.length > 0)
    .map((item) => ({
      name: item.name!,
      display: item.display ?? undefined,
      worn: item.worn ?? undefined,
      proficiency: item.prof ?? undefined,
      potency: item.pot ?? undefined,
      resilience: item.res ?? undefined,
      runes: item.runes ?? [],
    }));

  return {
    name: derived.name ?? undefined,
    level: derived.level,
    abilities,
    ac,
    proficiencies,
    attributes,
    armor,
    resistances: derived.resistances ?? [],
  };
}

/**
 * Calculate a non-persistent snapshot with exactly the choices confirmed so far.
 * Preflight has no persisted custom/reference items, so synthesize only the
 * missing worn Reinforced Chassis armor row in memory when the normal inventory
 * resolver cannot find it. This mirrors the same metadata applied during import.
 */
async function calculatePathbuilderCurrentSummary(
  character: Character,
  resolved: ResolvedBuild,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  customItems: Map<string, Item>
): Promise<PathbuilderCurrentSummary> {
  const previewWarnings: string[] = [];
  const previewCharacter = cloneDeep(character);
  const inventoryItems = buildInventory(resolved, content, customItems, previewWarnings);
  const reinforcedChassis = resolved.feats.some(
    (feat) => labelToVariable(feat.name) === 'REINFORCED_CHASSIS'
  );
  const inventoryHasResolvedArmor = resolved.armor
    ? inventoryItems.some((entry) => labelToVariable(entry.item.name) === labelToVariable(resolved.armor!.name))
    : false;

  if (resolved.armor && reinforcedChassis && !inventoryHasResolvedArmor) {
    const referenceArmor = {
      id: -1,
      created_at: '',
      name: resolved.armor.name,
      price: null,
      bulk: null,
      level: 0,
      rarity: 'COMMON',
      traits: [],
      description: '',
      group: 'ARMOR',
      hands: null,
      size: 'MEDIUM',
      craft_requirements: null,
      usage: null,
      operations: [],
      content_source_id: -1,
      version: '1.0',
      meta_data: { bulk: {} },
    } as Item;
    const withRunes = withPathbuilderRunes(
      referenceArmor,
      resolved.armorPotency,
      0,
      resolved.armorRunes,
      content,
      previewWarnings,
      'armor warning',
      resolved.armorResilience
    );
    const item = withPathbuilderReinforcedChassis(withRunes, resolved);
    inventoryItems.push({
      id: 'pathbuilder-preflight-armor',
      item,
      is_formula: false,
      is_equipped: true,
      is_invested: false,
      is_implanted: false,
      container_contents: [],
    });
  }

  previewCharacter.inventory = {
    coins: { ...resolved.coins },
    items: inventoryItems,
  };

  await executeOperations<OperationCharacterResultPackage>({
    type: 'CHARACTER',
    data: {
      character: cloneDeep(previewCharacter),
      content,
      context: 'CHARACTER-SHEET',
    },
  });

  const abilities = Object.entries(PATHBUILDER_ABILITY_LABELS).map(([key, label]) => ({
    key,
    label,
    modifier: getFinalVariableValue('CHARACTER', `ATTRIBUTE_${key.toUpperCase()}`).total,
  }));

  const armor = getBestArmor('CHARACTER', previewCharacter.inventory)?.item;
  let acTotal: number | null = null;
  try {
    acTotal = getFinalAcValue('CHARACTER', armor);
  } catch (error) {
    console.warn('Could not calculate Pathbuilder preflight AC preview:', error);
  }

  return { abilities, acTotal };
}

/**
 * Compare Pathbuilder's calculated values with WG's native operation engine.
 * Ability-score and AC mismatches are fatal: the character must not be created
 * when its core attributes or defense differ from the source calculation.
 */
async function validatePathbuilderDerived(
  character: Character,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  derived: import('@schemas/pathbuilder').PathbuilderDerivedBuild,
  resolved: ResolvedBuild,
  warnings: string[]
): Promise<void> {
  await executeOperations<OperationCharacterResultPackage>({
    type: 'CHARACTER',
    data: { character: cloneDeep(character), content, context: 'CHARACTER-SHEET' },
  });

  const fatalMismatches: string[] = [];
  const abilities = derived.abilities;
  if (abilities) {
    for (const [ability, score] of Object.entries(abilities)) {
      if (typeof score !== 'number') continue;
      const variable = getFinalVariableValue('CHARACTER', `ATTRIBUTE_${ability.toUpperCase()}`);
      if (ability === 'int') {
      }
      const expectedModifier = Math.floor((score - 10) / 2);
      if (variable.total !== expectedModifier) {
        fatalMismatches.push(
          `ability ${ability}: Pathbuilder score ${score} (modifier ${expectedModifier}), WG modifier ${variable.total}`
        );
      }
    }
  }


  // Compare proficiency ranks independently from the final AC/roll totals.
  // Pathbuilder serializes proficiency rank codes as 0/2/4/6/8 (U/T/E/M/L).
  // This prevents an unrelated bonus from compensating for missing native training.
  const proficiencyRanks: Record<number, string> = {
    0: 'U',
    2: 'T',
    4: 'E',
    6: 'M',
    8: 'L',
  };
  const proficiencyNames: Record<string, string> = {
    classDC: 'CLASS_DC',
    perception: 'PERCEPTION',
    fortitude: 'SAVE_FORT',
    reflex: 'SAVE_REFLEX',
    will: 'SAVE_WILL',
    heavy: 'HEAVY_ARMOR',
    medium: 'MEDIUM_ARMOR',
    light: 'LIGHT_ARMOR',
    unarmored: 'UNARMORED_DEFENSE',
    advanced: 'ADVANCED_WEAPONS',
    martial: 'MARTIAL_WEAPONS',
    simple: 'SIMPLE_WEAPONS',
    unarmed: 'UNARMED_ATTACKS',
    acrobatics: 'SKILL_ACROBATICS',
    arcana: 'SKILL_ARCANA',
    athletics: 'SKILL_ATHLETICS',
    crafting: 'SKILL_CRAFTING',
    deception: 'SKILL_DECEPTION',
    diplomacy: 'SKILL_DIPLOMACY',
    intimidation: 'SKILL_INTIMIDATION',
    medicine: 'SKILL_MEDICINE',
    nature: 'SKILL_NATURE',
    occultism: 'SKILL_OCCULTISM',
    performance: 'SKILL_PERFORMANCE',
    religion: 'SKILL_RELIGION',
    society: 'SKILL_SOCIETY',
    stealth: 'SKILL_STEALTH',
    survival: 'SKILL_SURVIVAL',
    thievery: 'SKILL_THIEVERY',
  };

  for (const [sourceName, sourceRank] of Object.entries(derived.proficiencies ?? {})) {
    if (typeof sourceRank !== 'number') continue;
    // These Starfinder-only skills have no PF2e variable and are untrained here.
    if ((sourceName === 'piloting' || sourceName === 'computers') && sourceRank === 0) continue;

    const variableName = sourceName.startsWith('casting')
      ? sourceRank === 0 ? null : 'SPELL_ATTACK'
      : proficiencyNames[sourceName];
    if (!variableName) {
      if (sourceRank !== 0) {
        fatalMismatches.push(
          `proficiency ${sourceName}: Pathbuilder rank code ${sourceRank} has no native WG mapping`
        );
      }
      continue;
    }

    const expectedType = proficiencyRanks[sourceRank];
    const variable = getVariable('CHARACTER', variableName);
    if (!expectedType) {
      fatalMismatches.push(`proficiency ${sourceName}: unsupported Pathbuilder rank code ${sourceRank}`);
      continue;
    }
    if (!variable || variable.type !== 'prof') {
      fatalMismatches.push(`proficiency ${sourceName}: native WG variable ${variableName} is missing`);
      continue;
    }

    const actualType = compileProficiencyType(variable.value);
    if (actualType !== expectedType) {
      fatalMismatches.push(
        `proficiency ${sourceName}: Pathbuilder ${expectedType}, WG ${actualType} (${variableName})`
      );
    }
  }

  for (const [loreName, sourceRank] of derived.lores ?? []) {
    const variableName = `SKILL_LORE_${labelToVariable(loreName)}`;
    const expectedType = proficiencyRanks[sourceRank];
    const variable = getVariable('CHARACTER', variableName);
    if (!expectedType) {
      fatalMismatches.push(`lore ${loreName}: unsupported Pathbuilder rank code ${sourceRank}`);
    } else if (!variable || variable.type !== 'prof') {
      fatalMismatches.push(`lore ${loreName}: native WG variable ${variableName} is missing`);
    } else {
      const actualType = compileProficiencyType(variable.value);
      if (actualType !== expectedType) {
        fatalMismatches.push(`lore ${loreName}: Pathbuilder ${expectedType}, WG ${actualType}`);
      }
    }
  }

  // These base values are represented directly by native WG variables.
  // Pathbuilder's speedBonus is included in the final Speed comparison.
  const baseAttributeVariables: Record<string, string> = {
    ancestryhp: 'MAX_HEALTH_ANCESTRY',
    classhp: 'MAX_HEALTH_CLASS_PER_LEVEL',
    bonushp: 'MAX_HEALTH_BONUS',
  };
  for (const [sourceName, sourceValue] of Object.entries(derived.attributes ?? {})) {
    if (typeof sourceValue !== 'number') continue;
    const variableName = baseAttributeVariables[sourceName];
    if (variableName) {
      const actual = getFinalVariableValue('CHARACTER', variableName).total;
      if (actual !== sourceValue) {
        fatalMismatches.push(
          `attribute ${sourceName}: Pathbuilder ${sourceValue}, WG ${actual} (${variableName})`
        );
      }
    } else if (sourceName === 'speed') {
      const expected = sourceValue + (typeof derived.attributes?.speedBonus === 'number' ? derived.attributes.speedBonus : 0);
      const actual = getFinalVariableValue('CHARACTER', 'SPEED').total;
      if (actual !== expected) {
        fatalMismatches.push(`attribute speed: Pathbuilder ${expected}, WG ${actual}`);
      }
    } else if (sourceName === 'speedBonus' && typeof derived.attributes?.speed === 'number') {
      // Already included above in the final Speed comparison.
      continue;
    } else if (sourceValue !== 0) {
      fatalMismatches.push(
        `attribute ${sourceName}: non-zero Pathbuilder value ${sourceValue} has no native WG mapping`
      );
    }
  }

  const armor = getBestArmor('CHARACTER', character.inventory)?.item;
  if (derived.acTotal?.acTotal !== undefined) {
    const acParts = getAcParts('CHARACTER', armor);
    // WG may represent an AC item bonus on the armor itself or as a separate
    // AC_BONUS effect. Compare the effective item category, not only the armor row.
    const effectiveItemBonus = Math.max(
      acParts.armorBonus,
      acParts.breakdown.bonuses.get('item bonus')?.value ?? 0
    );
    const componentChecks = [
      ['proficiency', derived.acTotal.acProfBonus, acParts.profBonus],
      ['Dexterity', derived.acTotal.acAbilityBonus, acParts.dexBonus],
      ['item', derived.acTotal.acItemBonus, effectiveItemBonus],
    ] as const;
    for (const [component, expected, actual] of componentChecks) {
      if (expected !== undefined && expected !== actual) {
        fatalMismatches.push(`AC ${component}: Pathbuilder ${expected}, WG ${actual}`);
      }
    }

    const actualAc = getFinalAcValue('CHARACTER', armor);
    const sourceAc = derived.acTotal.acTotal;
    if (actualAc !== sourceAc) {
      const difference = actualAc - sourceAc;
      const signedDifference = difference > 0 ? `+${difference}` : String(difference);
      const reconstructedChassis = resolved.hints.some((hint) =>
        /reconstructed the automaton reinforced chassis/i.test(hint)
      );
      const chassisIsResolved = resolved.feats.some(
        (feat) => labelToVariable(feat.name) === 'REINFORCED_CHASSIS'
      ) && /automaton\\s+chassi/i.test(resolved.armor?.name ?? '');
      const hasUnnamedArmorRuneState =
        !resolved.armor && (resolved.armorPotency > 0 || resolved.armorRunes.length > 0);
      const explanation = reconstructedChassis
        ? 'The share payload omitted the chassis armor name. WG reconstructed the Reinforced Chassis from the recorded Automaton ancestry, feat, and character level; the exported JSON AC appears inconsistent with that armor state.'
        : chassisIsResolved
          ? 'The resolved armor data identifies the Automaton Reinforced Chassis, but the JSON AC total contradicts the chassis rule calculation. The export contains inconsistent armor and AC data.'
          : hasUnnamedArmorRuneState
            ? 'The share payload contains armor potency or rune state but no reliable armor name, so that state could not safely identify the intended armor.'
            : !resolved.armor
              ? 'No reliable equipped armor reference was available to explain the difference.'
              : 'The resolved armor exists, but its rules calculation differs. Review armor statistics, proficiency, Dexterity cap, runes, shield state, and temporary bonuses.';

      fatalMismatches.push(
        `AC mismatch: Pathbuilder JSON reports ${sourceAc}; Wanderer's Guide calculates ${actualAc} (difference ${signedDifference}). ${explanation}`
      );
    }
  }

  if (fatalMismatches.length > 0) {
    throw new Error(`Pathbuilder 1:1 validation failed: ${fatalMismatches.join('; ')}`);
  }
}

function buildPathbuilderCustomOperations(
  resolved: ResolvedBuild,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  warnings: string[]
): Operation[] {
  const operations: Operation[] = [];
  const seenLanguages = new Set<number>();

  for (const languageName of resolved.languages) {
    const language = findPathbuilderMatch(
      'language',
      languageName,
      content.languages,
      (candidate) => candidate.name
    );
    if (!language) {
      warnings.push(`language: WG has no language matching "${languageName}"`);
      continue;
    }
    if (seenLanguages.has(language.id)) continue;
    seenLanguages.add(language.id);
    operations.push({
      id: crypto.randomUUID(),
      type: 'giveLanguage',
      data: { languageId: language.id },
    });
  }

  for (const buff of resolved.activeCustomBuffs) {
    if (!buff.custom) continue;
    operations.push(
      ...customEffectOperations(
        buff.custom,
        Math.max(1, buff.stacks),
        warnings,
        content,
        resolved.identity.className?.toUpperCase()
      )
    );
  }

  // The Pathbuilder sheet oracle for build 1597410 includes the Hunter Automaton
  // quadruped speed in its displayed Speed total. WG's shared heritage operation only
  // preserves the hands-free condition as explanatory text, so it contributes no
  // numeric value. Reproduce Pathbuilder's sheet total with an adjValue operation,
  // not a typed bonus: the variable engine tracks base-speed adjustments separately so
  // derived speeds inherit the same baseline. Do not mutate shared rules content or
  // remove the original condition text.
  const hasHunterAutomatonHeritage =
    labelToVariable(resolved.identity.heritage ?? '') === 'HUNTER_AUTOMATON' ||
    resolved.feats.some(
      (feat) =>
        labelToVariable(feat.slot) === 'HERITAGE_FEAT' &&
        labelToVariable(feat.name) === 'HUNTER_AUTOMATON'
    );
  if (hasHunterAutomatonHeritage) {
    operations.push({
      id: crypto.randomUUID(),
      type: 'adjValue',
      data: {
        variable: 'SPEED',
        value: 5,
      },
    });
  }

  // A retained armor potency/property-rune editor state is not proof that the
  // character is unarmored or that a rune can apply without a base item. Never turn
  // this ambiguous state into a free AC bonus. Known Automaton chassis cases are
  // reconstructed by resolveBuild; all other missing armor cases remain explicit
  // warnings and preserve their raw source payload for later correction.
  if (!resolved.armor && (resolved.armorPotency > 0 || resolved.armorRunes.length > 0)) {
    warnings.push(
      'armor warning: Pathbuilder contains armor potency/property-rune state but no reliable armor reference; the retained rune state was not applied to AC without a base armor item'
    );
  }

  return operations;
}

const PATHBUILDER_ATTRIBUTE_VARIABLES = new Set([
  'ATTRIBUTE_STR',
  'ATTRIBUTE_DEX',
  'ATTRIBUTE_CON',
  'ATTRIBUTE_INT',
  'ATTRIBUTE_WIS',
  'ATTRIBUTE_CHA',
]);

/**
 * Detect an attribute selector from the actual WG options rather than from its
 * source path. This keeps feat, skill, heritage, and lore selectors out of the
 * ability-boost matcher.
 */
function isAttributeSelection(options: ObjectWithUUID[]): boolean {
  if (options.length === 0) return false;
  const labels = new Set(['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
  return options.every((option) => {
    if (typeof option.variable === 'string' && PATHBUILDER_ATTRIBUTE_VARIABLES.has(option.variable)) return true;
    return typeof option.name === 'string' && labels.has(option.name);
  });
}

function isSkillSelection(
  options: ObjectWithUUID[],
  selection?: { title?: string; description?: string }
): boolean {
  const selectionText = [selection?.title, selection?.description].filter(Boolean).join(' ');
  if (/\bskill\b.*\b(?:train|increase|select)|\b(?:train|increase|select).*\bskill\b/i.test(selectionText)) {
    return true;
  }
  if (options.length === 0) return false;
  return options.every((option) => {
    const label = option.name ?? option.title;
    return typeof label === 'string' && PATHBUILDER_SKILL_NAMES.has(labelToVariable(label));
  });
}

function isLanguageSelection(selection: { title?: string; description?: string } | undefined): boolean {
  return /\blanguage\b/i.test([selection?.title, selection?.description].filter(Boolean).join(' '));
}

function findPathbuilderOption(
  selections: { name: string; level: number }[],
  options: ObjectWithUUID[],
  level: number
): ObjectWithUUID | null {
  const exact = findMatchingOption(selections, options, level);
  if (exact) return exact;

  const atLevel = selections.filter((selection) => selection.level === level);
  for (const selection of atLevel) {
    const aliased = findPathbuilderMatch(
      'feat',
      selection.name,
      options,
      (option) => option.name ?? option.title
    );
    if (aliased) return aliased;
  }

  for (const selection of atLevel) {
    for (const candidate of pathbuilderNameCandidates('feat', selection.name)) {
      const requested = labelToVariable(candidate);
      const compatible = options.filter((option) => {
        const available = labelToVariable(option.name ?? option.title ?? '');
        if (!available || !requested) return false;
        return (
          available === requested ||
          requested.startsWith(available + '_') ||
          available.startsWith(requested + '_')
        );
      });
      if (compatible.length === 1) return compatible[0];
      // A generic legacy name can match several class-qualified records. Do not
      // guess which class's version the build meant.
      if (compatible.length > 1) return null;
    }
  }
  return null;
}

/**
 * Read the source choice belonging to a generated ancestry-feat slot.
 *
 * Wanderer's Guide creates a normal ancestry-feat slot every 4 levels and,
 * with Ancestry Paragon, adds slots at levels 1, 3, 7, 11, 15, and 19. The
 * generated operation's numeric suffix is a slot index; use that index and
 * Pathbuilder's own slot labels to avoid matching a skill/class/archetype feat
 * simply because it shares a level with the ancestry selector.
 */
function getAncestryFeatSelectionsForOperation(
  slotIndex: number,
  level: number,
  resolved: ResolvedBuild
): { name: string; level: number }[] {
  const atLevel = resolved.feats.filter((feat) => feat.level === level);
  const isParagonSlot =
    resolved.variants.ancestry_paragon &&
    (slotIndex === 1 || (slotIndex >= 2 && slotIndex % 2 === 0));

  const target = isParagonSlot
    ? atLevel.filter((feat) => labelToVariable(feat.slot) === 'ANCESTRY_PARAGON')
    : atLevel.filter((feat) => {
        const slot = labelToVariable(feat.slot);
        const ancestrySlot = labelToVariable(resolved.identity.ancestry ?? '') + '_FEAT';
        return slot === ancestrySlot || slot === 'ANCESTRY_FEAT';
      });

  // Pathbuilder uses "Reincarnation Feat" as a category selector rather than
  // as an actual feat. The actual feat is stored in a nested slot whose name
  // starts with that selector. Route the real feat to WG's ancestry slot.
  const resolvedTargets = target.flatMap((feat) => {
    const isReincarnationCategory =
      feat.category === 'ANCESTRY' &&
      feat.qualifier === 'GENERAL' &&
      labelToVariable(feat.name) === 'REINCARNATION_FEAT';
    if (!isReincarnationCategory) return [feat];

    const nestedSlot = labelToVariable(`${feat.name}${feat.slot}`);
    const nestedFeats = atLevel.filter(
      (candidate) =>
        candidate.category === 'REINCARNATION' &&
        labelToVariable(candidate.slot) === nestedSlot
    );
    return nestedFeats.length === 1 ? nestedFeats : [feat];
  });

  return resolvedTargets.map((feat) => ({ name: feat.name, level }));
}

/**
 * Pathbuilder kept the legacy names for the Remastered versatile heritages
 * (Ifrit/Naari, Aasimar and Tiefling/Nephilim, Half-Elf/Aiuvarin,
 * Half-Orc/Dromaar). The alias registry handles the rename; the ancestry feats
 * use the same Remastered trait, so resolving the heritage is enough for its
 * feat list to become available.
 */
function findHeritageOption(options: ObjectWithUUID[], heritage: string): ObjectWithUUID | null {
  return (
    findPathbuilderMatch('heritage', heritage, options, (option) => option.name ?? option.title) ??
    null
  );
}

/**
 * Versatile heritages live in their own `versatile-heritage` table whose
 * `heritage_id` points at a heritage ability block. The operation engine filters
 * the heritage selector to blocks that already carry an ancestry trait, which
 * excludes versatile heritages because their trait is granted *when selected*.
 * The builder therefore offers them through a separate "Versatile Heritages" tab;
 * the importer has to synthesize that block the same way the tab does.
 *
 * Exported for the regression suite (`scripts/pathbuilder-real-import.test.mjs`).
 */
export function findVersatileHeritageOption(
  content: Pick<
    Awaited<ReturnType<typeof fetchContentPackage>>,
    'abilityBlocks' | 'versatileHeritages'
  >,
  heritage: string
): ObjectWithUUID | null {
  const matched = findPathbuilderMatch(
    'heritage',
    heritage,
    content.versatileHeritages ?? [],
    (versatile) => versatile.name
  );
  if (matched) {
    const block = (content.abilityBlocks ?? []).find(
      (candidate) => candidate.id === matched.heritage_id
    );
    if (!block) return null;
    return {
      ...block,
      _select_uuid: String(block.id),
      _content_type: 'ability-block',
    } as ObjectWithUUID;
  }
  return null;
}

function getFeatSelectionsForOperation(
  title: string,
  level: number,
  resolved: ResolvedBuild
): { name: string; level: number }[] {
  const normalizedTitle = title.toLowerCase();
  const atLevel = resolved.feats.filter((feat) => feat.level === level);

  if (normalizedTitle.includes('archetype') || normalizedTitle.includes('dedication')) {
    return atLevel
      .filter((feat) => /^free archetype/i.test(feat.slot))
      .map((feat) => ({ name: feat.name, level }));
  }
  if (normalizedTitle.includes('skill')) {
    return atLevel
      .filter((feat) => /^skill feat/i.test(feat.slot))
      .map((feat) => ({ name: feat.name, level }));
  }
  if (normalizedTitle.includes('general')) {
    return atLevel
      .filter((feat) => /^general feat/i.test(feat.slot))
      .map((feat) => ({ name: feat.name, level }));
  }
  if (normalizedTitle.includes('class')) {
    return atLevel
      .filter((feat) => /\bfeat\b/i.test(feat.slot) && !/^(skill|general|free archetype|ancestry paragon)/i.test(feat.slot))
      .map((feat) => ({ name: feat.name, level }));
  }

  // Generic feat selectors are used by ancestry, ancestry-paragon, and nested
  // feat choices as well as Free Archetype descendants. Pathbuilder's slot names
  // are not consistent: "Ancestry Paragon" is a feat slot without the word "Feat",
  // while nested slots such as "Reincarnation FeatAncestry Paragon" omit the word
  // boundary after "Feat". Keep those recorded choices available and let WG's
  // legal option list decide which selector can accept each choice.
  return atLevel
    .filter((feat) => /feat/i.test(feat.slot) || /^(?:free archetype|ancestry paragon)/i.test(feat.slot))
    .map((feat) => ({ name: feat.name, level }));
}

export function getSpecialSelectionsForOperation(
  selection: { title?: string; description?: string } | undefined,
  level: number,
  resolved: ResolvedBuild
): { name: string; level: number }[] {
  const title = selection?.title ?? '';
  const normalizedTitle = labelToVariable(title.replace(/^select\s+(?:an?\s+)?/i, ''));
  const matches = resolved.specialSelections
    .filter((special) => {
      const prompt = labelToVariable(special.prompt.replace(/^select\s+(?:an?\s+)?/i, ''));

      // Pathbuilder labels this editor choice "Blessing of the Devoted", while WG's
      // actual level-3 selector is titled "Select a Blessing". They are the same
      // semantic choice; failing to alias them silently falls back to the first option.
      const isBlessingSelector =
        normalizedTitle === 'BLESSING' && prompt === 'BLESSING_OF_THE_DEVOTED';

      // Pathbuilder records Champion's Lay on Hands choice under the slot
      // "Devotion Spells" with prompt "Select Initial Devotion Spell". WG's
      // equivalent content may label the same native operation "Select a Focus
      // Spell". Match these only when both the recorded slot and selector title
      // identify a devotion/focus spell, rather than prompting the user again.
      const isDevotionSpellSelector =
        labelToVariable(special.slot) === 'DEVOTION_SPELLS' &&
        /\b(?:devotion|focus)\s+spell\b/i.test(title) &&
        /\b(?:devotion|focus)\s+spell\b/i.test(special.prompt);

      // Pathbuilder records the wizard thesis prompt as "Select Thesis"; WG titles
      // the selector "Select a Thesis Topic". The recorded value is already one of
      // the native options, so only the prompt wording needs to be bridged.
      const isThesisSelector = /\bthesis\b/i.test(title) && /\bthesis\b/i.test(special.prompt);

      return (
        prompt === normalizedTitle || isBlessingSelector || isDevotionSpellSelector || isThesisSelector
      );
    })
    .map((special) => ({ name: special.value, level }));

  if (/sanctification/i.test(title)) {
    const cause = resolved.specialSelections.find((special) =>
      /cause/i.test(special.prompt)
    );
    const match = cause?.value.match(/\b(Holy|Unholy|Neither)\b/i);
    if (match) matches.push({ name: match[1], level });
  }

  return matches;
}


/**
 * Pathbuilder records the selected domain, not a second choice for its granted
 * initial/advanced domain spell. Resolve the spell from the selected domain's WG
 * content when possible, then verify it against the legal options surfaced by the
 * operation engine. Never choose the first available spell merely to satisfy it.
 */
function findDomainSpellOption(
  title: string,
  level: number,
  currentPath: string,
  options: ObjectWithUUID[],
  resolved: ResolvedBuild,
  content: Awaited<ReturnType<typeof fetchContentPackage>>
): ObjectWithUUID | null {
  const spellKind = /\badvanced\b/i.test(title)
    ? 'Advanced'
    : /\binitial\b/i.test(title)
      ? 'Initial'
      : null;
  if (!spellKind || !/\bdomain\s+spell\b/i.test(title)) return null;

  const domainSelections = resolved.specialSelections.filter((special) => {
    const prompt = labelToVariable(special.prompt.replace(/^select\s+(?:an?\s+)?/i, ''));
    return prompt === 'DOMAIN';
  });
  // Champion's initial and advanced domain spells belong to the level-1 and
  // level-8 domain feats. Prefer those source slots because some operation result
  // packages report the enclosing class feature's level instead of the nested
  // level-specific operation's level; use the operation level as a safe fallback.
  const expectedDomainLevel = spellKind === 'Initial' ? 1 : 8;
  const atExpectedLevel = domainSelections.filter(
    (special) => parseFeatSlotKey(special.slot).level === expectedDomainLevel
  );
  const atOperationLevel = domainSelections.filter(
    (special) => parseFeatSlotKey(special.slot).level === level
  );
  const candidates =
    atExpectedLevel.length === 1
      ? atExpectedLevel
      : atOperationLevel.length === 1
        ? atOperationLevel
        : domainSelections.length === 1
          ? domainSelections
          : [];
  if (candidates.length !== 1) return null;
  const chosenDomainName = candidates[0].value;
  const normalizedDomainName = labelToVariable(chosenDomainName);

  // Prefer the Domains ability block actually referenced by the feature whose
  // operation produced this selector. A content package may include both legacy
  // and Remastered records with the same domain name but different spell grants.
  // Selecting the first global "Select a Domain" record would silently bind to
  // whichever version happened to occur first in the content array.
  const selectionId = currentPath.slice(currentPath.lastIndexOf('_') + 1);
  const sourceFeature = content.abilityBlocks.find(
    (block) =>
      currentPath.includes(`_${block.id}_`) &&
      (block.operations ?? []).some(
        (operation) => operation.type === 'select' && operation.id === selectionId
      )
  );
  const referencedDomainBlockIds = (sourceFeature?.operations ?? [])
    .filter((operation) => operation.type === 'giveAbilityBlock')
    .map((operation) => operation.data.abilityBlockId);
  const linkedDomainBlocks = content.abilityBlocks.filter(
    (block) =>
      referencedDomainBlockIds.some((id) => String(id) === String(block.id)) &&
      (block.operations ?? []).some(
        (operation) =>
          operation.type === 'select' &&
          labelToVariable(operation.data.title ?? '') === 'SELECT_A_DOMAIN'
      )
  );
  const domainBlocksToInspect = linkedDomainBlocks.length > 0
    ? linkedDomainBlocks
    : content.abilityBlocks;

  const domainOptions = domainBlocksToInspect.flatMap((block) =>
    (block.operations ?? []).flatMap((operation) => {
      // Keep the discriminated-union check in the same callback that reads
      // optionsPredefined; a preceding Array.filter does not narrow this
      // operation type for TypeScript in the following flatMap.
      if (
        operation.type !== 'select' ||
        labelToVariable(operation.data.title ?? '') !== 'SELECT_A_DOMAIN'
      ) {
        return [];
      }
      return (operation.data.optionsPredefined ?? []).filter(
        (option) =>
          option.type === 'CUSTOM' &&
          labelToVariable(option.title) === normalizedDomainName
      );
    })
  );

  const legalSpellOptions = new Map<string, ObjectWithUUID>();
  for (const domainOption of domainOptions) {
    if (domainOption.type !== 'CUSTOM') continue;
    const spellMatch = new RegExp(
      '\\*\\*' + spellKind + ' Spell\\*\\*\\s*\\[([^\\]]+)\\]\\(link_spell_(\\d+)\\)',
      'i'
    ).exec(domainOption.description);
    if (!spellMatch) continue;

    // link_spell_* is a source-link ID, not WG's local Spell.id. Match the
    // authored name only against the legal options for this exact selector.
    const matchedSpell = findPathbuilderMatch(
      'spell',
      spellMatch[1],
      options,
      (option) => option.name ?? option.title
    );
    if (matchedSpell) {
      legalSpellOptions.set(matchedSpell._select_uuid, matchedSpell);
    }
  }
  if (legalSpellOptions.size === 1) return [...legalSpellOptions.values()][0];
  // If multiple rule records resolve to different legal spells, fail closed:
  // preserve the prompt rather than guessing a spell from the wrong rules version.
  if (legalSpellOptions.size > 1 || linkedDomainBlocks.length > 0) return null;

  // Fallback only when the source feature does not identify a particular Domains
  // record. A unique domain-trait option is safe; multiple matches are ambiguous.
  const domainTraitId = content.traits.find(
    (trait) => labelToVariable(trait.name) === normalizedDomainName
  )?.id;
  if (domainTraitId === undefined) return null;
  const traitMatches = options.filter((option) =>
    Array.isArray(option.traits) &&
    option.traits.some((trait) =>
      typeof trait === 'number'
        ? trait === domainTraitId
        : labelToVariable(String(trait)) === normalizedDomainName
    )
  );
  return traitMatches.length === 1 ? traitMatches[0] : null;
}

/**
 * Identify WG's dedicated class key-ability selector without letting the key
 * ability satisfy an unrelated attribute-boost selector with the same label.
 */
function isKeyAbilitySelection(
  selection: { title?: string; description?: string } | undefined
): boolean {
  const text = [selection?.title, selection?.description].filter(Boolean).join(' ');
  return /\bkey\b.*\b(?:ability|attribute)\b|\b(?:ability|attribute)\b.*\bkey\b/i.test(text);
}

/**
 * If the operation engine produced no options for an ancestry heritage selector,
 * recover candidates from the loaded WG content package. Only show heritage records
 * explicitly tagged with the selected ancestry; unrelated heritage choices are not offered.
 */
function getManualSelectionOptions(
  options: ObjectWithUUID[],
  title: string,
  character: Character,
  content: Awaited<ReturnType<typeof fetchContentPackage>>
): ObjectWithUUID[] {
  if (!/heritage/i.test(title)) return options;

  const toOption = (block: (typeof content.abilityBlocks)[number]) =>
    ({
      ...block,
      _select_uuid: String(block.id),
      _content_type: 'ability-block',
    }) satisfies ObjectWithUUID;

  const ancestryTraitId = character.details?.ancestry?.trait_id;
  const ancestryHeritages =
    ancestryTraitId === undefined || ancestryTraitId === null
      ? []
      : content.abilityBlocks
          .filter(
            (block) =>
              block.type === 'heritage' &&
              block.meta_data?.unselectable !== true &&
              (block.traits ?? []).includes(ancestryTraitId)
          )
          .map(toOption);

  const versatileHeritages = (content.versatileHeritages ?? [])
    .map((versatile) =>
      content.abilityBlocks.find((block) => block.id === versatile.heritage_id)
    )
    .filter((block): block is NonNullable<typeof block> => Boolean(block))
    .map(toOption);

  const seen = new Set<string>();
  return [...options, ...ancestryHeritages, ...versatileHeritages].filter((option) => {
    if (seen.has(option._select_uuid)) return false;
    seen.add(option._select_uuid);
    return true;
  });
}

/** Feed the operation builder every choice the payload records, level by level. */
async function resolveSelections(
  character: Character,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  resolved: ResolvedBuild,
  warnings: string[],
  selectionOverrides: Record<string, string> = {}
): Promise<PathbuilderSelectionPrompt | null> {
  // Levels for special selections come from the feat slot that owns them.
  const slotLevel = new Map<string, number>();
  for (const feat of resolved.feats) {
    if (feat.level !== undefined) slotLevel.set(feat.slot, feat.level);
  }

  const selections: { name: string; level: number }[] = [
    ...resolved.feats.map((feat) => ({ name: feat.name, level: feat.level ?? 1 })),
    ...resolved.skillIncreases.map((increase) => ({ name: increase.skill, level: increase.level })),
    // Class/background/ancestry operations often ask for additional trained skills at level 1.
    // The share payload records these independently from hashMapSkillIncreases.
    ...resolved.trainedSkills.map((skill) => ({ name: skill, level: 1 })),
    ...resolved.specialSelections.map((special) => {
      const parsedSlot = parseFeatSlotKey(special.slot);
      return {
        name: special.value,
        level: parsedSlot.level ?? slotLevel.get(parsedSlot.slot) ?? slotLevel.get(special.slot) ?? 1,
      };
    }),
  ];

  const chosen: Record<string, string> = {};
  const checked = new Set<string>();
  // Dynamic grants can rebuild the same selection with a different ancestry/source path.
  // Keep the confirmed value by operation id so it can be replayed at the new path.
  const selectedByOperationAndLevel = new Map<string, string>();
  // A selector can be surfaced under multiple generated result paths after its
  // parent grant is rebuilt. Replay its value on each path, but only count the
  // first resolution of the semantic selector as new progress.
  const resolvedSelectionKeys = new Set<string>();
  const abilityBoostCursors = new Map<string, number>();
  const skillCursors = new Map<number, number>();
  let classAttributeSelectionIndex = 0;
  const featCursors = new Map<string, number>();
  const freeArchetypeBranchUuids = new Set<string>();

  let hasSelections = true;
  let iteration = 0;
  while (hasSelections) {
    const results = await executeOperations<OperationCharacterResultPackage>({
      type: 'CHARACTER',
      data: {
        character: cloneDeep(character),
        content,
        context: 'CHARACTER-BUILDER',
      },
    });
    let found = findFirstSelection(results, checked);
    let resolvedAny = false;
    let pendingSelection: PathbuilderSelectionPrompt | null = null;
    // Resolve independent selectors from this operation snapshot together. A
    // selected parent may reveal new children, so rerun the engine after this batch.
    while (found) {
      const current = found;
      const selectionId = current.selection?.selection?.id ?? '';
      const ancestryFeatSlotIndex = current.path.startsWith('ancestry-section-')
        ? getPathbuilderAncestryFeatSelectorIndex(selectionId)
        : undefined;
      const ancestryFeatLevel = inferPathbuilderAncestryFeatLevel(
        selectionId,
        resolved.variants.ancestry_paragon
      );
      const selectionLevel =
        ancestryFeatLevel ?? inferPathbuilderOperationLevel(current.path, current.level);
      const selectionKey = selectionId ? `${selectionId}:${selectionLevel}` : '';
      const trackingKey = selectionKey || current.path;
      const selectionKeyWasResolved = resolvedSelectionKeys.has(trackingKey);
      const options = current.selection?.selection?.options ?? [];
      // Rules reuse operation IDs across level-specific class features. Scope replay
      // by level so a level-1 choice cannot overwrite an unrelated level-4 choice.
      const previouslySelectedUuid = selectedByOperationAndLevel.get(trackingKey);
      const previouslySelectedOption = previouslySelectedUuid
        ? options.find((option) => option._select_uuid === previouslySelectedUuid) ?? null
        : null;
      const attributeSelection = isAttributeSelection(options);
      const skillSelection = isSkillSelection(options, current.selection?.selection);
      const languageSelection = isLanguageSelection(current.selection?.selection);
      const keyAbilitySelection = isKeyAbilitySelection(current.selection?.selection);
      // Only a heritage selector may satisfy a recorded heritage; otherwise the
      // versatile-heritage fallback would be returned for unrelated selectors.
      const heritageSelection = /heritage/i.test(current.selection?.selection?.title ?? '');
      const specialAttributeSelection = /\bapex\b/i.test(current.selection?.selection?.title ?? '');
      const implicitKeyAbilitySelection =
        attributeSelection &&
        current.path.startsWith('class_') &&
        classAttributeSelectionIndex === 0 &&
        !resolved.identity.keyAbility;
      let requestedSelections: { name: string; level: number }[] = [];
      let result: Pick<ObjectWithUUID, '_select_uuid'> | null = previouslySelectedOption;

      const isFreeArchetypeRootSelector =
        selectionId.startsWith('9594307d-b111-437f-a55a-de101e8d46b1-');
      const isFreeArchetypeDedicationSelector =
        selectionId.startsWith('1c575456-4cb7-44eb-a153-9d6884b272a8-');
      const isFreeArchetypeFeatSelector =
        selectionId.startsWith('f8cbab2a-f19f-4209-9207-5eb30b43d4eb-');
      const freeArchetypeBranch = findFreeArchetypeBranch(options, selections, selectionLevel);
      if (isFreeArchetypeRootSelector && freeArchetypeBranch) {
        result = freeArchetypeBranch;
      }
      const isFreeArchetypeDescendant =
        isFreeArchetypeDedicationSelector ||
        isFreeArchetypeFeatSelector ||
        [...freeArchetypeBranchUuids].some((uuid) => current.path.split('_').includes(uuid));
      const freeArchetypeChoicesAtLevel = resolved.feats
        .filter((feat) => feat.level === selectionLevel && /^free archetype/i.test(feat.slot))
        .map((feat) => ({ name: feat.name, level: selectionLevel }));

      if (attributeSelection) {
        if (specialAttributeSelection) {
          requestedSelections = getSpecialSelectionsForOperation(
            current.selection?.selection,
            selectionLevel,
            resolved
          );
        } else {
          const isClassAttributeSelection = current.path.startsWith('class_');
          const isFirstClassAttributeSelection =
            isClassAttributeSelection && classAttributeSelectionIndex === 0;
          if (isFirstClassAttributeSelection) {
            if (resolved.identity.keyAbility) {
              requestedSelections = [{ name: pathbuilderAbilityLabel(resolved.identity.keyAbility), level: selectionLevel }];
            } else if (options.length === 1) {
              result = options[0];
            } else {
              // The key ability was omitted from the share. Leave it unresolved here
              // so the preflight UI can ask the user rather than aborting the import.
              requestedSelections = [];
            }
          } else if (keyAbilitySelection && resolved.identity.keyAbility) {
            requestedSelections = [{ name: pathbuilderAbilityLabel(resolved.identity.keyAbility), level: selectionLevel }];
          } else {
            const origin = getAbilityBoostOriginForPath(current.path);
            if (origin) {
              const cursorKey = origin + ':' + selectionLevel;
              const cursor = abilityBoostCursors.get(cursorKey) ?? 0;
              const candidates = resolved.abilityBoosts.filter(
                (boost) => boost.origin === origin && boost.level === selectionLevel
              );
              const candidate = candidates[cursor];
              requestedSelections = candidate
                ? [{ name: pathbuilderAbilityLabel(candidate.ability), level: candidate.level }]
                : [];
            } else {
              requestedSelections = [];
            }
          }
        }
      } else if (skillSelection) {
        const cursor = skillCursors.get(selectionLevel) ?? 0;
        const candidates = [
          ...resolved.trainedSkills.map((skill) => ({ name: skill, level: 1 })),
          ...resolved.skillIncreases.map((increase) => ({ name: increase.skill, level: increase.level })),
        ].filter((selection) => selection.level === selectionLevel);
        const candidate = candidates[cursor];
        requestedSelections = candidate ? [candidate] : [];
      } else if (languageSelection) {
        requestedSelections = resolved.languages.map((name) => ({ name, level: selectionLevel }));
      } else if (/\bfeat\b/i.test(current.selection?.selection?.title ?? '')) {
        if (ancestryFeatSlotIndex !== undefined) {
          requestedSelections = getAncestryFeatSelectionsForOperation(
            ancestryFeatSlotIndex,
            selectionLevel,
            resolved
          );
        } else {
          const key = current.path;
          const cursor = featCursors.get(key) ?? 0;
          const candidates = getFeatSelectionsForOperation(current.selection?.selection?.title ?? '', selectionLevel, resolved);
          requestedSelections = candidates.slice(cursor);
        }
      } else {
        requestedSelections = getSpecialSelectionsForOperation(current.selection?.selection, selectionLevel, resolved);
      }

      if (!result && heritageSelection && resolved.identity.heritage) {
        result =
          findHeritageOption(options, resolved.identity.heritage) ??
          findVersatileHeritageOption(content, resolved.identity.heritage);
      }

      const selectionTitle = implicitKeyAbilitySelection
        ? 'Select a Key Ability'
        : current.selection?.selection?.title ??
          current.selection?.selection?.description ??
          'Select a required option';
      const manualOptions = getManualSelectionOptions(options, selectionTitle, character, content);
      const seenOptionIds = new Set<string>();
      for (const option of manualOptions) {
        if (seenOptionIds.has(option._select_uuid)) {
          const message = `Pathbuilder selection options contain duplicate identifiers for "${selectionTitle}" at level ${selectionLevel}: ${option._select_uuid}`;
          console.error(message);
          throw new Error(message);
        }
        seenOptionIds.add(option._select_uuid);
      }

      // If Pathbuilder did record a heritage but WG's level-filtered selector
      // omitted null-level heritage entries, resolve against the same ancestry-
      // constrained fallback list instead of asking the user to repeat the choice.
      if (!result && heritageSelection && resolved.identity.heritage) {
        result =
          findHeritageOption(manualOptions, resolved.identity.heritage) ??
          findVersatileHeritageOption(content, resolved.identity.heritage);
      }

      const isClassFeatSelector =
        /\bclass\b/i.test(selectionTitle) &&
        !/\b(?:archetype|dedication)\b/i.test(selectionTitle);
      if (
        !result &&
        !isClassFeatSelector &&
        (isFreeArchetypeDescendant || /archetype|dedication|\bfeat\b/i.test(selectionTitle))
      ) {
        // The operation engine can render a Free Archetype child as a generic
        // feat selector with no descriptive title. Prefer the selected
        // Free Archetype feat only when it is a legal option at this node.
        result = findPathbuilderOption(freeArchetypeChoicesAtLevel, options, selectionLevel);
      }
      if (!result) {
        result = findDomainSpellOption(
          current.selection?.selection?.title ?? '',
          selectionLevel,
          current.path,
          options,
          resolved,
          content
        );
      }
      // Prefer choices explicitly recoverable from the Pathbuilder payload over
      // a preflight selection override. Overrides are for genuinely unmapped
      // choices; an older/broader preflight may have supplied a placeholder
      // first-option choice for a selector that this importer can now resolve.
      if (!result) {
        result = findPathbuilderOption(requestedSelections, options, selectionLevel);
      }
      if (!result && ancestryFeatSlotIndex !== undefined && requestedSelections.length === 1) {
        const requestedFeatName = requestedSelections[0].name;
        const matchingContentFeats = findPathbuilderMatches(
          'feat',
          requestedFeatName,
          content.abilityBlocks.filter((block) => block.type === 'feat'),
          (block) => block.name
        );
        if (matchingContentFeats.length === 1) {
          const matchingFeat = matchingContentFeats[0];
          // The engine can restore an ability block by numeric ID even if a selector's
          // ancestry filter omits it. Pathbuilder's explicit choice is authoritative.
          result = { _select_uuid: String(matchingFeat.id) };
        } else {
          const reason = matchingContentFeats.length === 0
            ? 'does not exist in the loaded Wanderer\'s Guide content package'
            : 'matches multiple Wanderer\'s Guide feat records';
          throw new Error(
            `Pathbuilder selected ancestry feat "${requestedFeatName}" at level ${selectionLevel}, but it ${reason}. The import cannot preserve this choice safely.`
          );
        }
      }
      if (
        attributeSelection &&
        !implicitKeyAbilitySelection &&
        !keyAbilitySelection &&
        !specialAttributeSelection &&
        requestedSelections.length === 0
      ) {
        throw new Error(
          `Pathbuilder 1:1 ability boost mapping failed: no source boost matches WG selector at level ${selectionLevel} (${current.path})`
        );
      }
      if (attributeSelection && requestedSelections.length > 0 && !result) {
        throw new Error(
          `Pathbuilder 1:1 ability boost mapping failed: WG has no legal option matching "${requestedSelections[0].name}" at level ${selectionLevel} (${current.path})`
        );
      }
      const manualSelectionUuid = selectionOverrides[trackingKey] ?? selectionOverrides[current.path];
      if (!result && manualSelectionUuid) {
        result = manualOptions.find((option) => option._select_uuid === manualSelectionUuid) ?? null;
      }
      if (!result) {
        pendingSelection = {
          key: trackingKey,
          path: current.path,
          title: selectionTitle,
          description: current.selection?.selection?.description,
          level: selectionLevel,
          options: manualOptions.map((option) => ({
            value: option._select_uuid,
            label: String(option._display_label ?? option.name ?? option.title ?? option._select_uuid ?? 'Unnamed option'),
            ...(typeof option.description === 'string' && option.description
              ? { description: option.description }
              : {}),
          })),
          diagnostics: {
            selections: cloneDeep(chosen),
            resolvedSelectionKeys: [...resolvedSelectionKeys],
          },
        };
        break;
      }
      if (result) {
        chosen[current.path] = result._select_uuid;
        if (
          freeArchetypeBranch &&
          result._select_uuid === freeArchetypeBranch._select_uuid
        ) {
          freeArchetypeBranchUuids.add(result._select_uuid);

          // Resolve the payload-backed child feat at the same time as the outer
          // Free Archetype branch. The WG archetype-feat filter can initially
          // return no options until the dedication has been granted, which would
          // otherwise force a manual selection (or an empty picker) despite the
          // share already naming the exact feat. runSelect supports restoring a
          // selected AbilityBlock by ID when it is absent from the filtered list.
          const sourceFeatsAtLevel = resolved.feats.filter(
            (feat) => feat.level === selectionLevel && /^free archetype/i.test(feat.slot)
          );
          if (sourceFeatsAtLevel.length === 1) {
            const sourceFeat = sourceFeatsAtLevel[0];
            const matchingBlocks = findPathbuilderMatches(
              'feat',
              sourceFeat.name,
              content.abilityBlocks.filter((block) => block.type === 'feat'),
              (block) => block.name
            );
            if (matchingBlocks.length === 1) {
              const childSelectorPrefix = /\bdedication\b/i.test(sourceFeat.name)
                ? '1c575456-4cb7-44eb-a153-9d6884b272a8'
                : 'f8cbab2a-f19f-4209-9207-5eb30b43d4eb';
              const childSelectorId = `${childSelectorPrefix}-${selectionLevel}`;
              const childPath = `${current.path}_${result._select_uuid}_${childSelectorId}`;
              const childTrackingKey = `${childSelectorId}:${selectionLevel}`;
              const childValue = String(matchingBlocks[0].id);

              chosen[childPath] = childValue;
              selectedByOperationAndLevel.set(childTrackingKey, childValue);
              resolvedSelectionKeys.add(childTrackingKey);
              checked.add(childPath);
            }
          }
        }
        selectedByOperationAndLevel.set(trackingKey, result._select_uuid);
        resolvedSelectionKeys.add(trackingKey);
        character.operation_data!.selections = cloneDeep(chosen);

        // A selector can reappear under a rebuilt parent path. Replay its saved
        // UUID, but never consume the same source choice twice.
        if (!selectionKeyWasResolved && attributeSelection) {
          if (current.path.startsWith('class_')) classAttributeSelectionIndex++;
        }
        if (
          !selectionKeyWasResolved &&
          attributeSelection &&
          !keyAbilitySelection &&
          !specialAttributeSelection &&
          !(current.path.startsWith('class_') && classAttributeSelectionIndex === 1)
        ) {
          const origin = getAbilityBoostOriginForPath(current.path);
          if (origin) {
            const cursorKey = origin + ':' + selectionLevel;
            abilityBoostCursors.set(cursorKey, (abilityBoostCursors.get(cursorKey) ?? 0) + 1);
          }
        }
        if (!selectionKeyWasResolved && skillSelection) {
          const cursor = skillCursors.get(selectionLevel) ?? 0;
          skillCursors.set(selectionLevel, cursor + 1);
        }
        if (!selectionKeyWasResolved && /\bfeat\b/i.test(current.selection?.selection?.title ?? '')) {
          const key = current.path;
          featCursors.set(key, (featCursors.get(key) ?? 0) + 1);
        }
      }
      checked.add(current.path);
      if (!selectionKeyWasResolved) resolvedAny = true;
      // A versatile heritage block is not in the engine's filtered option list (its
      // trait is granted on selection), so sibling ancestry feat lists in this
      // snapshot were built without that trait. Rerun before resolving them.
      if (
        heritageSelection &&
        result &&
        !options.some((option) => option._select_uuid === result!._select_uuid)
      ) {
        break;
      }
      found = findFirstSelection(results, checked);
    }

    // A required choice with no trustworthy Pathbuilder match must be surfaced
    // immediately. Continuing to rerun the operation engine while holding this
    // unresolved selector can repeat expensive calculation batches and delay the
    // preflight/fail-closed result until the global calculation timeout.
    if (pendingSelection) return pendingSelection;
    if (resolvedAny) {
      if (++iteration > Math.max(64, selections.length + 16)) {
        throw new Error(
          `Pathbuilder 1:1 selection resolution did not converge after ${iteration} batches`
        );
      }
      continue;
    }
    hasSelections = false;
  }

  // A native operation tree can silently omit a boost selector even when all
  // selectors it does expose were resolved. Compare every source boost at or
  // below the character's current level with the number of distinct WG selectors
  // that consumed it. Future planned boosts are intentionally not applied yet.
  const expectedBoostCounts = new Map<string, number>();
  for (const boost of resolved.abilityBoosts) {
    if (boost.level > resolved.identity.level) continue;
    const key = `${boost.origin}:${boost.level}`;
    expectedBoostCounts.set(key, (expectedBoostCounts.get(key) ?? 0) + 1);
  }
  const boostKeys = new Set([...expectedBoostCounts.keys(), ...abilityBoostCursors.keys()]);
  const boostMappingErrors = [...boostKeys]
    .sort()
    .flatMap((key) => {
      const expected = expectedBoostCounts.get(key) ?? 0;
      const mapped = abilityBoostCursors.get(key) ?? 0;
      return expected === mapped ? [] : [`${key}: expected ${expected}, mapped ${mapped}`];
    });
  if (boostMappingErrors.length > 0) {
    throw new Error(
      `Pathbuilder 1:1 ability boost mapping failed: ${boostMappingErrors.join('; ')}`
    );
  }

  return null;
}

/**
 * Resolve an inventory reference to a concrete WG item.
 */
function withPathbuilderWeaponState(item: Item, weapon: ResolvedBuild['weapons'][number]): Item {
  const copy = cloneDeep(item);
  const existing = copy.meta_data ?? ({ bulk: {} } as NonNullable<Item['meta_data']>);
  const existingPathbuilder = existing.pathbuilder;
  const pathbuilderState = {
    ...(existingPathbuilder ?? {
      uniqueIdentifier: crypto.randomUUID(),
      type: 0,
      raw: null,
    }),
    attackAbility: weapon.attackAbility,
    twoHanded: weapon.twoHanded,
  };
  copy.meta_data = {
    ...existing,
    pathbuilder: pathbuilderState,
  };
  return copy;
}

function findInventoryItem(
  ref: ResolvedItemRef,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  customItems: Map<string, Item>
): Item | undefined {
  if (ref.kind === 'custom' && ref.uuid) {
    const custom = customItems.get(ref.uuid.toLowerCase());
    if (custom) return custom;
  }

  if (ref.kind === 'standard') {
    // A Pathbuilder weapon can carry a display-only nameOverride (e.g. "Claw")
    // while weaponName remains the actual content reference ("Special Unarmed (1d4)").
    const found = findImportedItem(content.items, ref.name) ?? findImportedItem(content.items, ref.raw);
    if (found) return found;
    return (
      customItems.get(`ref:${labelToVariable(ref.name)}`) ??
      customItems.get(`ref:${labelToVariable(ref.raw)}`)
    );
  }

  if (ref.kind === 'unresolved') {
    return customItems.get(`unresolved:${ref.raw.toLowerCase()}`);
  }

  return undefined;
}

/** Apply Pathbuilder weapon rune state to a WG item without mutating the shared content cache. */
function withPathbuilderRunes(
  item: Item,
  potency: number,
  striking: number,
  propertyNames: string[],
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  warnings: string[],
  warningPrefix = 'rune',
  resilient: number | null = 0
): Item {
  if (
    potency <= 0 &&
    striking <= 0 &&
    propertyNames.length === 0 &&
    (resilient === null || resilient <= 0)
  ) return item;

  const copy = cloneDeep(item);
  const existing = copy.meta_data ?? ({ bulk: {} } as NonNullable<Item['meta_data']>);
  const runes = { ...(existing.runes ?? {}) };

  if (potency > 0) runes.potency = potency;
  if (striking > 0) runes.striking = striking;
  if (resilient !== null && resilient > 0) runes.resilient = Math.min(resilient, 3);

  const properties = [];
  for (const name of propertyNames) {
    const rune = findPathbuilderMatch('item', name, content.items, (candidate) => candidate.name);
    if (rune) {
      properties.push({ name: rune.name, id: rune.id, rune });
    } else {
      warnings.push(`${warningPrefix}: WG has no property rune "${name}"`);
    }
  }
  if (properties.length > 0) runes.property = properties;

  copy.meta_data = { ...existing, bulk: existing.bulk ?? {}, runes };
  return copy;
}

/**
 * Pathbuilder exports the Remastered Automaton chassis as a synthetic armor row.
 * Its AC item bonus scales with character level and cannot be inferred from a generic
 * reference-item record (which may only carry the armor-rune potency). Rebuild the
 * actual Reinforced Chassis statistics on the per-character copy of the imported item.
 *
 * Guns & Gears errata: +3 base, +4 from level 5, +5 from level 10; Dex cap +1.
 * The Remastered chassis uses unarmored proficiency and has no legacy armor penalties.
 */
function withPathbuilderReinforcedChassis(item: Item, resolved: ResolvedBuild): Item {
  const hasReinforcedChassis = resolved.feats.some(
    (feat) => labelToVariable(feat.name) === 'REINFORCED_CHASSIS'
  );
  const armorName = labelToVariable(resolved.armor?.name ?? item.name);
  const isAutomatonChassis =
    armorName.startsWith('AUTOMATON_CHASSI') ||
    armorName.startsWith('AUTOMATON_CHASSIS') ||
    (resolved.armor?.raw ?? '').startsWith('inferred: Reinforced Chassis');
  // A chassis-specific feat must never overwrite an explicitly selected different
  // armor's statistics merely because the character also owns that feat.
  if (!hasReinforcedChassis || !isAutomatonChassis) return item;

  const baseAcBonus = resolved.identity.level >= 10 ? 5 : resolved.identity.level >= 5 ? 4 : 3;
  const copy = cloneDeep(item);
  const existing = copy.meta_data ?? ({ bulk: {} } as NonNullable<Item['meta_data']>);
  copy.meta_data = {
    ...existing,
    category: 'unarmored_defense',
    ac_bonus: baseAcBonus,
    dex_cap: 1,
    check_penalty: 0,
    speed_penalty: 0,
    strength: 0,
    bulk: existing.bulk ?? {},
  };
  return copy;
}

/**
 * Rebuild the inventory, including the container hierarchy and Pathbuilder rune state.
 *
 * Pathbuilder stores quantities on references, while WG represents inventory quantity
 * by repeating InventoryItem rows. Expand each reference directly so duplicate names
 * in different locations cannot accidentally steal one another's quantity.
 */
function buildInventory(
  resolved: ResolvedBuild,
  content: Awaited<ReturnType<typeof fetchContentPackage>>,
  customItems: Map<string, Item>,
  warnings: string[]
): InventoryItem[] {
  const toInventoryItems = (
    ref: ResolvedItemRef,
    itemOverride?: Item,
    forceEquipped = false
  ): InventoryItem[] => {
    const sourceItem = itemOverride ?? findInventoryItem(ref, content, customItems);
    if (!sourceItem) {
      warnings.push('item: could not resolve "' + ref.name + '"');
      return [];
    }

    // Pathbuilder quantities are references (e.g. Chalk quantity 10), while WG
    // stores one physical row per unit. Never reuse a content-cache Item object
    // across rows: editing the quantity/runes of one row must not mutate every
    // duplicate through a shared object reference.
    const quantity = Math.max(1, ref.quantity ?? 1);
    return Array.from({ length: quantity }, () => {
      const item = cloneDeep(sourceItem);
      const existing = item.meta_data ?? ({ bulk: {} } as NonNullable<Item['meta_data']>);
      // Each row represents exactly one unit. Total quantity is represented by
      // the number of rows, not by repeating the source stack count on every row.
      item.meta_data = { ...existing, quantity: 1 };

      return {
        id: crypto.randomUUID(),
        item,
        is_formula: false,
        is_equipped: forceEquipped || isItemEquippable(item),
        is_invested: isItemInvestable(item),
        is_implanted: isItemImplantable(item),
        container_contents: [],
      };
    });
  };

  const items: InventoryItem[] = [];

  for (const container of resolved.containers) {
    const containerItem = findImportedItem(content.items, container.name);
    const contents = container.items.flatMap((ref) => toInventoryItems(ref));
    if (containerItem) {
      items.push({
        id: crypto.randomUUID(),
        item: cloneDeep(containerItem),
        is_formula: false,
        is_equipped: false,
        is_invested: false,
        is_implanted: false,
        container_contents: contents,
      });
    } else {
      // Keep the children visible even when WG lacks the container record.
      warnings.push(
        `container: WG has no "${container.name}", so its ${contents.length} item(s) were moved to the top level`
      );
      items.push(...contents);
    }
  }

  for (const weapon of resolved.weapons) {
    const base = findInventoryItem(weapon, content, customItems);
    if (!base) {
      warnings.push(`item: could not resolve weapon "${weapon.name}"`);
      continue;
    }
    const item = withPathbuilderRunes(
      withPathbuilderWeaponState(base, weapon),
      weapon.potency,
      weapon.striking,
      weapon.runes,
      content,
      warnings
    );
    items.push(...toInventoryItems(weapon, item, true));
  }

  for (const ref of resolved.looseEquipment) {
    items.push(...toInventoryItems(ref));
  }

  if (resolved.shield) {
    items.push(...toInventoryItems(resolved.shield));
  }

  if (resolved.armor) {
    const armor = findInventoryItem(resolved.armor, content, customItems);
    if (armor) {
      const item = withPathbuilderReinforcedChassis(
        withPathbuilderRunes(
          armor,
          resolved.armorPotency,
          0,
          resolved.armorRunes,
          content,
          warnings,
          'armor warning',
          resolved.armorResilience
        ),
        resolved
      );
      items.push(...toInventoryItems(resolved.armor, item, true));
    } else {
      warnings.push(
        `armor warning: could not resolve armor "${resolved.armor.name}"; the character will be created, but armor effects and AC may be incomplete`
      );
    }
  }
  // The resolver classifies rune/potency editor state without a selected armor as a
  // non-blocking hint. Pathbuilder can retain this state after armor is cleared;
  // the raw payload preserves it, and applying it to a nonexistent item would be wrong.

  return items;
}
