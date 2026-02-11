const DEFAULT_SETTINGS = {
  stratagemId: '',
  code: '',
  cooldownSeconds: 0,
  useArrows: false,
  skipCtrl: false,
};

const COMMANDS_FALLBACK_DELAY_MS = 800;

let websocket = null;
let uuid = null;
let actionInfo = null;
let actionContext = null;
let settings = { ...DEFAULT_SETTINGS };
let globalSettings = {};
let commands = [];
let commandsReceivedFromPlugin = false;

function connectElgatoStreamDeckSocket(port, inUUID, registerEvent, info, inActionInfo) {
  uuid = inUUID;
  actionInfo = JSON.parse(inActionInfo || '{}');
  actionContext = actionInfo.context || uuid;
  websocket = new WebSocket(`ws://127.0.0.1:${port}`);

  websocket.onopen = () => {
    websocket.send(
      JSON.stringify({
        event: registerEvent,
        uuid,
      })
    );
    requestSettings();
    requestGlobalSettings();
    sendToPlugin({ type: 'refreshCommands' });
    window.setTimeout(() => {
      if (!commandsReceivedFromPlugin) {
        loadCommandsFallback();
      }
    }, COMMANDS_FALLBACK_DELAY_MS);
  };

  websocket.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    handleMessage(data);
  };
}

function handleMessage(msg) {
  switch (msg.event) {
    case 'didReceiveSettings':
      settings = { ...DEFAULT_SETTINGS, ...(msg.payload.settings || {}) };
      syncForm();
      break;
    case 'didReceiveGlobalSettings':
      globalSettings = msg.payload.settings || {};
      syncGlobalForm();
      break;
    case 'sendToPropertyInspector':
      handlePluginPayload(msg.payload || {});
      break;
    default:
      break;
  }
}

function handlePluginPayload(payload) {
  switch (payload.type) {
    case 'commands': {
      commandsReceivedFromPlugin = true;
      applyCommands(payload.commands || []);
      setCommandsStatus(`Loaded ${commands.length} commands from plugin.`);
      break;
    }
    case 'commandsError':
      setCommandsStatus(payload.message || 'Failed to load commands from plugin.', true);
      break;
    case 'syncSettings':
      settings = { ...DEFAULT_SETTINGS, ...(payload.settings || {}) };
      globalSettings = payload.globalSettings || {};
      syncForm();
      syncGlobalForm();
      break;
    case 'cooldownStarted':
      // Placeholder hook for future cooldown visualization.
      break;
    default:
      break;
  }
}

