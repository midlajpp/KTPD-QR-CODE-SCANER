import crypto from 'crypto';

/**
 * Generates a cryptographically secure, URL-safe random token.
 * 32 characters (16 bytes hex) provides 128-bit entropy, making collisions impossible.
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generates a secure random salt or hash if needed
 */
export const generateRandomString = (length = 16) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

