import { del } from '@vercel/blob';
import { getBlobErrorMessage, isBlobConfigured } from '../lib/blob.js';
import { STORAGE_KEYS, getRedisErrorMessage, readList, writeList } from '../lib/storage.js';

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

  try {
    if (req.method === 'GET') {
      var action = req.query.action;

      if (action === 'pending') {
        return res.status(200).json(await readList(STORAGE_KEYS.guestbookPending));
      }

      if (action === 'approved') {
        return res.status(200).json(await readList(STORAGE_KEYS.guestbookApproved));
      }

      if (action === 'photos') {
        return res.status(200).json(await readList(STORAGE_KEYS.galleryPhotos));
      }

      return res.status(400).json({ error: 'Unknown action. Use: pending, approved, photos' });
    }

    if (req.method === 'POST') {
      var body = req.body || {};

      if (body.action === 'approve' && body.id) {
        var pending = await readList(STORAGE_KEYS.guestbookPending);
        var idx = pending.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
        var entry = pending.splice(idx, 1)[0];
        var approved = await readList(STORAGE_KEYS.guestbookApproved);
        approved.unshift(entry);
        await writeList(STORAGE_KEYS.guestbookPending, pending);
        await writeList(STORAGE_KEYS.guestbookApproved, approved);
        return res.status(200).json({ success: true, message: 'Entry approved' });
      }

      if (body.action === 'approve_all') {
        var pending = await readList(STORAGE_KEYS.guestbookPending);
        if (pending.length === 0) {
          return res.status(200).json({ success: true, message: 'No pending entries' });
        }
        var approved = await readList(STORAGE_KEYS.guestbookApproved);
        approved = pending.concat(approved);
        await writeList(STORAGE_KEYS.guestbookApproved, approved);
        await writeList(STORAGE_KEYS.guestbookPending, []);
        return res.status(200).json({ success: true, message: 'All entries approved (' + pending.length + ')' });
      }

      if (body.action === 'reject' && body.id) {
        var pending = await readList(STORAGE_KEYS.guestbookPending);
        var idx = pending.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
        pending.splice(idx, 1);
        await writeList(STORAGE_KEYS.guestbookPending, pending);
        return res.status(200).json({ success: true, message: 'Entry rejected' });
      }

      if (body.action === 'delete_entry' && body.id) {
        var approved = await readList(STORAGE_KEYS.guestbookApproved);
        var idx = approved.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
        approved.splice(idx, 1);
        await writeList(STORAGE_KEYS.guestbookApproved, approved);
        return res.status(200).json({ success: true, message: 'Entry deleted' });
      }

      if (body.action === 'delete_photo' && body.id) {
        var photos = await readList(STORAGE_KEYS.galleryPhotos);
        var idx = photos.findIndex(function(p) { return p.id === body.id; });
        if (idx === -1) return res.status(404).json({ error: 'Photo not found' });
        var photo = photos.splice(idx, 1)[0];
        await writeList(STORAGE_KEYS.galleryPhotos, photos);
        if (!isBlobConfigured()) {
          return res.status(503).json({ error: 'Blob storage is not configured. Connect Vercel Blob and redeploy.' });
        }
        try {
          await del(photo.url);
        } catch (error) {
          return res.status(503).json({ error: getBlobErrorMessage(error) });
        }
        return res.status(200).json({ success: true, message: 'Photo deleted' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin error:', error);
    return res.status(503).json({ error: getRedisErrorMessage(error) });
  }
}
