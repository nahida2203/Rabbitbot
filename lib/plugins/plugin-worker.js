import { parentPort, workerData } from 'node:worker_threads'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import { PluginSdkClient, SDK_CAPABILITIES } from './plugin-sdk.js'
import { createRpcEvent, isRpcEnvelope } from './rpc-protocol.js'
import { RpcPeer, RpcTransport } from './rpc-transport.js'





class PluginWorker {
  constructor(data) {
    this.pluginId = data.pluginId
    this.entryPath = data.entryPath
    this.config = data.config || {}
    this.allowedModules = new Set(data.allowedModules || [])
    this.blockedModules = new Set(data.blockedModules || [])
    this.tsRuntimeEnabled = !!data.tsRuntimeEnabled

    this.context = null
    this.plugin = null
    this.nodeRequire = createRequire(import.meta.url)
    this.transport = parentPort ? new RpcTransport(parentPort) : null
    this.rpc = this.transport ? new RpcPeer(this.transport, { timeout: 15000 }) : null
    this.sdk = new PluginSdkClient({
      pluginId: this.pluginId,
      config: this.config,
      rpc: this.rpc,
      capabilities: Array.isArray(data.capabilities) ? data.capabilities : [
        SDK_CAPABILITIES.LOGGER,
        SDK_CAPABILITIES.EVENTS
      ],
      permissions: Array.isArray(data.permissions) ? data.permissions : []
    })

    this.init()
  }

  


  async init() {
    try {
      
      this.createSandbox()

      
      await this.loadPlugin()

      let handshake = null
      try {
        handshake = await this.sdk.createApi().meta.handshake()
      } catch (error) {
        handshake = {
          error: error?.message || String(error)
        }
      }

      
      this.sendMessage('loaded', {
        instance: this.serializeInstance(),
        handshake
      })

    } catch (error) {
      this.sendMessage('error', error.message)
    }
  }

  


  createSandbox() {
    
    const moduleStub = { exports: {} }
    const exportsStub = moduleStub.exports

    
    const sandbox = {
      
      console: this.createSafeConsole(),
      Buffer,
      URL,
      URLSearchParams,
      TextEncoder,
      TextDecoder,

      
      setTimeout: this.createSafeTimeout(),
      clearTimeout,
      setInterval: this.createSafeInterval(),
      clearInterval,
      setImmediate,
      clearImmediate,

      
      Promise,

      
      Math,
      Date,

      
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      TypeError,
      ReferenceError,
      SyntaxError,

      
      JSON,

      
      require: this.createSafeRequire(),

      
      pluginAPI: this.createPluginAPI(),
      sdk: this.sdk.createApi(),

      
      process: {
        env: { NODE_ENV: process.env.NODE_ENV },
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },

      
      module: moduleStub,
      exports: exportsStub
    }

    
    this.context = vm.createContext(sandbox, {
      name: `plugin-${this.pluginId}`,
      codeGeneration: {
        strings: false,
        wasm: false
      }
    })
  }

  


  createSafeConsole() {
    return {
      log: (...args) => this.sendMessage('log', { level: 'info', args }),
      info: (...args) => this.sendMessage('log', { level: 'info', args }),
      warn: (...args) => this.sendMessage('log', { level: 'warn', args }),
      error: (...args) => this.sendMessage('log', { level: 'error', args }),
      debug: (...args) => this.sendMessage('log', { level: 'debug', args })
    }
  }

  


  createSafeTimeout() {
    return (callback, delay, ...args) => {
      
      const maxDelay = 300000 
      const safeDelay = Math.min(delay || 0, maxDelay)

      return setTimeout(callback, safeDelay, ...args)
    }
  }

  


  createSafeInterval() {
    return (callback, delay, ...args) => {
      
      const minDelay = 100 
      const safeDelay = Math.max(delay || 0, minDelay)

      return setInterval(callback, safeDelay, ...args)
    }
  }

  


  createSafeRequire() {
    return (moduleName) => {
      
      if (this.blockedModules.has(moduleName)) {
        throw new Error(`模块被禁止访问: ${moduleName}`)
      }

      
      if (this.allowedModules.size > 0 && !this.allowedModules.has(moduleName)) {
        throw new Error(`模块未被允许: ${moduleName}`)
      }

      
      const dangerousModules = [
        'fs', 'child_process', 'cluster', 'worker_threads',
        'os', 'process', 'vm', 'repl', 'dgram', 'net',
        'tls', 'crypto', 'inspector'
      ]

      if (dangerousModules.includes(moduleName)) {
        throw new Error(`危险模块被禁止: ${moduleName}`)
      }

      try {
        return this.nodeRequire(moduleName)
      } catch (error) {
        throw new Error(`模块加载失败: ${moduleName} - ${error.message}`)
      }
    }
  }

  


  createPluginAPI() {
    return this.sdk.createApi()
  }

  


