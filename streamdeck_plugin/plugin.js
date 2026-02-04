const childProcess = require('child_process');
const net = require('net');
const path = require('path');
const { loadCommandsFromFile, resolveIconPath } = require('./shared/commands');

function buildHelperArgs(code, settings = {}) {
  const args = ['--code', code];
  if (settings.useArrows) {
    args.push('--arrows');
  }
  if (settings.skipCtrl) {
    args.push('--no-ctrl');
  }
  return args;
}

function buildHelperSpawnOptions(platform = process.platform) {
  return {
    windowsHide: true,
    detached: platform === 'win32',
    stdio: ['ignore', 'ignore', 'pipe'],
  };
}

const DEFAULT_SETTINGS = {
  stratagemId: '',
  code: '',
  cooldownSeconds: 0,
  useArrows: false,
  skipCtrl: false,
};

const DEFAULT_GLOBAL_SETTINGS = {
  tcpEnabled: false,
  tcpWhitelist: '127.0.0.1',
  tcpPort: 7777,
};

class StratagemaPlugin {
  constructor() {
    this.websocket = null;
    this.uuid = null;
    this.actionContexts = new Map();
    this.commands = this.loadCommands();
    this.helperPath = this.resolveHelperPath();
    this.globalSettings = { ...DEFAULT_GLOBAL_SETTINGS };
    this.tcpServer = null;
    this.tcpClients = new Set();
    this.tcpPort = null;
  }

  connect(port, uuid, registerEvent) {
    this.uuid = uuid;
    this.websocket = new WebSocket(`ws://127.0.0.1:${port}`);

    this.websocket.onopen = () => {
      this.send({ event: registerEvent, uuid });
      this.send({ event: 'getGlobalSettings', context: uuid });
    };

    this.websocket.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      this.routeMessage(data);
    };

