/** Actual creator adapter, synchronizer, paid-access and handler; only external I/O is mocked. */
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(repo+'/frontend/package.json');
const {build}=require('esbuild');
const dir=await mkdtemp(tmpdir()+'/wg-creator-tests-');
after(()=>rm(dir,{recursive:true,force:true}));
const env={PATREON_V2_CLIENT_ID:'v2',PATREON_V2_CLIENT_SECRET:'fixture-secret',PATREON_CREATOR_ENABLED:'true'};
globalThis.Deno={env:{get:key=>env[key]}};
let calls=[],responses=[],operations=[],tokens,failSave=false,observation;
let profileWrites=[], groupRows=[], leaseObservedAt;
const client={from(table){
  assert.equal(table,'public_user');
  return {
    select:(columns,options)=>({eq:async(column)=>{
      if(options?.head)return {count:0,error:null};
      assert.equal(columns,'user_id,display_name');
      assert.equal(column,'patreon->game_master->virtual_tier->>game_master_user_id');
      return {data:groupRows,error:null};
    }}),
    update(body){let id;const query={eq(key,value){if(key==='id')id=value;return query;},is(){return query;},async select(){profileWrites.push(structuredClone(body));return {data:[{id}],error:null};}};return query;},
  };
},async rpc(name,args){
  operations.push({name,args:structuredClone(args)});
  if(name.endsWith('_acquire')){leaseObservedAt=new Date().toISOString();return {data:tokens,error:null};}
  if(name.endsWith('_membership'))return {data:typeof observation==='function'?observation(args.p_user):observation,error:null};
  if(name.endsWith('_save') && failSave)return {error:{message:'private credential in driver error'},data:null};
  return {data:true,error:null};
}};
globalThis.__creatorClient=client;
globalThis.__creatorProfiles=[];
await build({stdin:{contents:`export * from './supabase/functions/_shared/patreon-creator-api.ts'; export * from './supabase/functions/_shared/patreon-creator.ts'; export * from './supabase/functions/_shared/patreon.ts'; export * from './supabase/functions/sync-patreon-memberships/index.ts';`,resolveDir:repo},bundle:true,format:'esm',platform:'node',outfile:dir+'/creator.mjs',plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/^https:\/\/esm.sh\/zod@3/},()=>({path:require.resolve('zod/v3')}));
  b.onResolve({filter:/^lodash$/},()=>({path:require.resolve('lodash-es')}));
  b.onResolve({filter:/^(std\/server|@supabase\/supabase-js|\.\/helpers.ts)$/},a=>({path:a.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const serve=()=>{}; export const createClient=()=>globalThis.__creatorClient; export const logEvent=()=>{}; export const fetchData=async()=>structuredClone(globalThis.__creatorProfiles);`,loader:'js'}));
}}]});
const api=await import(pathToFileURL(dir+'/creator.mjs').href);
function member(id='patron',tiers=['5628112'],attributes={}){return {id:'member-'+id,type:'member',attributes,
  relationships:{user:{data:{id,type:'user'}},campaign:{data:{id:'4805226',type:'campaign'}},currently_entitled_tiers:{data:tiers.map(id=>({id,type:'tier'}))}}};}
function page(members=[member()],next=null,total=members.length){return {data:members,meta:{pagination:{cursors:{next},total}}};}
function setup(...values){
 calls=[];responses=values;operations=[];failSave=false;tokens={client_id:'v2',access_token:'creator',refresh_token:'creator-refresh'};
 profileWrites=[];groupRows=[];globalThis.__creatorProfiles=[];
 observation={enabled:true,available:true,tier:'WANDERER',observed_at:new Date().toISOString()};
 globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});const response=responses.shift();assert(response,'Unexpected provider I/O');if(response instanceof Error)throw response;return response;};
}
const response=body=>Response.json(body);
test('complete creator pagination maps USER IDs and does not send empty sparse fields',async()=>{
 setup(response(page([member('one')],'cursor',2)),response(page([member('two',['22622808'])],null,2)));
 const result=await api.fetchCreatorMemberships('creator');
 assert.equal(result.pages,2);assert.equal(result.members.one.tier,'WANDERER');assert.equal(result.members.two.tier,'GAME-MASTER');
 assert.equal(result.members['member-one'],undefined);assert.equal(result.count,2);
 const query=new URL(calls[1].url).searchParams;assert.equal(query.get('page[cursor]'),'cursor');assert.equal(query.has('fields[user]'),false);
});
test('paid-through cancellation, gifts and trials follow entitled tiers despite billing status',async()=>{
 setup(response(page([member('paid',['5628112'],{patron_status:'former_patron',next_charge_date:null,last_charge_status:'Paid'}),member('trial',['5612688'],{last_charge_status:null}),member('gift',['6299276'],{last_charge_status:null})])));
 const result=await api.fetchCreatorMemberships('creator');
 assert.equal(result.members.paid.tier,'WANDERER');assert.equal(result.members.paid.next_charge_date,null);assert.equal(result.members.trial.tier,'ADVOCATE');assert.equal(result.members.gift.tier,'LEGEND');
});
test('renewal retains member identity; upgrades, downgrades and ended benefits track current tiers',async()=>{
 for(const [ids,tier] of [[['5628112'],'WANDERER'],[['22622808','5628112'],'GAME-MASTER'],[['5612688'],'ADVOCATE'],[[],null]]){
  setup(response(page([member('same-user',ids,{next_charge_date:'2026-12-16T00:00:00Z'})])));
  const result=await api.fetchCreatorMemberships('creator');assert.equal(result.members['same-user'].member_id,'member-same-user');assert.equal(result.members['same-user'].tier,tier);
 }
});
for(const [name,make] of [
 ['missing tiers',()=>{const m=member();delete m.relationships.currently_entitled_tiers;return page([m]);}],
 ['wrong campaign',()=>{const m=member();m.relationships.campaign.data.id='other';return page([m]);}],
 ['duplicate identity',()=>page([member(),{...member(),id:'different-member'}])],
 ['incomplete total',()=>page([member()],null,3)],
 ['unfollowable next URL',()=>({...page(),links:{next:'https://other.invalid/secret'}})],
 ['missing pagination',()=>({data:[member()]})],
])test(`rejects ${name} without publishing`,async()=>{setup(response(make()));await assert.rejects(api.fetchCreatorMemberships('creator'),e=>e.stage==='membership');assert.equal(operations.length,0);});
test('unidentified membership is recorded instead of silently treating other IDs as absent',async()=>{
 const m=member();m.relationships.user.data=null;setup(response(page([m])));assert.equal((await api.fetchCreatorMemberships('creator')).unidentified,true);
});
test('cursor cycle and page failure cannot publish a partial snapshot',async()=>{
 setup(response(page([member('one')],'same',3)),response(page([member('two')],'same',3)));
 await assert.rejects(api.syncCreatorMemberships(client));assert(!operations.some(x=>x.name.endsWith('_publish')));
 setup(response(page([member('one')],'second',3)),new Response('',{status:429}));
 await assert.rejects(api.syncCreatorMemberships(client));assert(!operations.some(x=>x.name.endsWith('_publish')));
});
test('expired creator access refreshes once, persists rotated pair BEFORE next campaign request',async()=>{
 setup(new Response('',{status:401}),response({access_token:'rotated',refresh_token:'rotated-refresh',scope:'identity campaigns.members',expires_in:3600}),response(page()));
 const originalFetch=globalThis.fetch;globalThis.fetch=async(url,init)=>{if(String(url).includes('/members?') && calls.length===2)assert(operations.some(x=>x.name.endsWith('_save')));return originalFetch(url,init);};
 await api.syncCreatorMemberships(client);
 assert.equal(calls.filter(x=>x.url.endsWith('/token')).length,1);const save=operations.find(x=>x.name.endsWith('_save'));
 assert.equal(save.args.p_tokens.refresh_token,'rotated-refresh');assert(save.args.p_tokens.expires_at>Date.now());assert(operations.some(x=>x.name.endsWith('_publish')));
});
test('expiry-aware scheduled refresh runs before access expires',async()=>{
 setup(response({access_token:'rotated',refresh_token:'rotated-refresh',scope:'campaigns.members',expires_in:3600}),response(page()));tokens.expires_at=Date.now()+60_000;
 await api.syncCreatorMemberships(client);assert(calls[0].url.endsWith('/token'));
});
test('failed persistence retries only same save; refresh never replays and snapshot stays unchanged',async()=>{
 setup(new Response('',{status:401}),response({access_token:'rotated',refresh_token:'rotated-refresh',scope:'campaigns.members'}));failSave=true;
 await assert.rejects(api.syncCreatorMemberships(client));assert.equal(calls.length,2);const saves=operations.filter(x=>x.name.endsWith('_save'));assert.equal(saves.length,3);assert.deepEqual(saves[0].args,saves[2].args);assert(!operations.some(x=>x.name.endsWith('_publish')));
});
test('missing member scope still saves rotated credentials, then stops without publication',async()=>{
 setup(new Response('',{status:401}),response({access_token:'rotated',refresh_token:'rotated-refresh',scope:'identity'}));
 await assert.rejects(api.syncCreatorMemberships(client));assert(operations.some(x=>x.name.endsWith('_save')));assert(!operations.some(x=>x.name.endsWith('_publish')));assert.equal(calls.length,2);
});
test('busy or ambiguity-blocked creator does not make provider calls',async()=>{
 setup();tokens=null;await assert.rejects(api.syncCreatorMemberships(client));assert.equal(calls.length,0);
});
test('legacy paid access uses creator observation with zero personal refreshes or writes',async()=>{
 setup();const user={id:1,user_id:'fixture',patreon:{patreon_user_id:'patron',access_token:'old-access',refresh_token:'old-refresh',oauth_scopes:['users'],tier:'ADVOCATE',game_master:{access_code:'unchanged'}}};const before=structuredClone(user);
 assert.equal(await api.hasPatreonAccess(user,2,{throwOnFailure:true}),true);assert.equal(await api.hasPatreonAccess(user,3,{throwOnFailure:true}),false);assert.deepEqual(user,before);assert.equal(calls.length,0);assert(operations.every(x=>x.name.endsWith('_membership')));
});
test('unavailable creator check preserves personal connection and reports temporary outage',async()=>{
 setup();observation={enabled:true,available:false};const user={id:1,user_id:'fixture',patreon:{patreon_user_id:'patron',access_token:'old'}};const before=structuredClone(user);
 await assert.rejects(api.hasPatreonAccess(user,2,{throwOnFailure:true}),e=>e.code==='PATREON_UNAVAILABLE');assert.deepEqual(user,before);assert.equal(calls.length,0);
});
test('accounts outside pilot retain personal verification path',async()=>{
 setup(response({data:{id:'patron',type:'user',attributes:{},relationships:{memberships:{data:[]}}},included:[]}));observation={enabled:false};
 assert.equal(await api.hasPatreonAccess({id:1,user_id:'fixture',patreon:{patreon_user_id:'patron',access_token:'personal'}},2),false);assert.equal(calls.length,1);assert(calls[0].url.includes('/identity?'));
});
test('a fresh personal authorization is not overridden by an older campaign snapshot',async()=>{
 setup();observation={enabled:true,available:true,tier:null,observed_at:'2026-11-16T00:00:00Z'};
 const user={user_id:'fixture',patreon:{patreon_user_id:'patron',oauth_client_id:'v2',tier:'WANDERER',identity_verified_at:'2026-11-16T01:00:00Z'}};
 assert.equal(await api.applyCreatorMembership(client,user),false);assert.equal(user.patreon.tier,'WANDERER');
});
test('personal authorization completed during pagination outranks the scan-start observation',async()=>{
 setup(response(page([member('patron',[])],'next',2)),response(page([member('other')],null,2)));
 const fresh={user_id:'fixture',patreon:{patreon_user_id:'patron',oauth_client_id:'v2',tier:'WANDERER',access_token:'fresh-personal'}};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(...args)=>{const result=await originalFetch(...args);if(calls.length===2)fresh.patreon.identity_verified_at=new Date().toISOString();return result;};
 await api.syncCreatorMemberships(client);
 observation={enabled:true,available:true,tier:null,observed_at:leaseObservedAt};
 assert(Date.parse(fresh.patreon.identity_verified_at)>Date.parse(leaseObservedAt));
 assert.equal(await api.applyCreatorMembership(client,fresh),false);assert.equal(fresh.patreon.tier,'WANDERER');assert.equal(fresh.patreon.access_token,'fresh-personal');
});
test('creator outage preserves the working personal v2 verification path',async()=>{
 setup(response({data:{id:'patron',type:'user',attributes:{},relationships:{memberships:{data:[]}}},included:[]}));
 observation={enabled:true,available:false};
 const user={id:1,user_id:'fixture',patreon:{patreon_user_id:'patron',access_token:'personal',oauth_client_id:'v2'}};
 assert.equal(await api.hasPatreonAccess(user,2,{throwOnFailure:true}),false);assert.equal(calls.length,1);assert(calls[0].url.includes('/identity?'));
});
test('healthy creator-verified GM sponsors a player despite unavailable personal legacy link',async()=>{
 setup();observation=id=>id==='sponsor'?{enabled:true,available:true,tier:'GAME-MASTER',observed_at:new Date().toISOString()}:{enabled:true,available:false};
 globalThis.__creatorProfiles=[{id:2,user_id:'sponsor',patreon:{patreon_user_id:'gm-patron',tier:'GAME-MASTER'}}];
 const player={id:1,user_id:'player',patreon:{patreon_user_id:'unmapped-player',access_token:'personal-unchanged',game_master:{virtual_tier:{game_master_user_id:'sponsor'}}}};
 assert.equal(await api.hasPatreonAccess(player,2,{throwOnFailure:true}),true);
 assert.equal(calls.length,0);assert.equal(profileWrites.length,0);
});
test('creator-confirmed GM downgrade stops virtual benefits and higher tiers are never shared',async()=>{
 setup();globalThis.__creatorProfiles=[{id:2,user_id:'sponsor',patreon:{patreon_user_id:'gm-patron',tier:'GAME-MASTER'}}];
 observation={enabled:true,available:true,tier:'WANDERER',observed_at:new Date().toISOString()};
 const player={id:1,user_id:'player',patreon:{game_master:{virtual_tier:{game_master_user_id:'sponsor'}}}};
 assert.equal(await api.hasPatreonAccess(player,2,{throwOnFailure:true}),false);
 observation.tier='GAME-MASTER';assert.equal(await api.hasPatreonAccess(player,3,{throwOnFailure:true}),false);assert.equal(calls.length,0);
});
test('creator-confirmed GM upgrade can regenerate code without changing personal credentials',async()=>{
 setup();observation={enabled:true,available:true,tier:'GAME-MASTER',observed_at:new Date().toISOString()};
 const gm={id:2,user_id:'sponsor',patreon:{patreon_user_id:'gm-patron',tier:'WANDERER',access_token:'personal-access',refresh_token:'personal-refresh',game_master:{access_code:'old-code'}}};
 globalThis.__creatorProfiles=[gm];
 const result=await api.regenerateGameMasterAccessCode(client,gm);assert.equal(result.status,'SUCCESS');
 assert.equal(profileWrites.length,1);assert.equal(profileWrites[0].patreon.access_token,'personal-access');assert.equal(profileWrites[0].patreon.refresh_token,'personal-refresh');assert.equal(profileWrites[0].patreon.membership_verified_at,undefined);assert.notEqual(profileWrites[0].patreon.game_master.access_code,'old-code');assert.equal(calls.length,0);
});
test('owners can list existing group members across tier changes without leaking member secrets',async()=>{
 setup();groupRows=[{user_id:'member',display_name:'Member',patreon:{access_token:'must-not-escape'}}];
 const gm={user_id:'sponsor',patreon:{patreon_user_id:'gm-patron',tier:'WANDERER'}};
 assert.deepEqual(await api.getAllUsersInGameMasterGroup(gm),[{user_id:'member',display_name:'Member'}]);
 assert.equal(operations.length,0);assert.equal(calls.length,0);assert.equal(profileWrites.length,0);
});
test('player with an unavailable personal link can join a creator-verified GM group',async()=>{
 setup();observation=id=>id==='sponsor'?{enabled:true,available:true,tier:'GAME-MASTER',observed_at:new Date().toISOString()}:{enabled:true,available:false};
 globalThis.__creatorProfiles=[{id:2,user_id:'sponsor',display_name:'Fixture GM',patreon:{patreon_user_id:'gm-patron',tier:'GAME-MASTER',game_master:{access_code:'valid-code'}}}];
 const player={id:1,user_id:'player',patreon:{patreon_user_id:'unmapped-player',tier:'WANDERER',access_token:'personal-unchanged'}};
 const result=await api.addToGameMasterGroup(client,player,'sponsor','valid-code');assert.equal(result.status,'SUCCESS');assert.equal(profileWrites.length,1);assert.equal(profileWrites[0].patreon.access_token,'personal-unchanged');assert.equal(profileWrites[0].patreon.game_master.virtual_tier.game_master_user_id,'sponsor');assert.equal(calls.length,0);
});
test('scheduler rejects missing/wrong capability before acquiring credentials',async()=>{
 setup();env.PATREON_SYNC_SECRET_SHA256='0'.repeat(64);
 for(const secret of ['', 'wrong'.repeat(10)]){const result=await api.handlePatreonSync(new Request('https://fixture.invalid',{method:'POST',headers:{'X-WG-Patreon-Sync':secret}}));assert.equal(result.status,403);}
 assert.equal(operations.length,0);assert.equal(calls.length,0);
});
