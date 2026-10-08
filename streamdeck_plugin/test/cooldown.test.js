const test = require('node:test');
const assert = require('node:assert/strict');
const { StratagemaPlugin } = require('../plugin');
function fixture(t) {
  let now = 1000;
  const plugin = new StratagemaPlugin({ now: () => now });
  const messages = [], calls = [];
  plugin.send = m => messages.push(m);
  plugin.sendToPropertyInspector = (context, payload) => messages.push({ context, payload });
  plugin.invokeHelper = async (...args) => { calls.push(args); };
  t.after(() => clearInterval(plugin.cooldownTimer));
  return { plugin, messages, calls,
    appear(key, seconds = 3) { plugin.onWillAppear(key, { settings: { code: 'wasd', cooldownSeconds: seconds } }); },
    press(key, action) { return plugin.routeMessage({ event: 'keyDown', context: key, action, payload: { settings: {} } }); },
    remaining(key) { return plugin.remainingSeconds(plugin.actionContexts.get(key)); },
    advance(ms) { now += ms; plugin.tickCooldowns(); },
  };
}
const RESET = 'com.stratagema.sdplugin.reset-round';
test('countdown blocks presses, updates image, expires and restores original icon', async t => {
  const f = fixture(t); f.appear('a'); await f.press('a');
  assert.equal(f.remaining('a'), 3);
  const overlay = f.messages.find(m => m.event === 'setImage' && m.payload.image.startsWith('data:'));
  assert.match(Buffer.from(overlay.payload.image.split(',')[1], 'base64').toString(), />0:03</);
  await f.press('a'); assert.equal(f.calls.length, 1);
  f.advance(2000); assert.equal(f.remaining('a'), 1);
  await f.press('a'); assert.equal(f.calls.length, 1);
  f.advance(1000); assert.equal(f.plugin.cooldownTimer, null);
  assert.equal(f.messages.filter(m => m.event === 'setImage').at(-1).payload.image, 'icons/blank.png');
  await f.press('a'); assert.equal(f.calls.length, 2);
});
test('round reset clears all keys including hidden keys and preserves their configuration', async t => {
  const f = fixture(t); f.appear('a'); f.appear('b', 5);
  await f.press('a'); await f.press('b');
  f.plugin.routeMessage({ event: 'willDisappear', context: 'b' });
  const settings = { ...f.plugin.actionContexts.get('b').settings };
  await f.press('reset', RESET);
  assert.equal(f.remaining('a'), 0); assert.equal(f.remaining('b'), 0);
  assert.equal(f.calls.length, 2); assert.equal(f.plugin.cooldownTimer, null);
  assert.deepEqual(f.plugin.actionContexts.get('b').settings, settings);
  f.appear('b', 5); await f.press('b'); assert.equal(f.calls.length, 3);
});
test('page changes and settings changes preserve active cooldown', async t => {
  const f = fixture(t); f.appear('a', 5); await f.press('a');
  f.plugin.routeMessage({ event: 'willDisappear', context: 'a' }); f.advance(1000);
  f.appear('a', 0); await f.press('a');
  assert.equal(f.calls.length, 1); assert.equal(f.remaining('a'), 4);
  f.advance(4000); await f.press('a'); assert.equal(f.calls.length, 2); assert.equal(f.remaining('a'), 0);
});
test('global busy guard discards presses; reset during send prevents old cooldown restarting', async t => {
  const f = fixture(t); f.appear('a'); f.appear('b'); let finish;
  f.plugin.invokeHelper = (...args) => { f.calls.push(args); return new Promise(resolve => { finish = resolve; }); };
  const sending = f.press('a'); await f.press('a'); await f.press('b');
  assert.equal(f.calls.length, 1);
  await f.press('reset', RESET); assert.equal(f.plugin.sending, true);
  finish(); await sending;
  assert.equal(f.plugin.sending, false); assert.equal(f.remaining('a'), 0); assert.equal(f.plugin.cooldownTimer, null);
  f.plugin.invokeHelper = async (...args) => { f.calls.push(args); };
  await f.press('b'); assert.equal(f.calls.length, 2); assert.equal(f.remaining('b'), 3);
});
test('failed playback starts no countdown and allows retry', async t => {
  const f = fixture(t); f.appear('a');
  f.plugin.invokeHelper = async () => { throw new Error('helper unavailable'); };
  await f.press('a'); assert.equal(f.plugin.cooldownTimer, null); assert.equal(f.plugin.sending, false);
  assert.ok(f.messages.some(m => m.payload?.message === 'Sequence failed: helper unavailable'));
  f.plugin.invokeHelper = async (...args) => { f.calls.push(args); };
  await f.press('a'); assert.equal(f.calls.length, 1);
});
test('explicit zero survives catalogue defaults and permits repeated successful presses', async t => {
  const f = fixture(t);
  f.plugin.onWillAppear('a', { settings: { stratagemId: 'machine_gun', cooldownSeconds: 0 } });
  assert.equal(f.plugin.actionContexts.get('a').settings.cooldownSeconds, 0);
  await f.press('a'); await f.press('a'); assert.equal(f.calls.length, 2); assert.equal(f.plugin.cooldownTimer, null);
});
