import { Redis } from '@upstash/redis';

var redis = null;

function getEnv(nameList) {
  for (var i = 0; i < nameList.length; i += 1) {
    var value = process.env[nameList[i]];
    if (value) {
      return value;
    }
  }

  return '';
}

function getRedis() {
  if (!redis) {
    var url = getEnv([
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_KV_REST_API_URL'
    ]);
    var token = getEnv([
      'UPSTASH_REDIS_REST_TOKEN',
      'UPSTASH_REDIS_REST_KV_REST_API_TOKEN'
    ]);

    if (!url || !token) {
      throw new Error('Upstash Redis is not configured. Add the Marketplace integration and redeploy.');
    }

    redis = new Redis({
      url: url,
      token: token
    });
  }

  return redis;
}

export function isRedisConfigured() {
  return !!getEnv([
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_KV_REST_API_URL'
  ]) && !!getEnv([
    'UPSTASH_REDIS_REST_TOKEN',
    'UPSTASH_REDIS_REST_KV_REST_API_TOKEN'
  ]);
}

export function getRedisErrorMessage(error) {
  var message = error instanceof Error ? error.message : String(error || '');

  if (!isRedisConfigured() || /not configured/i.test(message)) {
    return 'Redis storage is not configured. Connect Upstash Redis and redeploy.';
  }

  return 'Redis storage is unavailable right now. Check the Upstash integration and project environment variables.';
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

export async function checkRedisHealth() {
  if (!isRedisConfigured()) {
    return {
      configured: false,
      ok: false,
      message: getRedisErrorMessage(new Error('Redis storage is not configured.'))
    };
  }

  try {
    await getRedis().get(STORAGE_KEYS.guestbookApproved);
    return {
      configured: true,
      ok: true,
      message: 'Redis storage connected.'
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      message: getRedisErrorMessage(error)
    };
  }
}

export function createRecordId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function sanitizeText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}