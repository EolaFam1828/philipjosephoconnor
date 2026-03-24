# Philip Joseph O'Connor Memorial

Static memorial site for Philip Joseph "P.J." O'Connor, deployed on Vercel with:

- Vercel KV for guestbook and moderation data
- Vercel Blob for uploaded gallery photos
- Serverless API routes under `api/`

## Storage setup on Vercel

1. In the Vercel project, add a `KV` store and connect it to this project.
2. Add a `Blob` store and connect it to this project.
3. Set an `ADMIN_TOKEN` environment variable for the moderation page.
4. Redeploy.

Vercel injects the KV and Blob credentials automatically for deployed environments. For local development, pull them into a local env file:

```bash
vercel env pull .env.local
```

## Data model

- `guestbook_pending`: submitted guestbook entries waiting for review
- `guestbook_approved`: guestbook entries visible on the site
- `gallery_photos`: uploaded photo metadata stored alongside public Blob URLs

## Moderation flow

- Visitors submit guestbook messages to `api/guestbook`
- Messages land in `guestbook_pending`
- The admin page approves, rejects, or deletes entries through `api/admin`
- Gallery uploads go to Blob and their metadata is saved in `gallery_photos`

## Deploy notes

- Route rewrites are configured in `vercel.json`
- The admin page is intended for private use only and relies on `ADMIN_TOKEN`
- Blob objects are public because gallery photos need to render on the site
