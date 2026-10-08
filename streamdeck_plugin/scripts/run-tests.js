const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Windows npm shells and Node 20 do not expand wildcard test paths.
const directory = path.resolve(__dirname, '..', 'test', process.argv[2] === 'browser' ? 'browser' : '');
const files = fs.readdirSync(directory)
  .filter(name => name.endsWith('.test.js'))
  .sort()
  .map(name => path.join(directory, name));
if (files.length === 0) throw new Error(`No tests found in ${directory}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
