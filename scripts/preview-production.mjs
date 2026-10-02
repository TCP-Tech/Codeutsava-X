// Runs the actual standalone release with a local replacement for Django's counter.
// This helper is outside the release bundle and never connects to the live API.
import { spawn } from 'node:child_process';
import { cp, access } from 'node:fs/promises';
import http from 'node:http';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const standalone = path.join(root, '.next', 'standalone');
await access(path.join(standalone, 'server.js')).catch(() => {
  throw new Error('Build the release first with pnpm build.');
});
await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
await cp(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true });

const port = Number(process.env.PREVIEW_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65534) throw new Error('Invalid PREVIEW_PORT.');
const appPort = port + 1;
const duration = 28 * 3600000;
let counter = { flag: false, startTime: 0, endTime: 0 };
let offline = false;
const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};

const proxy = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  if (pathname === '/_preview/status' && request.method === 'GET') {
    json(response, 200, { mode: 'isolated-production-preview' });
    return;
  }
  // Local fixture only: mirrors unchecking Flag in Django without touching timestamps.
  if (pathname === '/_preview/reset-flag' && request.method === 'POST') {
    counter = { ...counter, flag: false };
    json(response, 200, { data: [counter] });
    return;
  }
  if (pathname.startsWith('/server/')) {
    if (offline) { json(response, 503, { error: 'Local preview counter is offline.' }); return; }
    if (pathname === '/server/getcounter/' && request.method === 'GET') {
      json(response, 200, { data: [counter] });
      return;
    }
    if (pathname === '/server/setcounter/' && request.method === 'POST') {
      if (request.headers.origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(request.headers.origin)) {
        json(response, 403, { error: 'Origin rejected.' }); return;
      }
      try {
        let body = '';
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 4096) { json(response, 413, { error: 'Request too large.' }); return; }
        }
        const next = JSON.parse(body);
        if (counter.flag) { json(response, 409, { error: 'Counter already started.' }); return; }
        if (next.flag !== true || !Number.isSafeInteger(next.startTime) || next.startTime <= 0 || next.endTime - next.startTime !== duration) {
          json(response, 400, { error: 'Expected a 28-hour counter in epoch milliseconds.' }); return;
        }
        counter = { flag: true, startTime: next.startTime, endTime: next.endTime };
        json(response, 200, { data: counter });
      } catch { json(response, 400, { error: 'Invalid JSON.' }); }
      return;
    }
    json(response, 404, { error: 'Unknown local counter route.' });
    return;
  }

  const upstream = http.request({
    hostname: '127.0.0.1', port: appPort, path: request.url,
    method: request.method, headers: request.headers,
  }, (result) => {
    response.writeHead(result.statusCode, result.headers);
    result.pipe(response);
  });
  upstream.setTimeout(60000, () => upstream.destroy(new Error('Preview request timed out.')));
  upstream.on('error', () => {
    if (!response.headersSent) json(response, 502, { error: 'Production preview is starting. Refresh in a moment.' });
    else response.destroy();
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
});
await new Promise((resolve, reject) => {
  proxy.once('error', reject);
  proxy.listen(port, '127.0.0.1', resolve);
});

const app = spawn(process.execPath, [path.join(standalone, 'server.js')], {
  cwd: standalone, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true,
  env: { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(appPort),
    COUNTDOWN_API_BASE_URL: `http://127.0.0.1:${port}/server` },
});
const consoleInput = createInterface({ input: process.stdin, output: process.stdout });
consoleInput.on('line', (line) => {
  switch (line.trim()) {
    case 'reset': counter = { flag: false, startTime: 0, endTime: 0 }; offline = false; break;
    case 'flag-off': counter = { ...counter, flag: false }; break;
    case 'finish': {
      const endTime = Date.now();
      counter = { flag: true, startTime: endTime - duration, endTime };
      break;
    }
    case 'offline': offline = true; break;
    case 'online': offline = false; break;
    default: console.log('Commands: reset, flag-off, finish, offline, online'); return;
  }
  console.log(`Local counter: ${offline ? 'offline' : JSON.stringify(counter)}. Pages sync within five seconds.`);
});
let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  consoleInput.close();
  app.kill();
  proxy.close();
  proxy.closeAllConnections();
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
consoleInput.on('SIGINT', close);
consoleInput.on('close', close);
app.on('error', (error) => { console.error(error); process.exitCode = 1; close(); });
app.on('exit', (code) => { if (!closing) process.exitCode = code ?? 1; close(); });
console.log(`\nProduction preview: http://localhost:${port}/timer`);
console.log('Actual release UI; isolated local counter. Live Django data is untouched.');
console.log('Terminal commands: reset, flag-off, finish, offline, online. Ctrl+C stops both servers.\n');
