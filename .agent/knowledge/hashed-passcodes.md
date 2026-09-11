# Hashed school passcodes

School access and admin passcodes are stored as hashes in `schools/{schoolId}/secrets/{secretId}` (`school_access`, `admin`). After a successful login with a leftover plaintext field (`schoolAccessPasscode`, `adminPasscode`, or `passcode`), that field is deleted.

## Do not check plaintext only

`legacyExpected` being empty does **not** mean the school has no passcode. Use `schoolPasscodeConfigured(...)` (secret document **or** leftover plaintext) before showing “no passcode configured.”

A wrong code against a hashed secret must be `permission-denied` / “Invalid passcode.”, not `failed-precondition`.
