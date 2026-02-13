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
const embeddedCommandsPath = path.join(pluginRoot, 'shared', 'commands.embedded.js');

const raw = fs.readFileSync(commandsTxtPath, 'utf8');
const commands = parseCommands(raw, console);

fs.writeFileSync(commandsJsonPath, `${JSON.stringify(commands, null, 2)}\n`, 'utf8');

const embeddedScript = `(function attachEmbeddedCommands(globalScope) {\n  const commands = ${JSON.stringify(commands, null, 2)};\n  globalScope.StratagemaEmbeddedCommands = commands;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;
fs.writeFileSync(embeddedCommandsPath, embeddedScript, 'utf8');

console.log(`Generated ${commandsJsonPath} and ${embeddedCommandsPath} with ${commands.length} commands.`);
