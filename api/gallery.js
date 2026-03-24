import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — return all photos
  if (req.method === 'GET') {
    try {
      var photos = await kv.get('gallery_photos');
      return res.status(200).json(photos || []);
    } catch (error) {
      console.error('Gallery GET error:', error);
      return res.status(500).json({ error: 'Failed to load photos' });
    }
  }

  // POST — upload a photo
  if (req.method === 'POST') {
    try {
      var body = req.body;
      var image = body.image;
      var caption = body.caption;
      var name = body.name;

      if (!image) {
        return res.status(400).json({ error: 'Image is required' });
      }

      // Validate base64 data URL
      var match = image.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid image format. Please use JPEG, PNG, GIF, or WebP.' });
      }

      var ext = match[1];
      var buffer = Buffer.from(match[2], 'base64');

      // 4MB limit (leaves room for JSON overhead within Vercel's 4.5MB body limit)
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

      var photos = await kv.get('gallery_photos') || [];
      photos.unshift(photo);
      await kv.set('gallery_photos', photos);

      return res.status(201).json({ success: true, photo: photo });
    } catch (error) {
      console.error('Gallery POST error:', error);
      return res.status(500).json({ error: 'Failed to upload photo' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
