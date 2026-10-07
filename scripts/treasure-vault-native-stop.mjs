import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

/** Cooperative stop requests never skip owner-verified finally cleanup. */
export function createNativeStopController({receipt,signals=process}) {
  let requested=null;
  function request(signal) {
    if (!requested) requested={signal,requested_at:new Date().toISOString()};
    receipt.stop_requested=requested;
  }
  const handlers=new Map(['SIGINT','SIGTERM'].map(signal=>[signal,()=>request(signal)]));
  for (const [signal,handler] of handlers) signals.on(signal,handler);
  function throwIfRequested(label='checkpoint') {
    if (!requested) return;
    const error=new Error('Native verification stopped at '+label+' after '+requested.signal);
    error.code='ERR_NATIVE_STOP';error.signal=requested.signal;error.exitCode=requested.signal==='SIGINT'?130:143;
    throw error;
  }
  async function checkpoint(label) {
    assert.equal(typeof label,'string');
    await setImmediate();
    throwIfRequested(label);
  }
  return {
    checkpoint,throwIfRequested,
    get requested(){return requested;},
    close(){for(const [signal,handler] of handlers)signals.off(signal,handler);},
    limits:'Cooperative checkpoints between commands/chunks. A synchronous Docker command cannot be immediately interrupted; its transport timeout remains the hard bound. Cleanup is never cancelled by this controller.',
  };
}

/** An observed late stop cannot become success during mandatory finally work. */
export async function finalizeNativeStopReceipt({receipt,stop}) {
  let failure;
  try {await stop.checkpoint('final receipt serialization');}
  catch (error) {failure=error;}
  if (!stop.requested) {
    if (failure) throw failure;
    return null;
  }
  assert.equal(failure?.code,'ERR_NATIVE_STOP');
  assert.ok(['SIGINT','SIGTERM'].includes(failure.signal));
  assert.equal(failure.signal,stop.requested.signal);
  assert.equal(failure.exitCode,failure.signal==='SIGINT'?130:143);
  receipt.passed=false;
  receipt.full_native_execution_complete=false;
  if('release_native_execution_complete' in receipt)receipt.release_native_execution_complete=false;
  receipt.late_stop={phase:'final receipt serialization',name:failure.name,code:failure.code,signal:failure.signal,exit_code:failure.exitCode,requested_at:stop.requested.requested_at,message:failure.message};
  receipt.failure??=receipt.late_stop;
  return failure.exitCode;
}
