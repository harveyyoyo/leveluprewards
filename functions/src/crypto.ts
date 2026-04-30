/**
 * Node-compatible encryption utility for Cloud Functions.
 * Matches the logic in src/lib/crypto.ts.
 */

const SECRET_KEY = 'levelup-arcade-security-token-2026';

export function encryptField(text: string | undefined): string | undefined {
  if (!text) return text;
  if (text.startsWith('enc:')) return text;

  try {
    const key = SECRET_KEY;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return 'enc:' + Buffer.from(result, 'binary').toString('base64');
  } catch (e) {
    console.error('Encryption error:', e);
    return text;
  }
}

export function decryptField(text: string | undefined): string | undefined {
  if (!text || typeof text !== 'string' || !text.startsWith('enc:')) {
    return text;
  }

  try {
    const base64 = text.substring(4);
    const raw = Buffer.from(base64, 'base64').toString('binary');
      
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
