import { cloneDeep } from 'lodash-es';

export interface SelectionTreeNode {
  value: string | null;
  children: Record<string, SelectionTreeNode>;
}

export interface SelectionTrack {
  path: string;
  node: SelectionTreeNode | undefined;
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