  async loadPlugin() {
    try {
      
      let code = await fs.readFile(this.entryPath, 'utf8')

      
      if (this.tsRuntimeEnabled && (this.entryPath.endsWith('.ts') || this.entryPath.endsWith('.tsx'))) {
        try {
          const req = this.nodeRequire
          const ts = req('typescript')
          const transpiled = ts.transpileModule(code, {
            fileName: this.entryPath,
            compilerOptions: {
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES2020,
              esModuleInterop: true
            }
          })
          code = transpiled.outputText
        } catch (e) {
          throw new Error(`沙箱运行时加载 TS 失败：${e?.message || e}。请安装开发依赖 typescript 或将 tsLoadMode 设为 build`) 
        }
      }

      
      const script = new vm.Script(code, {
        filename: this.entryPath,
        timeout: 10000 
      })

      const result = script.runInContext(this.context)

      
      let PluginClass
      if (this.context.module && this.context.module.exports) {
        PluginClass = this.context.module.exports.default || this.context.module.exports
      } else if (this.context.exports) {
        PluginClass = this.context.exports.default || this.context.exports
      } else {
        PluginClass = result
      }

      if (typeof PluginClass !== 'function' && typeof PluginClass !== 'object') {
        throw new Error('插件导出无效，需导出类或对象')
      }

      
      this.plugin = typeof PluginClass === 'function' ? new PluginClass({ pluginAPI: this.createPluginAPI() }) : PluginClass

      
      this.validatePlugin()

    } catch (error) {
      this.sendMessage('error', error.message)
      throw error
    }
  }

  validatePlugin() {
    if (!this.plugin) throw new Error('插件未加载')

    
    const requiredMethods = ['start', 'stop']
    for (const method of requiredMethods) {
      if (typeof this.plugin[method] !== 'function') {
        throw new Error(`插件缺少必要方法: ${method}`)
      }
    }

    
    if (this.plugin.events && typeof this.plugin.events !== 'object') {
      throw new Error('插件events属性必须是对象')
    }

    if (this.plugin.commands && typeof this.plugin.commands !== 'object') {
      throw new Error('插件commands属性必须是对象')
    }
  }

  


  serializeInstance() {
    if (!this.plugin) return null

    return {
      hasStart: typeof this.plugin.start === 'function',
      hasStop: typeof this.plugin.stop === 'function',
      hasDestroy: typeof this.plugin.destroy === 'function',
      hasEvents: !!this.plugin.events,
      hasCommands: !!this.plugin.commands,
      eventCount: this.plugin.events ? Object.keys(this.plugin.events).length : 0,
      commandCount: this.plugin.commands ? Object.keys(this.plugin.commands).length : 0,
      eventNames: this.plugin.events ? Object.keys(this.plugin.events) : [],
      commandNames: this.plugin.commands ? Object.keys(this.plugin.commands) : []
    }
  }

  


  sendMessage(type, data) {
    if (parentPort) {
      parentPort.postMessage({
        type,
        pluginId: this.pluginId,
        timestamp: Date.now(),
        data
      })
    }
  }

  


  handleMessage(message) {
    if (isRpcEnvelope(message)) {
      return
    }

    const { type, data } = message

    try {
      switch (type) {
        case 'start':
          this.startPlugin()
          break

        case 'stop':
          this.stopPlugin()
          break

        case 'destroy':
          this.destroyPlugin()
          break

        case 'call':
          this.callMethod(data)
          break

        default:
          break
      }
    } catch (error) {
      this.sendMessage('error', error.message)
    }
  }

  


  async startPlugin() {
    try {
      if (this.plugin && this.plugin.start) {
        await this.plugin.start()
      }
      this.sendMessage('started')
    } catch (error) {
      this.sendMessage('error', error.message)
    }
  }

  


  async stopPlugin() {
    try {
      if (this.plugin && this.plugin.stop) {
        await this.plugin.stop()
      }
      this.sendMessage('stopped')
    } catch (error) {
      this.sendMessage('error', error.message)
    }
  }

  


  async destroyPlugin() {
    try {
      if (this.plugin && this.plugin.destroy) {
        await this.plugin.destroy()
      }
      this.sendMessage('destroyed')
      process.exit(0)
    } catch (error) {
      this.sendMessage('error', error.message)
      process.exit(1)
    }
  }

  


  async callMethod({ kind = 'method', name, args = [], callId }) {
    try {
      let fn
      if (kind === 'event') {
        fn = this.plugin?.events?.[name]
      } else if (kind === 'command') {
        fn = this.plugin?.commands?.[name]
      } else {
        fn = this.plugin?.[name]
      }

      if (typeof fn !== 'function') {
        throw new Error(`方法不存在: ${kind}:${name}`)
      }

      const result = await fn.apply(this.plugin, args)
      this.sendMessage('call-result', { kind, name, result, callId })
      this.transport?.post(createRpcEvent('plugin.call.result', { kind, name, result, callId }))
    } catch (error) {
      this.sendMessage('call-error', { kind, name, error: error.message, callId })
      this.transport?.post(createRpcEvent('plugin.call.error', { kind, name, error: error.message, callId }))
    }
  }
}


process.on('uncaughtException', (error) => {
  if (parentPort) {
    parentPort.postMessage({
      type: 'error',
      data: `未捕获异常: ${error.message}`,
      timestamp: Date.now()
    })
  }
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  if (parentPort) {
    parentPort.postMessage({
      type: 'error',
      data: `未处理的Promise拒绝: ${reason}`,
      timestamp: Date.now()
    })
  }
  process.exit(1)
})


if (workerData) {
  const worker = new PluginWorker(workerData)

  
  if (parentPort) {
    parentPort.on('message', (message) => {
      worker.handleMessage(message)
    })
  }
}

export default PluginWorker