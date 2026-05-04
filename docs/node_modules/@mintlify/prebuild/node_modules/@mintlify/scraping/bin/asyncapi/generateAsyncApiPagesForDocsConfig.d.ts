import { AsyncAPIDocumentInterface } from '@mintlify/common';
import { DecoratedNavigationPage } from '@mintlify/models';
import { DecoratedGroupsConfig, GroupsConfig } from '@mintlify/validation';
type GenerateAsyncApiPagesOptions = {
    asyncApiFilePath?: string;
    version?: string;
    writeFiles?: boolean;
    outDir?: string;
    outDirBasePath?: string;
    overwrite?: boolean;
    localSchema?: boolean;
};
type AsyncApiPageGenerationResult = {
    nav: GroupsConfig;
    decoratedNav: DecoratedGroupsConfig;
    spec: AsyncAPIDocumentInterface;
    pagesAcc: Record<string, DecoratedNavigationPage>;
    isUrl: boolean;
};
export declare function generateAsyncApiPagesForDocsConfig(spec: AsyncAPIDocumentInterface | string | URL, opts?: GenerateAsyncApiPagesOptions): Promise<AsyncApiPageGenerationResult>;
export {};
