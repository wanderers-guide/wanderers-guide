import { cloneDeep } from 'lodash-es';
import { OperationSelect, validateSelectionAliases } from '@schemas/operations';
import {
  isConvertedDomainSelection,
  LEGACY_DOMAIN_SELECTOR_ID,
  resolveDomainChoice,
} from './domain-selection-compatibility';

export interface SelectionTreeNode {
  value: string | null;
  children: Record<string, SelectionTreeNode>;
}

export interface SelectionTrack {
  path: string;
  node: SelectionTreeNode | undefined;
  /** Stable owner for daily identities, independent of saved choice values and legacy paths. */
  choiceOwner?: string;
}

const SKILLED_HUMAN_EXPERT_SELECTOR = '756bd886-c321-4dec-8ea9-112568382526';
const SKILLED_HUMAN_TRAINED_SELECTOR = 'b00d9373-98fe-45a0-83a1-c8be11076851';

/** Both branches of Common Core Skilled Human represent the same printed skill choice. */
function isSkilledHumanSkillSelection(operation: OperationSelect): boolean {
  const filter: OperationSelect['data']['optionsFilters'] = operation.data.optionsFilters;
  return (
    operation.data.modeType === 'FILTERED' &&
    operation.data.optionType === 'ADJ_VALUE' &&
    filter?.type === 'ADJ_VALUE' &&
    filter.group === 'SKILL' &&
    typeof filter.value === 'object' &&
    filter.value !== null &&
    'value' in filter.value &&
    ((operation.id === SKILLED_HUMAN_EXPERT_SELECTOR && filter.value.value === 'E') ||
      (operation.id === SKILLED_HUMAN_TRAINED_SELECTOR && filter.value.value === 'T'))
  );
}

/** Resolve compatible saved choices only within this selection's current owner path. */
export function resolveSelectionNode(
  parent: SelectionTreeNode | undefined,
  operation: OperationSelect
): { id: string; node: SelectionTreeNode | undefined; aliases?: string[] } {
  validateSelectionAliases(operation);
  const domainSelection: boolean = isConvertedDomainSelection(operation);
  let aliases: string[] | undefined;
  if (domainSelection) {
    aliases = [operation.id, LEGACY_DOMAIN_SELECTOR_ID];
  } else if (isSkilledHumanSkillSelection(operation)) {
    // Preserve the explicitly reselected Expert choice if an older Trained choice also exists.
    aliases = [SKILLED_HUMAN_EXPERT_SELECTOR, SKILLED_HUMAN_TRAINED_SELECTOR];
  } else if (operation.data.selectionAliases?.length) {
    aliases = [operation.id, ...operation.data.selectionAliases];
  }
  if (!aliases) return { id: operation.id, node: parent?.children[operation.id] };
  // A present preferred key, even an empty clear marker, must not resurrect a stale peer.
  const id: string = aliases.find((candidate) => parent && Object.hasOwn(parent.children, candidate)) ?? operation.id;
  const node: SelectionTreeNode | undefined = parent?.children[id];
  return {
    id,
    node: domainSelection && node ? { ...node, value: resolveDomainChoice(node.value) } : node,
    aliases,
  };
}

/** Remove only exact saved choice keys in one immutable update, preserving unrelated owners and siblings. */
export function clearSelectionPaths(paths: string[], selections?: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = { ...selections };
  for (const path of paths) delete next[path];
  return next;
}

let selectionTree: SelectionTreeNode = { value: null, children: {} };

/**
 *
 * @param key - Key, format: <primary source ID>_<UUID>_<UUID>_<UUID>...
 * @param value - UUID of the selected option
 *
 */
export function setSelections(metadata: { key: string; value: string }[]) {
  resetSelections();
  for (const item of metadata) {
    addToSelectionTree(selectionTree, item.key, item.value);
  }
}

function addToSelectionTree(root: SelectionTreeNode, key: string, value: string): void {
  const subIds = key.split('_');
  let currentNode = root;

  for (const subId of subIds) {
    if (!currentNode.children[subId]) {
      currentNode.children[subId] = { value: null, children: {} };
    }
    currentNode = currentNode.children[subId];
  }

  currentNode.value = value;
}

export function getRootSelection() {
  return cloneDeep(selectionTree);
}

export function resetSelections() {
  selectionTree = { value: null, children: {} };
}

export function removeParentSelections(prefix: string, selections?: Record<string, string> | undefined) {
  const newSelections = cloneDeep(selections);
  for (const key in newSelections) {
    if (key.startsWith(prefix)) {
      delete newSelections[key];
    }
  }
  return newSelections;
}
