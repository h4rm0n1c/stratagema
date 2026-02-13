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

const embeddedBlockRegex = /const\s+EMBEDDED_COMMANDS_TXT\s*=\s*`[\s\S]*?`;\r?\n\r?\n/;
const replacementBlock = `const EMBEDDED_COMMANDS_TXT = \`\n${escapedRaw}\`;\n\n`;

let nextPiJs;
if (embeddedBlockRegex.test(piJs)) {
  nextPiJs = piJs.replace(embeddedBlockRegex, replacementBlock);
} else {
  const startToken = 'const EMBEDDED_COMMANDS_TXT = `';
  const startIndex = piJs.indexOf(startToken);
  if (startIndex === -1) {
    throw new Error('Could not find EMBEDDED_COMMANDS_TXT start token in pi.js to update');
  }

  const endIndex = piJs.indexOf('`;', startIndex + startToken.length);
  if (endIndex === -1) {
    throw new Error('Could not find EMBEDDED_COMMANDS_TXT end token in pi.js to update');
  }

  const blockEnd = endIndex + 2;
  const before = piJs.slice(0, startIndex);
  const after = piJs.slice(blockEnd).replace(/^\r?\n\r?\n/, '\n\n');
  nextPiJs = `${before}${replacementBlock}${after}`;
}

fs.writeFileSync(piJsPath, nextPiJs, 'utf8');

console.log(`Generated ${commandsJsonPath} and updated embedded commands in ${piJsPath} with ${commands.length} commands.`);
