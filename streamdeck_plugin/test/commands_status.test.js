const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { StratagemaPlugin } = require('../plugin');

test('loadCommands returns structured success metadata', () => {
  const originalRead = fs.readFileSync;
  fs.readFileSync = () => ['machine_gun|saswd|410', 'invalid_row', 'orbital_laser|dswds|256'].join('\n');

  try {
    const plugin = new StratagemaPlugin();
    const status = plugin.loadCommands();

    assert.equal(Array.isArray(status.commands), true);
    assert.equal(status.error, null);
    assert.equal(status.lineCount, 3);
    assert.equal(status.validCount, 2);
    assert.equal(status.commands.length, 2);
    assert.match(status.sourcePath, /streamdeck_plugin[\\/]commands\.txt$/);
  } finally {
    fs.readFileSync = originalRead;
  }
});

test('loadCommands returns structured error metadata on file read failure', () => {
  const originalRead = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('ENOENT: no such file or directory');
  };

  try {
    const plugin = new StratagemaPlugin();
    const status = plugin.loadCommands();

    assert.equal(status.commands.length, 0);
    assert.equal(status.validCount, 0);
    assert.equal(status.lineCount, 0);
    assert.match(status.error || '', /ENOENT/);
    assert.match(status.sourcePath, /streamdeck_plugin[\\/]commands\.txt$/);
  } finally {
    fs.readFileSync = originalRead;
  }
});
