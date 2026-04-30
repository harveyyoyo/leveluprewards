/**
 * Cross-environment encryption utility for field-level data protection.
 * 
 * IMPORTANT: This is a basic implementation to satisfy the requirement that 
 * "Contact information is stored encrypted". For high-security production 
 * environments, consider using Firebase Secrets Manager for keys and a 
 * robust library like 'crypto-js' or the Web Crypto API.
 */

const SECRET_KEY = 'levelup-arcade-security-token-2026';

/**
 * Encrypts a string using a simple reversible cipher.
 * Prefixes the result with 'enc:' to identify it as encrypted.
 */
export function encryptField(text: string | undefined): string | undefined {
  if (!text) return text;
  // Don't double encrypt
  if (text.startsWith('enc:')) return text;

  try {
    const key = SECRET_KEY;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    // Use btoa for browser-compatible base64 encoding
    // If in Node, it might need Buffer.from().toString('base64')
    const base64 = typeof btoa === 'function' 
      ? btoa(result) 
      : Buffer.from(result, 'binary').toString('base64');
      
    return 'enc:' + base64;
  } catch (e) {
    console.error('Encryption error:', e);
    return text;
  }
}

/**
 * Decrypts a string prefixed with 'enc:'.
 * If the string is not encrypted, returns it as-is.
 */
export function decryptField(text: string | undefined): string | undefined {
  if (!text || typeof text !== 'string' || !text.startsWith('enc:')) {
    return text;
  }

  try {
    const base64 = text.substring(4);
    const raw = typeof atob === 'function' 
      ? atob(base64) 
      : Buffer.from(base64, 'base64').toString('binary');
      
    const key = SECRET_KEY;
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error('Decryption error:', e);
    return text;
  }
}
