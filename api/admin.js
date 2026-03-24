import { kv } from '@vercel/kv';
import { del } from '@vercel/blob';

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

  // GET — list pending guestbook entries
  if (req.method === 'GET') {
    try {
      var action = req.query.action;

      if (action === 'pending') {
        var pending = await kv.get('guestbook_pending') || [];
        return res.status(200).json(pending);
      }

      if (action === 'approved') {
        var approved = await kv.get('guestbook_approved') || [];
        return res.status(200).json(approved);
      }

      if (action === 'photos') {
        var photos = await kv.get('gallery_photos') || [];
        return res.status(200).json(photos);
      }

      return res.status(400).json({ error: 'Unknown action. Use: pending, approved, photos' });
    } catch (error) {
      console.error('Admin GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
  }

  // POST — approve, reject guestbook entries or delete photos
  if (req.method === 'POST') {
    try {
      var body = req.body;

      // Approve a guestbook entry
      if (body.action === 'approve' && body.id) {
        var pending = await kv.get('guestbook_pending') || [];
        var idx = pending.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) {
          return res.status(404).json({ error: 'Entry not found in pending' });
        }
        var entry = pending.splice(idx, 1)[0];
        var approved = await kv.get('guestbook_approved') || [];
        approved.unshift(entry);
        await kv.set('guestbook_pending', pending);
        await kv.set('guestbook_approved', approved);
        return res.status(200).json({ success: true, message: 'Entry approved' });
      }

      // Approve all pending entries
      if (body.action === 'approve_all') {
        var pending = await kv.get('guestbook_pending') || [];
        if (pending.length === 0) {
          return res.status(200).json({ success: true, message: 'No pending entries' });
        }
        var approved = await kv.get('guestbook_approved') || [];
        approved = pending.concat(approved);
        await kv.set('guestbook_approved', approved);
        await kv.set('guestbook_pending', []);
        return res.status(200).json({ success: true, message: 'All entries approved (' + pending.length + ')' });
      }

      // Reject (delete) a guestbook entry
      if (body.action === 'reject' && body.id) {
        var pending = await kv.get('guestbook_pending') || [];
        var idx = pending.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) {
          return res.status(404).json({ error: 'Entry not found' });
        }
        pending.splice(idx, 1);
        await kv.set('guestbook_pending', pending);
        return res.status(200).json({ success: true, message: 'Entry rejected' });
      }

      // Delete an approved guestbook entry
      if (body.action === 'delete_entry' && body.id) {
        var approved = await kv.get('guestbook_approved') || [];
        var idx = approved.findIndex(function(e) { return e.id === body.id; });
        if (idx === -1) {
          return res.status(404).json({ error: 'Entry not found' });
        }
        approved.splice(idx, 1);
        await kv.set('guestbook_approved', approved);
        return res.status(200).json({ success: true, message: 'Entry deleted' });
      }

      // Delete a gallery photo
      if (body.action === 'delete_photo' && body.id) {
        var photos = await kv.get('gallery_photos') || [];
        var idx = photos.findIndex(function(p) { return p.id === body.id; });
        if (idx === -1) {
          return res.status(404).json({ error: 'Photo not found' });
        }
        var photo = photos.splice(idx, 1)[0];
        // Delete from Vercel Blob
        try { await del(photo.url); } catch (e) { /* ok if already gone */ }
        await kv.set('gallery_photos', photos);
        return res.status(200).json({ success: true, message: 'Photo deleted' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
      console.error('Admin POST error:', error);
      return res.status(500).json({ error: 'Operation failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
