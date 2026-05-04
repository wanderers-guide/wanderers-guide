import type { Root } from 'hast';
import type { Framework } from '../types/framework.js';
export declare const framework: Framework;
export declare function detectFramework(rootHast: Root): void;
