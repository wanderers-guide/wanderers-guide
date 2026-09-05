// @ts-ignore
import { serve } from 'std/server';
import { connect } from '../_shared/helpers.ts';
import {
  aiRequest,
  consumeWorkBudget,
  fetchWorkText,
  parseRequest,
  requireWorkUser,
} from '../_shared/costly-requests.ts';
import { HttpError } from '../_shared/http-errors.ts';

serve(async (req: Request) =>
  connect(
    req,
    async (client, body, token) => {
      const user = await requireWorkUser(client, token);
      const { content, model } = parseRequest(aiRequest, body);
      const url = Deno.env.get('AI_FUNCTION_URL');
      if (!url) throw new HttpError(503, 'AI is temporarily unavailable.', 'SERVICE_UNAVAILABLE');
      // Input blocks and the larger model cost more work units. Failed upstream calls
      // keep their reservation because the provider may already have billed them.
      await consumeWorkBudget('ai', user.user_id, Math.ceil(content.length / 4000) * (model === 'gpt-4o' ? 10 : 1));
      const data = await fetchWorkText(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, model }),
      });
      return { status: 'success', data };
    },
    { maxBodyBytes: 256 * 1024 }
  )
);
