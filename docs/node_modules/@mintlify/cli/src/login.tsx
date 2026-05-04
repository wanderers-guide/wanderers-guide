import { input, search } from '@inquirer/prompts';
import { addLog, ErrorLog, InfoLog, SuccessLog } from '@mintlify/previewing';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import open from 'open';
import {
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';

import { startCallbackServer } from './callbackServer.js';
import { setConfigValue } from './config.js';
import { DASHBOARD_URL, STYTCH_CLIENT_ID, TOKEN_ENDPOINT } from './constants.js';
import { storeCredentials } from './keyring.js';
import { getCliSubdomains } from './status.js';
import { trackLoginAttempt, trackLoginFailed, trackLoginSuccess } from './telemetry/track.js';

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  request_id: string;
  status_code: number;
}

export async function login(): Promise<void> {
  const codeVerifier = randomPKCECodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
  const nonce = randomNonce();
  const clientState = randomState();

  const state = Buffer.from(JSON.stringify({ nonce, clientState })).toString('base64url');

  const authorizeUrl = new URL('/api/cli/oauth/authorize', DASHBOARD_URL);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  const url = authorizeUrl.toString();

  void trackLoginAttempt();

  const { codePromise, close: closeServer } = await startCallbackServer();

  addLog(
    <Box flexDirection="column" gap={1} paddingY={1}>
      <Text bold>
        <Text color="green">◆ </Text>A browser window will open for Mintlify authentication
      </Text>
      <Box flexDirection="column" paddingLeft={3} gap={1}>
        <Text dimColor>If your browser doesn't open automatically, copy this URL:</Text>
        <Text dimColor>{url}</Text>
      </Box>
    </Box>
  );

  open(url).catch(() => {});

  addLog(
    <Box flexDirection="column" paddingLeft={1} marginTop={1}>
      <Text dimColor>╭─ Paste the authorization code from your browser</Text>
      <Text dimColor>│</Text>
    </Box>
  );

  // Let ink finish rendering before inquirer takes over stdout
  await new Promise((resolve) => setTimeout(resolve, 50));

  const inputPromise = input({
    message: '█',
    theme: {
      prefix: chalk.dim(' │'),
      style: {
        answer: (text: string) => chalk.cyan(text),
      },
    },
  });

  let code: string;
  try {
    code = await Promise.race([codePromise, inputPromise]);
  } catch {
    closeServer();
    inputPromise.cancel();
    addLog(<ErrorLog message="login cancelled" />);
    return;
  }

  closeServer();
  inputPromise.cancel();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STYTCH_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: `${DASHBOARD_URL}/api/cli/oauth/callback`,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const reason = body.error_message ?? body.error ?? 'unknown error';
    void trackLoginFailed(reason);
    addLog(<ErrorLog message={`login failed: ${reason}`} />);
    return;
  }

  const token = body as TokenResponse;
  await storeCredentials(token.access_token, token.refresh_token);
  void trackLoginSuccess();
  addLog(<SuccessLog message="logged in successfully" />);
  await promptSubdomainSelection(token.access_token);
}

function isPromptCancellationError(error: unknown): boolean {
  return error instanceof Error && error.name === 'ExitPromptError';
}

async function promptSubdomainSelection(accessToken: string): Promise<void> {
  const subdomains = await getCliSubdomains(accessToken);
  if (subdomains.length === 0) return;

  if (subdomains.length === 1) {
    await setConfigValue('subdomain', subdomains[0]!);
    addLog(<InfoLog message={`default project set to ${subdomains[0]}`} />);
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 50));

  let chosen: string;
  try {
    chosen = await search<string>({
      message: 'Select a default project',
      source: (term) => {
        const results = term
          ? subdomains.filter((s) => s.toLowerCase().includes(term.toLowerCase()))
          : subdomains;
        return results.map((s) => ({ name: s, value: s }));
      },
    });
  } catch (error) {
    if (isPromptCancellationError(error)) {
      addLog(
        <InfoLog
          message={`No project set. To set a default project, run ${chalk.bold('mintlify config set subdomain <subdomain>')}`}
        />
      );
      return;
    }
    throw error;
  }

  await setConfigValue('subdomain', chosen);
  addLog(<InfoLog message={`default project set to ${chosen}`} />);
}
