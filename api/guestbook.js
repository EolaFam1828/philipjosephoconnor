import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — return approved entries
  if (req.method === 'GET') {
    try {
      var approved = await kv.get('guestbook_approved');
      return res.status(200).json(approved || []);
    } catch (error) {
      console.error('Guestbook GET error:', error);
      return res.status(500).json({ error: 'Failed to load messages' });
    }
  }

  // POST — submit new entry (goes to pending)
  if (req.method === 'POST') {
    try {
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

      var pending = await kv.get('guestbook_pending') || [];
      pending.unshift(entry);
      await kv.set('guestbook_pending', pending);

      return res.status(201).json({
        success: true,
        message: 'Your message has been received and will appear after review.'
      });
    } catch (error) {
      console.error('Guestbook POST error:', error);
      return res.status(500).json({ error: 'Failed to save message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
