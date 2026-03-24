export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://philipjosephoconnor.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  var SUPABASE_URL = process.env.SUPABASE_URL;
  var SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  var supabaseHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  // GET — return approved entries
  if (req.method === 'GET') {
    try {
      var response = await fetch(
        SUPABASE_URL + '/rest/v1/guestbook?approved=eq.true&order=created_at.desc',
        { headers: supabaseHeaders }
      );
      if (!response.ok) throw new Error('Database query failed');
      var data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load messages' });
    }
  }

  // POST — submit new entry
  if (req.method === 'POST') {
    try {
      var body = req.body;
      var name = body.name;
      var relationship = body.relationship;
      var message = body.message;

      // Validate
      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }
      if (name.length > 200 || message.length > 5000) {
        return res.status(400).json({ error: 'Input too long' });
      }
      if (relationship && relationship.length > 100) {
        return res.status(400).json({ error: 'Relationship too long' });
      }

      // Sanitize — strip HTML tags
      var sanitize = function(str) {
        return str.replace(/<[^>]*>/g, '').trim();
      };

      var entry = {
        name: sanitize(name),
        relationship: relationship ? sanitize(relationship) : null,
        message: sanitize(message),
        approved: false,
        created_at: new Date().toISOString()
      };

      var postResponse = await fetch(
        SUPABASE_URL + '/rest/v1/guestbook',
        {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify(entry)
        }
      );

      if (!postResponse.ok) throw new Error('Database insert failed');

      return res.status(201).json({ success: true, message: 'Your message has been received and will appear after review.' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
