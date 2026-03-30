import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'
import { Worker } from 'node:worker_threads'
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import chokidar from 'chokidar'
import lodash from 'lodash'
import eventBus from '../common/event-bus.js'
import hotReload from '../common/hot-reload.js'
import { ulid } from 'ulid'
import axios from 'axios'
import cacheManager from '../cache/cache-manager.js'
import monitorEngine from '../common/monitor-engine.js'
import { loggerManager } from '../common/logger.js'
import { createRequire } from 'node:module'
import { PluginSdkHost } from './plugin-sdk.js'
import { resolvePluginCapabilities } from './plugin-capabilities.js'
import { RpcPeer, RpcTransport } from './rpc-transport.js'

const logger = loggerManager.getLogger('PluginEngine')

const __dirname = path.dirname(fileURLToPath(import.meta.url))




const PluginStatus = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  LOADED: 'loaded',
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error',
  DISABLED: 'disabled'
}




const PluginType = {
  SYSTEM: 'system',
  CORE: 'core',
  EXTENSION: 'extension',
  THEME: 'theme',
  ADAPTER: 'adapter'
}




class Semaphore {
  constructor(max = 1) {
    this.max = Math.max(1, max)
    this.current = 0
    this.queue = []
  }

  
  acquire() {
    return new Promise((resolve) => {
      if (this.current < this.max) {
        this.current++
        resolve(() => this._release())
      } else {
        this.queue.push(resolve)
      }
    })
  }

  _release() {
    if (this.current > 0) this.current--
    if (this.queue.length > 0) {
      const nextResolve = this.queue.shift()
      this.current++
      nextResolve(() => this._release())
    }
  }
}




class PluginInfo {
  constructor(data = {}) {
    this.id = data.id || ''
    this.name = data.name || ''
    this.version = data.version || '1.0.0'
    this.description = data.description || ''
    this.author = data.author || ''
    this.type = data.type || PluginType.EXTENSION
    this.priority = data.priority || 50
    this.dependencies = data.dependencies || []
    this.permissions = data.permissions || []
    this.config = data.config || {}
    this.entry = data.entry || 'index.js'
    this.language = data.language || (this.entry?.endsWith('.ts') || this.entry?.endsWith('.tsx') ? 'ts' : (this.entry?.endsWith('.py') ? 'python' : 'js'))
    this.path = data.path || ''
    this.status = PluginStatus.UNLOADED
    this.instance = null
    this.worker = null
    this.metadata = {
      loadTime: null,
      startTime: null,
      stopTime: null,
      errorCount: 0,
      lastError: null,
      ...data.metadata
    }
  }

  


  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      type: this.type,
      priority: this.priority,
      dependencies: this.dependencies,
      permissions: this.permissions,
      config: this.config,
      entry: this.entry,
      language: this.language,
      path: this.path,
      status: this.status,
      metadata: this.metadata
    }
  }
}





class PluginEngine {
  constructor() {
    
    this.plugins = new Map()
    
    
    this.dependencies = new Map()
    
    
    this.loadOrder = []
    
    
    this.pluginDirs = new Set()
    
    
    this._initialized = false
    this._destroyed = false
    this._shutdownHandlerId = null
    this._hotReloadHookAdded = false
    
    
    this.config = {
      enableSandbox: false,
      enableHotReload: true,
      maxWorkers: os.cpus()?.length || 1,
      workerTimeout: 30000,
      autoLoad: true,
      autoStart: true,
      pluginTimeout: 5000,
      maxMemory: 128 * 1024 * 1024, 
      allowedModules: ['lodash', 'axios', 'moment'],
      blockedModules: ['fs', 'child_process', 'cluster'],
      
      rateLimit: { enabled: true, refillRate: 10, bucketCapacity: 20 }, 
      circuitBreaker: { enabled: true, failureThreshold: 5, windowMs: 30000, halfOpenAfter: 15000 },
      
      scanDepth: 3,
      entryCandidates: ['index.js', 'index.ts', 'index.mjs', 'index.cjs', 'index.py', 'main.js', 'main.ts', 'main.py'],
      tsLoadMode: 'auto'
    }
    
    
    this.workers = new Map()
    this.workerQueue = []
    
    
    this.pendingCalls = new Map()
    
    
    this.eventHandlers = new Map()
    
    
    this.commandHandlers = new Map()
    
    
    this.middlewares = []

    
    this.limiters = new Map()
    this.breakers = new Map()
    
    
    this.coreVersion = '0.0.0'
    this.versionRegistryPath = path.join(process.cwd(), 'data', 'plugins-versions.json')
    this.versionRegistry = { core: { version: this.coreVersion }, plugins: {} }

    
    this.stats = {
      loaded: 0,
      running: 0,
      errors: 0,
      commands: 0,
      events: 0,
      calls: 0,
      callErrors: 0,
      timeouts: 0,
      rateLimited: 0,
      breakerOpen: 0,
      startTime: Date.now()
    }
    
    
    this.hooks = {
      beforeLoad: [],
      afterLoad: [],
      beforeStart: [],
      afterStart: [],
      beforeStop: [],
      afterStop: [],
      beforeUnload: [],
      afterUnload: []
    }

    
    this._pluginWatchers = new Map()
    this._reloadTimers = new Map()
  }

  


  async init(config = {}) {
    this.config = { ...this.config, ...config }

    
    if (this._initialized) {
      try {
        logger?.info?.(`插件引擎已初始化，应用配置更新: enableSandbox=${this.config.enableSandbox}, hotReload=${this.config.enableHotReload}, maxWorkers=${this.config.maxWorkers}, tsLoadMode=${this.config.tsLoadMode}`)
      } catch {}
      return
    }

    this._destroyed = false
    try {
      logger?.info?.(`插件引擎配置: enableSandbox=${this.config.enableSandbox}, hotReload=${this.config.enableHotReload}, maxWorkers=${this.config.maxWorkers}, tsLoadMode=${this.config.tsLoadMode}`)
    } catch {}
   
   await this._ensureDataDir()
   await this._loadVersionRegistry().catch(() => {})
   
   try {
     const corePkg = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8'))
     this.coreVersion = corePkg.version || this.coreVersion
     this.versionRegistry.core = { version: this.coreVersion, lastSeen: Date.now() }
     await this._saveVersionRegistry()
   } catch {}
    
    
    this.addPluginDir(path.join(process.cwd(), 'plugins'))
    
    
    if (!this._shutdownHandlerId) {
      this._shutdownHandlerId = eventBus.register('system:shutdown', () => this.destroy(), {
        namespace: 'plugin-engine',
        priority: 90
      })
    }
    
    
    if (this.config.enableHotReload && !this._hotReloadHookAdded) {
      hotReload.addHook('afterReload', async ({ moduleId }) => {
        
        if (this._destroyed) return
        await this.handleModuleReload(moduleId)
      })
      this._hotReloadHookAdded = true
    }
    
    logger?.info('插件引擎初始化完成')
    
    
    if (this.config.autoLoad !== false) {
      logger?.info('开始扫描插件目录...')
      await this.scanPlugins()
      
      const pluginIds = Array.from(this.plugins.keys())
      if (pluginIds.length > 0) {
        logger?.info(`发现 ${pluginIds.length} 个插件，开始加载...`)
        
        for (const [id, plugin] of this.plugins.entries()) {
        }
        await this.loadPluginsParallel(pluginIds, this.config.maxWorkers || 1)
        logger?.info('插件加载完成')
        
        try {
          const pyPlugins = Array.from(this.plugins.values()).filter(p => p?.instance?.python)
          if (pyPlugins.length === 0) {
            logger?.info?.('[汇总] 未检测到 Python 插件命令')
          } else {
            for (const p of pyPlugins) {
              const registered = Array.from(this.commandHandlers?.entries?.() || [])
                .filter(([name, v]) => v?.plugin === p.id)
                .map(([name]) => name)
              const list = registered.length ? registered.join(', ') : '(无)'
              logger?.info?.(`[汇总] Python 插件命令已就绪: ${p.id} 共 ${registered.length} 个 -> ${list}`)
            }
          }
        } catch (e) {
          logger?.debug?.('汇总打印 Python 命令失败', e)
        }
      } else {
        logger?.info('未发现任何插件')
      }
    } else {
    }

    
    this._initialized = true
  }

  


  addPluginDir(dir) {
    this.pluginDirs.add(path.resolve(dir))
    logger?.debug(`插件目录已添加: ${dir}`)
  }

  


  async scanPlugins() {
    const plugins = []

    const maxDepth = Number(this.config.scanDepth ?? 3)
    const entryNames = Array.isArray(this.config.entryCandidates) && this.config.entryCandidates.length > 0
      ? this.config.entryCandidates
      : ['index.js', 'index.ts', 'index.mjs', 'index.cjs', 'index.py', 'main.js', 'main.ts', 'main.py']

    
    const allowedExts = Array.from(new Set(
      entryNames.map(n => path.extname(n)).filter(Boolean).concat(['.js', '.ts', '.mjs', '.cjs', '.py'])
    ))

    const ensureExists = async (p) => !!p && await fs.access(p).then(() => true).catch(() => false)

    const isPluginCandidate = async (dir) => {
      if (await ensureExists(path.join(dir, 'package.json'))) return true
      if (await ensureExists(path.join(dir, 'plugin.json'))) return true
      for (const f of entryNames) {
        if (await ensureExists(path.join(dir, f))) return true
      }
      
      try {
        const items = await fs.readdir(dir, { withFileTypes: true })
        const files = items.filter(it => it.isFile() && allowedExts.includes(path.extname(it.name)))
        if (files.length === 1) {
          return true
        }
      } catch {}
      return false
    }

    const walk = async (dir, depthLeft) => {
      if (depthLeft < 0) return
      try {
        await fs.access(dir)
        const items = await fs.readdir(dir, { withFileTypes: true })
        for (const item of items) {
          if (!item.isDirectory()) continue
          const sub = path.join(dir, item.name)
          
          if (item.name === 'example' && path.basename(path.resolve(dir)) === 'plugins') {
            continue
          }
          if (await isPluginCandidate(sub)) {
            const plugin = await this.loadPluginInfo(sub)
            if (plugin) {
              try {
                await this.registerPlugin(plugin)
                plugins.push(plugin)
              } catch (e) {
                logger?.debug?.(`注册插件失败: ${sub}`, e)
              }
              
              continue
            } else {
            }
          }
          await walk(sub, depthLeft - 1)
        }
      } catch (error) {
        logger?.debug(`扫描插件目录失败: ${dir}`, error)
      }
    }

    for (const dir of this.pluginDirs) {
      await walk(dir, maxDepth)
    }

    return plugins
  }

  


