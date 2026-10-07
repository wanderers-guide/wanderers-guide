import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openSync,closeSync,fstatSync,lstatSync,readFileSync} from 'node:fs';
import {dirname,normalize} from 'node:path';

/** Strict local Engine byte boundaries; no Docker lifecycle or SQL parser. */
export const wireSha256=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Parse fragmented non-TTY stream frames without decoding partial UTF8. */
export function createStrictEngineDemux(maxBytes) {
  assert.ok(Number.isSafeInteger(maxBytes)&&maxBytes>0&&maxBytes<=128*1024*1024);
  let pending=Buffer.alloc(0),received=0,finished=false;
  const outputs=[[],[],[]];
  return {
    push(chunk) {
      assert.equal(finished,false,'Stream cannot resume after end');
      const bytes=Buffer.from(chunk);received+=bytes.length;
      assert.ok(received<=maxBytes,'Multiplex stream byte limit');
      pending=Buffer.concat([pending,bytes]);
      while(pending.length>=8) {
        assert.ok([1,2,3].includes(pending[0]),'Unexpected stream type');
        assert.deepEqual([...pending.subarray(1,4)],[0,0,0],'Reserved frame bytes');
        const length=pending.readUInt32BE(4);assert.ok(length<=maxBytes,'Frame byte limit');
        if(pending.length<8+length)break;
        assert.notEqual(pending[0],3,'Daemon system-error frame is a transport failure');
        outputs[pending[0]].push(Buffer.from(pending.subarray(8,8+length)));
        pending=pending.subarray(8+length);
      }
    },
    finish() {
      assert.equal(finished,false,'One clean stream end is required');finished=true;
      assert.equal(pending.length,0,'Truncated multiplex frame cannot qualify');
      return {stdout:Buffer.concat(outputs[1]).toString('utf8'),stderr:Buffer.concat(outputs[2]).toString('utf8'),received_bytes:received};
    },
  };
}

/** Build exactly one regular statement.sql entry; caller supplies its pinned SHA. */
export function createStrictStatementArchive({sourcePath,expectedSha256,expectedSize}) {
  assert.equal(typeof sourcePath,'string');assert.ok(sourcePath.startsWith('/'));
  assert.equal(normalize(sourcePath),sourcePath,'No path traversal or noncanonical segments');
  const directory=lstatSync(dirname(sourcePath));assert.ok(directory.isDirectory()&&!directory.isSymbolicLink());assert.equal(directory.mode&0o777,0o700,'Private archive source directory');
  assert.match(expectedSha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(expectedSize)&&expectedSize>=0&&expectedSize<=128*1024*1024);
  const before=lstatSync(sourcePath);
  assert.ok(before.isFile()&&!before.isSymbolicLink(),'Archive source is one real regular file');
  assert.equal(before.mode&0o777,0o600,'Private source mode');assert.equal(before.nlink,1,'No hard-linked archive source');
  const fd=openSync(sourcePath,'r');let bytes;
  try {
    const opened=fstatSync(fd);assert.equal(opened.dev,before.dev);assert.equal(opened.ino,before.ino);
    assert.ok(opened.isFile());assert.equal(opened.size,expectedSize);
    bytes=readFileSync(fd);const after=fstatSync(fd);
    assert.equal(after.size,opened.size);assert.equal(after.mtimeMs,opened.mtimeMs);assert.equal(after.ctimeMs,opened.ctimeMs);
  } finally {closeSync(fd);}
  const final=lstatSync(sourcePath);assert.equal(final.dev,before.dev);assert.equal(final.ino,before.ino);
  assert.ok(final.isFile()&&!final.isSymbolicLink());assert.equal(final.mode&0o777,0o600);assert.equal(final.nlink,1);
  assert.equal(bytes.length,expectedSize);assert.equal(wireSha256(bytes),expectedSha256,'Exact source SHA before archive');
  const header=Buffer.alloc(512);
  const text=(value,offset,length)=>{assert.ok(Buffer.byteLength(value)<=length);header.write(value,offset,length,'ascii');};
  const octal=(value,offset,length)=>text(value.toString(8).padStart(length-1,'0')+'\0',offset,length);
  text('statement.sql',0,100);octal(0o600,100,8);octal(0,108,8);octal(0,116,8);
  octal(bytes.length,124,12);octal(0,136,12);header.fill(0x20,148,156);
  text('0',156,1);text('ustar\0',257,6);text('00',263,2);
  const sum=header.reduce((total,byte)=>total+byte,0);text(sum.toString(8).padStart(6,'0')+'\0 ',148,8);
  const archive=Buffer.concat([header,bytes,Buffer.alloc((512-bytes.length%512)%512),Buffer.alloc(1024)]);
  return {archive,source_sha256:expectedSha256,source_bytes:bytes.length,archive_sha256:wireSha256(archive)};
}