async function loadCommandsFallback() {
  try {
    const response = await fetch('../commands.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const loaded = await response.json();
    if (!Array.isArray(loaded)) {
      throw new Error('commands.json did not contain an array');
    }
    applyCommands(loaded);
    setCommandsStatus(`Loaded ${commands.length} commands from commands.json fallback.`);
  } catch (err) {
    setCommandsStatus(`commands fallback failed: ${err.message}`, true);
  }
}

function applyCommands(loadedCommands) {
  commands = loadedCommands;
  const updated = applySelectionDefaults();
  populateStratagems();
  syncForm();
  if (updated) {
    setSettings();
  }
}

function requestSettings() {
  websocket.send(
    JSON.stringify({
      event: 'getSettings',
      context: actionContext,
    })
  );
}

function requestGlobalSettings() {
  websocket.send(
    JSON.stringify({
      event: 'getGlobalSettings',
      context: actionContext,
    })
  );
}

function setSettings() {
  websocket.send(
    JSON.stringify({
      event: 'setSettings',
      context: actionContext,
      payload: settings,
    })
  );
}

function setGlobalSettings() {
  websocket.send(
    JSON.stringify({
      event: 'setGlobalSettings',
      context: actionContext,
      payload: globalSettings,
    })
  );
}

function sendToPlugin(payload) {
  websocket.send(
    JSON.stringify({
      event: 'sendToPlugin',
      context: actionContext,
      payload,
    })
  );
}

function populateStratagems() {
  const select = document.getElementById('stratagem-select');
  if (!select) {
    return;
  }
  select.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Custom / not set';
  select.appendChild(defaultOption);

  commands.forEach((cmd) => {
    const option = document.createElement('option');
    option.value = cmd.id;
    option.textContent = `${cmd.id} (${cmd.code})`;
    select.appendChild(option);
  });

  if (settings.stratagemId && !commands.find((cmd) => cmd.id === settings.stratagemId)) {
    const preservedOption = document.createElement('option');
    preservedOption.value = settings.stratagemId;
    preservedOption.textContent = `${settings.stratagemId} (missing from commands.txt)`;
    select.appendChild(preservedOption);
  }

  select.value = settings.stratagemId || '';
}

function applySelectionDefaults() {
  let updated = false;

  if (!settings.stratagemId) {
    return updated;
  }

  const selected = commands.find((cmd) => cmd.id === settings.stratagemId);
  if (!selected) {
    return updated;
  }

  if (!settings.code) {
    settings.code = selected.code;
    updated = true;
  }

  if (!settings.cooldownSeconds) {
    settings.cooldownSeconds = selected.cooldownSeconds;
    updated = true;
  }

  return updated;
}

function syncForm() {
  document.getElementById('stratagem-select').value = settings.stratagemId || '';
  document.getElementById('code').value = settings.code || '';
  document.getElementById('cooldown').value = settings.cooldownSeconds || 0;
  document.getElementById('use-arrows').checked = Boolean(settings.useArrows);
  document.getElementById('skip-ctrl').checked = Boolean(settings.skipCtrl);
}

function syncGlobalForm() {
  document.getElementById('tcp-enabled').checked = Boolean(globalSettings.tcpEnabled);
  document.getElementById('tcp-whitelist').value = globalSettings.tcpWhitelist || '127.0.0.1';
  document.getElementById('tcp-port').value = globalSettings.tcpPort || '';
}

function setCommandsStatus(message, isError = false) {
  const status = document.getElementById('commands-status');
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function attachListeners() {
  document.getElementById('stratagem-select').addEventListener('change', (evt) => {
    settings.stratagemId = evt.target.value;
    const selected = commands.find((cmd) => cmd.id === settings.stratagemId);
    if (selected) {
      settings.code = selected.code;
      settings.cooldownSeconds = selected.cooldownSeconds;
      syncForm();
    }
    setSettings();
  });

  document.getElementById('code').addEventListener('input', (evt) => {
    settings.code = evt.target.value;
    setSettings();
  });

  document.getElementById('cooldown').addEventListener('input', (evt) => {
    settings.cooldownSeconds = Number.parseInt(evt.target.value, 10) || 0;
    setSettings();
  });

  document.getElementById('use-arrows').addEventListener('change', (evt) => {
    settings.useArrows = evt.target.checked;
    setSettings();
  });

  document.getElementById('skip-ctrl').addEventListener('change', (evt) => {
    settings.skipCtrl = evt.target.checked;
    setSettings();
  });

  document.getElementById('tcp-enabled').addEventListener('change', (evt) => {
    globalSettings.tcpEnabled = evt.target.checked;
    setGlobalSettings();
  });

  document.getElementById('tcp-whitelist').addEventListener('input', (evt) => {
    globalSettings.tcpWhitelist = evt.target.value;
    setGlobalSettings();
  });

  document.getElementById('tcp-port').addEventListener('input', (evt) => {
    globalSettings.tcpPort = Number.parseInt(evt.target.value, 10) || '';
    setGlobalSettings();
  });

  document.getElementById('refresh-commands').addEventListener('click', () => {
    sendToPlugin({ type: 'refreshCommands' });
    window.setTimeout(() => {
      if (!commandsReceivedFromPlugin) {
        loadCommandsFallback();
      }
    }, COMMANDS_FALLBACK_DELAY_MS);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  attachListeners();
  populateStratagems();
  loadCommandsFallback();
});
