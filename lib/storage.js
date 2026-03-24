import { Redis } from '@upstash/redis';

var redis = null;

function getRedis() {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis is not configured. Add the Marketplace integration and redeploy.');
    }

    redis = Redis.fromEnv();
  }

  return redis;
}

export var STORAGE_KEYS = {
  guestbookApproved: 'guestbook_approved',
  guestbookPending: 'guestbook_pending',
  galleryPhotos: 'gallery_photos'
};

function ensureList(value) {
  return Array.isArray(value) ? value : [];
}

export async function readList(key) {
  var value = await getRedis().get(key);
  return ensureList(value);
}

export async function writeList(key, value) {
  var nextValue = ensureList(value);
  await getRedis().set(key, nextValue);
  return nextValue;
}

export function createRecordId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function sanitizeText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}