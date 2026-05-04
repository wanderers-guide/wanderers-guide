import { PostHog } from 'posthog-node';

const TELEMETRY_ASYNC_TIMEOUT_MS = 10_000;

const POSTHOG_API_KEY = 'phc_eNuN6Ojnk9O7uWfC17z12AK85fNR0BY6IiGVy0Gfwzw';
const POSTHOG_HOST = 'https://ph.mintlify.com';

let client: PostHog | null = null;

export function getPostHogClient(): PostHog {
  if (!client) {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
  }
  return client;
}

export async function shutdownPostHog(): Promise<void> {
  if (!client) return;
  try {
    await Promise.race([
      client.shutdown(),
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, TELEMETRY_ASYNC_TIMEOUT_MS);
        t.unref();
      }),
    ]);
  } catch {}
  client = null;
}
