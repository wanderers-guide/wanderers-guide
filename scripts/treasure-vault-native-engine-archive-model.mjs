import assert from 'node:assert/strict';

/** Fake-model verifier also ensures no links, extra entries or path extensions. */
export function assertStrictStatementArchive(archive,expectedBytes) {
  const bytes=Buffer.from(archive),header=bytes.subarray(0,512);assert.equal(header.length,512);
  const field=(offset,length)=>header.subarray(offset,offset+length).toString('ascii').replace(/\0.*$/s,'');
  assert.equal(field(0,100),'statement.sql');assert.equal(field(100,8),'0000600');
  assert.equal(field(108,8),'0000000');assert.equal(field(116,8),'0000000');
  assert.equal(header[156],0x30);assert.ok(header.subarray(157,257).every(byte=>byte===0),'No link target');
  assert.equal(field(257,6),'ustar');assert.equal(field(263,2),'00');
  assert.ok(header.subarray(265,512).every(byte=>byte===0),'No user/group/prefix/extension');
  const size=Number.parseInt(field(124,12),8);assert.equal(size,expectedBytes.length);
  const checksumHeader=Buffer.from(header);checksumHeader.fill(0x20,148,156);
  assert.equal(Number.parseInt(field(148,8).trim(),8),checksumHeader.reduce((total,byte)=>total+byte,0));
  assert.deepEqual(bytes.subarray(512,512+size),Buffer.from(expectedBytes));
  assert.equal(bytes.length,512+size+(512-size%512)%512+1024);
  assert.ok(bytes.subarray(512+size).every(byte=>byte===0),'Padding and only two zero end blocks');
}
