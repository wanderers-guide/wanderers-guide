import { AsyncAPIDocumentInterface, AsyncAPIChannel, validateAsyncApi } from '@mintlify/common';
import { DecoratedNavigationPage } from '@mintlify/models';
import { DecoratedGroupsConfig, GroupsConfig } from '@mintlify/validation';

import { findNavGroup } from '../apiPages/common.js';
import { getAsyncApiDefinition } from './getAsyncApiDefinition.js';
import { processAsyncApiChannel } from './processAsyncApiChannel.js';

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

export async function generateAsyncApiPagesForDocsConfig(
  spec: AsyncAPIDocumentInterface | string | URL,
  opts?: GenerateAsyncApiPagesOptions
): Promise<AsyncApiPageGenerationResult> {
  let document: AsyncAPIDocumentInterface | undefined = undefined;
  let isUrl: boolean;
  if (typeof spec === 'string' || spec instanceof URL) {
    const { document: asyncApiDocument, isUrl: isUrlFromDefinition } = await getAsyncApiDefinition(
      spec,
      opts?.localSchema
    );
    if (asyncApiDocument) {
      document = asyncApiDocument;
    }
    isUrl = isUrlFromDefinition;
  } else {
    const { valid, errorMessage, document: asyncApiDocument } = await validateAsyncApi(spec);
    if (!valid && errorMessage) {
      throw new Error(errorMessage);
    }
    document = asyncApiDocument;
    isUrl = false;
  }

  if (!document) {
    throw new Error('No document defined');
  }

  const channels = document.channels();

  if (channels.isEmpty()) {
    throw new Error('No channels defined');
  }

  const nav: GroupsConfig = [];
  const decoratedNav: DecoratedGroupsConfig = [];
  const writePromises: Promise<void>[] = [];
  const pagesAcc: Record<string, DecoratedNavigationPage> = {};

  channels.all().forEach((channel) => {
    processAsyncApiChannel({
      channel: channel as AsyncAPIChannel,
      nav,
      decoratedNav,
      writePromises,
      pagesAcc,
      opts,
      findNavGroup,
    });
  });

  await Promise.all(writePromises);

  return {
    nav,
    decoratedNav,
    spec: document,
    pagesAcc,
    isUrl,
  };
}
