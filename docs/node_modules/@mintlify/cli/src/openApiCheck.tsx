import { validate, getOpenApiDocumentFromUrl, isAllowedLocalSchemaUrl } from '@mintlify/common';
import { addLog, ErrorLog, SuccessLog, WarningLog } from '@mintlify/previewing';
import type { DocsConfig } from '@mintlify/validation';

import { readLocalOpenApiFile } from './helpers.js';

export const getOpenApiFilenamesFromDocsConfig = (config: Pick<DocsConfig, 'api'>): string[] => {
  const openapi = config.api?.openapi;
  if (openapi === undefined) return [];
  if (typeof openapi === 'string') return [openapi];
  if (Array.isArray(openapi)) return openapi;
  return [openapi.source];
};

export const checkOpenApiFile = async (
  filename: string,
  localSchema: boolean
): Promise<boolean> => {
  try {
    if (isAllowedLocalSchemaUrl(filename, localSchema)) {
      await getOpenApiDocumentFromUrl(filename);
      addLog(<SuccessLog message="OpenAPI definition is valid." />);
      return true;
    }

    if (filename.startsWith('http://') && !localSchema) {
      addLog(
        <WarningLog message="include the --local-schema flag to check locally hosted OpenAPI files" />
      );
      addLog(<WarningLog message="only https protocol is supported in production" />);
      return true;
    }

    const document = await readLocalOpenApiFile(filename);
    if (!document) {
      throw new Error(
        'failed to parse OpenAPI spec: could not parse file correctly, please check for any syntax errors.'
      );
    }
    await validate(document);
    addLog(<SuccessLog message="OpenAPI definition is valid." />);
    return true;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      addLog(<ErrorLog message={`file not found, please check the path provided: ${filename}`} />);
    } else {
      addLog(<ErrorLog message={err instanceof Error ? err.message : 'unknown error'} />);
    }
    return false;
  }
};
