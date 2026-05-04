import { LOCAL_LINKED_CLI_VERSION } from '@mintlify/previewing';

import { getCliVersion } from '../src/helpers.js';

describe('getCliVersion', () => {
  const originalTestMode = process.env.CLI_TEST_MODE;

  afterEach(() => {
    if (originalTestMode === undefined) {
      delete process.env.CLI_TEST_MODE;
    } else {
      process.env.CLI_TEST_MODE = originalTestMode;
    }
  });

  it('returns a test marker when CLI_TEST_MODE is enabled', () => {
    process.env.CLI_TEST_MODE = 'true';
    expect(getCliVersion('mint')).toBe('test-cli');
  });

  it(
    'returns LOCAL_LINKED_CLI_VERSION when running from the monorepo source ' +
      '(not inside node_modules)',
    () => {
      delete process.env.CLI_TEST_MODE;
      expect(getCliVersion('mint')).toBe(LOCAL_LINKED_CLI_VERSION);
    }
  );
});
