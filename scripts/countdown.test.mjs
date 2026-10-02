import assert from 'node:assert/strict';
import test from 'node:test';
import { COUNTDOWN_DURATION, parseCounter, createStartPayload, remainingSeconds, counterPhase, csrfTokenFromCookie } from '../src/lib/countdown.ts';

const start = Date.parse('2026-10-03T09:00:00+05:30');
test('accepts both backend response shapes and numeric-string timestamps', () => {
  const counter = createStartPayload(start);
  assert.deepEqual(parseCounter({ data: [counter] }), counter);
  assert.deepEqual(parseCounter({ data: { ...counter, startTime: String(start), endTime: String(counter.endTime) } }), counter);
  assert.deepEqual(parseCounter({ data: [{ flag: false, startTime: null, endTime: null }] }), { flag: false, startTime: 0, endTime: 0 });
});
test('rejects missing counters, invalid flags and broken running timestamps', () => {
  for (const value of [null, { data: [] }, { flag: 'false' }, { flag: true, startTime: 0, endTime: 1 }, { flag: true, startTime: start, endTime: start - 1 }, { flag: true, startTime: 'yesterday', endTime: 'tomorrow' }]) assert.throws(() => parseCounter(value));
});
test('ready state remains at exactly 28 hours regardless of old timestamps', () => {
  const counter = { flag: false, startTime: 1, endTime: 2 };
  assert.equal(counterPhase(counter, start), 'ready');
  assert.equal(remainingSeconds(counter, start), 28 * 3600);
});
test('start uses epoch milliseconds and exactly 28 hours across dates/timezones', () => {
  const counter = createStartPayload(start + 0.5);
  assert.equal(counter.startTime, Math.round(start + 0.5));
  assert.equal(counter.endTime - counter.startTime, COUNTDOWN_DURATION);
  assert.equal(new Date(createStartPayload(start).endTime).toISOString(), '2026-10-04T07:30:00.000Z');
});
test('reload joins remaining time, rounds partial seconds up and clamps expiry', () => {
  const counter = createStartPayload(start);
  assert.equal(remainingSeconds(counter, start - 1000), 28 * 3600);
  assert.equal(remainingSeconds(counter, start + 3600000), 27 * 3600);
  assert.equal(remainingSeconds(counter, counter.endTime - 1), 1);
  assert.equal(remainingSeconds(counter, counter.endTime), 0);
  assert.equal(remainingSeconds(counter, counter.endTime + 3600000), 0);
  assert.equal(counterPhase(counter, counter.endTime), 'complete');
  assert.equal(counter.flag, true);
});
test('backend flag-only reset restores ready state after a running or completed timer and permits a fresh 28-hour start', () => {
  const original = createStartPayload(start);
  for (const now of [start + 3600000, original.endTime + 3600000]) {
    const reset = parseCounter({ data: [{ ...original, flag: false }] });
    assert.equal(counterPhase(reset, now), 'ready');
    assert.equal(remainingSeconds(reset, now), 28 * 3600);
    assert.deepEqual(reset, { flag: false, startTime: 0, endTime: 0 });
    const restarted = parseCounter({ data: [createStartPayload(now)] });
    assert.equal(restarted.startTime, now);
    assert.notEqual(restarted.startTime, original.startTime);
    assert.equal(restarted.endTime - restarted.startTime, COUNTDOWN_DURATION);
    assert.equal(counterPhase(restarted, now), 'running');
    assert.equal(remainingSeconds(restarted, now), 28 * 3600);
  }
});
test('extracts a real Django CSRF cookie without using template placeholders', () => {
  assert.equal(csrfTokenFromCookie('sessionid=unused; csrftoken=test-token; other=x'), 'test-token');
  assert.equal(csrfTokenFromCookie('csrftoken=encoded%20token'), 'encoded token');
  assert.equal(csrfTokenFromCookie('other=x'), undefined);
  assert.equal(csrfTokenFromCookie('csrftoken=%broken'), undefined);
});
