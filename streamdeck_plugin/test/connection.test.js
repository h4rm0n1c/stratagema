const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const { parseLaunchArgs } = require('../plugin');
const { loadCommandsFromFile } = require('../shared/commands');

test('launch arguments accept Elgato metadata and reject invalid registration', () => {
  assert.deepEqual(parseLaunchArgs([
    '-info', '{"application":{"version":"7.0.3"}}',
    '-registerEvent', 'registerPlugin', '-port', '12345', '-pluginUUID', 'test-uuid',
  ]), { port: 12345, uuid: 'test-uuid', registerEvent: 'registerPlugin' });
  for (const args of [[], ['-port'], ['-port', '0'], ['-port', '65536'],
    ['-port', '12345', '-pluginUUID', 'test', '-registerEvent', 'registerPropertyInspector']]) {
    assert.throws(() => parseLaunchArgs(args));
  }
});

test('Elgato process launch registers, requests settings, and serves command metadata', { timeout: 10000 }, async (t) => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  let child;
  t.after(async () => {
    const closed = child && child.exitCode === null ? once(child, 'exit') : null;
    if (closed) child.kill();
    server.clients.forEach((socket) => socket.terminate());
    await new Promise((resolve) => server.close(resolve));
    if (closed) await closed;
  });
  const messages = [];
  const expectedCommands = loadCommandsFromFile(path.resolve(__dirname, '../commands.txt'));
  let finish;
  const receivedCommands = new Promise((resolve) => { finish = resolve; });
  server.on('connection', (socket) => {
    socket.on('message', (raw) => {
      const message = JSON.parse(raw);
      messages.push(message);
      if (message.event === 'getGlobalSettings') {
        // Invalid traffic must not prevent subsequent valid events.
        socket.send('invalid json');
        socket.send(JSON.stringify({ event: 'willAppear', context: 'test-key',
          payload: { settings: { stratagemId: 'machine_gun' } } }));
      }
      if (message.event === 'sendToPropertyInspector' && message.payload.type === 'commands') {
        finish(message);
      }
    });
  });
  child = spawn(process.execPath, [path.resolve(__dirname, '../plugin.js'),
    '-port', String(server.address().port), '-pluginUUID', 'test-uuid',
    '-registerEvent', 'registerPlugin', '-info', '{}'], { stdio: 'pipe' });
  let stderr = '';
  let warningReceived;
  const malformedWarning = new Promise((resolve) => { warningReceived = resolve; });
  child.stderr.on('data', (data) => {
    stderr += data;
    if (stderr.includes('Failed to handle Stream Deck message')) warningReceived();
  });
  const commandMessage = await receivedCommands;
  assert.deepEqual(messages[0], { event: 'registerPlugin', uuid: 'test-uuid' });
  assert.deepEqual(messages[1], { event: 'getGlobalSettings', context: 'test-uuid' });
  assert.equal(commandMessage.context, 'test-key');
  assert.ok(expectedCommands.length > 0);
  assert.deepEqual(commandMessage.payload.commands, expectedCommands);
  assert.ok(messages.some((m) => m.event === 'setSettings' && m.payload.code === 'saswd'));
  assert.ok(messages.some((m) => m.event === 'setImage' && m.context === 'test-key'));
  assert.equal(child.exitCode, null);
  await malformedWarning;
  const exited = once(child, 'exit');
  server.clients.forEach((socket) => socket.close());
  const [code] = await exited;
  assert.equal(code, 0);
});

test('invalid process launch exits with an actionable error', async () => {
  const child = spawn(process.execPath, [path.resolve(__dirname, '../plugin.js')], { stdio: 'pipe' });
  let stderr = '';
  child.stderr.on('data', (data) => { stderr += data; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
  assert.match(stderr, /Expected -port/);
});