  async loadPluginInfo(pluginPath) {
    try {
      const ensureExists = async (p) => !!p && await fs.access(p).then(() => true).catch(() => false)

      
      let packageData = null
      let hasPkg = false
      try {
        const packagePath = path.join(pluginPath, 'package.json')
        const raw = await fs.readFile(packagePath, 'utf8')
        packageData = JSON.parse(raw)
        hasPkg = true
      } catch {}

      
      let plugin
      if (hasPkg) {
        plugin = new PluginInfo({
          id: packageData.name || path.basename(pluginPath),
          ...packageData.yunzai,
          path: pluginPath,
          ...packageData
        })
      } else {
        plugin = new PluginInfo({
          id: path.basename(pluginPath),
          name: path.basename(pluginPath),
          path: pluginPath
        })
      }

      
      const cfgCandidates = Array.isArray(this.config.entryCandidates) && this.config.entryCandidates.length > 0
        ? this.config.entryCandidates
        : ['index.js', 'index.ts', 'index.mjs', 'index.cjs', 'index.py', 'main.js', 'main.ts', 'main.py']

      const entryCandidates = []
      if (plugin.entry) entryCandidates.push(plugin.entry)
      for (const rel of cfgCandidates) entryCandidates.push(rel)

      let picked = null
      for (const rel of entryCandidates) {
        const abs = path.join(pluginPath, rel)
        if (await ensureExists(abs)) { picked = rel; break }
      }

      
      if (!picked) {
        const allowedExts = Array.from(new Set(
          cfgCandidates.map(n => path.extname(n)).filter(Boolean).concat(['.js', '.ts', '.mjs', '.cjs', '.py'])
        ))
        try {
          const items = await fs.readdir(pluginPath, { withFileTypes: true })
          const files = items
            .filter(d => d.isFile() && allowedExts.includes(path.extname(d.name)))
            .map(d => d.name)
          if (files.length > 0) {
            if (hasPkg) {
              
              const preferBases = ['index', 'main']
              const extPriority = ['.ts', '.py', '.js', '.mjs', '.cjs']
              const score = (name) => {
                const base = name.replace(/\.[^.]+$/, '')
                const baseScore = preferBases.includes(base) ? 0 : 1
                const ext = path.extname(name)
                const extIdx = extPriority.indexOf(ext)
                return [baseScore, extIdx === -1 ? 99 : extIdx, name]
              }
              files.sort((a, b) => {
                const [ab, ae, an] = score(a)
                const [bb, be, bn] = score(b)
                if (ab !== bb) return ab - bb
                if (ae !== be) return ae - be
                return an.localeCompare(bn)
              })
              picked = files[0]
            } else if (files.length === 1) {
              
              picked = files[0]
            }
          }
        } catch {}
      }

      if (picked) {
        plugin.entry = picked
        if (picked.endsWith('.ts') || picked.endsWith('.tsx')) plugin.language = 'ts'
        else if (picked.endsWith('.py')) plugin.language = 'python'
        else plugin.language = 'js'
      } else if (!hasPkg) {
        
        logger?.debug?.(`未找到入口文件，跳过: ${pluginPath}`)
        return null
      }

      return plugin
    } catch (error) {
      logger?.debug(`加载插件信息失败: ${pluginPath}`, error)
      return null
    }
  }

  


