import { STORAGE_KEYS, createRecordId, getRedisErrorMessage, readList, sanitizeText, writeList } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await readList(STORAGE_KEYS.guestbookApproved));
    }

    if (req.method === 'POST') {
      var body = req.body || {};
      var name = sanitizeText(body.name);
      var relationship = sanitizeText(body.relationship).slice(0, 100);
      var message = sanitizeText(body.message);

      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }
      if (name.length > 200 || message.length > 5000) {
        return res.status(400).json({ error: 'Input too long' });
      }

      var entry = {
        id: createRecordId(),
        name: name,
        relationship: relationship || null,
        message: message,
        created_at: new Date().toISOString()
      };

      var pending = await readList(STORAGE_KEYS.guestbookPending);
      pending.unshift(entry);
      await writeList(STORAGE_KEYS.guestbookPending, pending);

      return res.status(201).json({
        success: true,
        message: 'Your message has been received and will appear after review.'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Guestbook error:', error);
    return res.status(503).json({ error: getRedisErrorMessage(error) });
  }
}
