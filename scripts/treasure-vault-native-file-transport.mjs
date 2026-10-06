import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,lstatSync,realpathSync,unlinkSync,rmdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {nativeDiagnostic} from './treasure-vault-native-diagnostics.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Fixed transport program only. SQL is solely the copied regular file, never
// a shell argument, stdin, command substitution, or added psql framing.
const GROUPED_NATIVE_FILE_SCRIPT=`if [ "$#" -ne 5 ]; then printf '%s\\n' 'Native file transport setup failed: arguments' >&2; exit 92; fi
mode=$1; directory=$2; file=$3; expected=$4; login=$5
case "$mode" in run|cleanup) ;; *) printf '%s\\n' 'Native file transport setup failed: mode' >&2; exit 92 ;; esac
case "$directory" in /tmp/wg-tv-native-sql-??????) ;; *) printf '%s\\n' 'Native file transport setup failed: directory' >&2; exit 92 ;; esac
if [ "$file" != "$directory/statement.sql" ]; then printf '%s\\n' 'Native file transport setup failed: file' >&2; exit 92; fi
case "$login" in postgres|supabase_admin) ;; *) printf '%s\\n' 'Native file transport setup failed: login' >&2; exit 92 ;; esac
cleanup() {
  original=$?
  trap - 0 HUP INT TERM
  failed=0
  removed=$(rm -f -- "$file" 2>&1; code=$?; printf x; exit "$code") || failed=1
  [ "$removed" = x ] || failed=1
  emptied=$(rmdir -- "$directory" 2>&1; code=$?; printf x; exit "$code") || failed=1
  [ "$emptied" = x ] || failed=1
  if [ "$failed" -ne 0 ]; then printf '%s\\n' 'Native file transport cleanup failed' >&2; exit 91; fi
  exit "$original"
}
trap cleanup 0
trap 'printf "%s\\n" "Native file transport interrupted" >&2; exit 92' HUP INT TERM
if [ "$mode" = cleanup ]; then exit 0; fi
for utility in sha256sum psql rm rmdir; do
  if ! command -v "$utility" >/dev/null 2>&1; then printf '%s\\n' 'Native file transport setup failed: utility' >&2; exit 92; fi
done
if [ ! -d "$directory" ] || [ -L "$directory" ] || [ ! -f "$file" ] || [ -L "$file" ]; then
  printf '%s\\n' 'Native file transport setup failed: regular file' >&2; exit 92
fi
if actual=$(sha256sum -- "$file" 2>&1; code=$?; printf x; exit "$code"); then
  expected_output=$(printf '%s\\nx' "$expected  $file")
  if [ "$actual" != "$expected_output" ]; then printf '%s\\n' 'Native file transport digest failed' >&2; exit 90; fi
else
  printf '%s\\n' 'Native file transport digest failed' >&2; exit 90
fi
psql -U "$login" -d postgres -X -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -f "$file"
native=$?
exit "$native"
`;
const GROUPED_NATIVE_FILE_SCRIPT_SHA256=sha(Buffer.from(GROUPED_NATIVE_FILE_SCRIPT,'utf8'));

