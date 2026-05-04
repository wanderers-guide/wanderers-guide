import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import { rehypeRemoveHastComments } from '../utils/hastComments.js';
import { unifiedRemovePositions } from '../utils/position.js';
export function htmlToHast(html) {
    return unified()
        .use(rehypeParse)
        .use(unifiedRemovePositions)
        .use(rehypeRemoveHastComments)
        .parse(html);
}
//# sourceMappingURL=root.js.map