import type { DecoratedNavigationPage, PageMetaTags } from '@mintlify/models';
import { XMint } from '@mintlify/validation';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
export type OpenApiExtensions = {
    'x-mint'?: XMint;
    'x-excluded'?: boolean;
    'x-hidden'?: boolean;
};
export declare const getOpenApiDefinition: (pathOrDocumentOrUrl: string | OpenAPI.Document | URL, localSchema?: boolean) => Promise<{
    document: OpenAPI.Document;
    isUrl: boolean;
}>;
export declare const createOpenApiFrontmatter: ({ filename, openApiMetaTag, version, deprecated, metadata, extraContent, }: {
    filename: string;
    openApiMetaTag: string;
    version?: string;
    deprecated?: boolean;
    metadata?: PageMetaTags;
    extraContent?: string;
}) => Promise<void>;
export type GenerateOpenApiPagesOptions = {
    openApiFilePath?: string;
    version?: string;
    writeFiles?: boolean;
    outDir?: string;
    outDirBasePath?: string;
    overwrite?: boolean;
    localSchema?: boolean;
};
export type OpenApiPageGenerationResult<N, DN> = {
    nav: N;
    decoratedNav: DN;
    spec: OpenAPI.Document;
    pagesAcc: Record<string, DecoratedNavigationPage>;
    isUrl: boolean;
};
export declare function processOpenApiPath<N, DN>(path: string, pathItemObject: OpenAPIV3.PathItemObject<OpenApiExtensions>, schema: OpenAPI.Document, nav: N, decoratedNav: DN, writePromises: Promise<void>[], pagesAcc: Record<string, DecoratedNavigationPage>, options: GenerateOpenApiPagesOptions, findNavGroup: (nav: any, groupName?: string) => any): void;
export declare function processOpenApiWebhook<N, DN>(webhook: string, webhookObject: OpenAPIV3.PathItemObject<OpenApiExtensions>, _schema: OpenAPI.Document, nav: N, decoratedNav: DN, writePromises: Promise<void>[], pagesAcc: Record<string, DecoratedNavigationPage>, options: GenerateOpenApiPagesOptions, findNavGroup: (nav: any, groupName?: string) => any): void;
export declare const getXMintGroups: ({ pathObject, operationObject, }: {
    pathObject: OpenAPIV3.PathItemObject<OpenApiExtensions>;
    operationObject: OpenAPIV3.OperationObject<OpenApiExtensions> | undefined;
}) => string[];
