import { AsyncAPIChannel } from '@mintlify/common';
import { DecoratedNavigationPage } from '@mintlify/models';
import { DecoratedGroupsConfig, DecoratedPagesConfig, GroupsConfig, PagesConfig } from '@mintlify/validation';
type GenerateAsyncApiPagesOptions = {
    asyncApiFilePath?: string;
    version?: string;
    writeFiles?: boolean;
    outDir?: string;
    outDirBasePath?: string;
    overwrite?: boolean;
};
type ProcessAsyncApiChannelArgs = {
    channel: AsyncAPIChannel;
    nav: GroupsConfig;
    decoratedNav: DecoratedGroupsConfig;
    writePromises: Promise<void>[];
    pagesAcc: Record<string, DecoratedNavigationPage>;
    opts?: GenerateAsyncApiPagesOptions;
    findNavGroup: (nav: GroupsConfig | DecoratedGroupsConfig, groupName?: string) => PagesConfig | DecoratedPagesConfig;
};
export declare const processAsyncApiChannel: ({ channel, nav, decoratedNav, writePromises, pagesAcc, opts, findNavGroup, }: ProcessAsyncApiChannelArgs) => void;
export {};
