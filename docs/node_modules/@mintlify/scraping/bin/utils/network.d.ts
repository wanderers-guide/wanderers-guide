import { AsyncAPIDocumentInterface } from '@mintlify/common';
import { OpenAPI } from 'openapi-types';
import { Browser } from 'puppeteer';
export declare function startPuppeteer(): Promise<Browser | undefined>;
export declare function getHtmlWithPuppeteer(browser: Browser, url: string | URL): Promise<string | undefined>;
export declare function fetchPageHtml(url: string | URL, browser?: Browser | undefined): Promise<string>;
export declare function fetchImage(url: string): Promise<NodeJS.TypedArray>;
export declare function fetchOpenApi(url: URL): Promise<OpenAPI.Document>;
export declare function fetchAsyncApi(url: URL): Promise<AsyncAPIDocumentInterface>;
