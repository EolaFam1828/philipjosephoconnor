import { createClient } from 'redis';
import { put } from '@vercel/blob';

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

    // GET — return all photos
    if (req.method === 'GET') {
      var data = await redis.get('gallery_photos');
      return res.status(200).json(data ? JSON.parse(data) : []);
    }

    // POST — upload a photo
    if (req.method === 'POST') {
      var body = req.body;
      var image = body.image;
      var caption = body.caption;
      var name = body.name;

      if (!image) {
        return res.status(400).json({ error: 'Image is required' });
      }

      var match = image.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid image format. Please use JPEG, PNG, GIF, or WebP.' });
      }

      var ext = match[1];
      var buffer = Buffer.from(match[2], 'base64');

      if (buffer.length > 4 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large. Please use a smaller photo (max 4MB).' });
      }

      var sanitize = function(str) {
        return str ? str.replace(/<[^>]*>/g, '').trim() : '';
      };

      var filename = 'gallery/' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
      var blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'image/' + ext
      });

      var photo = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        url: blob.url,
        caption: sanitize(caption).slice(0, 500),
        name: sanitize(name).slice(0, 200) || 'A friend',
        created_at: new Date().toISOString()
      };

      var raw = await redis.get('gallery_photos');
      var photos = raw ? JSON.parse(raw) : [];
      photos.unshift(photo);
      await redis.set('gallery_photos', JSON.stringify(photos));

      return res.status(201).json({ success: true, photo: photo });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Gallery error:', error);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (redis) await redis.disconnect().catch(function() {});
  }
}
