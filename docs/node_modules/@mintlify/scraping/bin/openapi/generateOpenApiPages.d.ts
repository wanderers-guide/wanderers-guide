import type { DecoratedNavigation, Navigation } from '@mintlify/models';
import { OpenAPI } from 'openapi-types';
import { GenerateOpenApiPagesOptions, OpenApiPageGenerationResult } from './common.js';
export declare function generateOpenApiPages(pathOrDocumentOrUrl: string | OpenAPI.Document | URL, opts?: GenerateOpenApiPagesOptions): Promise<OpenApiPageGenerationResult<Navigation, DecoratedNavigation>>;
