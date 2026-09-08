/** Guard the generated offline bundle against optional downloads returning to startup. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
const directory = resolve(process.argv[2] ?? 'dist');
const worker = readFileSync(join(directory, 'sw.js'), 'utf8');
const precached = [...worker.matchAll(/url:"([^"]+)"/g)].map((match) => match[1]);
assert(precached.includes('index.html'), 'the app shell must remain available offline');
assert(!existsSync(join(directory, 'stats.html')), 'developer reports must stay out of the shipped app');
assert(!precached.some((url) => /stats\.html|game-icons-/.test(url)), 'optional reports/icons must not be precached');
const icons = readdirSync(join(directory, 'assets')).filter((name) => /^game-icons-.*\.js$/.test(name));
assert.equal(icons.length, 1, 'the existing icon set must remain an independent optional chunk');
assert(worker.includes('wg-game-icons') && worker.includes('CacheFirst'), 'icons must be cached after use');
console.log(
  JSON.stringify(
    {
      precachedFiles: precached.length,
      precachedUncompressedBytes: precached.reduce((total, url) => total + statSync(join(directory, url)).size, 0),
      optionalIconBytes: statSync(join(directory, 'assets', icons[0])).size,
      developerReportShipped: false,
    },
    null,
    2
  )
);
