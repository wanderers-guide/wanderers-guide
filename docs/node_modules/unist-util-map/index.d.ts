export {map} from './lib/index.js'
export type MapFunction<
  Kind extends import('unist').Node = import('unist').Node
> = import('./lib/index.js').MapFunction<Kind>
