import { createClient } from 'redis';
import { del } from '@vercel/blob';

async function getRedis() {
  var client = createClient({ url: process.env.KV_URL });
  await client.connect();
  return client;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check admin token
  var token = req.query.token || (req.body && req.body.token);
  var adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var redis;
  try {
    redis = await getRedis();

    // GET — list data
    if (req.method === 'GET') {
      var action = req.query.action;

      if (action === 'pending') {
        var raw = await redis.get('guestbook_pending');
        return res.status(200).json(raw ? JSON.parse(raw) : []);
      }

      if (action === 'approved') {
        var raw = await redis.get('guestbook_approved');
        return res.status(200).json(raw ? JSON.parse(raw) : []);
      }

      if (action === 'photos') {
        var raw = await redis.get('gallery_photos');
        return res.status(200).json(raw ? JSON.parse(raw) : []);
      }

      return res.status(400).json({ error: 'Unknown action. Use: pending, approved, photos' });
    }

    // POST — approve, reject, delete
    if (req.method === 'POST') {
      var body = req.body;

      if (body.action === 'approve' && body.id) {
        var rawP = await redis.get('guestbook_pending');
        var pending = rawP ? JSON.parse(rawP) : [];
        var idx = pending.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
        var entry = pending.splice(idx, 1)[0];
        var rawA = await redis.get('guestbook_approved');
        var approved = rawA ? JSON.parse(rawA) : [];
        approved.unshift(entry);
        await redis.set('guestbook_pending', JSON.stringify(pending));
        await redis.set('guestbook_approved', JSON.stringify(approved));
        return res.status(200).json({ success: true, message: 'Entry approved' });
      }

      if (body.action === 'approve_all') {
        var rawP = await redis.get('guestbook_pending');
        var pending = rawP ? JSON.parse(rawP) : [];
        if (pending.length === 0) {
          return res.status(200).json({ success: true, message: 'No pending entries' });
        }
        var rawA = await redis.get('guestbook_approved');
        var approved = rawA ? JSON.parse(rawA) : [];
        approved = pending.concat(approved);
        await redis.set('guestbook_approved', JSON.stringify(approved));
        await redis.set('guestbook_pending', JSON.stringify([]));
        return res.status(200).json({ success: true, message: 'All entries approved (' + pending.length + ')' });
      }

      if (body.action === 'reject' && body.id) {
        var rawP = await redis.get('guestbook_pending');
        var pending = rawP ? JSON.parse(rawP) : [];
        var idx = pending.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
        pending.splice(idx, 1);
        await redis.set('guestbook_pending', JSON.stringify(pending));
        return res.status(200).json({ success: true, message: 'Entry rejected' });
      }

      if (body.action === 'delete_entry' && body.id) {
        var rawA = await redis.get('guestbook_approved');
        var approved = rawA ? JSON.parse(rawA) : [];
        var idx = approved.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
        approved.splice(idx, 1);
        await redis.set('guestbook_approved', JSON.stringify(approved));
        return res.status(200).json({ success: true, message: 'Entry deleted' });
      }

      if (body.action === 'delete_photo' && body.id) {
        var rawPh = await redis.get('gallery_photos');
        var photos = rawPh ? JSON.parse(rawPh) : [];
        var idx = photos.findIndex(function(p) { return p.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Photo not found' });
        var photo = photos.splice(idx, 1)[0];
        try { await del(photo.url); } catch (e) { /* ok if already gone */ }
        await redis.set('gallery_photos', JSON.stringify(photos));
        return res.status(200).json({ success: true, message: 'Photo deleted' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin error:', error);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (redis) await redis.disconnect().catch(function() {});
  }
}