    this.websocket.onclose = () => {
      this.websocket = null;
    };
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, 'commands.txt');
    try {
      return loadCommandsFromFile(commandsPath);
    } catch (err) {
      this.log(`Failed to load commands.txt: ${err.message}`);
      return [];
    }
  }

  routeMessage(message) {
    switch (message.event) {
      case 'keyDown':
        this.onKeyDown(message.context, message.payload);
        break;
      case 'willAppear':
        this.onWillAppear(message.context, message.payload);
        break;
      case 'sendToPlugin':
        this.onSendToPlugin(message.context, message.payload);
        break;
      case 'didReceiveSettings':
        this.onReceiveSettings(message.context, message.payload.settings || {});
        break;
      case 'didReceiveGlobalSettings':
        this.onReceiveGlobalSettings(message.payload.settings || {});
        break;
      case 'propertyInspectorDidAppear':
        this.onPropertyInspectorDidAppear(message.context);
        break;
      default:
        break;
    }
  }

  onWillAppear(context, payload) {
    const settings = this.mergeSettings(payload.settings || {});
    this.actionContexts.set(context, {
      settings,
      state: {},
    });
    if (this.applyCommandDefaults(context, settings)) {
      this.setSettings(context, settings);
    }
    this.updateKeyImage(context, settings.stratagemId);
    this.pushCommandsToPropertyInspector(context);
  }

  onSendToPlugin(context, payload) {
    if (payload && payload.type === 'refreshCommands') {
      this.commands = this.loadCommands();
      this.pushCommandsToPropertyInspector(context);
      this.refreshCommandDefaults();
    }
  }

  onKeyDown(context, payload) {
    const ctx = this.ensureContext(context, payload.settings || {});
    const settings = ctx.settings;
    const command = this.getCommand(settings.stratagemId);
    const effectiveCode = settings.code || (command ? command.code : '');
    const cooldownSeconds = settings.cooldownSeconds || (command ? command.cooldownSeconds : 0);
    const commandName = command ? command.id : settings.stratagemId || 'custom';

    if (!effectiveCode) {
      this.log('No stratagem code configured; showing alert.');
      this.send({ event: 'showAlert', context });
      return;
    }

    this.log(`Triggering stratagem: ${settings.stratagemId || 'custom'} (${effectiveCode})`);

    this.invokeHelper(context, effectiveCode, settings)
      .then(() => {
        this.send({ event: 'showOk', context });
        this.sendToPropertyInspector(context, {
          type: 'cooldownStarted',
          cooldownSeconds,
          startedAt: Date.now(),
        });
        this.broadcastTcp(`[${effectiveCode}][${commandName}][${cooldownSeconds}]`);
      })
      .catch((err) => {
        this.log(`Helper error: ${err.message}`);
        this.send({ event: 'showAlert', context });
      });
  }

  onReceiveSettings(context, settings) {
    const ctx = this.ensureContext(context, settings);
    ctx.settings = this.mergeSettings(settings);
    if (this.applyCommandDefaults(context, ctx.settings)) {
      this.setSettings(context, ctx.settings);
    }
    this.updateKeyImage(context, ctx.settings.stratagemId);
  }

  onReceiveGlobalSettings(settings) {
    this.applyGlobalSettings(settings || {});
  }

  onPropertyInspectorDidAppear(context) {
    const ctx = this.ensureContext(context, {});
    this.sendToPropertyInspector(context, {
      type: 'syncSettings',
      settings: ctx.settings,
      globalSettings: this.globalSettings || {},
    });
    this.pushCommandsToPropertyInspector(context);
  }

  ensureContext(context, settings) {
    if (!this.actionContexts.has(context)) {
      this.actionContexts.set(context, {
        settings: this.mergeSettings(settings),
        state: {},
      });
    }
    return this.actionContexts.get(context);
  }

  mergeSettings(settings) {
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
    };
  }

  applyCommandDefaults(context, settings) {
    const ctx = this.ensureContext(context, settings);
    const state = ctx.state || {};
    if (!settings.stratagemId) {
      state.lastCommandId = null;
      ctx.state = state;
      return false;
    }

    const command = this.getCommand(settings.stratagemId);
    if (!command) {
      return false;
    }

    const previousCommand = state.lastCommandId ? this.getCommand(state.lastCommandId) : null;
    const codeIsDefault = !settings.code || (previousCommand && settings.code === previousCommand.code);
    const cooldownIsDefault =
      !settings.cooldownSeconds ||
      (previousCommand && settings.cooldownSeconds === previousCommand.cooldownSeconds);

    let updated = false;
    if (codeIsDefault) {
      settings.code = command.code;
      updated = true;
    }
    if (cooldownIsDefault) {
      settings.cooldownSeconds = command.cooldownSeconds;
      updated = true;
    }

    state.lastCommandId = settings.stratagemId;
    ctx.state = state;
    return updated;
  }

  getCommand(id) {
    if (!id) {
      return null;
    }
    return this.commands.find((cmd) => cmd.id === id) || null;
  }

  updateKeyImage(context, stratagemId) {
    const command = this.getCommand(stratagemId);
    const image = resolveIconPath(command);
    this.send({
      event: 'setImage',
      context,
      payload: {
        image,
        target: 0,
      },
    });
  }

  pushCommandsToPropertyInspector(context) {
    this.sendToPropertyInspector(context, {
      type: 'commands',
      commands: this.commands,
    });
  }

  refreshCommandDefaults() {
    this.actionContexts.forEach((ctx, context) => {
      if (this.applyCommandDefaults(context, ctx.settings)) {
        this.setSettings(context, ctx.settings);
      }
      this.updateKeyImage(context, ctx.settings.stratagemId);
    });
  }

  setSettings(context, settings) {
    this.send({
      event: 'setSettings',
      context,
      payload: settings,
    });
  }

  resolveHelperPath() {
    const helperName = process.platform === 'win32' ? 'stratagema_macro_helper.exe' : 'stratagema_macro_helper';
    return path.join(__dirname, 'helper', helperName);
  }

  invokeHelper(context, code, settings) {
    return new Promise((resolve, reject) => {
      const args = buildHelperArgs(code, settings);
      const spawnOptions = buildHelperSpawnOptions();

      const child = childProcess.spawn(this.helperPath, args, spawnOptions);

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        const message = stderr.trim() || `Helper exited with code ${code}`;
        reject(new Error(message));
      });
    });
  }

  sendToPropertyInspector(context, payload) {
    if (!this.websocket) {
      return;
    }
    this.websocket.send(
      JSON.stringify({
        event: 'sendToPropertyInspector',
        context,
        payload,
      })
    );
  }

  send(payload) {
    if (!this.websocket) {
      return;
    }
    this.websocket.send(JSON.stringify(payload));
  }

  log(message) {
    this.send({
      event: 'logMessage',
      payload: {
        message,
      },
    });
  }

  applyGlobalSettings(settings) {
    this.globalSettings = {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...settings,
    };
    this.reconfigureTcpServer();
  }

  reconfigureTcpServer() {
    if (!this.globalSettings.tcpEnabled) {
      this.stopTcpServer();
      return;
    }

    const port = Number.parseInt(this.globalSettings.tcpPort, 10);
    if (!port) {
      this.stopTcpServer();
      return;
    }

    if (this.tcpServer && this.tcpPort === port) {
      return;
    }

    this.stopTcpServer();
    this.startTcpServer(port);
  }

  startTcpServer(port) {
    this.tcpPort = port;
    this.tcpServer = net.createServer((socket) => {
      const remoteAddress = socket.remoteAddress;
      if (!this.isAllowedAddress(remoteAddress)) {
        socket.destroy();
        return;
      }

      this.tcpClients.add(socket);
      socket.on('close', () => {
        this.tcpClients.delete(socket);
      });
      socket.on('error', () => {
        this.tcpClients.delete(socket);
      });
    });

    this.tcpServer.on('error', (err) => {
      this.log(`TCP server error: ${err.message}`);
    });

    this.tcpServer.listen(port, '0.0.0.0', () => {
      this.log(`TCP server listening on port ${port}`);
    });
  }

  stopTcpServer() {
    this.tcpClients.forEach((socket) => {
      socket.destroy();
    });
    this.tcpClients.clear();
    if (this.tcpServer) {
      this.tcpServer.close();
      this.tcpServer = null;
    }
    this.tcpPort = null;
  }

  isAllowedAddress(address) {
    if (!address) {
      return false;
    }
    let normalized = address;
    if (normalized.startsWith('::ffff:')) {
      normalized = normalized.slice('::ffff:'.length);
    }
    if (normalized === '::1') {
      normalized = '127.0.0.1';
    }

    const whitelist = (this.globalSettings.tcpWhitelist || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (whitelist.length === 0) {
      return false;
    }
    return whitelist.includes(normalized);
  }

  broadcastTcp(message) {
    if (!this.tcpServer || !this.globalSettings.tcpEnabled) {
      return;
    }
    const payload = `${message}\n`;
    this.tcpClients.forEach((socket) => {
      if (socket.destroyed) {
        this.tcpClients.delete(socket);
        return;
      }
      socket.write(payload);
    });
  }
}

const plugin = new StratagemaPlugin();

function connectElgatoStreamDeckSocket(port, uuid, registerEvent) {
  plugin.connect(port, uuid, registerEvent);
}

if (typeof module !== 'undefined') {
  module.exports = {
    StratagemaPlugin,
    buildHelperArgs,
    buildHelperSpawnOptions,
    connectElgatoStreamDeckSocket,
  };
}
