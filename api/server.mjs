import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const resources = new Map([
  ['paywalls', 'paywalls.json'],
  ['flows', 'flows.json'],
  ['pricing-rules', 'pricing-rules.json'],
  ['assignments', 'assignments.json'],
  ['metrics', 'metrics.json'],
  ['purchases', 'purchases.json']
]);

async function readJson(resource) {
  const file = resources.get(resource);
  if (!file) throw Object.assign(new Error('Unknown resource'), { status: 404 });
  const body = await fs.readFile(path.join(dataDir, file), 'utf8');
  return JSON.parse(body || '[]');
}

async function writeJson(resource, data) {
  const file = resources.get(resource);
  if (!file) throw Object.assign(new Error('Unknown resource'), { status: 404 });
  const target = path.join(dataDir, file);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(tmp, target);
}

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function idFor(resource) {
  return `${resource}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const url = new URL(req.url ?? '/', 'http://localhost');
    const [, api, resource, id, action] = url.pathname.split('/');
    if (api !== 'api' || !resource) return send(res, 404, { error: 'Not found' });

    const collection = await readJson(resource);
    if (req.method === 'GET') {
      if (!id) return send(res, 200, collection);
      const item = collection.find((entry) => entry.id === id);
      return item ? send(res, 200, item) : send(res, 404, { error: 'Not found' });
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const item = { id: body.id ?? idFor(resource), ...body, createdAt: body.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
      collection.push(item);
      await writeJson(resource, collection);
      return send(res, 201, item);
    }

    const index = collection.findIndex((entry) => entry.id === id);
    if (index === -1) return send(res, 404, { error: 'Not found' });

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await parseBody(req);
      const previous = collection[index];
      let next = req.method === 'PUT' ? { ...body, id } : { ...previous, ...body };
      if (resource === 'paywalls' && action === 'rollback') {
        const selected = previous.versions?.find((version) => version.version === body.version);
        if (!selected) return send(res, 400, { error: 'Version not found' });
        const newVersion = (previous.currentVersion ?? 1) + 1;
        next = {
          ...previous,
          status: 'draft',
          layout: selected.layout,
          currentVersion: newVersion,
          versions: [...(previous.versions ?? []), { version: newVersion, createdAt: new Date().toISOString(), note: `Rollback to v${body.version}`, layout: selected.layout, status: 'draft' }]
        };
      }
      collection[index] = { ...next, updatedAt: new Date().toISOString() };
      await writeJson(resource, collection);
      return send(res, 200, collection[index]);
    }

    if (req.method === 'DELETE') {
      const [removed] = collection.splice(index, 1);
      await writeJson(resource, collection);
      return send(res, 200, removed);
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    send(res, error.status ?? 500, { error: error.message });
  }
}).listen(process.env.PORT ?? 8787, () => {
  console.log(`Game Module API listening on http://localhost:${process.env.PORT ?? 8787}`);
});
