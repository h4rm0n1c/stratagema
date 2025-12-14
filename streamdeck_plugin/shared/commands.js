const DEFAULT_ICON = 'icons/blank.png';

function parseCommands(text, logger = console) {
  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line, index) => normalizeLine(line, index, logger))
    .filter(Boolean);
}

function normalizeLine(line, index, logger = console) {
  const parts = line.split('|');
  if (parts.length < 3) {
    logMalformed(logger, index, line, 'expected 3+ pipe-delimited fields');
    return null;
  }

  const [idRaw, codeRaw, cooldownRaw, iconRaw] = parts;
  const id = idRaw.trim();
  const code = codeRaw.trim();
  const cooldownSeconds = Number.parseInt(cooldownRaw.trim(), 10);
  const icon = (iconRaw && iconRaw.trim()) || DEFAULT_ICON;

  if (!id || !code || Number.isNaN(cooldownSeconds)) {
    logMalformed(logger, index, line, 'missing id/code or invalid cooldown');
    return null;
  }

  return {
    id,
    code,
    cooldownSeconds,
    icon,
  };
}

function logMalformed(logger, index, line, reason) {
  if (logger && typeof logger.warn === 'function') {
    logger.warn(`commands.txt line ${index + 1}: ${reason} → "${line}"`);
  }
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
