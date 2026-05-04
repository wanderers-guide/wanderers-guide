import { DEFAULT_WEBSOCKETS_GROUP_NAME } from '../src/apiPages/common.js';
import { generateAsyncApiPagesForDocsConfig } from '../src/asyncapi/generateAsyncApiPagesForDocsConfig.js';

vi.mock('path', async () => {
  const originalModule = await vi.importActual<typeof import('path')>('path');
  return {
    ...originalModule.posix,
    default: {
      ...originalModule.posix,
    },
  };
});

function getAsyncAPIFixturePath(filename: string): string {
  const filePath = `./__test__/fixtures/${filename}`;
  return filePath;
}

describe(generateAsyncApiPagesForDocsConfig, () => {
  it('should throw error for empty channels', async () => {
    const emptyDoc = getAsyncAPIFixturePath('emptyAsyncAPI.yml');
    await expect(generateAsyncApiPagesForDocsConfig(emptyDoc)).rejects.toThrow(
      'No channels defined'
    );
  });

  it('should generate navigation structure for simple API with default group name', async () => {
    const simpleDoc = getAsyncAPIFixturePath('simpleAsyncAPI.yml');
    const result = await generateAsyncApiPagesForDocsConfig(simpleDoc, {
      asyncApiFilePath: 'simpleAsyncAPI.yml',
      version: '1.0.0',
    });

    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_WEBSOCKETS_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect(result.decoratedNav).toHaveLength(1);
    expect(result.decoratedNav[0]).toHaveProperty('group', DEFAULT_WEBSOCKETS_GROUP_NAME);
    expect(result.decoratedNav[0]).toHaveProperty('pages');
    const expectedPagesAcc = {
      'websockets/usersignedup': {
        asyncapi: '/simpleAsyncAPI.yml userSignedUp',
        title: 'User signed up',
        href: '/websockets/usersignedup',
        description: '',
        version: '1.0.0',
      },
      'websockets/userdeleted': {
        asyncapi: '/simpleAsyncAPI.yml userDeleted',
        title: 'User deleted',
        href: '/websockets/userdeleted',
        description: '',
        version: '1.0.0',
      },
    };

    expect(Object.keys(result.pagesAcc)).toHaveLength(2);
    expect(result.pagesAcc).toEqual(expect.objectContaining(expectedPagesAcc));
  });

  it('should handle custom group names', async () => {
    const withTags = getAsyncAPIFixturePath('withTagsAsyncAPI.yml');
    const result = await generateAsyncApiPagesForDocsConfig(withTags, {
      asyncApiFilePath: 'withTagsAsyncAPI.yml',
      version: '1.0.0',
    });
    expect(result.nav).toHaveLength(2);
    expect(result.nav[0]).toHaveProperty('group', 'Users');
    expect(result.nav[1]).toHaveProperty('group', 'Another');
    const expectedPagesAcc = {
      'users/usersignedup': {
        asyncapi: '/withTagsAsyncAPI.yml userSignedUp',
        title: 'User signed up',
        href: '/users/usersignedup',
        description: '',
        version: '1.0.0',
      },
      'users/userdeleted': {
        asyncapi: '/withTagsAsyncAPI.yml userDeleted',
        title: 'User deleted',
        href: '/users/userdeleted',
        description: '',
        version: '1.0.0',
      },
      'another/anotherchannel': {
        asyncapi: '/withTagsAsyncAPI.yml anotherChannel',
        title: 'Another channel',
        href: '/another/anotherchannel',
        description: '',
        version: '1.0.0',
      },
    };

    expect(Object.keys(result.pagesAcc)).toHaveLength(3);
    expect(result.pagesAcc).toEqual(expect.objectContaining(expectedPagesAcc));
  });

  it('should handle multiple paths and methods', async () => {
    const complexDoc = getAsyncAPIFixturePath('complexAsyncAPI.yml');
    const result = await generateAsyncApiPagesForDocsConfig(complexDoc, {
      asyncApiFilePath: 'complexAsyncAPI.yml',
      version: '1.0.0',
    });

    expect(result.nav).toHaveLength(1);
    expect(result.nav[0]).toHaveProperty('group', DEFAULT_WEBSOCKETS_GROUP_NAME);
    expect(result.nav[0]).toHaveProperty('pages');
    expect(result.decoratedNav).toHaveLength(1);
    expect(result.decoratedNav[0]).toHaveProperty('group', DEFAULT_WEBSOCKETS_GROUP_NAME);
    expect(result.decoratedNav[0]).toHaveProperty('pages');
    const expectedPagesAcc = {
      'websockets/userevents': {
        asyncapi: '/complexAsyncAPI.yml userEvents',
        title: 'User events',
        description: 'Used for broadcasting user creation and update events',
        version: '1.0.0',
        href: '/websockets/userevents',
      },
      'websockets/usercommands': {
        asyncapi: '/complexAsyncAPI.yml userCommands',
        title: 'User commands',
        description: 'Used for sending commands to create or update users',
        version: '1.0.0',
        href: '/websockets/usercommands',
      },
      'websockets/notifications': {
        asyncapi: '/complexAsyncAPI.yml notifications',
        title: 'Notifications',
        description: 'Used for email notification events',
        version: '1.0.0',
        href: '/websockets/notifications',
      },
    };

    expect(Object.keys(result.pagesAcc)).toHaveLength(3);
    expect(result.pagesAcc).toEqual(expect.objectContaining(expectedPagesAcc));
  });
});
