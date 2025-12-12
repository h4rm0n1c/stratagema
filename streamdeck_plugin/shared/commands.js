const DEFAULT_ICON = 'icons/blank.png';

function parseCommands(text) {
  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line, index) => normalizeLine(line, index))
    .filter(Boolean);
}

function normalizeLine(line, index) {
  const parts = line.split('|');
  if (parts.length < 3) {
    return null;
  }

  const [idRaw, codeRaw, cooldownRaw] = parts;
  const id = idRaw.trim();
  const code = codeRaw.trim();
  const cooldownSeconds = Number.parseInt(cooldownRaw.trim(), 10);

  if (!id || !code || Number.isNaN(cooldownSeconds)) {
    return null;
  }

  return {
    id,
    code,
    cooldownSeconds,
    icon: `icons/${id}.png`,
  };
}

function loadCommandsFromFile(filePath) {
  const fs = require('fs');
  const contents = fs.readFileSync(filePath, 'utf8');
  return parseCommands(contents);
}

function resolveIconPath(command) {
  if (!command || !command.icon) {
    return DEFAULT_ICON;
  }
  return command.icon;
}

(function attach(exports) {
  exports.parseCommands = parseCommands;
  exports.loadCommandsFromFile = loadCommandsFromFile;
  exports.resolveIconPath = resolveIconPath;
  exports.DEFAULT_ICON = DEFAULT_ICON;
})(typeof exports === 'undefined' ? (this.Commands = {}) : exports);
