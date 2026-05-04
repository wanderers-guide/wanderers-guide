import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SUPPORTED_MEDIA_EXTENSIONS } from '../constants.js';
import { getErrorMessage } from './errors.js';
import { getFileExtension } from './extension.js';
import { write } from './file.js';
import { fetchImage } from './network.js';
export async function downloadImage(src, rootPath) {
    if (src.startsWith('data:image/')) {
        return { success: true, data: [src, src] };
    }
    try {
        let filename = await writeImageToFile(src, rootPath);
        filename = filename.replace(process.cwd(), '');
        return { success: true, data: [src, filename] };
    }
    catch (error) {
        if (error instanceof Error) {
            return { success: false, message: error.message };
        }
        else {
            return {
                success: false,
                message: `${src} - an unknown error occurred downloading this image`,
            };
        }
    }
}
async function writeImageToFile(src, rootPath) {
    const filename = removeMetadataFromImageSrc(src);
    const imagePath = join(rootPath, filename);
    const shortenedFilename = filename.length > 36 ? `...${filename.slice(-36)}` : filename;
    if (!isValidImageSrc(filename)) {
        throw new Error(`${shortenedFilename} - file extension not supported`);
    }
    if (existsSync(imagePath)) {
        return imagePath;
    }
    try {
        mkdirSync(dirname(imagePath), { recursive: true });
    }
    catch (error) {
        throw new Error(`${imagePath} - failed to create directory`);
    }
    try {
        const imageData = await fetchImage(src);
        write(imagePath, imageData);
        return imagePath;
    }
    catch (error) {
        const errorMessage = getErrorMessage(error);
        throw new Error(`${shortenedFilename} - failed to download file from source${errorMessage}`);
    }
}
export function isValidImageSrc(src) {
    if (!src) {
        return false;
    }
    const ext = getFileExtension(src);
    if (ext && !SUPPORTED_MEDIA_EXTENSIONS.includes(ext)) {
        return false;
    }
    return true;
}
export function getFilenameBeforeMetadata(src, ext) {
    const lengthUntilMetadata = src.indexOf(`.${ext}`) + `.${ext}`.length;
    return src.slice(0, lengthUntilMetadata);
}
export function removeMetadataFromImageSrc(src) {
    let filename = '';
    if (src.includes('gitbook/image')) {
        for (const ext of SUPPORTED_MEDIA_EXTENSIONS) {
            if (src.includes(`.${ext}`)) {
                filename = getFilenameBeforeMetadata(src, ext);
            }
        }
    }
    if (!filename) {
        if (src.startsWith('http')) {
            src = new URL(src).pathname;
        }
        filename =
            decodeURIComponent(src
                .split('#')[0]
                .split('?')[0]
                .replace(/[\/]{2,}/g, '/')).replace(/(?:_{2,}|[\s%#&{}\\<>*?$!'":@+`|=])/g, '-') || 'image';
        return filename;
    }
    return filename.split('%2F').slice(4).join('%2F');
}
//# sourceMappingURL=images.js.map