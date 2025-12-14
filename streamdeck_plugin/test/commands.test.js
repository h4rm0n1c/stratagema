const test = require('node:test');
const assert = require('node:assert/strict');

const { parseCommands, DEFAULT_ICON } = require('../shared/commands');

test('parseCommands normalizes valid rows and falls back to blank icon', () => {
  const text = [
    '# comment row',
    'machine_gun|saswd|410',
    'laser_beam|wddsw|120|icons/laser_beam.png',
    '',
  ].join('\n');

  const commands = parseCommands(text);

  assert.equal(commands.length, 2);
  assert.deepEqual(commands[0], {
    id: 'machine_gun',
    code: 'saswd',
    cooldownSeconds: 410,
    icon: DEFAULT_ICON,
  });
  assert.deepEqual(commands[1], {
    id: 'laser_beam',
    code: 'wddsw',
    cooldownSeconds: 120,
    icon: 'icons/laser_beam.png',
  });
});

test('parseCommands logs and skips malformed lines', () => {
  const warnings = [];
  const logger = { warn: (msg) => warnings.push(msg) };

  const text = ['missing_fields', 'bad_number|saswd|not_a_number', 'good|wdsa|200'].join('\n');
  const commands = parseCommands(text, logger);

  assert.equal(commands.length, 1);
  assert.equal(commands[0].id, 'good');
  assert.equal(commands[0].cooldownSeconds, 200);

  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /expected 3\+ pipe-delimited fields/);
  assert.match(warnings[1], /missing id\/code or invalid cooldown/);
});
