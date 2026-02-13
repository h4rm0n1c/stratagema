import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import commandsModule from '../shared/commands.js';

const { parseCommands } = commandsModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, '..');
const commandsTxtPath = path.join(pluginRoot, 'commands.txt');
const commandsJsonPath = path.join(pluginRoot, 'commands.json');
const piJsPath = path.join(pluginRoot, 'property-inspector', 'pi.js');

const raw = fs.readFileSync(commandsTxtPath, 'utf8');
const commands = parseCommands(raw, console);

fs.writeFileSync(commandsJsonPath, `${JSON.stringify(commands, null, 2)}\n`, 'utf8');

const escapedRaw = raw.replace(/`/g, '\\`').replace(/\$\{/g, '\\\${');
const piJs = fs.readFileSync(piJsPath, 'utf8');
const nextPiJs = piJs.replace(
  /const EMBEDDED_COMMANDS_TXT = `([\s\S]*?)`;\n\n/,
  `const EMBEDDED_COMMANDS_TXT = \`\n${escapedRaw}\`;\n\n`
);

if (nextPiJs === piJs) {
  throw new Error('Could not find EMBEDDED_COMMANDS_TXT block in pi.js to update');
}

fs.writeFileSync(piJsPath, nextPiJs, 'utf8');

console.log(`Generated ${commandsJsonPath} and updated embedded commands in ${piJsPath} with ${commands.length} commands.`);
