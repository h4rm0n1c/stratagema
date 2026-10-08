const childProcess = require('child_process');
const net = require('net');
const fs = require('fs');
const RESET_ROUND_ACTION = 'com.stratagema.sdplugin.reset-round';
const path = require('path');
const WebSocket = require('ws');
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
  cooldownSeconds: null,
  useArrows: false,
  skipCtrl: false,
};

const DEFAULT_GLOBAL_SETTINGS = {
  tcpEnabled: false,
  tcpWhitelist: '127.0.0.1',
  tcpPort: 7777,
};

class StratagemaPlugin {
  constructor({ now = Date.now } = {}) {
    this.now = now;
    this.cooldownTimer = null;
    this.roundGeneration = 0;
    this.sending = false;
    this.iconData = new Map();
    this.websocket = null;
    this.uuid = null;
    this.actionContexts = new Map();
    this.commandsError = null;
    this.commandsStatus = this.loadCommands();
    this.commands = this.commandsStatus.commands;
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
      try {
        this.routeMessage(JSON.parse(evt.data));
      } catch (err) {
        console.error(`Failed to handle Stream Deck message: ${err.message}`);
      }
    };

    this.websocket.onerror = (evt) => {
      console.error(`Stream Deck connection failed: ${evt.message}`);
    };

