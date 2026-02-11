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

const raw = fs.readFileSync(commandsTxtPath, 'utf8');
const commands = parseCommands(raw, console);

fs.writeFileSync(commandsJsonPath, `${JSON.stringify(commands, null, 2)}\n`, 'utf8');
console.log(`Generated ${commandsJsonPath} with ${commands.length} commands.`);
