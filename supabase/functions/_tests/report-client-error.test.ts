import { assertEquals } from 'https://deno.land/std@0.203.0/assert/mod.ts';
import { callFunction, stackUnavailable } from './seed.ts';

Deno.test({
  name: 'client diagnostics: fixed anonymous categories are accepted, arbitrary data and oversized bodies are rejected',
  ignore: stackUnavailable(),
  async fn() {
    const report = { code: 'save_failed', surface: 'sheet', release: 'abcdef123', trace_id: crypto.randomUUID() };
    const valid = await callFunction('report-client-error', report);
    assertEquals(valid.body.status, 'success');
    for (const body of [{ ...report, message: 'Private character details' }, { ...report, surface: '/sheet/123' },
      { ...report, code: 'arbitrary code' }, { ...report, release: 'not-a-release' }]) {
      const invalid = await callFunction('report-client-error', body);
      assertEquals(invalid.body.status, 'fail');
    }
    const oversized = await callFunction('report-client-error', { ...report, message: 'x'.repeat(1000) });
    assertEquals(oversized.status, 413);
  },
});
