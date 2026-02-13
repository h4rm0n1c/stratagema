const DEFAULT_SETTINGS = {
  stratagemId: '',
  code: '',
  cooldownSeconds: 0,
  useArrows: false,
  skipCtrl: false,
};

const COMMANDS_FALLBACK_DELAY_MS = 800;

const EMBEDDED_COMMANDS_TXT = `
machine_gun|saswd|410
anti_material_rifle|sadws|410
stalwart|saswwa|410
expendable_anti_tank|ssawd|59
recoiless_rifle|sadda|410
flamethrower|sawsw|410
autocannon|saswwd|410
heavy_machine_gun|sawss|410
airburst_rocket_launcher|swwad|410
commando|sawsd|102
railgun|sdswad|410
spear|sswss|410
wasp|sswsd|410
orbital_gatling_barrage|dsaww|59
orbital_airburst_strike|ddd|85
orbital_120mm_he_barrage|ddsads|153
orbital_380mm_he_barrage|dswwass|205
orbital_walking_barrage|dsdsds|205
orbital_laser|dswds|256
orbital_napalm_barrage|ddsadw|205
orbital_railcannon_strike|dwssd|179
eagle_strafing_run|wdd|6
eagle_airstrike|wdsd|6
eagle_cluster_bomb|wdssd|6
eagle_napalm_airstrike|wdsw|6
jump_pack|swwsw|410
eagle_smoke_strike|wdws|6
eagle_110mm_rocket_pods|wdwa|6
eagle_500kg_bomb|wdsss|6
fast_recon_vehicle|asdsdsw|410
orbital_precision_strike|ddw|76
orbital_gas_strike|ddsd|64
orbital_ems_strike|ddas|64
orbital_smoke_strike|ddsw|85
hmg_emplacement|swadda|153
shield_relay|ssadad|76
tesla_tower|swdwad|102
ap_minefield|sawd|120
supply_pack|saswws|410
grenade_launcher|sawas|410
laser_cannon|saswa|410
incendiary_mines|saas|120
guard_dog_rover|swawdd|410
ballistic_shield_backpack|sawwd|256
arc_thrower|sdswaa|410
at_mines|saww|120
quasar|sswad|410
shield_generator_pack|swadad|410
gas_mines|saad|164
machine_gun_sentry|swddw|76
gatling_sentry|swda|128
mortar_sentry|swdds|153
guard_dog|swawds|410
autocannon_sentry|swdwaw|128
rocket_sentry|swdda|128
ems_mortar|swdsd|153
patriot_exosuit|asdwass|570
emancipator_exosuit|asdwasw|570
sterilizer|sawsa|410
dog_breath|swawdw|410
directional_shield|swadww|256
at_emplacement|swaddd|153
flame_sentry|swdsww|128
reinforce|wsdaw|0
sos_beacon|wsaw|0
resupply|sswd|171
eagle_rearm|wwawd|0
sssd_delivery|sssww|0
prospecting_drill|ssadss|0
super_earth_flag|swsw|0
hellbomb|swaswdsw|0
upload_data|adwww|0
seismic_probe|wwaass|0
seaf_artillery|dwws|0
hive_breaker_drill|awsdss|0
porta_hellbomb|sdwww|256
hover_pack|swwsad|410
grenadier_battlement|sdsad|102
one_true_flag|saddw|410
de_escalator|adwad|410
guard_dog_stun|swawda|410
warp_pack|sadsad|410
plas_epoch|sawad|410
laser_turret|swdswd|410
`;

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
      break;
    }
    case 'commandsStatus':
      renderCommandsStatus(payload);
      break;
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
    const parseCommands = window.Commands && typeof window.Commands.parseCommands === 'function'
      ? window.Commands.parseCommands
      : null;
    if (parseCommands) {
      const embeddedCommands = parseCommands(EMBEDDED_COMMANDS_TXT, console);
      if (embeddedCommands.length > 0) {
        applyCommands(embeddedCommands);
        setCommandsStatus(`Loaded ${commands.length} commands from embedded commands.txt fallback.`);
        return;
      }
    }

    if (Array.isArray(window.StratagemaEmbeddedCommands) && window.StratagemaEmbeddedCommands.length > 0) {
      applyCommands(window.StratagemaEmbeddedCommands);
      setCommandsStatus(`Loaded ${commands.length} embedded commands fallback.`);
      return;
    }

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
  status.classList.toggle('warning', isError);
}

function renderCommandsStatus(statusPayload) {
  const sourcePath = statusPayload.sourcePath || 'commands.txt';
  if (statusPayload.error) {
    setCommandsStatus(`Warning: ${statusPayload.error}`, true);
    return;
  }

  if (!statusPayload.validCount) {
    setCommandsStatus(
      `Warning: parsed 0 valid commands from ${sourcePath}. Expected format: id|code|cooldownSeconds`,
      true
    );
    return;
  }

  setCommandsStatus(`Loaded ${statusPayload.validCount} commands from ${sourcePath}.`);
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
