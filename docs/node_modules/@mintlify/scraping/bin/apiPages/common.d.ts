import { NavigationEntry } from '@mintlify/models';
import { DecoratedGroupsConfig, DecoratedPagesConfig, GroupsConfig, PagesConfig } from '@mintlify/validation';
export declare const DEFAULT_API_GROUP_NAME = "API Reference";
export declare const DEFAULT_WEBSOCKETS_GROUP_NAME = "Websockets";
export declare const findNavGroup: (nav: GroupsConfig | DecoratedGroupsConfig, groupName?: string) => PagesConfig | DecoratedPagesConfig;
export declare const prepareStringToBeValidFilename: (str?: string) => string | undefined;
export declare const generateUniqueFilenameWithoutExtension: (pages: NavigationEntry[], base: string) => string;