  async registerPlugin(plugin) {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`插件已存在: ${plugin.id}`)
    }
    
    await this.validatePlugin(plugin)
    
    this.plugins.set(plugin.id, plugin)
    this.registerDependencies(plugin)
    
    try { await this._recordPluginVersion(plugin) } catch {}
    
    logger?.info(`插件已注册: ${plugin.id}`)
  }

  


  async validatePlugin(plugin) {
    if (!plugin.id) {
      throw new Error('插件ID不能为空')
    }
    
    if (!plugin.path || !await fs.access(plugin.path).then(() => true).catch(() => false)) {
      throw new Error(`插件路径不存在: ${plugin.path}`)
    }
    
    
    for (const depId of plugin.dependencies) {
      if (!this.plugins.has(depId)) {
        throw new Error(`缺少依赖插件: ${depId}`)
      }
    }

    
    const report = await this._checkCompatibility(plugin)
    try { monitorEngine?.incrementCounter?.('plugin_compat_check_total', 1, { plugin: plugin.id, ok: report.ok ? 'yes' : 'no' }) } catch {}
    if (!report.ok) {
      try { monitorEngine?.incrementCounter?.('plugin_compat_fail_total', 1, { plugin: plugin.id }) } catch {}
      throw new Error(`插件兼容性检查未通过: ${report.reasons.join('; ')}`)
    }
  }

  


  async loadPlugin(pluginId, options = {}) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`)
    }
    
    if (plugin.status !== PluginStatus.UNLOADED) {
      return
    }
    
    try {
      plugin.status = PluginStatus.LOADING
      await this.runHooks('beforeLoad', { plugin, options })
      
      
      await this.loadDependencies(plugin, options)
      
      
      const entryPath = path.join(plugin.path, plugin.entry)
      let realEntryPath = entryPath
      const isTs = (plugin.language === 'ts') || plugin.entry.endsWith('.ts') || plugin.entry.endsWith('.tsx')
      if (isTs) {
        const mode = this.config.tsLoadMode || 'auto'
        if (this.config.enableSandbox) {
          if (mode === 'build') {
            realEntryPath = await this._buildTsPlugin(plugin, entryPath)
            await this.loadPluginInSandbox(plugin, realEntryPath)
          } else {
            
            let hasTs = false
            try {
              const req = createRequire(import.meta.url)
              req.resolve('typescript')
              hasTs = true
            } catch {}
            if (hasTs) {
              await this.loadPluginInSandbox(plugin, entryPath)
            } else if (mode === 'auto') {
              realEntryPath = await this._buildTsPlugin(plugin, entryPath)
              await this.loadPluginInSandbox(plugin, realEntryPath)
            } else {
              throw new Error('运行时加载 TypeScript 插件需要开发依赖 typescript，请先安装: pnpm i -D typescript')
            }
          }
        } else {
          if (mode === 'build') {
            realEntryPath = await this._buildTsPlugin(plugin, entryPath)
            await this.loadPluginDirect(plugin, realEntryPath, options)
          } else {
            try {
              await this._ensureTsNodeRegistered()
              await this.loadPluginDirectTsRuntime(plugin, entryPath, options)
            } catch (e) {
              if (mode === 'auto') {
                logger?.warn?.(`TS 运行时模式失败，回退到构建: ${e?.message || e}`)
                realEntryPath = await this._buildTsPlugin(plugin, entryPath)
                await this.loadPluginDirect(plugin, realEntryPath, options)
              } else {
                throw e
              }
            }
          }
        }
      } else if (plugin.language === 'python' || plugin.entry.endsWith('.py')) {
        
        if (this.config.enableSandbox) {
          await this.loadPluginInPython(plugin, entryPath)
        } else {
          throw new Error(`插件 ${plugin.id} 为 Python 插件，当前仅支持沙箱模式运行`)
        }
      } else {
        
        if (this.config.enableSandbox) {
          await this.loadPluginInSandbox(plugin, realEntryPath)
        } else {
          await this.loadPluginDirect(plugin, realEntryPath, options)
        }
      }
      
      plugin.status = PluginStatus.LOADED
      plugin.metadata.loadTime = Date.now()
      this.stats.loaded++
      
      await this.runHooks('afterLoad', { plugin, options })
      
      
      if (this.config.enableHotReload) {
        try { await this._watchPlugin(plugin) } catch (e) { logger?.debug?.('注册插件目录热重载失败', e) }
      }
      
      logger?.info(`插件加载成功: ${pluginId}`)
      
      if (this.config.autoStart) {
        await this.startPlugin(pluginId)
      }
    } catch (error) {
      plugin.status = PluginStatus.ERROR
      plugin.metadata.lastError = error.message
      plugin.metadata.errorCount++
      this.stats.errors++
      throw error
    }
  }

  


  async loadPluginInSandbox(plugin, entryPath) {
    const grantedCapabilities = resolvePluginCapabilities(plugin.permissions)
    const workerPath = path.join(__dirname, 'plugin-worker.js')
    const worker = new Worker(workerPath, {
      workerData: {
        pluginId: plugin.id,
        entryPath,
        config: plugin.config || {},
        permissions: Array.isArray(plugin.permissions) ? plugin.permissions : [],
        capabilities: grantedCapabilities,
        allowedModules: this.config.allowedModules || [],
        blockedModules: this.config.blockedModules || [],
        tsRuntimeEnabled: (this.config.tsLoadMode || 'auto') !== 'build'
      },
      type: 'module',
      resourceLimits: {
        maxOldGenerationSizeMb: Math.max(16, Math.floor((this.config.maxMemory || (128 * 1024 * 1024)) / (1024 * 1024)))
      }
    })
    
    worker._pluginId = plugin.id
    const transport = new RpcTransport(worker)
    const rpc = new RpcPeer(transport, { timeout: this.config.workerTimeout || 30000 })
    const sdkHost = new PluginSdkHost({
      pluginId: plugin.id,
      rpc,
      capabilities: grantedCapabilities,
      permissions: Array.isArray(plugin.permissions) ? plugin.permissions : [],
      handlers: {
        log: async ({ level, args, pluginId }) => {
          logger?.[level || 'info']?.(`[${pluginId}]`, ...(Array.isArray(args) ? args : [args]))
          return true
        },
        emitEvent: async ({ event, data }) => {
          try {
            eventBus.emit?.(event, data)
            return true
          } catch (error) {
            throw error
          }
        },
        storageGet: async (params) => await this._handleWorkerCapability(plugin, worker, 'storage-get', params),
        storageSet: async (params) => await this._handleWorkerCapability(plugin, worker, 'storage-set', params),
        storageDelete: async (params) => await this._handleWorkerCapability(plugin, worker, 'storage-delete', params),
        httpGet: async (params) => await this._handleWorkerCapability(plugin, worker, 'http-get', params),
        httpPost: async (params) => await this._handleWorkerCapability(plugin, worker, 'http-post', params),
        botSendMessage: async (params) => await this._handleWorkerCapability(plugin, worker, 'send-message', params),
        botCall: async (params) => await this._handleWorkerCapability(plugin, worker, 'bot-call', params)
      }
    })
    sdkHost.registerDefaultMethods()
    worker._rpcTransport = transport
    worker._rpcPeer = rpc

    
    worker.on('message', (msg) => {
      const { type, data } = msg || {}
      if (!type) return

      switch (type) {
        case 'log': {
          const lvl = data?.level || 'info'
          const args = Array.isArray(data?.args) ? data.args : [data]
          logger?.[lvl]?.(`[${plugin.id}]`, ...args)
          break
        }
        case 'event': {
          try { eventBus.emit?.(data?.event, data?.data) } catch {}
          break
        }
        case 'call-result':
        case 'call-error': {
          const { callId } = data || {}
          if (callId && this.pendingCalls.has(callId)) {
            const { resolve, reject, timer } = this.pendingCalls.get(callId)
            clearTimeout(timer)
            this.pendingCalls.delete(callId)
            if (type === 'call-result') resolve(data.result)
            else reject(new Error(data.error || 'worker call error'))
          }
          break
        }
        case 'error': {
          logger?.error(`插件[${plugin.id}] Worker错误:`, data)
          break
        }
        default:
          break
      }
    })

    
    return new Promise((resolve, reject) => {
      const onMessage = (msg) => {
        if (msg?.type === 'loaded') {
          
          plugin.instance = {
            sandbox: true,
            eventNames: msg.data?.instance?.eventNames || [],
            commandNames: msg.data?.instance?.commandNames || [],
            handshake: msg.data?.handshake || null,
            sdk: {
              capabilities: grantedCapabilities,
              permissions: Array.isArray(plugin.permissions) ? plugin.permissions : []
            }
          }
          this.workers.set(plugin.id, worker)
          try { this.registerEventHandlers?.(plugin) } catch (e) { logger?.debug?.(`注册 sandbox 插件事件处理器失败: ${plugin.id}`, e) }
          try { this.registerCommandHandlers?.(plugin) } catch (e) { logger?.debug?.(`注册 sandbox 插件命令处理器失败: ${plugin.id}`, e) }
          worker.off('message', onMessage)
          resolve()
        } else if (msg?.type === 'error') {
          worker.off('message', onMessage)
          reject(new Error(msg.data || '插件加载失败'))
        }
      }
      worker.on('message', onMessage)

      
      const timer = setTimeout(() => {
        worker.off('message', onMessage)
        reject(new Error('插件加载超时'))
      }, this.config.pluginTimeout || 5000)

      
      const finalize = (fn) => (...args) => { clearTimeout(timer); return fn(...args) }
      worker.on('error', finalize(reject))
      worker.on('exit', (code) => {
        if (code !== 0) {
          finalize(reject)(new Error(`Worker 退出: ${code}`))
        }
      })
    })
  }

  


  async loadPluginDirect(plugin, entryPath, options = {}) {
    const url = pathToFileURL(entryPath)
    if (options?.bust) {
      url.searchParams.set('t', String(options.bust))
    }
    const pluginModule = await import(url.href)
    plugin.instance = pluginModule.default || pluginModule
    
    
    this.registerEventHandlers(plugin)
    
    
    this.registerCommandHandlers(plugin)
  }

  async _ensureTsNodeRegistered() {
    if (this._tsNodeRegistered) return
    const req = createRequire(import.meta.url)
    try {
      req.resolve('ts-node')
    } catch {
      throw new Error('TS 运行时加载需要依赖 ts-node，请安装: pnpm i -D ts-node')
    }
    const { register } = req('ts-node')
    register({ transpileOnly: true, compilerOptions: { module: 'commonjs', target: 'ES2020', moduleResolution: 'node', esModuleInterop: true } })
    this._tsNodeRegistered = true
    try { logger?.debug?.('ts-node 注册完成（transpile-only，CJS 模式）') } catch {}
  }

  async loadPluginDirectTsRuntime(plugin, entryPath, options = {}) {
    
    const req = createRequire(import.meta.url)
    if (options?.bust) {
      try {
        const resolved = req.resolve(entryPath)
        if (req.cache && req.cache[resolved]) delete req.cache[resolved]
      } catch {}
    }
    const pluginModule = req(entryPath)
    plugin.instance = pluginModule.default || pluginModule

    this.registerEventHandlers(plugin)
    this.registerCommandHandlers(plugin)
  }

  


  async startPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`)
    }
    
    if (plugin.status !== PluginStatus.LOADED) {
      throw new Error(`插件状态错误: ${plugin.status}`)
    }
    
    try {
      await this.runHooks('beforeStart', { plugin })
      
      if (this.workers.has(plugin.id)) {
        const worker = this.workers.get(plugin.id)
        await this._waitWorker(worker, { type: 'start' }, 'started', this.config.workerTimeout)
      } else if (plugin.instance && typeof plugin.instance.start === 'function') {
        await plugin.instance.start()
      }
      
      plugin.status = PluginStatus.RUNNING
      plugin.metadata.startTime = Date.now()
      this.stats.running++
      
      await this.runHooks('afterStart', { plugin })
      
      logger?.info(`插件启动成功: ${pluginId}`)
    } catch (error) {
      plugin.status = PluginStatus.ERROR
      plugin.metadata.lastError = error.message
      plugin.metadata.errorCount++
      this.stats.errors++
      throw error
    }
  }

  


  async stopPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`)
    }
    
    if (plugin.status !== PluginStatus.RUNNING) {
      return
    }
    
    try {
      await this.runHooks('beforeStop', { plugin })
      
      if (this.workers.has(plugin.id)) {
        const worker = this.workers.get(plugin.id)
        await this._waitWorker(worker, { type: 'stop' }, 'stopped', this.config.workerTimeout)
      } else if (plugin.instance && typeof plugin.instance.stop === 'function') {
        await plugin.instance.stop()
      }
      
      plugin.status = PluginStatus.STOPPED
      plugin.metadata.stopTime = Date.now()
      this.stats.running--
      
      await this.runHooks('afterStop', { plugin })
      
      logger?.info(`插件停止成功: ${pluginId}`)
      
    } catch (error) {
      plugin.status = PluginStatus.ERROR
      plugin.metadata.lastError = error.message
      plugin.metadata.errorCount++
      this.stats.errors++
      throw error
    }
  }

  


  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`)
    }
    
    try {
      
      if (plugin.status === PluginStatus.RUNNING) {
        await this.stopPlugin(pluginId)
      }
      
      await this.runHooks('beforeUnload', { plugin })
      
      
      this.unregisterEventHandlers(plugin)
      
      
      this.unregisterCommandHandlers(plugin)
      
      
      await this._unwatchPlugin(pluginId)
      
      
      const worker = this.workers.get(pluginId)
      if (worker) {
        try { await this._waitWorker(worker, { type: 'destroy' }, 'destroyed', 2000) } catch {}
        await worker.terminate()
        this.workers.delete(pluginId)
      }
      
      plugin.status = PluginStatus.UNLOADED
      plugin.instance = null
      this.stats.loaded--
      
      await this.runHooks('afterUnload', { plugin })
      
      logger?.info(`插件卸载成功: ${pluginId}`)
      
    } catch (error) {
      plugin.status = PluginStatus.ERROR
      plugin.metadata.lastError = error.message
      plugin.metadata.errorCount++
      this.stats.errors++
      throw error
    }
  }

  


  async reloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`)
    }
    
    try {
      await this.unloadPlugin(pluginId)
      
      
      const reloadOptions = {}
      if (this.config.enableHotReload) {
        reloadOptions.bust = Date.now()
      }
      
      await this.loadPlugin(pluginId, reloadOptions)
      logger?.info(`插件重载成功: ${pluginId}`)
      
    } catch (error) {
      logger?.error(`插件重载失败: ${pluginId}`, error)
      throw error
    }
  }

  


  async handleModuleReload(moduleId) {
    
    for (const plugin of this.plugins.values()) {
      if (plugin.path && moduleId.startsWith(plugin.path)) {
        try {
          await this.reloadPlugin(plugin.id)
          logger?.info(`热重载插件: ${plugin.id}`)
        } catch (error) {
          logger?.error(`热重载插件失败: ${plugin.id}`, error)
        }
      }
    }
  }

  





  async _watchPlugin(plugin) {
    try {
      if (!this.config.enableHotReload) return
      if (!plugin || !plugin.id || !plugin.path) return

      
      await this._unwatchPlugin(plugin.id)

      const pluginDir = plugin.path
      const normalize = (p) => (p || '').replace(/\\/g, '/').toLowerCase()
      const pluginDirNorm = normalize(pluginDir.endsWith(path.sep) ? pluginDir.slice(0, -1) : pluginDir)
      const buildOut = path.join(process.cwd(), 'data', 'plugin-build', plugin.id)
      const buildOutNorm = normalize(buildOut)

      
      const ignored = [
        /(^|\\|\/)node_modules(\\|\/)/i,
        /(^|\\|\/)\.git(\\|\/)/i,
        /(^|\\|\/)\.idea(\\|\/)/i,
        /(^|\\|\/)\.vscode(\\|\/)/i,
        /(^|\\|\/)dist(\\|\/)/i,
        /(^|\\|\/)build(\\|\/)/i,
        /(^|\\|\/)\.cache(\\|\/)/i,
        /\.swp$/i,
        /\.tmp$/i,
        /\.log$/i
      ]
      const ignoreFn = (p) => {
        const n = normalize(p)
        if (!n) return true
        
        if (!n.startsWith(pluginDirNorm)) return true
        
        if (n.startsWith(buildOutNorm)) return true
        return ignored.some((r) => r.test(p))
      }

      const watcher = chokidar.watch(pluginDir, {
        persistent: true,
        ignoreInitial: true,
        depth: Infinity,
        awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
        ignored: ignoreFn
      })

      
      const scheduleReload = () => {
        try {
          const prev = this._reloadTimers.get(plugin.id)
          if (prev) clearTimeout(prev)
          const timer = setTimeout(async () => {
            try {
              
              const cur = this.plugins.get(plugin.id)
              if (!cur || cur.status === PluginStatus.UNLOADED || cur.status === PluginStatus.DISABLED) return
              await this.reloadPlugin(plugin.id)
              logger?.info?.(`目录变更触发插件重载: ${plugin.id}`)
            } catch (e) {
              logger?.error?.(`目录变更触发插件重载失败: ${plugin.id}`, e)
            }
          }, 300)
          this._reloadTimers.set(plugin.id, timer)
        } catch {}
      }

      watcher
        .on('add', scheduleReload)
        .on('change', scheduleReload)
        .on('unlink', scheduleReload)
        .on('addDir', scheduleReload)
        .on('unlinkDir', async (p) => {
          try {
            const n = normalize(p)
            
            if (n === pluginDirNorm) {
              await this._unwatchPlugin(plugin.id)
              await this.unloadPlugin(plugin.id)
              logger?.info?.(`插件目录移除，已卸载: ${plugin.id}`)
            } else {
              scheduleReload()
            }
          } catch (e) {
            logger?.error?.(`处理插件目录移除失败: ${plugin.id}`, e)
          }
        })
        .on('error', (err) => logger?.debug?.(`插件目录监听出错: ${plugin.id}`, err))

      this._pluginWatchers.set(plugin.id, watcher)
      logger?.debug?.(`已开启目录级热重载: ${plugin.id}`)
    } catch (e) {
      logger?.debug?.('注册插件目录热重载失败', e)
    }
  }

  


  async _unwatchPlugin(pluginId) {
    try {
      const watcher = this._pluginWatchers.get(pluginId)
      if (watcher) {
        try { await watcher.close() } catch {}
        this._pluginWatchers.delete(pluginId)
      }
      const timer = this._reloadTimers.get(pluginId)
      if (timer) {
        clearTimeout(timer)
        this._reloadTimers.delete(pluginId)
      }
    } catch {}
  }

  


  async loadDependencies(plugin, options = {}) {
    for (const depId of plugin.dependencies) {
      const dep = this.plugins.get(depId)
      if (dep && dep.status === PluginStatus.UNLOADED) {
        await this.loadPlugin(depId, options)
      }
    }
  }

  


  registerDependencies(plugin) {
    for (const depId of plugin.dependencies) {
      if (!this.dependencies.has(depId)) {
        this.dependencies.set(depId, new Set())
      }
      this.dependencies.get(depId).add(plugin.id)
    }
  }

  


  registerEventHandlers(plugin) {
    if (!plugin.instance?.events && !plugin.instance?.sandbox) return
    
    
    if (this.workers.has(plugin.id) && plugin.instance?.sandbox) {
      const worker = this.workers.get(plugin.id)
      const names = plugin.instance.eventNames || []
      for (const eventName of names) {
        const wrappedHandler = async (...args) => {
          try {
            return await this._callWorker(worker, { kind: 'event', name: eventName, args }, this.config.workerTimeout)
          } catch (error) {
            logger?.error(`事件处理器错误: ${plugin.id}:${eventName}`, error)
            throw error
          }
        }
        eventBus.register(eventName, wrappedHandler, {
          namespace: `plugin:${plugin.id}`,
          priority: plugin.priority
        })
        if (!this.eventHandlers.has(plugin.id)) this.eventHandlers.set(plugin.id, [])
        this.eventHandlers.get(plugin.id).push({ eventName, handler: wrappedHandler })
        this.stats.events++
      }
      return
    }

    
    for (const [eventName, handler] of Object.entries(plugin.instance.events || {})) {
      if (typeof handler === 'function') {
        const wrappedHandler = async (...args) => {
          try {
            return await handler.call(plugin.instance, ...args)
          } catch (error) {
            logger?.error(`事件处理器错误: ${plugin.id}:${eventName}`, error)
            throw error
          }
        }
        eventBus.register(eventName, wrappedHandler, {
          namespace: `plugin:${plugin.id}`,
          priority: plugin.priority
        })
        if (!this.eventHandlers.has(plugin.id)) {
          this.eventHandlers.set(plugin.id, [])
        }
        this.eventHandlers.get(plugin.id).push({ eventName, handler: wrappedHandler })
        this.stats.events++
      }
    }
  }

  


  unregisterEventHandlers(plugin) {
    const handlers = this.eventHandlers.get(plugin.id)
    if (!handlers) return
    
    for (const { eventName, handler } of handlers) {
      eventBus.unregister(eventName, handler)
      this.stats.events--
    }
    
    this.eventHandlers.delete(plugin.id)
  }

  


  registerCommandHandlers(plugin) {
    if (!plugin.instance?.commands && !plugin.instance?.sandbox) return
    
    
    if (this.workers.has(plugin.id) && plugin.instance?.sandbox) {
      const worker = this.workers.get(plugin.id)
      const names = plugin.instance.commandNames || []
      for (const commandName of names) {
        const wrappedHandler = async (...args) => {
          try {
            
            const safeArgs = args.map((a) => {
              if (a == null) return a
              const t = typeof a
              if (t === 'string' || t === 'number' || t === 'boolean') return a
              if (Array.isArray(a)) return a.slice(0, 20)
              if (t === 'object') {
                const out = {}
                const keys = Object.keys(a).slice(0, 20)
                for (const k of keys) {
                  const v = a[k]
                  if (typeof v === 'function') continue
                  if (k.startsWith('_')) continue
                  if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                    out[k] = v
                  }
                }
                
                if ('msg' in a || 'raw_message' in a) {
                  out.msg = a.msg
                  out.raw_message = a.raw_message ?? a.msg
                }
                if ('user_id' in a) out.user_id = a.user_id
                if ('group_id' in a) out.group_id = a.group_id
                if ('message_type' in a) out.message_type = a.message_type
                return out
              }
              try { return JSON.parse(JSON.stringify(a)) } catch { return undefined }
            })
            return await this._callWorker(worker, { kind: 'command', name: commandName, args: safeArgs }, this.config.workerTimeout)
          } catch (error) {
            logger?.error(`命令处理器错误: ${plugin.id}:${commandName}`, error)
            throw error
          }
        }
        this.commandHandlers.set(commandName, { plugin: plugin.id, handler: wrappedHandler })
      }
      return
    }

    
    for (const [commandName, handler] of Object.entries(plugin.instance.commands || {})) {
      if (typeof handler === 'function') {
        const wrappedHandler = async (...args) => {
          try {
            return await handler.call(plugin.instance, ...args)
          } catch (error) {
            logger?.error(`命令处理器错误: ${plugin.id}:${commandName}`, error)
            throw error
          }
        }
        this.commandHandlers.set(commandName, {
          plugin: plugin.id,
          handler: wrappedHandler
        })
      }
    }
  }

  


  unregisterCommandHandlers(plugin) {
    for (const [commandName, handler] of this.commandHandlers.entries()) {
      if (handler.plugin === plugin.id) {
        this.commandHandlers.delete(commandName)
      }
    }
  }

  


  addHook(hook, handler) {
    if (this.hooks[hook]) {
      this.hooks[hook].push(handler)
    }
  }

  


  async runHooks(hook, context) {
    if (!this.hooks[hook]) return
    
    for (const handler of this.hooks[hook]) {
      try {
        await handler(context)
      } catch (error) {
        logger?.error(`钩子执行失败: ${hook}`, error)
      }
    }
  }

  
  getPlugin(pluginId) {
    return this.plugins.get(pluginId)
  }

  getAllPlugins() {
    return Array.from(this.plugins.values())
  }

  getRunningPlugins() {
    return Array.from(this.plugins.values())
      .filter(p => p.status === PluginStatus.RUNNING)
  }

  getCommandHandler(commandName) {
    return this.commandHandlers.get(commandName)
  }

  getAllCommands() {
    return Array.from(this.commandHandlers.keys())
  }

  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      plugins: this.plugins.size,
      workers: this.workers.size
    }
  }

  getHealth() {
    const plugins = Array.from(this.plugins.values())
    const total = plugins.length
    const running = plugins.filter(p => p.status === PluginStatus.RUNNING).length
    const errors = plugins.filter(p => p.status === PluginStatus.ERROR).length
    
    return {
      status: errors === 0 ? 'healthy' : 'degraded',
      total,
      running,
      errors,
      uptime: Date.now() - this.stats.startTime,
      config: {
        enableSandbox: !!this.config.enableSandbox,
        enableHotReload: !!this.config.enableHotReload,
        maxWorkers: this.config.maxWorkers,
        workerTimeout: this.config.workerTimeout,
        autoLoad: this.config.autoLoad,
        autoStart: this.config.autoStart,
        allowedModules: Array.isArray(this.config.allowedModules) ? this.config.allowedModules.slice(0, 10) : undefined,
        blockedModules: Array.isArray(this.config.blockedModules) ? this.config.blockedModules.slice(0, 10) : undefined
      }
    }
  }

  
  async _ensureDataDir() {
    try { await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true }) } catch {}
  }

  async _loadVersionRegistry() {
    try {
      const txt = await fs.readFile(this.versionRegistryPath, 'utf8')
      this.versionRegistry = JSON.parse(txt)
    } catch {
      this.versionRegistry = { core: { version: this.coreVersion }, plugins: {} }
      await this._saveVersionRegistry()
    }
  }

  async _saveVersionRegistry() {
    try {
      await fs.writeFile(this.versionRegistryPath, JSON.stringify(this.versionRegistry, null, 2), 'utf8')
    } catch (e) {
      logger?.warn?.('保存版本注册表失败', e)
    }
  }

  async _recordPluginVersion(plugin) {
    const now = Date.now()
    const rec = this.versionRegistry.plugins[plugin.id] || { history: [] }
    if (rec.version && rec.version !== plugin.version) {
      rec.history.push({ version: rec.version, time: rec.time || now })
      rec.history = rec.history.slice(-10)
    }
    rec.version = plugin.version
    rec.path = plugin.path
    rec.time = now
    this.versionRegistry.plugins[plugin.id] = rec
    await this._saveVersionRegistry()
  }

  _parseSemver(v) {
    if (!v) return { major: 0, minor: 0, patch: 0 }
    const s = String(v).trim().replace(/^v/i, '')
    const m = s.match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!m) return { major: 0, minor: 0, patch: 0 }
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) }
  }
  _compareSemver(a, b) {
    const A = this._parseSemver(a); const B = this._parseSemver(b)
    if (A.major !== B.major) return A.major > B.major ? 1 : -1
    if (A.minor !== B.minor) return A.minor > B.minor ? 1 : -1
    if (A.patch !== B.patch) return A.patch > B.patch ? 1 : -1
    return 0
  }

  _satisfiesRange(version, range) {
    if (!range || range === '*' || range === '>=0.0.0') return true
    const v = version
    const r = String(range).trim()
    if (r.startsWith('^')) {
      const base = r.slice(1)
      const upper = { ...this._parseSemver(base) }
      upper.major += 1; upper.minor = 0; upper.patch = 0
      const upperStr = `${upper.major}.0.0`
      return this._compareSemver(v, base) >= 0 && this._compareSemver(v, upperStr) < 0
    }
    if (r.startsWith('~')) {
      const base = r.slice(1)
      const upper = { ...this._parseSemver(base) }
      upper.minor += 1; upper.patch = 0
      const upperStr = `${upper.major}.${upper.minor}.0`
      return this._compareSemver(v, base) >= 0 && this._compareSemver(v, upperStr) < 0
    }
    const m = r.match(/^(>=|<=|>|<|=)?\s*(\d+\.\d+\.\d+)$/)
    if (m) {
      const op = m[1] || '='
      const tgt = m[2]
      const cmp = this._compareSemver(v, tgt)
      switch (op) {
        case '>': return cmp > 0
        case '>=': return cmp >= 0
        case '<': return cmp < 0
        case '<=': return cmp <= 0
        case '=': default: return cmp === 0
      }
    }
    const parts = r.split(/\s+/)
    if (parts.length > 1) {
      
      return parts.every(p => this._satisfiesRange(v, p))
    }
    return this._compareSemver(v, r) === 0
  }

  async _checkCompatibility(plugin) {
    const reasons = []
    const okList = []
    const coreRange = plugin?.engines?.yunzai || plugin?.yunzai?.engines?.core || plugin?.yunzai?.core || ''
    if (coreRange) {
      const pass = this._satisfiesRange(this.coreVersion, coreRange)
      if (!pass) reasons.push(`要求核心版本 ${coreRange}，当前 ${this.coreVersion}`)
      else okList.push('core')
    }
    const nodeRange = plugin?.engines?.node || plugin?.yunzai?.engines?.node || ''
    if (nodeRange) {
      const nodeV = process.versions?.node || process.version?.replace(/^v/, '')
      const pass = this._satisfiesRange(nodeV, nodeRange)
      if (!pass) reasons.push(`要求 Node.js ${nodeRange}，当前 ${nodeV}`)
      else okList.push('node')
    }
    const depRanges = (plugin?.yunzai?.pluginDependencies) || {}
    for (const depId of Object.keys(depRanges)) {
      const range = depRanges[depId]
      const dep = this.plugins.get(depId)
      if (!dep) { reasons.push(`要求依赖插件 ${depId}@${range} 未安装`); continue }
      const pass = this._satisfiesRange(dep.version, range)
      if (!pass) reasons.push(`依赖插件 ${depId} 版本不满足 ${range}，当前 ${dep.version}`)
      else okList.push(`dep:${depId}`)
    }
    const ok = reasons.length === 0
    if (!ok) logger?.warn?.('插件兼容性检查失败', { pluginId: plugin.id, reasons })
    else logger?.debug?.('插件兼容性检查通过', { pluginId: plugin.id, checks: okList })
    return { ok, reasons }
  }

  
  async _runCmd(cmd, args, cwd, timeoutMs = 180000) {
    
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { cwd, shell: false })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL') } catch {}
        reject(new Error(`命令超时 ${cmd} ${args.join(' ')}`))
      }, timeoutMs)
      child.stdout?.on('data', d => { stdout += d.toString() })
      child.stderr?.on('data', d => { stderr += d.toString() })
      child.on('error', err => {
        clearTimeout(timer)
        reject(err)
      })
      child.on('close', code => {
        clearTimeout(timer)
        if (code === 0) return resolve({ code, stdout, stderr })
        const err = new Error(`命令失败(${code}): ${cmd} ${args.join(' ')}\n${stderr}`)
        err.code = code
        err.stdout = stdout
        err.stderr = stderr
        reject(err)
      })
    })
  }

  async _git(cwd, args, timeoutMs = 180000) {
    return this._runCmd('git', args, cwd, timeoutMs)
  }

  async _readPluginPackageVersion(plugin) {
    try {
      const txt = await fs.readFile(path.join(plugin.path, 'package.json'), 'utf8')
      const pkg = JSON.parse(txt)
      return pkg.version || plugin.version
    } catch {
      return plugin.version
    }
  }

  async listPluginVersions(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`插件不存在: ${pluginId}`)
    const repoDir = plugin.path
    try {
      await this._git(repoDir, ['rev-parse', '--is-inside-work-tree'])
    } catch {
      throw new Error(`插件目录不是 Git 仓库: ${repoDir}`)
    }
    
    const { stdout } = await this._git(repoDir, ['tag', '--list'])
    const tags = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const semverTags = tags.filter(t => /^(v)?\d+\.\d+\.\d+$/.test(t))
    semverTags.sort((a, b) => this._compareSemver(a.replace(/^v/, ''), b.replace(/^v/, ''))).reverse()
    return semverTags
  }

  async updatePlugin(pluginId, options = {}) {
    const { version, ref, reload = true } = options
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`插件不存在: ${pluginId}`)
    const repoDir = plugin.path
    try {
      await this._git(repoDir, ['rev-parse', '--is-inside-work-tree'])
    } catch {
      throw new Error(`插件目录不是 Git 仓库: ${repoDir}`)
    }
    try {
      
      await this._git(repoDir, ['fetch', '--all', '--tags'])
      if (version) {
        const tag = /^(v)?\d+\.\d+\.\d+$/.test(version) ? (version.startsWith('v') ? version : `v${version}`) : version
        
        await this._git(repoDir, ['checkout', '--detach', tag])
      } else if (ref) {
        await this._git(repoDir, ['checkout', ref])
        await this._git(repoDir, ['pull', '--ff-only'])
      } else {
        
        await this._git(repoDir, ['pull', '--ff-only'])
      }
      
      plugin.version = await this._readPluginPackageVersion(plugin)
      await this._recordPluginVersion(plugin)
      logger?.info?.(`插件已更新: ${pluginId} -> ${plugin.version}`)
      try { monitorEngine?.incrementCounter?.('plugin_update_total', 1, { plugin: pluginId }) } catch {}
      if (reload) {
        try { await this.reloadPlugin(pluginId) } catch (e) { logger?.warn?.('更新后重载失败', e) }
      }
      return { id: pluginId, version: plugin.version }
    } catch (e) {
      try { monitorEngine?.incrementCounter?.('plugin_update_fail_total', 1, { plugin: pluginId }) } catch {}
      logger?.error?.(`插件更新失败: ${pluginId}`, e)
      throw e
    }
  }

  async rollbackPlugin(pluginId, options = {}) {
    const { version, reload = true } = options
    const plugin = this.plugins.get(pluginId)
    if (!plugin) throw new Error(`插件不存在: ${pluginId}`)
    const repoDir = plugin.path
    try { await this._git(repoDir, ['rev-parse', '--is-inside-work-tree']) } catch { throw new Error(`插件目录不是 Git 仓库: ${repoDir}`) }

    
    let targetVersion = version
    if (!targetVersion) {
      const rec = this.versionRegistry?.plugins?.[pluginId]
      const hist = rec?.history || []
      if (hist.length > 0) targetVersion = hist[hist.length - 1].version
    }
    if (!targetVersion) throw new Error('未找到可回滚的目标版本')

    try {
      await this._git(repoDir, ['fetch', '--all', '--tags'])
      const tag = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`
      await this._git(repoDir, ['checkout', '--detach', tag])
      plugin.version = await this._readPluginPackageVersion(plugin)
      await this._recordPluginVersion(plugin)
      logger?.info?.(`插件已回滚: ${pluginId} -> ${plugin.version}`)
      try { monitorEngine?.incrementCounter?.('plugin_rollback_total', 1, { plugin: pluginId }) } catch {}
      if (reload) {
        try { await this.reloadPlugin(pluginId) } catch (e) { logger?.warn?.('回滚后重载失败', e) }
      }
      return { id: pluginId, version: plugin.version }
    } catch (e) {
      try { monitorEngine?.incrementCounter?.('plugin_rollback_fail_total', 1, { plugin: pluginId }) } catch {}
      logger?.error?.(`插件回滚失败: ${pluginId}`, e)
      throw e
    }
  }

  


  _getLimiter(pluginId) {
    const cfg = this.config.rateLimit || {}
    if (!cfg.enabled) return null
    if (!this.limiters.has(pluginId)) {
      this.limiters.set(pluginId, { tokens: cfg.bucketCapacity, lastRefill: Date.now() })
    }
    return this.limiters.get(pluginId)
  }

  


  _consumeToken(pluginId) {
    const cfg = this.config.rateLimit || {}
    if (!cfg.enabled) return true
    const limiter = this._getLimiter(pluginId)
    if (!limiter) return true
    const now = Date.now()
    const elapsed = (now - limiter.lastRefill) / 1000
    const refill = Math.floor(elapsed * (cfg.refillRate || 0))
    if (refill > 0) {
      limiter.tokens = Math.min(cfg.bucketCapacity, limiter.tokens + refill)
      limiter.lastRefill = now
    }
    if (limiter.tokens > 0) {
      limiter.tokens -= 1
      return true
    }
    return false
  }

  


  _getBreaker(pluginId) {
    const cfg = this.config.circuitBreaker || {}
    if (!cfg.enabled) return null
    if (!this.breakers.has(pluginId)) {
      this.breakers.set(pluginId, { state: 'closed', failures: 0, windowStart: Date.now(), openUntil: 0 })
    }
    const br = this.breakers.get(pluginId)
    
    if (br.state === 'open' && Date.now() >= br.openUntil) {
      br.state = 'half-open'
      br.failures = 0
      br.windowStart = Date.now()
    }
    return br
  }

  
  _onCallSuccess(pluginId) {
    const cfg = this.config.circuitBreaker || {}
    if (!cfg.enabled) return
    const br = this._getBreaker(pluginId)
    if (!br) return
    if (br.state === 'half-open') {
      br.state = 'closed'
      br.failures = 0
      br.windowStart = Date.now()
      br.openUntil = 0
    } else if (br.state === 'closed') {
      if (Date.now() - br.windowStart > cfg.windowMs) {
        br.failures = 0
        br.windowStart = Date.now()
      }
    }
  }

  
  _onCallFailure(pluginId) {
    const cfg = this.config.circuitBreaker || {}
    if (!cfg.enabled) return
    const br = this._getBreaker(pluginId)
    if (!br) return
    const now = Date.now()
    if (now - br.windowStart > cfg.windowMs) {
      br.windowStart = now
      br.failures = 0
    }
    br.failures += 1
    if (br.state === 'half-open' || br.failures >= cfg.failureThreshold) {
      br.state = 'open'
      br.openUntil = now + cfg.halfOpenAfter
      this.stats.breakerOpen++
      logger?.warn?.(`插件[${pluginId}] 熔断开启 ${cfg.halfOpenAfter}ms`)
      try { monitorEngine?.incrementCounter?.('plugin_breaker_open_total', 1, { plugin: pluginId }) } catch {}
    }
  }

  





  _callWorker(worker, payload, timeoutMs = 30000) {
    const pluginId = worker?._pluginId || 'unknown'
    const kind = payload?.kind || 'method'
    const name = payload?.name || ''

    
    if (!this._consumeToken(pluginId)) {
      this.stats.rateLimited++
      logger?.warn?.('插件调用被限流', { pluginId, kind, name })
      try { monitorEngine?.incrementCounter?.('plugin_rate_limited_total', 1, { plugin: pluginId, kind, name }) } catch {}
      return Promise.reject(new Error(`插件被限流: ${kind}:${name}`))
    }

    
    const br = this._getBreaker(pluginId)
    if (br && br.state === 'open' && Date.now() < br.openUntil) {
      logger?.warn?.('插件调用被熔断拒绝', { pluginId, kind, name, state: br.state, openUntil: br.openUntil })
      try { monitorEngine?.incrementCounter?.('plugin_breaker_reject_total', 1, { plugin: pluginId, kind, name }) } catch {}
      return Promise.reject(new Error(`插件熔断中: ${kind}:${name}`))
    }

    return new Promise((resolve, reject) => {
      const start = Date.now()
      const callId = ulid()

      const finalizeSuccess = (result) => {
        const duration = Date.now() - start
        this.stats.calls++
        try {
          monitorEngine?.incrementCounter?.('plugin_calls_total', 1, { plugin: pluginId, kind, name, result: 'success' })
          monitorEngine?.updateMetric?.('plugin_call_last_duration_ms', duration, { plugin: pluginId, kind, name })
        } catch {}
        logger?.info?.('插件调用成功', { pluginId, kind, name, callId, duration })
        this._onCallSuccess(pluginId)
        resolve(result)
      }

      const finalizeError = (err) => {
        const duration = Date.now() - start
        this.stats.callErrors++
        const isTimeout = (err?.message || '').includes('超时')
        if (isTimeout) this.stats.timeouts++
        try {
          monitorEngine?.incrementCounter?.('plugin_calls_total', 1, { plugin: pluginId, kind, name, result: isTimeout ? 'timeout' : 'error' })
          monitorEngine?.updateMetric?.('plugin_call_last_duration_ms', duration, { plugin: pluginId, kind, name })
        } catch {}
        logger?.error?.('插件调用失败', { pluginId, kind, name, callId, duration, error: err?.message || String(err), timeout: isTimeout })
        this._onCallFailure(pluginId)
        reject(err)
      }

      const timer = setTimeout(() => {
        
        if (this.pendingCalls.has(callId)) {
          this.pendingCalls.delete(callId)
        }
        finalizeError(new Error(`Worker 调用超时: ${kind}:${name}`))
      }, timeoutMs)

      
      this.pendingCalls.set(callId, { resolve: (r) => { clearTimeout(timer); finalizeSuccess(r) }, reject: (e) => { clearTimeout(timer); finalizeError(e) }, timer })

      try {
        worker.postMessage({ type: 'call', data: { ...payload, callId } })
      } catch (err) {
        clearTimeout(timer)
        this.pendingCalls.delete(callId)
        finalizeError(err)
      }
    })
  }

  






  _waitWorker(worker, message, expectedType, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const onMessage = (msg) => {
        if (msg?.type === expectedType) {
          cleanup()
          resolve(msg?.data)
        } else if (msg?.type === 'error') {
          cleanup()
          reject(new Error(typeof msg.data === 'string' ? msg.data : 'Worker 错误'))
        }
      }

      const onError = (err) => { cleanup(); reject(err) }
      const onExit = (code) => { if (code !== 0) { cleanup(); reject(new Error(`Worker 提前退出: ${code}`)) } }

      const timer = setTimeout(() => {
        cleanup()
        reject(new Error(`等待 Worker 响应超时: ${expectedType}`))
      }, timeoutMs)

      const cleanup = () => {
        clearTimeout(timer)
        worker.off('message', onMessage)
        worker.off('error', onError)
        worker.off('exit', onExit)
      }

      worker.on('message', onMessage)
      worker.on('error', onError)
      worker.on('exit', onExit)

      try {
        worker.postMessage(message)
      } catch (err) {
        cleanup()
        reject(err)
      }
    })
  }

  
  async _handleWorkerCapability(plugin, worker, type, data) {
    const start = Date.now()

    try {
      switch (type) {
        case 'storage-get': {
          const { key, cacheName } = data
          const value = await cacheManager.get(key, cacheName || 'default')
          try {
            monitorEngine?.incrementCounter?.('plugin_storage_ops_total', 1, { plugin: plugin.id, op: 'get' })
            monitorEngine?.updateMetric?.('plugin_storage_last_duration_ms', Date.now() - start, { plugin: plugin.id, op: 'get' })
          } catch {}
          return value
        }
        case 'storage-set': {
          const { key, value, options, cacheName } = data
          const ok = await cacheManager.set(key, value, options || {}, cacheName || 'default')
          try {
            monitorEngine?.incrementCounter?.('plugin_storage_ops_total', 1, { plugin: plugin.id, op: 'set' })
            monitorEngine?.updateMetric?.('plugin_storage_last_duration_ms', Date.now() - start, { plugin: plugin.id, op: 'set' })
          } catch {}
          return ok
        }
        case 'storage-delete': {
          const { key, cacheName } = data
          const ok = await cacheManager.delete(key, cacheName || 'default')
          try {
            monitorEngine?.incrementCounter?.('plugin_storage_ops_total', 1, { plugin: plugin.id, op: 'delete' })
            monitorEngine?.updateMetric?.('plugin_storage_last_duration_ms', Date.now() - start, { plugin: plugin.id, op: 'delete' })
          } catch {}
          return ok
        }
        case 'http-get': {
          const { url, options } = data
          try {
            const resp = await axios.get(url, { ...(options || {}), timeout: this.config.workerTimeout || 30000 })
            const duration = Date.now() - start
            const statusGroup = `${Math.floor((resp.status || 0) / 100)}xx`
            try {
              monitorEngine?.incrementCounter?.('plugin_http_requests_total', 1, { plugin: plugin.id, method: 'GET', status: statusGroup })
              monitorEngine?.updateMetric?.('plugin_http_last_duration_ms', duration, { plugin: plugin.id, method: 'GET' })
            } catch {}
            return { status: resp.status, headers: resp.headers, data: resp.data }
          } catch (err) {
            const duration = Date.now() - start
            const status = err?.response?.status
            const statusGroup = status ? `${Math.floor(status / 100)}xx` : 'error'
            try {
              monitorEngine?.incrementCounter?.('plugin_http_requests_total', 1, { plugin: plugin.id, method: 'GET', status: statusGroup })
              monitorEngine?.updateMetric?.('plugin_http_last_duration_ms', duration, { plugin: plugin.id, method: 'GET' })
            } catch {}
            throw err
          }
        }
        case 'http-post': {
          const { url, data: body, options } = data
          try {
            const resp = await axios.post(url, body, { ...(options || {}), timeout: this.config.workerTimeout || 30000 })
            const duration = Date.now() - start
            const statusGroup = `${Math.floor((resp.status || 0) / 100)}xx`
            try {
              monitorEngine?.incrementCounter?.('plugin_http_requests_total', 1, { plugin: plugin.id, method: 'POST', status: statusGroup })
              monitorEngine?.updateMetric?.('plugin_http_last_duration_ms', duration, { plugin: plugin.id, method: 'POST' })
            } catch {}
            return { status: resp.status, headers: resp.headers, data: resp.data }
          } catch (err) {
            const duration = Date.now() - start
            const status = err?.response?.status
            const statusGroup = status ? `${Math.floor(status / 100)}xx` : 'error'
            try {
              monitorEngine?.incrementCounter?.('plugin_http_requests_total', 1, { plugin: plugin.id, method: 'POST', status: statusGroup })
              monitorEngine?.updateMetric?.('plugin_http_last_duration_ms', duration, { plugin: plugin.id, method: 'POST' })
            } catch {}
            throw err
          }
        }
        case 'send-message': {
          try {
            const botId = data?.botId ?? data?.bot_id
            let groupId = data?.groupId ?? data?.group_id
            const userId = data?.userId ?? data?.user_id
            const messageType = data?.messageType ?? data?.message_type
            const message = data?.message

            
            const guildId = data?.guildId ?? data?.guild_id
            const channelId = data?.channelId ?? data?.channel_id
            if (!groupId && guildId && channelId) {
              groupId = `${guildId}-${channelId}`
            }

            
            const quoteId = data?.quoteId ?? data?.replyId ?? data?.quote_id
            const forward = data?.forward
            const image = data?.image
            const file = data?.file

            
            const segs = []
            if (quoteId) segs.push({ type: 'reply', id: String(quoteId) })
            if (forward && Array.isArray(forward)) segs.push({ type: 'node', data: forward })
            if (image) {
              if (typeof image === 'string') segs.push({ type: 'image', file: image })
              else if (typeof image === 'object') segs.push({ type: 'image', file: image.file ?? image.url, name: image.name })
            }
            if (file) {
              if (typeof file === 'string') segs.push({ type: 'file', file })
              else if (typeof file === 'object') segs.push({ type: 'file', file: file.file ?? file.url, name: file.name })
            }
            const addMsg = (m) => {
              if (m == null || m === '') return
              if (Array.isArray(m)) segs.push(...m)
              else if (typeof m === 'object') segs.push(m)
              else segs.push(m)
            }
            addMsg(message)

            const finalMsg = segs.length ? segs : message

            const isGroup = (messageType === 'group') || (!!groupId && messageType !== 'private')
            if (!global.Bot) throw new Error('Bot 未初始化')
            let ret
            if (isGroup) {
              if (!groupId) throw new Error('缺少 groupId')
              ret = await global.Bot.sendGroupMsg(botId, groupId, finalMsg)
            } else {
              if (!userId) throw new Error('缺少 userId')
              ret = await global.Bot.sendFriendMsg(botId, userId, finalMsg)
            }
            try {
              monitorEngine?.incrementCounter?.('plugin_message_send_total', 1, { plugin: plugin.id, type: isGroup ? 'group' : 'friend' })
              monitorEngine?.updateMetric?.('plugin_message_last_duration_ms', Date.now() - start, { plugin: plugin.id, type: isGroup ? 'group' : 'friend' })
            } catch {}
            return ret ?? true
          } catch (err) {
            throw err
          }
        }
        case 'bot-call': {
          try {
            const scope = data?.scope
            const method = data?.method
            const args = Array.isArray(data?.args) ? data.args : []
            const botId = data?.botId ?? data?.bot_id
            const userId = data?.userId ?? data?.user_id
            let groupId = data?.groupId ?? data?.group_id
            
            const guildId = data?.guildId ?? data?.guild_id
            const channelId = data?.channelId ?? data?.channel_id
            if (!groupId && guildId && channelId) {
              groupId = `${guildId}-${channelId}`
            }
            if (!global.Bot) throw new Error('Bot 未初始化')

            let target
            switch (scope) {
              case 'bot':
              case 'Bot':
                target = global.Bot
                break
              case 'friend':
              case 'user':
                if (!userId) throw new Error('缺少 userId')
                target = global.Bot.pickFriend(userId)
                break
              case 'group':
                if (!groupId) throw new Error('缺少 groupId')
                target = global.Bot.pickGroup(groupId)
                break
              case 'member':
              case 'group-member':
                if (!groupId || !userId) throw new Error('缺少 groupId 或 userId')
                target = global.Bot.pickMember(groupId, userId)
                break
              default:
                throw new Error(`不支持的scope: ${scope}`)
            }

            const whitelist = {
              bot: new Set(['getFriendList','getFriendArray','getFriendMap','getGroupList','getGroupArray','getGroupMap','sendFriendMsg','sendGroupMsg','makeForwardMsg','makeForwardArray','sendForwardMsg','pickFriend','pickGroup','pickMember']),
              friend: new Set(['sendMsg','recallMsg','sendFile','sendForwardMsg','getMsg','getForwardMsg','getInfo']),
              group: new Set(['sendMsg','recallMsg','sendFile','sendForwardMsg','getMsg','getForwardMsg','getInfo','getMemberArray','getMemberList','getMemberMap','getChannelArray','getChannelList','getChannelMap','pickMember']),
              member: new Set(['poke','kick','mute','sendMsg','recallMsg','getInfo'])
            }
            const scopeKey = (scope === 'bot' || scope === 'Bot') ? 'bot' : ((scope === 'friend' || scope === 'user') ? 'friend' : (scope === 'group' ? 'group' : 'member'))

            if (!method) throw new Error('缺少 method')
            if (!whitelist[scopeKey]?.has(method)) throw new Error(`禁止调用方法: ${method}`)
            const fn = target?.[method]
            if (typeof fn !== 'function') throw new Error(`目标不支持方法: ${method}`)

            const result = await fn.apply(target, Array.isArray(args) ? args : [args])
            return result ?? true
          } catch (err) {
            throw err
          }
        }
        default:
          throw new Error(`未知能力类型: ${type}`)
      }
    } catch (err) {
      throw err
    }
  }

  
  async _buildTsPlugin(plugin, tsEntry) {
    try {
      const buildDir = path.join(process.cwd(), 'data', 'plugin-build', plugin.id)
      try { await fs.mkdir(buildDir, { recursive: true }) } catch {}
      const outFile = path.join(buildDir, 'index.mjs')

      
      let esbuild
      try {
        esbuild = (await import('esbuild')).default || (await import('esbuild'))
      } catch (e) {
        throw new Error(`缺少 esbuild 依赖，请执行: pnpm add -D esbuild\n原始错误: ${e?.message || e}`)
      }

      await esbuild.build({
        entryPoints: [tsEntry],
        outfile: outFile,
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node24',
        sourcemap: false,
        logLevel: 'silent',
        absWorkingDir: plugin.path,
        external: ['**/node_modules/**']
      })

      return outFile
    } catch (err) {
      throw new Error(`构建 TS 插件失败(${plugin.id}): ${err?.message || err}`)
    }
  }

  


  async destroy() {
    
    for (const plugin of this.plugins.values()) {
      try {
        if (plugin.status === PluginStatus.RUNNING) {
          await this.stopPlugin(plugin.id)
        }
        await this.unloadPlugin(plugin.id)
      } catch (error) {
        logger?.error(`销毁时卸载插件失败: ${plugin.id}`, error)
      }
    }
    
    
    for (const worker of this.workers.values()) {
      await worker.terminate()
    }
    
    
    try {
      for (const [pid, w] of (this._pluginWatchers || new Map()).entries()) {
        await w.close()
      }
      this._pluginWatchers?.clear?.()
      for (const [pid, t] of (this._reloadTimers || new Map()).entries()) {
        clearTimeout(t)
      }
      this._reloadTimers?.clear?.()
    } catch {}

    
    this.plugins.clear()
    this.dependencies.clear()
    this.workers.clear()
    this.eventHandlers.clear()
    this.commandHandlers.clear()
    
    logger?.info('插件引擎已销毁')

    
    this._initialized = false
    this._destroyed = true
    this._shutdownHandlerId = null
    this._hotReloadHookAdded = false
    try { eventBus.clearNamespace?.('plugin-engine') } catch {}
  }

  





  async loadPluginsParallel(pluginIds, concurrency, options = {}) {
    
    const defaultConcurrency = os.cpus()?.length || 1
    const actualConcurrency = concurrency || defaultConcurrency

    if (!Array.isArray(pluginIds) || pluginIds.length === 0) {
      return
    }

    
    const plugins = pluginIds
      .map(id => this.plugins.get(id))
      .filter(plugin => plugin && plugin.status === PluginStatus.UNLOADED)

    if (plugins.length === 0) {
      logger?.info('没有需要加载的插件')
      return
    }

    
    const loadOrder = this.topologicalSort(plugins)
    
    
    await this.batchLoadPlugins(loadOrder, actualConcurrency, options)
    
    logger?.info(`并行加载完成，共处理 ${plugins.length} 个插件`)
  }

  




  topologicalSort(plugins) {
    const graph = new Map()
    const inDegree = new Map()
    const pluginMap = new Map()

    
    plugins.forEach(plugin => {
      pluginMap.set(plugin.id, plugin)
      graph.set(plugin.id, [])
      inDegree.set(plugin.id, 0)
    })

    
    plugins.forEach(plugin => {
      plugin.dependencies.forEach(depId => {
        if (pluginMap.has(depId)) {
          graph.get(depId).push(plugin.id)
          inDegree.set(plugin.id, inDegree.get(plugin.id) + 1)
        }
      })
    })

    
    const batches = []
    const remaining = new Set(plugins.map(p => p.id))

    while (remaining.size > 0) {
      const currentBatch = []
      
      
      for (const pluginId of remaining) {
        if (inDegree.get(pluginId) === 0) {
          currentBatch.push(pluginMap.get(pluginId))
        }
      }

      if (currentBatch.length === 0) {
        
        logger?.warn('检测到插件循环依赖，强制加载剩余插件')
        batches.push([...remaining].map(id => pluginMap.get(id)))
        break
      }

      batches.push(currentBatch)

      
      currentBatch.forEach(plugin => {
        remaining.delete(plugin.id)
        graph.get(plugin.id).forEach(dependentId => {
          if (remaining.has(dependentId)) {
            inDegree.set(dependentId, inDegree.get(dependentId) - 1)
          }
        })
      })
    }

    return batches
  }

  





  async batchLoadPlugins(batches, concurrency, options) {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      logger?.info(`开始加载第 ${i + 1} 批插件，共 ${batch.length} 个`)

      
      const loadPromises = []
      const semaphore = new Semaphore(concurrency)

      for (const plugin of batch) {
        loadPromises.push(
          semaphore.acquire().then(async (release) => {
            try {
              await this.loadPlugin(plugin.id, options)
              logger?.debug(`插件加载成功: ${plugin.id}`)
            } catch (error) {
              logger?.error(`插件加载失败: ${plugin.id}`, error)
              
            } finally {
              release()
            }
          })
        )
      }

      
      await Promise.allSettled(loadPromises)
      
      
      const loadedCount = batch.filter(p => p.status === PluginStatus.LOADED || p.status === PluginStatus.RUNNING).length
      logger?.info(`第 ${i + 1} 批插件加载完成，成功: ${loadedCount}/${batch.length}`)
    }

  }

  


  async loadPluginInPython(plugin, entryPath) {
    const grantedCapabilities = resolvePluginCapabilities(plugin.permissions)
    let pythonCmd
    try {
      await new Promise((resolve, reject) => {
        const test = spawn('python3', ['--version'], { stdio: 'pipe' })
        test.on('close', (code) => (code === 0 ? resolve() : reject()))
        test.on('error', reject)
      })
      pythonCmd = 'python3'
    } catch {
      pythonCmd = 'python'
    }

    try {
      
      await new Promise((resolve, reject) => {
        const test = spawn(pythonCmd, ['--version'], { stdio: 'pipe' })
        test.on('close', (code) => {
          if (code === 0) resolve()
          else reject(new Error('Python 解释器不可用'))
        })
        test.on('error', reject)
      })
    } catch (error) {
      throw new Error(`Python 解释器检查失败(${pythonCmd}): ${error.message}`)
    }

    
    const workerPath = path.join(__dirname, 'python-worker.py')
    const pythonWorker = spawn(pythonCmd, [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PLUGIN_ID: plugin.id,
        PLUGIN_PATH: plugin.path,
        PLUGIN_ENTRY: entryPath,
        PLUGIN_CONFIG: JSON.stringify(plugin.config || {}),
        PLUGIN_PERMISSIONS: JSON.stringify(Array.isArray(plugin.permissions) ? plugin.permissions : []),
        PLUGIN_CAPABILITIES: JSON.stringify(grantedCapabilities),
        PLUGIN_PROTOCOL_VERSION: '1.0.0',
        PLUGIN_SDK_VERSION: '1.0.0',
        PLUGIN_TIMEOUT_MS: String(this.config?.workerTimeout || 30000),
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
      }
    })

    
    const workerShim = this._createPythonWorkerShim(pythonWorker, plugin)

    
    return new Promise((resolve, reject) => {
      const onMessage = (msg) => {
        if (msg?.type === 'loaded') {
          
          const eventNames = msg.data?.instance?.eventNames || []
          const commandNames = msg.data?.instance?.commandNames || []
          const engine = this

          const toSafeArgs = (args) => args.map((a) => {
            if (a == null) return a
            const t = typeof a
            if (t === 'string' || t === 'number' || t === 'boolean') return a
            if (Array.isArray(a)) return a.slice(0, 20)
            if (t === 'object') {
              const out = {}
              const keys = Object.keys(a).slice(0, 20)
              for (const k of keys) {
                const v = a[k]
                if (typeof v === 'function') continue
                if (k.startsWith('_')) continue
                if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                  out[k] = v
                }
              }
              if ('msg' in a || 'raw_message' in a) {
                out.msg = a.msg
                out.raw_message = a.raw_message ?? a.msg
              }
              if ('user_id' in a) out.user_id = a.user_id
              if ('group_id' in a) out.group_id = a.group_id
              if ('message_type' in a) out.message_type = a.message_type
              if ('self_id' in a) out.self_id = a.self_id
              if ('message_id' in a) out.message_id = a.message_id
              if ('guild_id' in a) out.guild_id = a.guild_id
              if ('channel_id' in a) out.channel_id = a.channel_id
              return out
            }
            try { return JSON.parse(JSON.stringify(a)) } catch { return undefined }
          })

          const commands = {}
          for (const name of commandNames) {
            commands[name] = async function (...args) {
              const safeArgs = toSafeArgs(args)
              return await engine._callWorker(workerShim, { kind: 'command', name, args: safeArgs }, engine.config.workerTimeout)
            }
          }

          const events = {}
          for (const ev of eventNames) {
            events[ev] = async function (...args) {
              const safeArgs = toSafeArgs(args)
              return await engine._callWorker(workerShim, { kind: 'event', name: ev, args: safeArgs }, engine.config.workerTimeout)
            }
          }

          plugin.instance = {
            sandbox: false,
            python: true,
            eventNames,
            commandNames,
            commands,
            events,
            handshake: msg.data?.handshake || null,
            sdk: {
              capabilities: grantedCapabilities,
              permissions: Array.isArray(plugin.permissions) ? plugin.permissions : []
            }
          }
          this.workers.set(plugin.id, workerShim)
          
          try { this.registerEventHandlers?.(plugin) } catch (e) { logger?.debug?.(`注册 Python 插件事件处理器失败: ${plugin.id}`, e) }
          try { this.registerCommandHandlers?.(plugin) } catch (e) { logger?.debug?.(`注册 Python 插件命令处理器失败: ${plugin.id}`, e) }
          try {
            const registered = Array.from(this.commandHandlers.entries())
              .filter(([name, v]) => v?.plugin === plugin.id)
              .map(([name]) => name)
            const list = registered.length ? registered.join(', ') : '(无)'
            logger?.info?.(`Python 插件命令已就绪: ${plugin.id} 共 ${registered.length} 个 -> ${list}`)
          } catch (e) {
            logger?.debug?.(`打印 Python 命令列表失败: ${plugin.id}`, e)
          }
          workerShim.off('message', onMessage)
          resolve()
        } else if (msg?.type === 'error') {
          workerShim.off('message', onMessage)
          reject(new Error(msg.data || 'Python 插件加载失败'))
        }
      }

      
      const timeout = setTimeout(() => {
        workerShim.off('message', onMessage)
        reject(new Error('Python 插件加载超时'))
      }, this.config.workerTimeout || 30000)

      workerShim.on('message', onMessage)
      workerShim.on('error', (error) => {
        clearTimeout(timeout)
        workerShim.off('message', onMessage)
        reject(error)
      })

      
      workerShim.postMessage({ type: 'init', data: { pluginId: plugin.id } })
    })
  }

  


  _createPythonWorkerShim(pythonProcess, plugin) {
    const shim = new EventEmitter()
    shim._pluginId = plugin.id
    shim._process = pythonProcess

    
    let buffer = ''
    pythonProcess.stdout.on('data', (data) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() 

      for (const line of lines) {
        if (line.trim()) {
          try {
            const msg = JSON.parse(line.trim())
            this._handlePythonWorkerMessage(shim, plugin, msg)
          } catch (error) {
            logger?.error(`Python Worker JSON 解析错误: ${error.message}`, line)
          }
        }
      }
    })

    
    pythonProcess.stderr.on('data', (data) => {
      const errorMsg = data.toString().trim()
      if (errorMsg) {
        logger?.error(`Python Worker [${plugin.id}] stderr:`, errorMsg)
        shim.emit('error', new Error(errorMsg))
      }
    })

    
    pythonProcess.on('exit', (code, signal) => {
      if (code !== 0) {
        logger?.error(`Python Worker [${plugin.id}] 进程退出: code=${code}, signal=${signal}`)
        shim.emit('exit', code)
      }
    })

    
    pythonProcess.on('error', (error) => {
      logger?.error(`Python Worker [${plugin.id}] 进程错误:`, error)
      shim.emit('error', error)
    })

    
    shim.postMessage = (message) => {
      try {
        const json = JSON.stringify(message) + '\n'
        pythonProcess.stdin.write(json)
      } catch (error) {
        logger?.error(`Python Worker [${plugin.id}] 发送消息失败:`, error)
        shim.emit('error', error)
      }
    }

    shim.terminate = () => {
      try {
        pythonProcess.kill('SIGTERM')
        setTimeout(() => {
          if (!pythonProcess.killed) {
            pythonProcess.kill('SIGKILL')
          }
        }, 5000)
      } catch (error) {
        logger?.error(`Python Worker [${plugin.id}] 终止失败:`, error)
      }
    }

    return shim
  }

  


  _handlePythonWorkerMessage(pythonWorker, plugin, msg) {
    const { type, data } = msg || {}
    if (!type) return

    
    pythonWorker.emit('message', { type, data })

    switch (type) {
      case 'log': {
        const lvl = data?.level || 'info'
        const args = Array.isArray(data?.args) ? data.args : [data]
        logger?.[lvl]?.(`[${plugin.id}]`, ...args)
        break
      }
      case 'event': {
        try { eventBus.emit?.(data?.event, data?.data) } catch {}
        break
      }
      case 'call-result':
      case 'call-error': {
        const { callId } = data || {}
        if (callId && this.pendingCalls.has(callId)) {
          const { resolve, reject, timer } = this.pendingCalls.get(callId)
          clearTimeout(timer)
          this.pendingCalls.delete(callId)
          if (type === 'call-result') resolve(data.result)
          else reject(new Error(data.error || 'Python worker call error'))
        }
        break
      }
      case 'storage-get':
      case 'storage-set':
      case 'storage-delete':
      case 'http-get':
      case 'http-post':
      case 'bot-call':
      case 'send-message': {
        this._handleWorkerCapability(plugin, pythonWorker, type, data)
        break
      }
      case 'error': {
        logger?.error(`Python 插件 [${plugin.id}] 错误:`, data)
        break
      }
      default:
        break
    }
  }

}


const pluginEngine = new PluginEngine()


export default pluginEngine
export { PluginEngine, PluginInfo, PluginStatus, PluginType }


if (typeof global !== 'undefined') {
  global.pluginEngine = pluginEngine
}
