import { Browser } from 'puppeteer';
export declare function downloadLogos(url: string | URL, browser: Browser | undefined): Promise<string | {
    light: string;
    dark: string;
} | undefined>;
