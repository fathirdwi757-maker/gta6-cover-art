// A small static file server for trying the studio locally.
//
//   node serve.ts              serves app/ at the default address
//   node serve.ts --port 8091  serves it on another port
//
// It answers with the content types an offline web app needs, refuses every
// path that climbs out of app/, and logs each request so screenshot runs can
// see what the browser asked for. Node 22, standard library only; it is a
// development convenience, never part of the entry the judge reads.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function chosenPort(): number {
  const flagAt = process.argv.indexOf('--port');
  const value = flagAt === -1 ? 8080 : Number(process.argv[flagAt + 1]);
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : 8080;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

const server = createServer((request, response) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = resolve(join(appDir, normalize(pathname)));
  if (target !== appDir && !target.startsWith(appDir + sep)) {
    console.error(`403 ${pathname}`);
    response.writeHead(403).end('forbidden');
    return;
  }
  let length: number;
  try {
    const stats = statSync(target);
    if (!stats.isFile()) throw new Error('directory');
    length = stats.size;
  } catch {
    console.error(`404 ${pathname}`);
    response.writeHead(404).end('not found');
    return;
  }
  console.log(`200 ${pathname}`);
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': length,
    'cache-control': 'no-store',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(target).pipe(response);
});

server.listen(chosenPort(), '127.0.0.1', () => {
  console.log(`Neon Horizon Cover Studio is open at http://localhost:${chosenPort()}`);
});
