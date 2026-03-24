import { createClient } from 'redis';

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

  var redis;
  try {
    redis = await getRedis();

    // GET — return approved entries
    if (req.method === 'GET') {
      var data = await redis.get('guestbook_approved');
      return res.status(200).json(data ? JSON.parse(data) : []);
    }

    // POST — submit new entry (goes to pending)
    if (req.method === 'POST') {
      var body = req.body;
      var name = body.name;
      var relationship = body.relationship;
      var message = body.message;

      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }
      if (name.length > 200 || message.length > 5000) {
        return res.status(400).json({ error: 'Input too long' });
      }

      var sanitize = function(str) {
        return str.replace(/<[^>]*>/g, '').trim();
      };

      var entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: sanitize(name),
        relationship: relationship ? sanitize(relationship).slice(0, 100) : null,
        message: sanitize(message),
        created_at: new Date().toISOString()
      };

      var raw = await redis.get('guestbook_pending');
      var pending = raw ? JSON.parse(raw) : [];
      pending.unshift(entry);
      await redis.set('guestbook_pending', JSON.stringify(pending));

      return res.status(201).json({
        success: true,
        message: 'Your message has been received and will appear after review.'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Guestbook error:', error);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (redis) await redis.disconnect().catch(function() {});
  }
}
