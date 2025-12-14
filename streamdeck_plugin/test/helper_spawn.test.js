const test = require('node:test');
const assert = require('node:assert/strict');

const { buildHelperSpawnOptions } = require('../plugin');

const baseOptions = buildHelperSpawnOptions();

test('buildHelperSpawnOptions hides the window and pipes stderr', () => {
  assert.equal(baseOptions.windowsHide, true);
  assert.deepEqual(baseOptions.stdio, ['ignore', 'ignore', 'pipe']);
});

test('buildHelperSpawnOptions detaches helper on Windows only', () => {
  const win = buildHelperSpawnOptions('win32');
  assert.equal(win.detached, true);

  const linux = buildHelperSpawnOptions('linux');
  assert.equal(linux.detached, false);
});
