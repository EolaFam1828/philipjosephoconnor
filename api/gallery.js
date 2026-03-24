import { put } from '@vercel/blob';
import { STORAGE_KEYS, createRecordId, readList, sanitizeText, writeList } from '../lib/storage.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await readList(STORAGE_KEYS.galleryPhotos));
    }

    if (req.method === 'POST') {
      var body = req.body || {};
      var image = body.image;
      var caption = sanitizeText(body.caption).slice(0, 500);
      var name = sanitizeText(body.name).slice(0, 200);

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

      var filename = 'gallery/' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
      var blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'image/' + ext
      });

      var photo = {
        id: createRecordId(),
        url: blob.url,
        caption: caption,
        name: name || 'A friend',
        created_at: new Date().toISOString()
      };

      var photos = await readList(STORAGE_KEYS.galleryPhotos);
      photos.unshift(photo);
      await writeList(STORAGE_KEYS.galleryPhotos, photos);

      return res.status(201).json({ success: true, photo: photo });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Gallery error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
