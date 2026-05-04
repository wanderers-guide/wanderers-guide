import { AsyncAPIDocumentInterface } from '@mintlify/common';
export declare const getAsyncApiDefinition: (pathOrDocumentOrUrl: string | URL, localSchema?: boolean) => Promise<{
    document: AsyncAPIDocumentInterface | undefined;
    isUrl: boolean;
}>;
