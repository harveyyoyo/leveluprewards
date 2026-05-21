"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_OWNER_EMAILS = void 0;
exports.isGoogleOwnerEmail = isGoogleOwnerEmail;
exports.isAllowedGoogleEmailOnAllowlist = isAllowedGoogleEmailOnAllowlist;
/**
 * Keep in sync with `src/lib/googleAllowlist.ts`.
 */
exports.GOOGLE_OWNER_EMAILS = ["sdeichemed@gmail.com"];
function isGoogleOwnerEmail(email) {
    const normalized = email.trim().toLowerCase();
    return exports.GOOGLE_OWNER_EMAILS.includes(normalized);
}
function isAllowedGoogleEmailOnAllowlist(email, allowlist) {
    const normalized = email.trim().toLowerCase();
    if (!normalized)
        return false;
    if (isGoogleOwnerEmail(normalized))
        return true;
    if (allowlist.length === 0)
        return true;
    return allowlist.includes(normalized);
}
//# sourceMappingURL=googleAllowlist.js.map