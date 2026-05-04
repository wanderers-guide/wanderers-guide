// Functions used for both OpenAPI and AsyncAPI page generation
import { NavigationEntry } from '@mintlify/models';
import {
  DecoratedGroupsConfig,
  DecoratedPagesConfig,
  GroupsConfig,
  PagesConfig,
} from '@mintlify/validation';

export const DEFAULT_API_GROUP_NAME = 'API Reference';
export const DEFAULT_WEBSOCKETS_GROUP_NAME = 'Websockets';

export const findNavGroup = (
  nav: GroupsConfig | DecoratedGroupsConfig,
  groupName: string = DEFAULT_API_GROUP_NAME
): PagesConfig | DecoratedPagesConfig => {
  const group = nav.find(
    (fileOrGroup) =>
      typeof fileOrGroup === 'object' && 'group' in fileOrGroup && fileOrGroup.group === groupName
  );
  if (group === undefined || !('pages' in group)) {
    const newGroup = {
      group: groupName,
      pages: [],
    };
    nav.push(newGroup);
    return newGroup.pages;
  } else {
    return group.pages;
  }
};

export const prepareStringToBeValidFilename = (str?: string) =>
  str
    ? str
        .replaceAll(' ', '-')
        .replace(/\{.*?\}/g, '-') // remove path parameters
        .replace(/^-/, '')
        .replace(/-$/, '')
        .replace(/[{}(),.'\n\/]/g, '') // remove special characters
        .replaceAll(/--/g, '-') // replace double hyphens
        .toLowerCase()
    : undefined;

// returns a filename that is unique within the given array of pages
export const generateUniqueFilenameWithoutExtension = (
  pages: NavigationEntry[],
  base: string
): string => {
  let filename = base;
  if (pages.includes(filename)) {
    let extension = 1;
    filename = `${base}-${extension}`;
    while (pages.includes(filename)) {
      extension += 1;
      filename = `${base}-${extension}`;
    }
  }
  return filename.toLowerCase();
};
