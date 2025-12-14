const test = require('node:test');
const assert = require('node:assert/strict');

const { buildHelperArgs } = require('../plugin');

test('buildHelperArgs preserves WASD defaults and toggles arrows', () => {
  const base = buildHelperArgs('saswd', { useArrows: false, skipCtrl: false });
  assert.deepEqual(base, ['--code', 'saswd']);

  const arrows = buildHelperArgs('saswd', { useArrows: true, skipCtrl: false });
  assert.deepEqual(arrows, ['--code', 'saswd', '--arrows']);
});

test('buildHelperArgs disables control when requested', () => {
  const args = buildHelperArgs('wdwd', { useArrows: false, skipCtrl: true });
  assert.deepEqual(args, ['--code', 'wdwd', '--no-ctrl']);
});
