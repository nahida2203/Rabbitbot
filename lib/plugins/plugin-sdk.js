import { RPC_ERROR_CODE, RPC_PROTOCOL_VERSION } from './rpc-protocol.js'

export const SDK_VERSION = '1.0.0'

export const SDK_CAPABILITIES = Object.freeze({
  LOGGER: 'logger',
  EVENTS: 'events',
  STORAGE: 'storage',
  HTTP: 'http',
  BOT: 'bot'
})

export class PluginSdkClient {
  constructor(options = {}) {
    this.pluginId = options.pluginId
    this.config = options.config || {}
    this.rpc = options.rpc
    this.capabilities = new Set(options.capabilities || [])
    this.permissions = Array.isArray(options.permissions) ? options.permissions : []
  }

  assertCapability(name) {
    if (!this.capabilities.has(name)) {
      const error = new Error(`Capability not granted: ${name}`)
      error.code = RPC_ERROR_CODE.PERMISSION_DENIED
      throw error
    }
  }

  createApi() {
    return {
      sdkVersion: SDK_VERSION,
      pluginId: this.pluginId,
      config: this.config,
      capabilities: Array.from(this.capabilities),
      permissions: [...this.permissions],
      meta: {
        handshake: async () => await this.rpc.request('sdk.meta.handshake', {
          pluginId: this.pluginId,
          sdkVersion: SDK_VERSION,
          protocolVersion: RPC_PROTOCOL_VERSION,
          capabilities: Array.from(this.capabilities),
          permissions: [...this.permissions]
        })
      },
      emit: async (event, data) => {
        this.assertCapability(SDK_CAPABILITIES.EVENTS)
        return await this.rpc.request('sdk.events.emit', { event, data })
      },
      logger: {
        info: async (...args) => await this._log('info', args),
        warn: async (...args) => await this._log('warn', args),
        error: async (...args) => await this._log('error', args),
        debug: async (...args) => await this._log('debug', args)
      },
      storage: {
        get: async (key, options = {}) => {
          this.assertCapability(SDK_CAPABILITIES.STORAGE)
          return await this.rpc.request('sdk.storage.get', { key, ...options })
        },
        set: async (key, value, options = {}) => {
          this.assertCapability(SDK_CAPABILITIES.STORAGE)
          return await this.rpc.request('sdk.storage.set', { key, value, options })
        },
        delete: async (key, options = {}) => {
          this.assertCapability(SDK_CAPABILITIES.STORAGE)
          return await this.rpc.request('sdk.storage.delete', { key, ...options })
        }
      },
      http: {
        get: async (url, options = {}) => {
          this.assertCapability(SDK_CAPABILITIES.HTTP)
          return await this.rpc.request('sdk.http.get', { url, options })
        },
        post: async (url, data, options = {}) => {
          this.assertCapability(SDK_CAPABILITIES.HTTP)
          return await this.rpc.request('sdk.http.post', { url, data, options })
        }
      },
      bot: {
        sendMessage: async (payload) => {
          this.assertCapability(SDK_CAPABILITIES.BOT)
          return await this.rpc.request('sdk.bot.sendMessage', payload)
        },
        call: async (payload) => {
          this.assertCapability(SDK_CAPABILITIES.BOT)
          return await this.rpc.request('sdk.bot.call', payload)
        }
      }
    }
  }

  async _log(level, args) {
    this.assertCapability(SDK_CAPABILITIES.LOGGER)
    return await this.rpc.request('sdk.logger.log', { level, args })
  }
}

export class PluginSdkHost {
  constructor(options = {}) {
    this.pluginId = options.pluginId
    this.rpc = options.rpc
    this.handlers = options.handlers || {}
    this.capabilities = Array.isArray(options.capabilities) ? options.capabilities : []
    this.permissions = Array.isArray(options.permissions) ? options.permissions : []
  }

  registerDefaultMethods() {
    this.rpc.registerMethod('sdk.meta.handshake', async ({ pluginId, sdkVersion, protocolVersion, capabilities, permissions }) => {
      return {
        pluginId: this.pluginId,
        hostPluginId: this.pluginId,
        sdkVersion: SDK_VERSION,
        protocolVersion: RPC_PROTOCOL_VERSION,
        client: {
          pluginId,
          sdkVersion,
          protocolVersion,
          capabilities: Array.isArray(capabilities) ? capabilities : [],
          permissions: Array.isArray(permissions) ? permissions : []
        },
        grantedCapabilities: [...this.capabilities],
        grantedPermissions: [...this.permissions]
      }
    })

    this.rpc.registerMethod('sdk.logger.log', async ({ level, args }) => {
      return await this.handlers.log?.({ level, args, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.events.emit', async ({ event, data }) => {
      return await this.handlers.emitEvent?.({ event, data, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.storage.get', async (params) => {
      return await this.handlers.storageGet?.({ ...params, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.storage.set', async (params) => {
      return await this.handlers.storageSet?.({ ...params, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.storage.delete', async (params) => {
      return await this.handlers.storageDelete?.({ ...params, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.http.get', async (params) => {
      return await this.handlers.httpGet?.({ ...params, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.http.post', async (params) => {
      return await this.handlers.httpPost?.({ ...params, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.bot.sendMessage', async (params) => {
      return await this.handlers.botSendMessage?.({ ...params, pluginId: this.pluginId })
    })

    this.rpc.registerMethod('sdk.bot.call', async (params) => {
      return await this.handlers.botCall?.({ ...params, pluginId: this.pluginId })
    })
  }
}
