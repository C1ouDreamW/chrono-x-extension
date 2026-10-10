const test = require('node:test');
const assert = require('node:assert/strict');
require('../shared/timezones.js');
const T = globalThis.ChronoX;

test('validates timezone names and rejects nonsense', () => {
  assert.ok(T.isValidZone('America/New_York'));
  assert.ok(T.isValidZone('Asia/Shanghai'));
  assert.equal(T.isValidZone('Mars/Olympus'), false);
  assert.equal(T.isValidZone(''), false);
});
test('converts a fixed instant into Asia/Shanghai and New York', () => {
  const instant = new Date('2026-10-10T13:30:00Z');
  assert.equal(T.formatDate(instant,'Asia/Shanghai'), '2026/10/10 21:30');
  assert.equal(T.formatDate(instant,'America/New_York'), '2026/10/10 09:30');
});
test('honors seasonal DST changes', () => {
  const jan = new Date('2026-01-10T13:30:00Z');
  assert.equal(T.formatDate(jan,'America/New_York'), '2026/01/10 08:30');
  assert.equal(T.formatDate(jan,'America/Los_Angeles'), '2026/01/10 05:30');
});
test('supports 12-hour formatting', () => {
  assert.equal(T.formatDate(new Date('2026-10-10T13:30:00Z'),'Asia/Shanghai',true),'2026/10/10 09:30 下午');
});
test('recognizes clear cities and one-timezone countries', () => {
  assert.equal(T.inferZone('New York, NY').timeZone,'America/New_York');
  assert.equal(T.inferZone('Tokyo, Japan').timeZone,'Asia/Tokyo');
  assert.equal(T.inferZone('中国·济南').timeZone,'Asia/Shanghai');
  assert.equal(T.inferZone('🇬🇧 United Kingdom').timeZone,'Europe/London');
});
test('does not invent timezone for multi-timezone countries', () => {
  assert.equal(T.inferZone('United States'),null);
  assert.equal(T.inferZone('Canada'),null);
  assert.equal(T.inferZone('Australia'),null);
  assert.equal(T.inferZone('Somewhere on earth'),null);
});
test('avoids matching fragments within unrelated place names', () => {
  assert.equal(T.inferZone('I love Japanese food'),null);
  assert.equal(T.inferZone('my own sandiego'),null);
});
test('normalizes handles defensively', () => {
  assert.equal(T.cleanHandle(' @Example_123 '),'example_123');
  assert.equal(T.cleanHandle('@no-dashes'),null);
  assert.equal(T.cleanHandle('a'.repeat(16)),null);
});

test('does not infer author time from a United States account location', () => {
  assert.equal(T.inferZone('Based in United States'), null);
  assert.equal(T.inferZone('United States'), null);
  assert.equal(T.inferZone('Los Angeles, California').timeZone, 'America/Los_Angeles');
  assert.equal(T.inferZone('San Francisco, California').timeZone, 'America/Los_Angeles');
});
