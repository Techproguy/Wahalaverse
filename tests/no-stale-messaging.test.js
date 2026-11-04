// Guards against the misleading "Demo mode" / "Supabase not configured" messaging
// returning to the player-facing UI. Guest mode is NOT demo mode — the games are fully
// playable without a backend, which is intentional for the guest release.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appjs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const BANNED = [
  'Demo mode is active',
  'Real email sign-in becomes available after Supabase',
  'Prototype is running without a backend',
  'Sign-in available after setup',
  'Guest demo mode',
  'Supabase connected',
];

test('player-facing UI contains no stale demo-mode / backend-config messaging', () => {
  for (const phrase of BANNED) {
    assert.ok(!appjs.includes(phrase), `stale phrase must not appear in app.js: "${phrase}"`);
  }
});

test('the word "demo" only survives as the internal sample-challenge constant (DEMO), never as UI copy', () => {
  // Any lowercase "demo mode" phrasing is UI copy and is disallowed.
  assert.ok(!/demo mode/i.test(appjs), 'no "demo mode" wording anywhere in app.js');
});

test('guest build exposes honest guest messaging (device-local saves, no account needed)', () => {
  assert.ok(/no account needed/i.test(appjs), 'guest copy explains no account is needed');
  assert.ok(/saved on this device|saves on this device/i.test(appjs), 'guest copy explains device-local saves');
});
