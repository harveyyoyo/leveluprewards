"use strict";
/**
 * Node-compatible encryption utility for Cloud Functions.
 * Matches the logic in src/lib/crypto.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptField = encryptField;
exports.decryptField = decryptField;
const SECRET_KEY = 'levelup-arcade-security-token-2026';
function encryptField(text) {
    if (!text)
        return text;
    if (text.startsWith('enc:'))
        return text;
    try {
        const key = SECRET_KEY;
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return 'enc:' + Buffer.from(result, 'binary').toString('base64');
    }
    catch (e) {
        console.error('Encryption error:', e);
        return text;
    }
}
function decryptField(text) {
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
    }
    catch (e) {
        console.error('Decryption error:', e);
        return text;
    }
}
//# sourceMappingURL=crypto.js.map