const { spawn } = require('child_process');
const path = require('path');
const { loadCommandsFromFile, resolveIconPath } = require('./shared/commands');

const DEFAULT_SETTINGS = {
  stratagemId: '',
  code: '',
  cooldownSeconds: 0,
  useArrows: false,
  skipCtrl: false,
};

class StratagemaPlugin {
  constructor() {
    this.websocket = null;
    this.uuid = null;
    this.actionContexts = new Map();
    this.commands = this.loadCommands();
    this.helperPath = this.resolveHelperPath();
  }

  connect(port, uuid, registerEvent) {
    this.uuid = uuid;
    this.websocket = new WebSocket(`ws://127.0.0.1:${port}`);

    this.websocket.onopen = () => {
      this.send({ event: registerEvent, uuid });
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
    this.updateKeyImage(context, settings.stratagemId);
    this.pushCommandsToPropertyInspector(context);
  }

  onSendToPlugin(context, payload) {
    if (payload && payload.type === 'refreshCommands') {
      this.commands = this.loadCommands();
      this.pushCommandsToPropertyInspector(context);
    }
  }

  onKeyDown(context, payload) {
    const ctx = this.ensureContext(context, payload.settings || {});
    const settings = ctx.settings;
    const command = this.getCommand(settings.stratagemId);
    const effectiveCode = settings.code || (command ? command.code : '');
    const cooldownSeconds = settings.cooldownSeconds || (command ? command.cooldownSeconds : 0);

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
      })
      .catch((err) => {
        this.log(`Helper error: ${err.message}`);
        this.send({ event: 'showAlert', context });
      });
  }

  onReceiveSettings(context, settings) {
    const ctx = this.ensureContext(context, settings);
    ctx.settings = this.mergeSettings(settings);
    this.updateKeyImage(context, ctx.settings.stratagemId);
  }

  onReceiveGlobalSettings(settings) {
    this.globalSettings = settings || {};
  }

  onPropertyInspectorDidAppear(context) {
    this.pushCommandsToPropertyInspector(context);
    const ctx = this.ensureContext(context, {});
    this.sendToPropertyInspector(context, {
      type: 'syncSettings',
      settings: ctx.settings,
      globalSettings: this.globalSettings || {},
    });
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

  resolveHelperPath() {
    const helperName = process.platform === 'win32' ? 'stratagema_macro_helper.exe' : 'stratagema_macro_helper';
    return path.join(__dirname, 'helper', helperName);
  }

  invokeHelper(context, code, settings) {
    return new Promise((resolve, reject) => {
      const args = ['--code', code];
      if (settings.useArrows) {
        args.push('--arrows');
      }
      if (settings.skipCtrl) {
        args.push('--no-ctrl');
      }

      const child = spawn(this.helperPath, args, {
        windowsHide: true,
      });

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
}

const plugin = new StratagemaPlugin();

function connectElgatoStreamDeckSocket(port, uuid, registerEvent) {
  plugin.connect(port, uuid, registerEvent);
}

module.exports = {
  connectElgatoStreamDeckSocket,
};
