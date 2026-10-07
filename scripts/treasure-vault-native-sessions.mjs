import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';

const q=value=>"'"+String(value).replaceAll("'","''")+"'";

/** Persistent owned psql sessions. Construction has no process or SQL effects. */
export function createOwnedNativeSessions({assertOwned,spawnPsql,queryJson,cleanupAssertOwned,cleanupQueryJson,redact,throwIfRequested,receipt}) {
  for(const callback of [assertOwned,spawnPsql,queryJson,cleanupAssertOwned,cleanupQueryJson,redact,throwIfRequested])assert.equal(typeof callback,'function');
  const sessions=new Set();
  async function openSession({label}) {
    assert.equal(typeof label,'string');assertOwned();throwIfRequested('open owned SQL session');
    const applicationName='wg-native-session-'+randomUUID(),child=spawnPsql();
    let pid=null,pending=null,closed=false,closing=false,aborted=false,closePromise=null,carry='',stderrWithoutRequest='';
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    let resolveClosed;const didClose=new Promise(resolve=>{resolveClosed=resolve;});
    const identity={label,application_name:applicationName,pid:null};
    (receipt.owned_sessions??=[]).push(identity);
    function finishTimers(request){clearTimeout(request.timer);clearInterval(request.stopTimer);}
    function transportError(error) {
      aborted=true;
      const wrapped=new Error('Owned psql transport error, not an expected SQL guard: '+redact(error.message),{cause:error});
      wrapped.code='ERR_NATIVE_SQL_TRANSPORT';
      if(pending){const request=pending;pending=null;finishTimers(request);wrapped.native_result={status:null,signal:null,stdout:redact(request.stdout.join('\n')),stderr:redact(request.stderr)};request.reject(wrapped);}
      else identity.transport_error=wrapped.message;
    }
    child.on('error',transportError);child.stdin.on('error',transportError);
    child.stdout.on('data',chunk=>{
      carry+=chunk.toString('utf8');
      for(;;) {
        const end=carry.indexOf('\n');if(end<0)break;
        const line=carry.slice(0,end).replace(/\r$/,'');carry=carry.slice(end+1);
        if(!pending){if(line)identity.unexpected_stdout=redact(line);continue;}
        if(line===pending.marker) {
          const request=pending;pending=null;finishTimers(request);
          request.resolve({status:0,signal:null,stdout:request.stdout.join('\n'),stderr:request.stderr,ready:true,pid});
        } else pending.stdout.push(line);
      }
    });
    child.stderr.on('data',chunk=>{
      const text=chunk.toString('utf8');
      if(pending)pending.stderr+=text;else stderrWithoutRequest+=text;
    });
    child.on('close',(status,signal)=>{
      closed=true;identity.close_status=status;identity.close_signal=signal;
      if(pending) {
        const request=pending;pending=null;finishTimers(request);
        const result={status,signal,stdout:request.stdout.join('\n')+(carry?'\n'+carry:''),stderr:request.stderr+stderrWithoutRequest,ready:false,pid};
        if(status===0)request.reject(new Error('Owned psql exited without consuming the request completion marker'));
        else if(request.allowFailure)request.resolve(result);
        else request.reject(new Error('Owned SQL failed: '+redact(result.stderr)));
      }
      resolveClosed({status,signal});
    });
    async function run(sql,{allowFailure=false,deadlineMs=30000}={}) {
      assert.equal(typeof sql,'string');assert.equal(typeof allowFailure,'boolean');
      assert.ok(Number.isSafeInteger(deadlineMs)&&deadlineMs>0&&deadlineMs<=660000);
      assert.equal(aborted,false,'A failed/deadline-aborted transport cannot later qualify as SQL success');
      assert.equal(pending,null,'One actual request at a time per session');
      assert.equal(closed,false,'Actual psql session remains connected');(closing?cleanupAssertOwned:assertOwned)();
      if(!closing)throwIfRequested('owned SQL request '+label);
      const marker='__wg_native_ready_'+randomUUID().replaceAll('-','');
      assert.equal(sql.includes(marker),false);
      return new Promise((resolve,reject)=>{
        function interrupted(error) {
          if(!pending||pending.marker!==marker)return;
          const request=pending;pending=null;aborted=true;finishTimers(request);
          error.native_result={status:null,signal:null,stdout:redact(request.stdout.join('\n')),stderr:redact(request.stderr)};
          reject(error);child.kill('SIGTERM');
        }
        const timer=setTimeout(()=>{
          const error=new Error('Owned SQL request exceeded its transport deadline; this is not native55P03');
          error.code='ERR_NATIVE_SQL_DEADLINE';interrupted(error);
        },deadlineMs);
        const stopTimer=setInterval(()=>{if(!closing)try{throwIfRequested('pending owned SQL '+label);}catch(error){interrupted(error);}},100);
        pending={marker,stdout:[],stderr:'',timer,stopTimer,resolve,reject,allowFailure};
        child.stdin.write(sql+'\n\\echo '+marker+'\n',error=>{if(error)transportError(error);});
      });
    }
    async function backendPresent() {
      cleanupAssertOwned();
      return cleanupQueryJson(`select to_jsonb(exists(select 1 from pg_catalog.pg_stat_activity where ${pid==null?'':`pid=${pid} and `}datname=current_database() and application_name=${q(applicationName)}));`);
    }
    async function closeOwned({rollback=true}={}) {
      assert.equal(typeof rollback,'boolean');closing=true;
      try {
        if(!closed&&!pending&&!aborted&&rollback)await run('rollback;',{deadlineMs:30000});
        if(!closed&&(pending||aborted)) {
          cleanupAssertOwned();
          if(pid!=null)cleanupQueryJson(`select to_jsonb(coalesce((select pg_catalog.pg_cancel_backend(pid) from pg_catalog.pg_stat_activity where pid=${pid} and datname=current_database() and application_name=${q(applicationName)}),false));`);
          else child.kill('SIGTERM'); // Unidentified failed startup: only this owned child, never guessed backend IDs.
        }
        if(!closed&&!child.stdin.destroyed)child.stdin.end('\\q\n');
        const deadline=new Promise((_,reject)=>{
          const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('Owned psql close exceeded deadline'));},30000);
          didClose.then(()=>clearTimeout(timer));
        });
        await Promise.race([didClose,deadline]);
        if(await backendPresent()) {
          assert.ok(pid>0,'Only a positively identified PID may be terminated');
          cleanupQueryJson(`select to_jsonb(coalesce((select pg_catalog.pg_terminate_backend(pid) from pg_catalog.pg_stat_activity where pid=${pid} and datname=current_database() and application_name=${q(applicationName)}),false));`);
          const until=Date.now()+5000;
          while(await backendPresent()) {assert.ok(Date.now()<until,'The exact owned backend must disappear within the bounded observation');await pause(50);}
        }
        assert.equal(closed,true);identity.backend_gone=pid!=null;
        identity.application_name_absent=true;
        if(pid==null)identity.backend_identity_limit='Startup failed before PID readback; unique application name absence and client closure only, never accepted native family evidence.';
        sessions.delete(session);
      } catch(error) {identity.cleanup_error=redact(error.message);throw error;}
    }
    async function close(options={rollback:true}) {
      if(closePromise)return closePromise;
      // A failed close remains tracked and may be retried by fixture disposal.
      closePromise=closeOwned(options);
      try{return await closePromise;}catch(error){closePromise=null;throw error;}
    }
    const session={get pid(){return pid;},run,close};sessions.add(session);
    try {
      const initial=await run(`set application_name=${q(applicationName)};select jsonb_build_object('pid',pg_backend_pid(),'application_name',current_setting('application_name'));`);
      assert.equal(initial.ready,true);const row=JSON.parse(initial.stdout.trim());
      assert.ok(Number.isSafeInteger(row.pid)&&row.pid>0);assert.equal(row.application_name,applicationName);
      pid=row.pid;identity.pid=pid;
      return session;
    } catch(error) {
      try{await close({rollback:false});}catch(cleanupError){error.session_cleanup_error=redact(cleanupError.message);identity.startup_error=redact(error.message);}
      throw error;
    }
  }
  async function closeAll() {
    const failures=[];
    for(const session of [...sessions])try{await session.close({rollback:true});}catch(error){failures.push(redact(error.message));}
    assert.deepEqual(failures,[],'All identified owned SQL sessions must close before container disposal');
  }
  return {openSession,closeAll};
}
