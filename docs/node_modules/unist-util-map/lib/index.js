/**
 * @typedef {import('unist').Node} UnistNode
 * @typedef {import('unist').Parent} UnistParent
 */

/**
 * @typedef {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10} Uint
 *   Number; capped reasonably.
 * @see https://github.com/syntax-tree/unist-util-visit-parents/blob/main/lib/index.js
 */

/**
 * @typedef {I extends 0 ? 1 : I extends 1 ? 2 : I extends 2 ? 3 : I extends 3 ? 4 : I extends 4 ? 5 : I extends 5 ? 6 : I extends 6 ? 7 : I extends 7 ? 8 : I extends 8 ? 9 : 10} Increment
 *   Increment a number in the type system.
 * @template {Uint} [I=0]
 *   Index.
 * @see https://github.com/syntax-tree/unist-util-visit-parents/blob/main/lib/index.js
 */

/**
 * @typedef {(
 *   Tree extends UnistParent
 *     ? Depth extends Max
 *       ? Tree
 *       : Tree | InclusiveDescendant<Tree['children'][number], Max, Increment<Depth>>
 *     : Tree
 * )} InclusiveDescendant
 *   Collect all (inclusive) descendants of `Tree`.
 *
 *   > 👉 **Note**: for performance reasons, this seems to be the fastest way to
 *   > recurse without actually running into an infinite loop, which the
 *   > previous version did.
 *   >
 *   > Practically, a max of `2` is typically enough assuming a `Root` is
 *   > passed, but it doesn’t improve performance.
 *   > It gets higher with `List > ListItem > Table > TableRow > TableCell`.
 *   > Using up to `10` doesn’t hurt or help either.
 * @template {UnistNode} Tree
 *   Tree type.
 * @template {Uint} [Max=10]
 *   Max; searches up to this depth.
 * @template {Uint} [Depth=0]
 *   Current depth.
 * @see https://github.com/syntax-tree/unist-util-visit-parents/blob/main/lib/index.js
 */

/**
 * @template {UnistNode} Tree
 *   Node type.
 * @typedef {(
 *   (
 *     node: InclusiveDescendant<Tree>,
 *     index: number | undefined,
 *     parent: Extract<InclusiveDescendant<Tree>, UnistParent> | undefined
 *   ) => Tree | InclusiveDescendant<Tree>
 * )} MapFunction
 *   Function called with a node, its index, and its parent to produce a new
 *   node.
 */

/**
 * Create a new tree by mapping all nodes with the given function.
 *
 * @template {UnistNode} Tree
 *   Type of input tree.
 * @param {Tree} tree
 *   Tree to map.
 * @param {MapFunction<Tree>} mapFunction
 *   Function called with a node, its index, and its parent to produce a new
 *   node.
 * @returns {InclusiveDescendant<Tree>}
 *   New mapped tree.
 */
export function map(tree, mapFunction) {
  const result = preorder(tree, undefined, undefined)

  // @ts-expect-error: the new node is expected.
  return result

  /** @type {MapFunction<UnistNode | UnistParent>} */
  function preorder(oldNode, index, parent) {
    /** @type {UnistNode} */
    const newNode = {
      ...mapFunction(
        // @ts-expect-error: the old node is expected.
        oldNode,
        index,
        parent
      )
    }

    if ('children' in oldNode) {
      const newNodeAstParent = /** @type {UnistParent} */ (newNode)

      const nextChildren = oldNode.children.map(function (child, index) {
        return preorder(child, index, oldNode)
      })

      newNodeAstParent.children = nextChildren
    }

    return newNode
  }
}
