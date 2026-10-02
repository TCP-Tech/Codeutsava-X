import assert from 'node:assert/strict';
import test from 'node:test';

const base = process.env.COUNTDOWN_DEMO_URL ?? 'http://localhost:3000';
const url = new URL(base);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Demo tests require a localhost server.');
const endpoint = `${url.origin}/api/countdown/demo`;
const read = () => fetch(endpoint, { cache: 'no-store' });
const action = (name) => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name }) });

test('local shared timer: start, competing click, reload, outage, recovery, finish and reset', async () => {
  try {
    assert.equal((await action('reset')).status, 200);
    assert.equal((await (await read()).json()).counter.flag, false);
    const starts = await Promise.all([action('start'), action('start')]);
    assert.deepEqual(starts.map((response) => response.status).sort(), [200, 409]);
    const first = await (await read()).json();
    assert.equal(first.counter.endTime - first.counter.startTime, 28 * 3600000);
    const second = await (await read()).json();
    assert.deepEqual(second.counter, first.counter);
    assert.equal((await action('disconnect')).status, 200);
    assert.equal((await read()).status, 503);
    assert.equal((await action('start')).status, 503);
    assert.equal((await action('reconnect')).status, 200);
    assert.deepEqual((await (await read()).json()).counter, first.counter);
    assert.equal((await action('finish')).status, 200);
    const finished = await (await read()).json();
    assert.equal(finished.counter.flag, true);
    assert.ok(finished.counter.endTime <= finished.serverTime);
    assert.equal((await action('start')).status, 409);
    assert.equal((await action('unknown')).status, 400);
    const crossOrigin = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: JSON.stringify({ action: 'reset' }) });
    assert.equal(crossOrigin.status, 403);
  } finally { await action('reset'); }
});
