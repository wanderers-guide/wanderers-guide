import { describe, expect, it } from 'vitest';

import { readLocalOpenApiFile } from '../src/helpers.js';

describe('readLocalOpenApiFile', () => {
  describe('path traversal prevention', () => {
    it('rejects path traversal with ../', async () => {
      await expect(readLocalOpenApiFile('../etc/passwd')).rejects.toThrow(
        'path: ../etc/passwd is outside the current directory'
      );
    });

    it('rejects absolute paths', async () => {
      await expect(readLocalOpenApiFile('/etc/passwd')).rejects.toThrow(
        'path: /etc/passwd is outside the current directory'
      );
    });

    it('rejects deep path traversal', async () => {
      await expect(readLocalOpenApiFile('../../secret.yaml')).rejects.toThrow(
        'path: ../../secret.yaml is outside the current directory'
      );
    });
  });
});
