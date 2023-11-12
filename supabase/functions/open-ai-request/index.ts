// @ts-ignore
import { serve } from "std/server";
import { connect } from "../_shared/helpers.ts";

// TODO: This function URL is relatively safe to expose to the public, it's rate limited.
//       However, we should move & change it if any abuse happens.
const AI_FUNCTION_URL = `https://msgback.azurewebsites.net/api/OpenAICompletion?code=JHWQG9lejiCvD2ekya4rSXShGu1mv7DrncxoKF2FLFPbAzFu_ZAxBQ==`;

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { content, model } = body as { content: string; model?: string };

    const res = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        model: model ?? 'gpt-4',
      }),
    });

    if(res.ok) {
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
