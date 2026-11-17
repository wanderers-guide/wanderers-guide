/** One bounded reconciliation; no OAuth exchange is replayed by the scheduler. */
const secret=process.env.WG_PATREON_SYNC_SECRET;
const anon=process.env.WG_MONITOR_ANON_KEY;
if (!secret || !anon) throw new Error('Patreon scheduler credentials are not configured');
try {
  const response=await fetch('https://fdrjqcyjklatdrmjdnys.supabase.co/functions/v1/sync-patreon-memberships',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(150_000),
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${anon}`,apikey:anon,'X-WG-Patreon-Sync':secret},
    body:'{}',
  });
  const result=await response.json();
  if (!response.ok || result?.status!=='success' || !Number.isInteger(result.data?.members) || !Number.isInteger(result.data?.pages))
    throw new Error('Reconciliation failed');
  // Public workflow logs need health, not private campaign membership totals.
  console.log(JSON.stringify({status:'success',checked_at:new Date().toISOString()}));
} catch {
  console.error('Patreon reconciliation failed. Check the creator integration; customer connections were not replaced.');
  process.exitCode=1;
}
