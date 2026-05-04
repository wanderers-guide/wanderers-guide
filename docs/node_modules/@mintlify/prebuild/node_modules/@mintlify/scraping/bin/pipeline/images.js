import { join, dirname } from 'node:path';
import { CONTINUE, visit } from 'unist-util-visit';
import { downloadImage } from '../utils/images.js';
import { createFilename } from '../utils/path.js';
export async function downloadImagesFromFile(root, url) {
    url = new URL(url);
    const imageUrls = [];
    visit(root, function (node) {
        let imageUrl = undefined;
        if (node.type === 'image') {
            imageUrl = node.url;
        }
        else if (node.type === 'mdxJsxFlowElement') {
            imageUrl = node.attributes.find((attr) => attr.type === 'mdxJsxAttribute' && (attr.name === 'src' || attr.name === 'img'))?.value;
        }
        if (!imageUrl)
            return CONTINUE;
        if (imageUrl.startsWith('/')) {
            imageUrl = new URL(imageUrl, url.origin).toString();
        }
        imageUrls.push(imageUrl);
    });
    const rootPath = join(process.cwd(), '/images');
    const filename = createFilename(rootPath, url, '');
    const localRootPath = filename ? dirname(filename) : rootPath;
    const imageResults = await Promise.all(imageUrls.map(async (imageUrl) => await downloadImage(imageUrl, localRootPath)));
    const imagePathsMap = new Map(imageResults.filter((result) => result.success).map((result) => result.data));
    visit(root, function (node, index, parent) {
        if (node.type === 'image') {
            if (node.url.startsWith('/')) {
                node.url = imagePathsMap.get(new URL(node.url, url.origin).toString()) ?? node.url;
            }
            else {
                node.url = imagePathsMap.get(node.url) ?? node.url;
            }
            if (parent && typeof index === 'number')
                parent.children[index] = node;
        }
        else if (node.type === 'mdxJsxFlowElement') {
            const urlAttr = node.attributes.find(
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            (attr) => attr.type === 'mdxJsxAttribute' && (attr.name === 'src' || attr.name === 'img'));
            if (!urlAttr)
                return CONTINUE;
            urlAttr.value = imagePathsMap.get(urlAttr.value) ?? urlAttr.value;
            if (parent && typeof index === 'number')
                parent.children[index] = node;
        }
    });
    return imageResults;
}
//# sourceMappingURL=images.js.map