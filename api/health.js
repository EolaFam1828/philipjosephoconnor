import { checkBlobHealth } from '../lib/blob.js';
import { checkRedisHealth } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var redis = await checkRedisHealth();
  var blob = await checkBlobHealth();
  var adminTokenConfigured = !!process.env.ADMIN_TOKEN;
  var ok = redis.ok && blob.ok && adminTokenConfigured;

  return res.status(ok ? 200 : 503).json({
    ok: ok,
    timestamp: new Date().toISOString(),
    adminTokenConfigured: adminTokenConfigured,
    storage: {
      redis: redis,
      blob: blob
    }
  });
}