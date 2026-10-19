/**
 * Centralized JWT Configuration & Validation Helper
 * Ensures secure key retrieval, consistent expiration handling,
 * and safe fail-fast behavior if required secrets are missing in production.
 */

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is missing. A secure random secret is required for production deployment.'
      );
    }
    return 'your_super_secret_jwt_access_token_secret_key_12345';
  }
  return secret;
};

const getJwtRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_REFRESH_SECRET environment variable is missing. A secure random secret is required for production deployment.'
      );
    }
    return 'your_super_secret_jwt_refresh_token_secret_key_54321';
  }
  return secret;
};

const getJwtExpire = () => process.env.JWT_EXPIRE || '15m';
const getJwtRefreshExpire = () => process.env.JWT_REFRESH_EXPIRE || '7d';

/**
 * Validates JWT configuration on server startup.
 * Throws in production if variables are unset or using default insecure placeholders.
 */
const validateJwtConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!secret || secret === 'your_super_secret_jwt_access_token_secret_key_12345') {
      throw new Error(
        'FATAL: JWT_SECRET must be configured with a unique, secure secret in production. Insecure defaults/placeholders are prohibited on Render/production.'
      );
    }

    if (!refreshSecret || refreshSecret === 'your_super_secret_jwt_refresh_token_secret_key_54321') {
      throw new Error(
        'FATAL: JWT_REFRESH_SECRET must be configured with a unique, secure secret in production. Insecure defaults/placeholders are prohibited on Render/production.'
      );
    }

    if (secret.length < 32) {
      console.warn(
        '[SECURITY WARNING] JWT_SECRET is shorter than 32 characters. A 64-character hex string (256-bit) is recommended for production.'
      );
    }
  } else {
    if (!process.env.JWT_SECRET) {
      console.warn('[JWT] Warning: JWT_SECRET is not set in backend/.env. Using development fallback secret.');
    }
  }
};

module.exports = {
  getJwtSecret,
  getJwtRefreshSecret,
  getJwtExpire,
  getJwtRefreshExpire,
  validateJwtConfig
};
