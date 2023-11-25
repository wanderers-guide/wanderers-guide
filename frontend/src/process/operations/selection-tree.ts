

export interface SelectionTreeNode {
  value: number | string | null;
  children: Record<string, SelectionTreeNode>;
}

let selectionTree: SelectionTreeNode = { value: null, children: {} };

/**
 *
 * @param key - Key, format: <primary source ID>_<UUID>_<UUID>_<UUID>...
 * @param value - ID of the selected option, either number or string
 *
 */
export function setSelections(metadata: { key: string; value: number | string }[]) {
  selectionTree = { value: null, children: {} };
  for (const item of metadata) {
    addToSelectionTree(selectionTree, item.key, item.value);
  }
}

function addToSelectionTree(root: SelectionTreeNode, key: string, value: number | string): void {
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

export function getSelection() {

}