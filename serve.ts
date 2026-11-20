import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { resolve, relative, isAbsolute, extname, sep } from 'node:path';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portText = portIndex === -1 ? '8080' : args[portIndex + 1];
if (!portText || !/^\d+$/.test(portText)) {
  throw new Error('--port requires an integer between 1 and 65535');
}
const port = Number(portText);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('--port requires an integer between 1 and 65535');
}

const root = await fs.realpath(resolve('game'));
const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function insideRoot(file: string): boolean {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!insideRoot(file)) throw new Error('Path outside game directory');

    // Check the canonical path too, so symlinks cannot expose outside files.
    const canonical = await fs.realpath(file);
    if (!insideRoot(canonical)) throw new Error('Symlink outside game directory');
    const bytes = await fs.readFile(canonical);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': bytes.length,
    });
    response.end(bytes);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
});

server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, () => {
  console.log(`Static game server: http://localhost:${port}/`);
});
