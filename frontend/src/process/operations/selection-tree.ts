import { cloneDeep } from 'lodash-es';
import { OperationSelect, validateSelectionAliases } from '@schemas/operations';

export interface SelectionTreeNode {
  value: string | null;
  children: Record<string, SelectionTreeNode>;
}

export interface SelectionTrack {
  path: string;
  node: SelectionTreeNode | undefined;
}

/** Resolve an explicitly authored sibling only within this selection's current owner path. */
export function resolveSelectionNode(
  parent: SelectionTreeNode | undefined,
  operation: OperationSelect
): { id: string; node: SelectionTreeNode | undefined; aliases?: string[] } {
  validateSelectionAliases(operation);
  const peers: string[] | undefined = operation.data.selectionAliases;
  if (!peers?.length) return { id: operation.id, node: parent?.children[operation.id] };
  const aliases: string[] = [operation.id, ...peers];
  // A present primary, even an empty clear marker, must not resurrect a stale peer.
  const id: string = aliases.find((candidate) => parent && Object.hasOwn(parent.children, candidate)) ?? operation.id;
  return { id, node: parent?.children[id], aliases };
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
