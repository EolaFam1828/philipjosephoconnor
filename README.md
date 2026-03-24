# Philip Joseph O'Connor Memorial

Static memorial site for Philip Joseph "P.J." O'Connor, deployed on Vercel with:

- Upstash Redis for guestbook and moderation data
- Vercel Blob for uploaded gallery photos
- Serverless API routes under `api/`

## Storage setup on Vercel

1. In the Vercel Marketplace, install the `Upstash Redis` integration for this project.
2. Add a `Blob` store and connect it to this project.
3. Set an `ADMIN_TOKEN` environment variable for the moderation page.
4. Redeploy.

The site now accepts either of these Upstash env pairs:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_KV_REST_API_URL` + `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`

Your Vercel project currently appears to be using the second pair from the Marketplace integration. Vercel Blob injects `BLOB_READ_WRITE_TOKEN`. For local development, pull them into a local env file:

```bash
vercel env pull .env.local
```

## Data model

- `guestbook_pending`: submitted guestbook entries waiting for review
- `guestbook_approved`: guestbook entries visible on the site
- `gallery_photos`: uploaded photo metadata stored alongside public Blob URLs

## Why this storage choice

- Vercel KV has been sunset, so the site now uses Upstash Redis instead.
- `@upstash/redis` is HTTP-based and works cleanly in Vercel serverless functions.
- The application storage API stays the same internally, so guestbook, moderation, and gallery behavior do not need to change.

## Environment notes

- `ADMIN_TOKEN` is required and already relevant.
- `BLOB_READ_WRITE_TOKEN` is required for gallery uploads.
- `UPSTASH_REDIS_REST_KV_REST_API_URL` and `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` are sufficient for storage.
- `UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN` is not used by this site.
- `UPSTASH_REDIS_REST_KV_URL` and `UPSTASH_REDIS_REST_REDIS_URL` are not used by this site.
- `memorial_REDIS_URL` is leftover from the previous setup and can be removed.
- `EDGE_CONFIG` is currently unused by this site.

## Moderation flow

- Visitors submit guestbook messages to `api/guestbook`
- Messages land in `guestbook_pending`
- The admin page approves, rejects, or deletes entries through `api/admin`
- Gallery uploads go to Blob and their metadata is saved in `gallery_photos`

## Deploy notes

- Route rewrites are configured in `vercel.json`
- The admin page is intended for private use only and relies on `ADMIN_TOKEN`
- Blob objects are public because gallery photos need to render on the site

## Post-deploy verification

- Visit `/api/health` after deploy to verify Redis, Blob, and `ADMIN_TOKEN` are all configured and responding.
- Open `/admin` to see the same storage checks rendered in the admin UI before signing in.
