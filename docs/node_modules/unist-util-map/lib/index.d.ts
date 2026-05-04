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
export function map<Tree extends import('unist').Node>(
  tree: Tree,
  mapFunction: MapFunction<Tree>
): InclusiveDescendant<Tree, 10, 0>
export type UnistNode = import('unist').Node
export type UnistParent = import('unist').Parent
/**
 * Number; capped reasonably.
 */
export type Uint = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
/**
 * Increment a number in the type system.
 */
export type Increment<I extends Uint = 0> = I extends 0
  ? 1
  : I extends 1
  ? 2
  : I extends 2
  ? 3
  : I extends 3
  ? 4
  : I extends 4
  ? 5
  : I extends 5
  ? 6
  : I extends 6
  ? 7
  : I extends 7
  ? 8
  : I extends 8
  ? 9
  : 10
/**
 * Collect all (inclusive) descendants of `Tree`.
 *
 * > 👉 **Note**: for performance reasons, this seems to be the fastest way to
 * > recurse without actually running into an infinite loop, which the
 * > previous version did.
 * >
 * > Practically, a max of `2` is typically enough assuming a `Root` is
 * > passed, but it doesn’t improve performance.
 * > It gets higher with `List > ListItem > Table > TableRow > TableCell`.
 * > Using up to `10` doesn’t hurt or help either.
 */
export type InclusiveDescendant<
  Tree extends import('unist').Node,
  Max extends Uint = 10,
  Depth extends Uint = 0
> = Tree extends UnistParent
  ? Depth extends Max
    ? Tree
    :
        | Tree
        | InclusiveDescendant<Tree['children'][number], Max, Increment<Depth>>
  : Tree
/**
 * Function called with a node, its index, and its parent to produce a new
 * node.
 */
export type MapFunction<Tree extends import('unist').Node> = (
  node: InclusiveDescendant<Tree>,
  index: number | undefined,
  parent: Extract<InclusiveDescendant<Tree>, UnistParent> | undefined
) => Tree | InclusiveDescendant<Tree>
