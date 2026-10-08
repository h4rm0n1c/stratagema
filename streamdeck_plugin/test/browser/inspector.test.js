const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { WebSocketServer } = require('ws');
const { loadCommandsFromFile } = require('../../shared/commands');

const root = path.resolve(__dirname, '../..');
const action = 'com.stratagema.sdplugin.stratagem';
const browserOptions = {
  executablePath: process.env.STREAMDECK_TEST_BROWSER || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
};

async function makeFixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stratagema-ui-'));
  await fs.mkdir(path.join(dir, 'shared'));
  for (const file of ['plugin.js', 'commands.txt', 'shared/commands.js']) {
    await fs.copyFile(path.join(root, file), path.join(dir, file));
  }
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  const browser = await chromium.launch(browserOptions);
  let pluginSocket;
  let uiSocket;
  let selectedContext;
  let globals = { tcpEnabled: false, tcpWhitelist: '127.0.0.1', tcpPort: 7777 };
  const stored = new Map();
  const errors = [];
  const traffic = [];
  let pluginReady;
  const ready = new Promise(resolve => { pluginReady = resolve; });
  const send = (socket, message) => socket?.readyState === 1 && socket.send(JSON.stringify(message));
  const settingsEvent = context => ({ action, event: 'didReceiveSettings', context, payload: { settings: stored.get(context) || {} } });
  server.on('connection', socket => {
    let role;
    socket.on('message', raw => {
      try {
        const message = JSON.parse(raw);
        traffic.push(message);
        if (message.event === 'registerPlugin') {
          role = 'plugin';
          pluginSocket = socket;
          pluginReady();
          return;
        }
        if (message.event === 'registerPropertyInspector') {
          role = 'ui';
          uiSocket = socket;
          assert.equal(message.uuid, 'inspector-session');
          return;
        }
        if (role === 'ui') {
          if (['getSettings', 'setSettings', 'sendToPlugin'].includes(message.event)) {
            assert.equal(message.action, action, 'UI must specify the action UUID');
            // The inspector sends its registration UUID; Stream Deck resolves
            // that session to the key context before notifying the backend.
            // Match Elgato's streamdeck-javascript-sdk/js/property-inspector.js.
            assert.equal(message.context, 'inspector-session', 'UI must address its registered inspector session');
            message.context = selectedContext;
          }
          if (['getGlobalSettings', 'setGlobalSettings'].includes(message.event)) {
            assert.equal(message.context, 'inspector-session', 'Global settings must use the registration identifier');
          }
        }
        switch (message.event) {
          case 'getSettings':
            send(socket, { ...settingsEvent(message.context), context: role === 'ui' ? 'inspector-session' : message.context });
            break;
          case 'setSettings':
            stored.set(message.context, message.payload);
            // Stream Deck notifies the other layer, not the sender.
            if (role === 'ui') send(pluginSocket, settingsEvent(message.context));
            else if (message.context === selectedContext) send(uiSocket, settingsEvent(message.context));
            break;
          case 'getGlobalSettings':
            send(socket, { event: 'didReceiveGlobalSettings', context: message.context, payload: { settings: globals } });
            break;
          case 'setGlobalSettings':
            globals = message.payload;
            send(pluginSocket, { event: 'didReceiveGlobalSettings', payload: { settings: globals } });
            break;
          case 'sendToPlugin':
            send(pluginSocket, message);
            break;
          case 'sendToPropertyInspector':
            if (message.context === selectedContext) send(uiSocket, { ...message, action, context: 'inspector-session' });
            break;
        }
      } catch (error) { errors.push(error.message); }
    });
  });
  const child = spawn(process.execPath, [path.join(dir, 'plugin.js'), '-port', String(server.address().port),
    '-pluginUUID', 'plugin-session', '-registerEvent', 'registerPlugin'], {
    env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') }, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  t.after(async () => {
    await browser.close();
    const exited = child.exitCode === null ? once(child, 'exit') : null;
    if (exited) child.kill();
    for (const socket of server.clients) socket.terminate();
    await new Promise(resolve => server.close(resolve));
    if (exited) await exited;
    await fs.rm(dir, { recursive: true, force: true });
  });
  await ready;
  async function open(context, initialSettings = stored.get(context) || {}) {
    selectedContext = context;
    stored.set(context, initialSettings);
    send(pluginSocket, { action, event: 'willAppear', context, payload: { settings: initialSettings } });
    const page = await browser.newPage({ viewport: { width: 520, height: 850 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => {
      errors.push(`Unexpected external dependency: ${route.request().url()}`);
      return route.abort();
    });
    await page.goto(pathToFileURL(path.join(root, 'property-inspector/index.html')).href);
    await page.evaluate(({ port, action, context, initialSettings }) => {
      window.connectElgatoStreamDeckSocket(String(port), 'inspector-session', 'registerPropertyInspector', '{}',
        JSON.stringify({ action, context, payload: { settings: initialSettings } }));
    }, { port: server.address().port, action, context, initialSettings });
    await page.waitForFunction(() => document.getElementById('commands-status').textContent.startsWith('Loaded '));
    return page;
  }
  return {
    dir, open, stored, errors, traffic, getStderr: () => stderr, getGlobals: () => globals,
    press: context => send(pluginSocket, { action, event: 'keyDown', context, payload: { settings: stored.get(context) || {} } }),
  };
}

test('inspector session UUID is resolved to each key for settings and commands.txt reload', { timeout: 30000 }, async t => {
  const fixture = await makeFixture(t);
  const expected = loadCommandsFromFile(path.join(root, 'commands.txt'));
  const command = expected[0];
  let page = await fixture.open('key-one', { stratagemId: command.id, code: 'wasd', cooldownSeconds: 17 });
  assert.equal(await page.locator('#stratagem-select option').count(), expected.length + 1);
  assert.equal(await page.locator('#stratagem-select').inputValue(), command.id);
  assert.equal(await page.locator('#code').inputValue(), 'wasd', 'Saved override must survive initial catalogue load');
  if (process.env.STRATAGEMA_UI_SCREENSHOT) {
    await page.screenshot({ path: process.env.STRATAGEMA_UI_SCREENSHOT, fullPage: true });
  }
  await page.locator('#stratagem-select').selectOption(expected[1].id);
  await page.waitForFunction(code => document.getElementById('code').value === code, expected[1].code);
  await page.waitForTimeout(100);
  fixture.press('key-one');
  await page.waitForTimeout(100);
  assert.ok(fixture.traffic.some(message => message.event === 'logMessage' &&
    message.payload.message === `Triggering stratagem: ${expected[1].id} (${expected[1].code})`),
  'A key press must reach helper dispatch with the saved dropdown code');
  assert.ok(!fixture.traffic.some(message => message.event === 'logMessage' &&
    message.payload.message.includes('No stratagem code configured')));
  await page.locator('#code').fill('custom');
  await page.locator('#cooldown').fill('23');
  await page.locator('#use-arrows').check();
  await page.locator('#skip-ctrl').check();
  await page.waitForTimeout(100);
  assert.deepEqual(fixture.stored.get('key-one'), { stratagemId: expected[1].id, code: 'custom', cooldownSeconds: 23, useArrows: true, skipCtrl: true });
  await page.close();
  page = await fixture.open('key-two', { stratagemId: command.id, code: command.code, cooldownSeconds: 410 });
  await page.locator('#code').fill('second-key');
  await page.waitForTimeout(100);
  await page.close();
  page = await fixture.open('key-one');
  assert.equal(await page.locator('#code').inputValue(), 'custom');
  assert.equal(await page.locator('#use-arrows').isChecked(), true);
  assert.equal(fixture.stored.get('key-two').code, 'second-key');
  await page.locator('#tcp-whitelist').fill('127.0.0.1,192.0.2.1');
  await page.waitForTimeout(100);
  assert.equal(fixture.getGlobals().tcpWhitelist, '127.0.0.1,192.0.2.1');

  await fs.writeFile(path.join(fixture.dir, 'commands.txt'), 'test_reload|sawd|99\n');
  await page.locator('#refresh-commands').click();
  await page.waitForFunction(() => document.querySelector('#stratagem-select option[value="test_reload"]'));
  assert.equal(await page.locator('#stratagem-select option').count(), 3, 'Live file replaces fallback while preserving missing saved selection');
  await page.locator('#stratagem-select').selectOption('test_reload');
  await page.waitForFunction(() => document.getElementById('code').value === 'sawd');
  assert.equal(await page.locator('#cooldown').inputValue(), '99');
  await fs.writeFile(path.join(fixture.dir, 'commands.txt'), '# no commands\n');
  await page.locator('#refresh-commands').click();
  await page.waitForFunction(() => document.getElementById('commands-status').textContent.includes('0 valid commands'));
  assert.equal(await page.locator('#stratagem-select option').count(), 2, 'Empty live file must not silently restore stale embedded entries');
  await fs.unlink(path.join(fixture.dir, 'commands.txt'));
  await page.locator('#refresh-commands').click();
  await page.waitForFunction(() => document.getElementById('commands-status').textContent.includes('Failed to load commands.txt'));
  assert.deepEqual(fixture.errors, []);
  assert.equal(fixture.getStderr(), '');
});

test('standalone inspector loads offline and reports an absent plugin instead of claiming commands.txt loaded', { timeout: 15000 }, async t => {
  const browser = await chromium.launch(browserOptions);
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(root, 'property-inspector/index.html')).href);
  assert.ok(await page.locator('#stratagem-select option').count() > 1);
  assert.equal(await page.locator('#stratagem-select').isDisabled(), true);
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  t.after(async () => {
    for (const socket of server.clients) socket.terminate();
    await new Promise(resolve => server.close(resolve));
  });
  await page.evaluate(({ port, action }) => {
    window.connectElgatoStreamDeckSocket(String(port), 'ui', 'registerPropertyInspector', '{}',
      JSON.stringify({ action, context: 'key', payload: { settings: {} } }));
  }, { port: server.address().port, action });
  await page.waitForFunction(() => document.getElementById('commands-status').textContent.includes('Plugin did not respond'));
  await page.locator('#refresh-commands').click();
  assert.equal(await page.locator('#commands-status').textContent(), 'Loading commands.txt...');
  await page.waitForFunction(() => document.getElementById('commands-status').textContent.includes('Plugin did not respond'));
  for (const socket of server.clients) socket.close();
  await page.waitForFunction(() => document.getElementById('stratagem-select').disabled);
  assert.match(await page.locator('#connection-status').textContent(), /Disconnected/);
  assert.deepEqual(errors, []);
});