    this.websocket.onclose = () => {
      this.websocket = null;
      this.stopTcpServer();
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    };
  }

  loadCommands() {
    const commandsPath = path.resolve(path.join(__dirname, 'commands.txt'));
    this.log(`Loading commands from ${commandsPath}`);
    try {
      const fs = require('fs');
      const rawContents = fs.readFileSync(commandsPath, 'utf8');
      const loadedCommands = loadCommandsFromFile(commandsPath);
      const lineCount = rawContents.length === 0 ? 0 : rawContents.split(/\r?\n/).length;
      this.commandsError = null;
      this.log(`Loaded ${loadedCommands.length} commands from commands.txt`);
      return {
        commands: loadedCommands,
        sourcePath: commandsPath,
        error: null,
        lineCount,
        validCount: loadedCommands.length,
      };
    } catch (err) {
      this.commandsError = `Failed to load commands.txt from ${commandsPath}: ${err.message}`;
      this.log(this.commandsError);
      this.pushCommandsErrorToAllInspectors();
      return {
        commands: [],
        sourcePath: commandsPath,
        error: this.commandsError,
        lineCount: 0,
        validCount: 0,
      };
    }
  }

  routeMessage(message) {
    switch (message.event) {
      case 'keyDown':
        return this.onKeyDown(message.context, message.payload, message.action);
        break;
      case 'willAppear':
        this.onWillAppear(message.context, message.payload, message.action);
        break;
      case 'willDisappear':
        if (this.actionContexts.has(message.context)) this.actionContexts.get(message.context).visible = false;
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

  onWillAppear(context, payload = {}, action) {
    const ctx = this.ensureContext(context, payload.settings || {});
    ctx.settings = this.mergeSettings(payload.settings || {});
    ctx.action = action || ctx.action;
    ctx.visible = true;
    if (ctx.action === RESET_ROUND_ACTION) return;
    if (this.applyCommandDefaults(context, ctx.settings)) this.setSettings(context, ctx.settings);
    this.updateKeyImage(context, ctx.settings.stratagemId);
    this.pushCommandsToPropertyInspector(context);
  }

  onSendToPlugin(context, payload) {
    if (payload && payload.type === 'refreshCommands') {
      this.commandsStatus = this.loadCommands();
      this.commands = this.commandsStatus.commands;
      this.pushCommandsToPropertyInspector(context);
      this.pushCommandsToAllInspectors();
      this.refreshCommandDefaults();
    }
  }

  async onKeyDown(context, payload = {}, action) {
    const ctx = this.ensureContext(context, payload.settings || {});
    ctx.action = action || ctx.action;
    if (ctx.action === RESET_ROUND_ACTION) {
      this.resetRound();
      return;
    }
    if (this.remainingSeconds(ctx) > 0) {
      this.updateKeyImage(context, ctx.settings.stratagemId);
      this.pushExecutionStatus(context, 'Cooling down; press ignored.');
      return;
    }
    if (this.sending) {
      this.send({ event: 'showAlert', context });
      this.pushExecutionStatus(context, 'Sending a sequence; press ignored.');
      return;
    }
    const settings = ctx.settings;
    const command = this.getCommand(settings.stratagemId);
    const effectiveCode = settings.code || (command ? command.code : '');
    const cooldownSeconds = Number(settings.cooldownSeconds ?? (command ? command.cooldownSeconds : 0));
    const commandName = command ? command.id : settings.stratagemId || 'custom';
    if (!effectiveCode || !Number.isFinite(cooldownSeconds) || cooldownSeconds < 0) {
      const message = !effectiveCode ? 'No stratagem code configured; showing alert.' : 'Invalid cooldown; use a non-negative number.';
      this.log(message);
      this.pushExecutionStatus(context, message);
      this.send({ event: 'showAlert', context });
      return;
    }
    this.sending = true;
    const generation = this.roundGeneration;
    this.log(`Triggering stratagem: ${settings.stratagemId || 'custom'} (${effectiveCode})`);
    this.pushExecutionStatus(context, 'Sending sequence…');
    try {
      await this.invokeHelper(context, effectiveCode, settings);
      // A reset during playback must not recreate a cooldown from the old round.
      if (generation === this.roundGeneration && cooldownSeconds > 0) {
        ctx.state.cooldownUntil = this.now() + cooldownSeconds * 1000;
        this.startCooldownTimer();
      }
      this.updateKeyImage(context, ctx.settings.stratagemId);
      this.pushExecutionStatus(context);
      this.broadcastTcp(`[${effectiveCode}][${commandName}][${cooldownSeconds}]`);
    } catch (err) {
      this.log(`Helper error: ${err.message}`);
      this.pushExecutionStatus(context, `Sequence failed: ${err.message}`);
      this.send({ event: 'showAlert', context });
    } finally {
      this.sending = false;
    }
  }

  remainingSeconds(ctx) {
    return Math.max(0, Math.ceil(((ctx.state.cooldownUntil || 0) - this.now()) / 1000));
  }

  pushExecutionStatus(context, message) {
    const ctx = this.actionContexts.get(context);
    if (!ctx || ctx.action === RESET_ROUND_ACTION) return;
    const remaining = this.remainingSeconds(ctx);
    this.sendToPropertyInspector(context, {
      type: 'executionStatus', remainingSeconds: remaining,
      message: message || (remaining ? `Cooling down: ${remaining}s remaining.` : 'Ready.'),
    });
  }

  startCooldownTimer() {
    if (this.cooldownTimer) return;
    this.cooldownTimer = setInterval(() => this.tickCooldowns(), 250);
    this.cooldownTimer.unref();
  }

  tickCooldowns() {
    let active = false;
    for (const [context, ctx] of this.actionContexts) {
      if (!ctx.state.cooldownUntil) continue;
      const remaining = this.remainingSeconds(ctx);
      active ||= remaining > 0;
      if (remaining === 0) delete ctx.state.cooldownUntil;
      if (ctx.visible !== false && ctx.state.renderedRemaining !== remaining) {
        this.updateKeyImage(context, ctx.settings.stratagemId);
        this.pushExecutionStatus(context);
      }
    }
    if (!active) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  resetRound() {
    this.roundGeneration += 1;
    clearInterval(this.cooldownTimer);
    this.cooldownTimer = null;
    for (const [context, ctx] of this.actionContexts) {
      delete ctx.state.cooldownUntil;
      delete ctx.state.renderedRemaining;
      if (ctx.action === RESET_ROUND_ACTION) continue;
      if (ctx.visible !== false) this.updateKeyImage(context, ctx.settings.stratagemId);
      this.pushExecutionStatus(context, 'Round reset. Ready.');
    }
    this.log('Round reset; all cooldowns cleared.');
  }

  onReceiveSettings(context, settings) {
    const ctx = this.ensureContext(context, settings);
    ctx.settings = this.mergeSettings(settings);
    if (ctx.action === RESET_ROUND_ACTION) return;
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
    this.pushExecutionStatus(context);
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
      settings.cooldownSeconds == null ||
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
    let image = resolveIconPath(command);
    const ctx = this.actionContexts.get(context);
    const remaining = ctx ? this.remainingSeconds(ctx) : 0;
    if (ctx) ctx.state.renderedRemaining = remaining;
    if (remaining > 0) {
      if (!this.iconData.has(image)) {
        try {
          this.iconData.set(image, `data:image/png;base64,${fs.readFileSync(path.join(__dirname, image)).toString('base64')}`);
        } catch { this.iconData.set(image, ''); }
      }
      const icon = this.iconData.get(image);
      const label = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
      // Preserve the category-colored frame; dim the artwork behind the timer.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" fill="#242424"/>${icon ? `<image xlink:href="${icon}" width="144" height="144"/>` : ''}<rect x="8" y="8" width="128" height="128" fill="#161816" opacity="0.82"/><text x="72" y="87" text-anchor="middle" font-family="Bahnschrift SemiCondensed,Arial Narrow,Arial,sans-serif" font-size="44" font-weight="bold" fill="#ffffff">${label}</text></svg>`;
      image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }
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
    this.sendToPropertyInspector(context, {
      type: 'commandsStatus',
      ...this.commandsStatus,
    });
    if (this.commandsError) {
      this.sendToPropertyInspector(context, {
        type: 'commandsError',
        message: this.commandsError,
      });
    }
  }

  pushCommandsToAllInspectors() {
    this.actionContexts.forEach((_ctx, context) => {
      this.pushCommandsToPropertyInspector(context);
    });
  }

  pushCommandsErrorToAllInspectors() {
    if (!this.commandsError) {
      return;
    }
    this.actionContexts.forEach((_ctx, context) => {
      this.sendToPropertyInspector(context, {
        type: 'commandsError',
        message: this.commandsError,
      });
    });
  }

  refreshCommandDefaults() {
    this.actionContexts.forEach((ctx, context) => {
      if (ctx.action === RESET_ROUND_ACTION) return;
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
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
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
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.websocket.send(JSON.stringify(payload));
  }

  log(message) {
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log(message);
    }
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

let plugin;

function connectElgatoStreamDeckSocket(port, uuid, registerEvent) {
  plugin = plugin || new StratagemaPlugin();
  plugin.connect(port, uuid, registerEvent);
  return plugin;
}

function parseLaunchArgs(args) {
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i].startsWith('-') || args[i + 1] === undefined) {
      throw new Error(`Missing value for launch argument ${args[i]}`);
    }
    values[args[i]] = args[i + 1];
  }
  const port = Number(values['-port']);
  const uuid = values['-pluginUUID'];
  const registerEvent = values['-registerEvent'];
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !uuid || registerEvent !== 'registerPlugin') {
    throw new Error('Expected -port <1-65535> -pluginUUID <uuid> -registerEvent registerPlugin');
  }
  return { port, uuid, registerEvent };
}

if (require.main === module) {
  try {
    const { port, uuid, registerEvent } = parseLaunchArgs(process.argv.slice(2));
    connectElgatoStreamDeckSocket(port, uuid, registerEvent);
  } catch (err) {
    console.error(`Unable to start Stratagema: ${err.message}`);
    process.exitCode = 1;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    StratagemaPlugin,
    buildHelperArgs,
    buildHelperSpawnOptions,
    connectElgatoStreamDeckSocket,
    parseLaunchArgs,
  };
}
