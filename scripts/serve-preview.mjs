import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = await fs.realpath(process.cwd());
const output = path.resolve(root, 'out');
if (!output.startsWith(root + path.sep)) throw new Error('Preview output must remain inside the project.');
await fs.access(path.join(output, 'index.html'));
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://cdn.shopify.com data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
function headers(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', csp);
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
}
function json(response, status, payload, method) {
  response.writeHead(status, { 'Content-Type': mime['.json'], 'Cache-Control': 'no-store' });
  response.end(method === 'HEAD' ? undefined : JSON.stringify(payload));
}
const server = http.createServer(async (request, response) => {
  headers(response);
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/cart' && ['GET', 'HEAD'].includes(request.method ?? 'GET')) {
        json(response, 200, { mode: 'development', cart: null }, request.method); return;
      }
      const message = pathname === '/api/forms'
        ? 'This form is not connected in the static development preview. Your submission has not been sent.'
        : 'This is a static development preview. Live checkout, orders and merchant services are unavailable.';
      json(response, 503, { error: { code: pathname === '/api/forms' ? 'FORM_UNCONNECTED' : 'DEVELOPMENT_MODE', message } }, request.method);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' }); response.end(); return;
    }
    let target = path.resolve(output, '.' + pathname);
    if (target !== output && !target.startsWith(output + path.sep)) {
      response.writeHead(403, { 'Cache-Control': 'no-store' }); response.end('Forbidden'); return;
    }
    let status = 200;
    try {
      const stat = await fs.stat(target);
      if (stat.isDirectory()) target = path.join(target, 'index.html');
      const real = await fs.realpath(target);
      if (!real.startsWith(output + path.sep)) throw new Error('Outside export.');
      target = real;
    } catch {
      status = 404;
      target = path.join(output, '404.html');
      try { await fs.access(target); } catch { target = path.join(output, '404', 'index.html'); }
    }
    const body = await fs.readFile(target);
    const extension = path.extname(target).toLowerCase();
    response.writeHead(status, {
      'Content-Type': mime[extension] ?? 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': extension === '.html' || extension === '.txt' ? 'no-store' : pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    if (!response.headersSent) response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('The preview request could not be served.');
  }
});
server.listen(port, '127.0.0.1', () => console.log('buttersalt static development preview: http://127.0.0.1:' + port));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
