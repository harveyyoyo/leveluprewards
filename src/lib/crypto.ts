/**
 * Lightweight field obfuscation utility.
 *
 * ⚠️  This is NOT real encryption — it uses a simple reversible XOR cipher
 * whose key is visible in the client bundle. Its purpose is to prevent casual
 * reading of contact fields in Firestore / DevTools, not to protect against a
 * determined attacker.
 *
 * For genuine confidentiality, move encryption to a Cloud Function or API
 * route using AES-256-GCM with a key stored in environment variables or
 * Firebase Secrets Manager.
 */

/**
 * Obfuscates a string with a reversible XOR cipher.
 * Prefixes the result with 'enc:' to identify it as obfuscated.
 *
 * @deprecated Prefer server-side encryption for sensitive data.
 */
export function obfuscateField(text: string | undefined): string | undefined {
  if (!text) return text;
  // Don't double obfuscate
  if (text.startsWith('enc:')) return text;

  try {
    const key = 'levelup-arcade-obfuscation-token';
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
    console.error('Obfuscation error:', e);
    return text;
  }
}

/**
 * De-obfuscates a string prefixed with 'enc:'.
 * If the string is not obfuscated, returns it as-is.
 *
 * @deprecated Prefer server-side encryption for sensitive data.
 */
export function deobfuscateField(text: string | undefined): string | undefined {
  if (!text || typeof text !== 'string' || !text.startsWith('enc:')) {
    return text;
  }

  try {
    const base64 = text.substring(4);
    const raw = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');

    const key = 'levelup-arcade-obfuscation-token';
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error('De-obfuscation error:', e);
    return text;
  }
}

/**
 * @deprecated Use {@link obfuscateField} instead. Alias kept for backward compatibility.
 */
export const encryptField = obfuscateField;

/**
 * @deprecated Use {@link deobfuscateField} instead. Alias kept for backward compatibility.
 */
export const decryptField = deobfuscateField;
