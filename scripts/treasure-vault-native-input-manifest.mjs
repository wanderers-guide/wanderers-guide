import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,lstat,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const migrationName=/^[0-9]{14}_[a-z0-9_]+\.sql$/;
const releaseName=/^[a-z0-9-]+\.sql$/;

/** Capture only exact checked-in execution inputs; no symlink, live export or private receipt fallback. */
export async function captureNativeInputManifest({root}) {
  root=resolve(root);
  const contents=new Map(),records=new Map();
  async function capture(path) {
    assert.equal(typeof path,'string');
    assert.ok(!path.startsWith('/')&&!path.split('/').includes('..'));
    const absolute=resolve(root,path);
    assert.equal(relative(root,absolute),path);
    if(contents.has(path))return contents.get(path);
    const before=await lstat(absolute);
    assert.ok(before.isFile()&&!before.isSymbolicLink(),path+': source must be a regular non-symlink file');
    const bytes=await readFile(absolute),after=await lstat(absolute);
    assert.ok(after.isFile()&&!after.isSymbolicLink());
    assert.equal(after.dev,before.dev);assert.equal(after.ino,before.ino);
    assert.equal(after.size,before.size);assert.equal(after.mtimeMs,before.mtimeMs);
    assert.equal(bytes.length,after.size);
    const text=bytes.toString('utf8');assert.ok(Buffer.from(text,'utf8').equals(bytes),path+': lossless UTF8');
    contents.set(path,text);records.set(path,{path,bytes:bytes.length,sha256:sha(bytes)});
    return text;
  }
  const migrationFiles=(await readdir(root+'/supabase/migrations')).filter(path=>migrationName.test(path)).sort();
  assert.equal(migrationFiles.length,104,'Complete reviewed chronology is mandatory');
  const requirements=JSON.parse(await capture('supabase/release/requirements.json'));
  const registeredCiPaths=['.github/workflows/e2e.yml','supabase/release/war-of-immortals-index.sql','supabase/release/war-of-immortals-index-regression.sql'];
  for(const path of registeredCiPaths)await capture(path);
  const bootstrapPaths=['data/schema.sql','data/data.sql','data/auth-trigger.sql','supabase/seed.sql','docker/db-init/zzz-passwords.sh'];
  for(const path of bootstrapPaths)await capture(path);
  const migrations=[];
  for(const path of migrationFiles) {
    const sql=await capture('supabase/migrations/'+path);
    migrations.push({path,sql,sha256:sha(sql)});
    const requirement=requirements[path];
    if(requirement?.check) {
      assert.match(requirement.check,releaseName);
      await capture('supabase/release/'+requirement.check);
    }
  }
  const visited=new Set();
  async function module(path) {
    if(visited.has(path))return;visited.add(path);
    const source=await capture(path);
    const declarations=[...source.matchAll(/^\s*import\s+[^\n]+$/gm)];
    for(const declaration of declarations) {
      const target=declaration[0].match(/\bfrom\s*['"]([^'"]+)['"]\s*;?\s*$/)?.[1];
      assert.ok(target,path+': only explicit single-line reviewed imports are supported');
      if(target.startsWith('node:'))continue;
      assert.match(target,/^\.\/treasure-vault-native-[a-z-]+\.mjs$/);
      await module('scripts/'+target.slice(2));
    }
    assert.doesNotMatch(source,/\bimport\s*\(/,path+': unmanifested dynamic input imports reject');
  }
  await module('scripts/treasure-vault-native-safety.mjs');
  const entries=[...records.values()].sort((a,b)=>a.path.localeCompare(b.path));
  const manifest={schema:'wg-tv-native-checked-in-input-manifest-v1',entries,sha256:sha(JSON.stringify(entries)),chronology:migrations.map(({path,sha256})=>({path,sha256})),bootstrap_paths:bootstrapPaths,registered_ci_paths:registeredCiPaths,native_modules:[...visited].sort(),external_private_inputs:[]};
  async function verify() {
    const current=await captureNativeInputManifest({root});
    assert.deepEqual(current.manifest,manifest,'Every input byte and complete execution membership remains the starting captured state');
    return {files:entries.length,manifest_sha256:manifest.sha256,all_input_bytes_and_membership_preserved:true};
  }
  const readText=path=>{
    const key=relative(root,resolve(path));
    assert.ok(contents.has(key),'No late/unmanifested file read: '+key);
    return contents.get(key);
  };
  async function readCurrentText(path) {
    const key=relative(root,resolve(path));
    const expected=readText(path),before=await lstat(path);
    assert.ok(before.isFile()&&!before.isSymbolicLink(),key+': current source remains regular/non-symlink');
    const current=await readFile(path,'utf8'),after=await lstat(path);
    assert.ok(after.isFile()&&!after.isSymbolicLink());
    assert.equal(before.ino,after.ino);assert.equal(before.dev,after.dev);
    assert.equal(before.size,after.size);assert.equal(before.mtimeMs,after.mtimeMs);
    assert.equal(current,expected,key+': actual fresh read must equal captured input bytes');
    return current;
  }
  return {manifest,migrations,readText,readCurrentText,readRelative:path=>{assert.ok(contents.has(path));return contents.get(path);},verify};
}
