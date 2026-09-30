import http from 'node:http';
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const clients = new Set();
let activeBuild = Promise.resolve(), timer;
await build();
watch(path.join(root, 'content'), { recursive: true }, (_event, filename) => {
  if (filename && !filename.endsWith('.md')) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    activeBuild = activeBuild.then(async () => {
      await build();
      for (const client of clients) client.write('data: reload\n\n');
      console.log('Content saved: rebuilt and refreshed preview.');
    }).catch(error => console.error('Build failed; fix the Markdown and save again:', error.message));
  }, 200);
});
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.webm': 'video/webm', '.zip': 'application/zip', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/official') { res.writeHead(301, { Location: '/official/' }); res.end(); return; }
    pathname = pathname.replace(/^\/official\//, '/');
    if (pathname === '/__preview_events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const target = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!target.startsWith(root + path.sep) || /(?:^|[\\/])(?:node_modules|\.git|\.cache)(?:[\\/]|$)/.test(target)) { res.writeHead(403); res.end(); return; }
    await activeBuild;
    let data = await fs.readFile(target);
    if (path.extname(target) === '.html') {
      // Preview-only reload client; never included in generated/deployed HTML.
      const reload = '<script>new EventSource("/official/__preview_events").onmessage=function(event){if(event.data==="reload")location.reload();};</script>';
      data = Buffer.from(data.toString('utf8').replace('</body>', reload + '</body>'));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/official/`));
