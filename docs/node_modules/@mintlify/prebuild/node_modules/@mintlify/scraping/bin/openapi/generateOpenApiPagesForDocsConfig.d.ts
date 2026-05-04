import { DecoratedGroupsConfig, GroupsConfig } from '@mintlify/validation';
import { OpenAPI } from 'openapi-types';
import { GenerateOpenApiPagesOptions, OpenApiPageGenerationResult } from './common.js';
export declare function generateOpenApiPagesForDocsConfig(pathOrDocumentOrUrl: string | OpenAPI.Document | URL, opts?: GenerateOpenApiPagesOptions): Promise<OpenApiPageGenerationResult<GroupsConfig, DecoratedGroupsConfig>>;
