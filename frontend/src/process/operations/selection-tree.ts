import { cloneDeep } from 'lodash-es';
import { OperationSelect, validateSelectionAliases, validateSkillChoice } from '@schemas/operations';
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

/** Read exact historical saves without treating arbitrary option strings as mapping keys. */
function resolveSkillChoiceValue(choice: NonNullable<OperationSelect['data']['skillChoice']>, value: string): string {
  const previous = choice.previousOptions;
  return previous && Object.hasOwn(previous, value) ? previous[value] : value;
}

/** Resolve compatible saved choices only within this selection's current owner path. */
export function resolveSelectionNode(
  parent: SelectionTreeNode | undefined,
  operation: OperationSelect
): { id: string; node: SelectionTreeNode | undefined; aliases?: string[] } {
  validateSelectionAliases(operation);
  validateSkillChoice(operation);
  const skillChoice = operation.data.skillChoice;
  const domainSelection: boolean = isConvertedDomainSelection(operation);
  const primary = skillChoice?.id ?? operation.id;
  const previousIds = skillChoice
    ? skillChoice.previousIds
    : domainSelection
      ? [LEGACY_DOMAIN_SELECTOR_ID]
      : operation.data.selectionAliases;
  const aliases = [primary, ...(previousIds ?? [])];
  // A present preferred key, even an empty clear marker, must not resurrect a stale peer.
  const savedId = aliases.find((candidate) => parent && Object.hasOwn(parent.children, candidate));
  let node = savedId === undefined ? undefined : parent?.children[savedId];
  if (domainSelection && node) node = { ...node, value: resolveDomainChoice(node.value) };
  if (skillChoice && node?.value) node = { ...node, value: resolveSkillChoiceValue(skillChoice, node.value) };
  return {
    id: skillChoice ? primary : (savedId ?? primary),
    node,
    ...(aliases.length > 1 ? { aliases } : {}),
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
 * @param value - Saved identity of the selected option
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
