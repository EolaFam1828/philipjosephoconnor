import { list } from '@vercel/blob';

export function isBlobConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function getBlobErrorMessage(error) {
  var message = error instanceof Error ? error.message : String(error || '');

  if (!isBlobConfigured() || /not configured/i.test(message)) {
    return 'Blob storage is not configured. Connect Vercel Blob and redeploy.';
  }

  return 'Blob storage is unavailable right now. Check the Vercel Blob integration and project environment variables.';
}

export async function checkBlobHealth() {
  if (!isBlobConfigured()) {
    return {
      configured: false,
      ok: false,
      message: getBlobErrorMessage(new Error('Blob storage is not configured.'))
    };
  }

  try {
    var result = await list({ limit: 1 });
    return {
      configured: true,
      ok: true,
      message: 'Blob storage connected.',
      sampleCount: result.blobs.length
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      message: getBlobErrorMessage(error)
    };
  }
}