import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

const errorNames=new Set(['Error','AssertionError','TypeError','RangeError','SyntaxError','ReferenceError','URIError','EvalError','AggregateError']);
const errnoCodes=new Set(['EACCES','EBADF','EDQUOT','EEXIST','EINTR','EIO','EISDIR','EMFILE','ENFILE','ENOENT','ENOSPC','ENOTDIR','EPIPE','EROFS']);
const ownedDiagnostics=new WeakMap();

function property(error,key) {
  try {return error?.[key];}catch {return undefined;}
}

/** Receipt-safe diagnostics never retain arbitrary text without the fixture's secret redactor. */
export function nativeDiagnostic(error,{summary='Native diagnostic unavailable',redact,remember=false}={}) {
  const object=error!==null&&(typeof error==='object'||typeof error==='function');
  const owned=object?ownedDiagnostics.get(error):undefined;
  const rawName=owned?owned.name:property(error,'name'),rawCode=owned?owned.code:property(error,'code');
  const name=errorNames.has(rawName)?rawName:'Error';
  let message=owned?.message??summary;
  if(typeof redact==='function')try {
    message=summary;
    const rawMessage=owned?owned.message:property(error,'message');
    if(typeof rawMessage==='string') {
      const redacted=redact(rawMessage);if(typeof redacted==='string')message=redacted;
    }
  }catch { /* Retain only the fixed summary when diagnostic redaction itself fails. */ }
  const diagnostic={name,message,...(errnoCodes.has(rawCode)?{code:rawCode}:{})};
  // Alternate exceptions retain their identity and control fields, not another fixture's raw text.
  if(remember&&object)ownedDiagnostics.set(error,Object.freeze({...diagnostic}));
  return diagnostic;
}

/** Complete append-only records; checkpoints drain writes before another owned action. */
export function createNativeReceiptLogger({write,checkpoint,monotonic=()=>performance.now(),timestamp=()=>new Date().toISOString()}) {
  assert.equal(typeof write,'function');assert.equal(typeof checkpoint,'function');
  const started=monotonic();let sequence=0,writes=Promise.resolve();
  function log(row) {
    assert.ok(row&&typeof row==='object'&&!Array.isArray(row));
    const elapsed=monotonic()-started;assert.ok(Number.isFinite(elapsed)&&elapsed>=0);
    const record={...row,log_sequence:++sequence,observed_at:timestamp(),observed_elapsed_ms:elapsed};
    const buffer=Buffer.from(JSON.stringify(record)+'\n','utf8');
    writes=writes.then(async()=>{
      for(let offset=0;offset<buffer.length;) {
        const result=await write(buffer,offset,buffer.length-offset);
        assert.ok(Number.isSafeInteger(result?.bytesWritten)&&result.bytesWritten>0&&result.bytesWritten<=buffer.length-offset,'Complete native log byte writes required');
        offset+=result.bytesWritten;
      }
    });
    void writes.catch(()=>{});return writes;
  }
  return {log,flush:()=>writes,checkpoint:async label=>{
    await checkpoint(label);
    await writes;
    await checkpoint('after log drain: '+label);
  }};
}
