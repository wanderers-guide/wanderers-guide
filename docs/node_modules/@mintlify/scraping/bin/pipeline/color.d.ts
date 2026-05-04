import { Colors } from '@mintlify/models';
import type { Root as HastRoot } from 'hast';
export declare const defaultColors: {
    primary: string;
    light: string;
    dark: string;
};
export declare function downloadColors(hast: HastRoot): Promise<Colors>;
