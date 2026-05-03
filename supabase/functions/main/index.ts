import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

console.log('main function started');

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const serviceName = pathParts[0];

  if (!serviceName) {
    return new Response(JSON.stringify({ msg: 'missing function name in request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const servicePath = `/home/deno/functions/${serviceName}`;

  try {
    const envVarsObj = Deno.env.toObject();
    const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]);

    // @ts-ignore - EdgeRuntime is injected by the supabase/edge-runtime
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb: 256,
      workerTimeoutMs: 5 * 60 * 1000,
      noModuleCache: false,
      importMapPath: '/home/deno/functions/import_map.json',
      envVars,
    });

    return await worker.fetch(req);
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ msg: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
