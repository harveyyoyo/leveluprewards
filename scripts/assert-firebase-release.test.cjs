const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertFirebaseRelease } = require('./assert-firebase-release.cjs');

test('accepts a confirmed Hosting release with Firebase ANSI formatting', () => {
  assert.doesNotThrow(() => assertFirebaseRelease('\x1b[32m✔ hosting[school-site]:\x1b[39m release complete\n✔ Deploy complete!'));
});

test('accepts the escaped color formatting in GitHub log exports', () => {
  assert.doesNotThrow(() => assertFirebaseRelease('^[[32m^[[1m✔ hosting[school-site]:^[[22m^[[39m release complete'));
});

test('rejects the observed 409 even when the CLI exits without failing', () => {
  assert.throws(() => assertFirebaseRelease('hosting[school-site]: file upload complete\nHTTP Error: 409, unable to queue the operation\nfailed to update function projects/school/functions/ssr'), /backend/);
});

test('rejects an upload that never released', () => {
  assert.throws(() => assertFirebaseRelease('hosting[school-site]: file upload complete'), /Hosting release/);
});

test('rejects a partial backend failure even if another site released', () => {
  assert.throws(() => assertFirebaseRelease('failed to create function projects/school/functions/ssr\nhosting[other-site]: release complete'), /backend/);
});
