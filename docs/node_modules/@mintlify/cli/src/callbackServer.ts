import { CALLBACK_PORT, DASHBOARD_URL } from './constants.js';

export async function startCallbackServer(): Promise<{
  codePromise: Promise<string>;
  close: () => void;
}> {
  const { default: http } = await import('http');

  let resolveCode: (code: string) => void;
  let rejectCode: (err: Error) => void;
  let closed = false;

  const codePromise = new Promise<string>((res, rej) => {
    resolveCode = res;
    rejectCode = rej;
  });

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', DASHBOARD_URL);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const { code } = JSON.parse(body) as { code: string };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          closed = true;
          server.close();
          resolveCode(code);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'invalid body' }));
        }
      });
    } else {
      res.writeHead(405);
      res.end();
    }
  });

  server.listen(CALLBACK_PORT, 'localhost');

  const close = () => {
    if (!closed) {
      closed = true;
      server.close();
      rejectCode(new Error('Login cancelled'));
    }
  };

  return { codePromise, close };
}
