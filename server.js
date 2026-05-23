const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const adminKey = process.env.ADMIN_KEY || '';
const albumsPath = path.join(root, 'albums.json');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-key'
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function normalizeAlbum(a = {}) {
  return {
    artist: String(a.artist || ''),
    title: String(a.title || ''),
    genre: String(a.genre || ''),
    year: a.year || '',
    cover: String(a.cover || a.artwork || ''),
    appleMusic: String(a.appleMusic || a.link || ''),
    firstTrackId: String(a.firstTrackId || ''),
    firstTrackUrl: String(a.firstTrackUrl || ''),
    firstTrackName: String(a.firstTrackName || '')
  };
}

function normalizeAlbums(data) {
  const list = Array.isArray(data) ? data : data && data.albums;
  if (!Array.isArray(list)) return [];
  return list.map(normalizeAlbum).filter(a => a.title || a.artist || a.cover || a.appleMusic);
}

async function handleAlbums(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'GET') {
    try {
      const json = await fs.readFile(albumsPath, 'utf8');
      return send(res, 200, json);
    } catch {
      return send(res, 200, JSON.stringify({ updatedAt: new Date().toISOString(), albums: [] }, null, 2));
    }
  }
  if (req.method === 'PUT') {
    if (!adminKey) return send(res, 500, JSON.stringify({ error: 'ADMIN_KEY is not configured' }));
    if (req.headers['x-admin-key'] !== adminKey) return send(res, 403, JSON.stringify({ error: 'Forbidden' }));
    try {
      const payload = JSON.parse(await readBody(req));
      const albums = normalizeAlbums(payload);
      const body = JSON.stringify({ updatedAt: new Date().toISOString(), albums }, null, 2) + '\n';
      await fs.writeFile(albumsPath, body, 'utf8');
      return send(res, 200, body);
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }));
    }
  }
  return send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
}

async function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rawPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(root, rawPath));
  if (!filePath.startsWith(root)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
}

http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/api/albums')) return handleAlbums(req, res);
  return serveFile(req, res);
}).listen(port, () => {
  console.log(`Music coverflow listening on http://localhost:${port}`);
});
