import { cli } from '../src/cli.js';

export async function runCommand(...args: string[]) {
  const prevCliTestMode = process.env.CLI_TEST_MODE;
  process.env.CLI_TEST_MODE = 'true';
  process.argv = ['node', 'cli.js', ...args];
  try {
    return await cli({ packageName: 'mint' });
  } finally {
    if (prevCliTestMode === undefined) {
      delete process.env.CLI_TEST_MODE;
    } else {
      process.env.CLI_TEST_MODE = prevCliTestMode;
    }
  }
}

export const mockValidOpenApiDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
  components: {},
};
