// Utility helpers for Property Media (Photos & Videos)

export const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';

/**
 * Resolves a media URL, ensuring local uploads (/uploads/...) are correctly routed.
 */
export const getMediaUrl = (url) => {
  if (!url) return DEFAULT_PROPERTY_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // In development Vite proxies /uploads to port 5001. If needed, prepend localhost:5001.
  if (url.startsWith('/')) {
    return url;
  }
  return `/uploads/${url}`;
};

/**
 * Formats bytes to human-readable size (e.g. 2.4 MB, 450 KB).
 */
export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Validates file size and format for Property Media.
 * Max image: 10MB
 * Max video: 100MB
 */
export const validateMediaFile = (file) => {
  const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
  const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov'];

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  const name = file.name || '';
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot !== -1 ? name.substring(lastDot).toLowerCase() : '';
  const mime = (file.type || '').toLowerCase();

  const isImage = ALLOWED_IMAGE_EXTS.includes(ext) || mime.startsWith('image/');
  const isVideo = ALLOWED_VIDEO_EXTS.includes(ext) || mime.startsWith('video/');

  if (!isImage && !isVideo) {
    return {
      isValid: false,
      error: `Unsupported file format '${ext || file.type}'. Allowed: JPG, PNG, WEBP for photos, and MP4, WEBM, MOV for videos.`
    };
  }

  if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE) {
      return {
        isValid: false,
        error: `Video '${name}' (${formatBytes(file.size)}) exceeds limit. Video must be smaller than 100 MB.`
      };
    }
    return { isValid: true, type: 'video' };
  }

  if (isImage) {
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        isValid: false,
        error: `Image '${name}' (${formatBytes(file.size)}) exceeds limit. Image must be smaller than 10 MB.`
      };
    }
    return { isValid: true, type: 'image' };
  }

  return { isValid: false, error: 'Invalid file.' };
};
