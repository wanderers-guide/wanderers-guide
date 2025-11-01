// @ts-ignore
import { serve } from 'std/server';
import { connect } from '../_shared/helpers.ts';

// @ts-ignore
const AI_FUNCTION_URL = Deno.env.get('AI_FUNCTION_URL') ?? '';

serve(async (req: Request) => {
  return await connect(req, async (_client, body) => {
    let { content, model } = body as { content: string; model?: string };

    const res = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        model: model ?? 'gpt-4o',
      }),
    });

    if (res.ok) {
      return {
        status: 'success',
        data: await res.text(),
      };
    } else {
      return {
        status: 'error',
        message: 'Too many requests, please try again later.',
      };
    }
  });
});
