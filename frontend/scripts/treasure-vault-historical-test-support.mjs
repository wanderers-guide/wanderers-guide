import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import {
  TERMINAL_HELPER,
  extractReviewedTerminalHelper,
  extractReviewedWrapper,
} from '../../scripts/treasure-vault-native-inputs.mjs';

const repository = new URL('../../', import.meta.url);
const repositoryPath = fileURLToPath(repository);

/** Keep original repair assertions separate from the independently pinned safety wrapper. */
export function createReviewedHistoricalSqlReader(
  readText = (path) => readFile(new URL(path, repository), 'utf8')
) {
  let helperPromise;
  const helper = () => {
    helperPromise ??= Promise.all([
      readText(`supabase/migrations/${TERMINAL_HELPER.migration}`),
      readText(`supabase/release/${TERMINAL_HELPER.release}`),
    ]).then(([migrationSql, releaseSql]) => extractReviewedTerminalHelper({ migrationSql, releaseSql }));
    return helperPromise;
  };
  return async function readReviewedHistoricalSql(url, encoding = 'utf8') {
    assert.equal(encoding, 'utf8', 'Reviewed SQL is read as complete UTF-8 text');
    assert.ok(url instanceof URL && url.protocol === 'file:', 'Use an explicit repository file URL');
    assert.equal(url.search + url.hash, '', 'A SQL source URL has no query or fragment');
    const path = relative(repositoryPath, fileURLToPath(url));
    assert.match(path, /^supabase\/(?:migrations|release)\/[a-z0-9_\-]+\.sql$/, 'Only direct repository SQL sources');
    const reviewedHelper = await helper();
    const manifests = reviewedHelper.proof.historical_files.filter((entry) =>
      path === `supabase/migrations/${entry.migration}` || path === `supabase/release/${entry.release}`
    );
    assert.ok(manifests.length > 0, `${path} is not an explicitly reviewed historical wrapper`);
    const originals = [];
    for (const manifest of manifests) {
      const [migrationSql, releaseSql] = await Promise.all([
        readText(`supabase/migrations/${manifest.migration}`),
        readText(`supabase/release/${manifest.release}`),
      ]);
      const reviewed = extractReviewedWrapper({ migrationSql, releaseSql, manifest, helper: reviewedHelper });
      originals.push(path.startsWith('supabase/migrations/') ? reviewed.originalSql : reviewed.originalReleaseSql);
    }
    assert.ok(originals.every((original) => original === originals[0]), 'A shared release has one exact original query');
    return originals[0];
  };
}

export const readReviewedHistoricalSql = createReviewedHistoricalSqlReader();