/** Synchronous exact-file API with one fixed verify/execute/cleanup program. */
export function createNativeFileSqlTransport({getOwnedDatabaseId,docker,cleanupTransport,redact,record=()=>{}}) {
  for(const callback of [getOwnedDatabaseId,docker,cleanupTransport,redact,record])assert.equal(typeof callback,'function');
  return function sql(statement,allowFailure=false,login='postgres') {
    assert.equal(typeof statement,'string');assert.equal(typeof allowFailure,'boolean');
    assert.ok(['postgres','supabase_admin'].includes(login),'Only existing fixture logins');
    const bytes=Buffer.from(statement,'utf8');assert.equal(bytes.toString('utf8'),statement,'Lossless UTF8 SQL');
    const containerId=getOwnedDatabaseId();assert.match(containerId,/^[a-f0-9]{64}$/);
    const evidence={sql_sha256:sha(bytes),sql_bytes:bytes.length,login,stdin_attached:false,sql_framing_added:false,
      grouped_script_sha256:GROUPED_NATIVE_FILE_SCRIPT_SHA256,copied_bytes_verified:false,temporary_files_cleaned:false,
      remote_cleanup_completed:false,remote_allocation_attempted:false,remote_path_verified:false,possible_unknown_remote_allocation:false,
      group_dispatch_attempted:false,post_group_ownership_verified:false,commands:[],
      scope:'SQL byte/transport evidence only; not guard/migration proof.'};
    let localDirectory=null,localFile=null,remoteDirectory=null,remoteFile=null,allocationAttempted=false,groupAttempted=false,result=null,failure=null;
    const cleanupFailures=[];
    function command(kind,args) {
      assert.equal(getOwnedDatabaseId(),containerId,'Same positively verified owned container before every action');
      // A refused pre-dispatch identity/stop check is not an unknown execution.
      if(kind==='grouped-verify-execute-cleanup')groupAttempted=true;
      const value=docker(args,undefined,true);
      if(kind==='grouped-verify-execute-cleanup'){
        result=value;evidence.raw_grouped_status=value.status;evidence.raw_grouped_signal=value.signal;
      }
      evidence.commands.push({kind,status:value.status,signal:value.signal,no_transport_error:value.error==null});
      assert.equal(value.error==null,true,kind+': transport failure is not a PostgreSQL rejection');
      assert.equal(value.signal,null,kind+': terminated command cannot qualify');
      assert.ok(Number.isInteger(value.status),kind+': an actual exit status is required');
      return value;
    }
    function successful(kind,args) {
      const value=command(kind,args);assert.equal(value.status,0,kind+': '+redact(value.stderr));return value;
    }
    function grouped(mode) {
      assert.ok(['run','cleanup'].includes(mode));assert.match(remoteDirectory,/^\/tmp\/wg-tv-native-sql-[a-zA-Z0-9]{6}$/);
      assert.equal(remoteFile,remoteDirectory+'/statement.sql');
      return ['exec',containerId,'/bin/sh','-c',GROUPED_NATIVE_FILE_SCRIPT,'wg-tv-native-file',mode,remoteDirectory,remoteFile,sha(bytes),login];
    }
    function cleanup(action) {try{action();}catch(error){cleanupFailures.push(error);}}
    try {
      localDirectory=mkdtempSync(join(realpathSync(tmpdir()),'wg-tv-native-sql-'));
      const directoryStat=lstatSync(localDirectory);assert.ok(directoryStat.isDirectory()&&!directoryStat.isSymbolicLink());
      assert.equal(directoryStat.mode&0o777,0o700);localFile=join(localDirectory,'statement.sql');
      writeFileSync(localFile,bytes,{flag:'wx',mode:0o600});
      const fileStat=lstatSync(localFile);assert.ok(fileStat.isFile()&&!fileStat.isSymbolicLink());
      assert.equal(fileStat.mode&0o777,0o600);assert.deepEqual(readFileSync(localFile),bytes);
      allocationAttempted=true;
      const allocated=successful('allocate-private-remote-directory',['exec',containerId,'mktemp','-d','/tmp/wg-tv-native-sql-XXXXXX']);
      const path=allocated.stdout.endsWith('\n')?allocated.stdout.slice(0,-1):allocated.stdout;
      assert.match(path,/^\/tmp\/wg-tv-native-sql-[a-zA-Z0-9]{6}$/,'One exact newly allocated remote directory');
      remoteDirectory=path;remoteFile=remoteDirectory+'/statement.sql';
      const beforeCopyDirectory=lstatSync(localDirectory),beforeCopyFile=lstatSync(localFile);
      assert.ok(beforeCopyDirectory.isDirectory()&&!beforeCopyDirectory.isSymbolicLink());assert.equal(beforeCopyDirectory.mode&0o777,0o700);
      assert.ok(beforeCopyFile.isFile()&&!beforeCopyFile.isSymbolicLink());assert.equal(beforeCopyFile.mode&0o777,0o600);
      assert.deepEqual(readFileSync(localFile),bytes,'Exact private source bytes immediately before copying');
      successful('copy-exact-local-file',['cp',localFile,containerId+':'+remoteFile]);
      result=command('grouped-verify-execute-cleanup',grouped('run'));
      // CLI 1/2 can fail before the shell starts, so even a clean process exit
      // cannot prove its trap ran. Other ambiguous exits remain unknown too.
      evidence.remote_cleanup_completed=[0,3,90].includes(result.status);
      assert.ok(![90,91,92].includes(result.status),'Reserved grouped transport failure: '+redact(result.stderr));
      evidence.copied_bytes_verified=[0,3].includes(result.status);
      assert.ok([0,3].includes(result.status),'Only actual psql success or ON_ERROR_STOP script-error may qualify');
      evidence.raw_sql_status=result.status;evidence.raw_sql_signal=result.signal;
      // This is a fresh read-only closure, not cached metadata or stop authority.
      // The next actual asynchronous checkpoint still vetoes a requested stop.
      cleanupTransport(()=>{
        assert.equal(getOwnedDatabaseId(),containerId,'Same positively verified owned container after grouped execution');
        evidence.post_group_ownership_verified=true;
      });
      if(!allowFailure)assert.equal(result.status,0,'File psql must succeed: '+redact(result.stderr));
    } catch(error) {
      failure=error;
      // Keep ambiguous raw exits available without serializing full SQL output.
      if(result&&Object.isExtensible(error))Object.defineProperty(error,'rawTransportResult',{value:result,enumerable:false});
    }
    finally {
      // No retry after grouped execution. Before execution, this same fixed
      // program may only remove an exact known path after a failed copy/setup.
      cleanup(()=>cleanupTransport(()=>{
        if(remoteDirectory&&!groupAttempted){
          successful('cleanup-known-unexecuted-file',grouped('cleanup'));evidence.remote_cleanup_completed=true;
        }
      }));
      cleanup(()=>{
        if(localFile&&existsSync(localFile)){
          const stat=lstatSync(localFile);assert.ok(stat.isFile()&&!stat.isSymbolicLink());unlinkSync(localFile);
        }
      });
      cleanup(()=>{if(localDirectory)rmdirSync(localDirectory);});
      evidence.remote_allocation_attempted=allocationAttempted;evidence.remote_path_verified=remoteDirectory!==null;
      evidence.group_dispatch_attempted=groupAttempted;
      evidence.possible_unknown_remote_allocation=allocationAttempted&&remoteDirectory===null;
      evidence.temporary_files_cleaned=cleanupFailures.length===0&&!evidence.possible_unknown_remote_allocation&&(!remoteDirectory||evidence.remote_cleanup_completed);
      evidence.cleanup_errors=cleanupFailures.map(error=>nativeDiagnostic(error,{redact,summary:'Native file-transport cleanup diagnostic unavailable'}));
      evidence.passed=failure===null&&cleanupFailures.length===0;record(evidence);
    }
    if(cleanupFailures.length)throw new AggregateError([...(failure?[failure]:[]),...cleanupFailures],'Exact file-transport cleanup failed; no SQL result may qualify');
    if(failure)throw failure;
    return result;
  };
}
