// @ts-ignore
import { serve } from 'std/server';
import {
  connect,
  createServiceClient,
  fetchData,
  getPublicUser,
  upsertData,
  upsertResponseWrapper,
} from '../_shared/helpers.ts';
import type { ContentSource } from '../_shared/content.d.ts';

const BUILD_ID_RE = /^\d+$/;

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
    const { build_id } = body as { build_id?: unknown };

    const buildId = typeof build_id === 'number' ? String(build_id) : typeof build_id === 'string' ? build_id.trim() : '';
    if (!BUILD_ID_RE.test(buildId)) {
      return {
        status: 'fail',
        data: { build_id: 'A numeric Pathbuilder build id is required' },
      };
    }

    const user = await getPublicUser(client, token, { rejectAnonymous: true });
    if (!user) {
      return {
        status: 'error',
        message: 'User not found',
      };
    }

    const sourceUrl = `https://pathbuilder2e.com/app.html?emailedBuildID=${buildId}`;
    const sourceName = `Pathbuilder Custom (build ${buildId})`;
    const serviceClient = createServiceClient();

    // Reuse an existing source for this exact user/build. This makes retries idempotent
    // and prevents a failed character import from leaving an unbounded trail of sources.
    const existing = await fetchData<ContentSource>(serviceClient, 'content_source', [
      { column: 'user_id', value: user.user_id },
      { column: 'url', value: sourceUrl },
    ]);
    if (existing.length > 0) {
      return { status: 'success', data: existing[0] };
    }

    const source = {
      id: -1,
      created_at: '',
      user_id: user.user_id,
      name: sourceName,
      foundry_id: null,
      url: sourceUrl,
      description: 'Custom content carried by a Pathbuilder 2e share link, imported verbatim.',
      operations: [],
      contact_info: '',
      require_key: false,
      keys: null,
      is_published: false,
      artwork_url: '',
      required_content_sources: [],
      group: '',
      meta_data: null,
    } satisfies ContentSource;

    const { procedure, result } = await upsertData<ContentSource>(serviceClient, 'content_source', source);
    return upsertResponseWrapper(procedure, result);
  });
});
