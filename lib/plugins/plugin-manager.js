import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import chokidar from 'chokidar'
import eventManager from '../common/event-manager.js'




export const PluginStatus = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  LOADED: 'loaded',
  RUNNING: 'running',
  ERROR: 'error',
  DISABLED: 'disabled'
}




export const PluginType = {
  SYSTEM: 'system',
  GAME: 'game',
  TOOL: 'tool',
  OTHER: 'other'
}




export const PluginPriority = {
  HIGHEST: 1000,
  HIGH: 750,
  NORMAL: 500,
  LOW: 250,
  LOWEST: 0
}




export class PluginInfo {
  constructor(data = {}) {
    this.name = data.name || ''
    this.version = data.version || '1.0.0'
    this.description = data.description || ''
    this.author = data.author || ''
    this.type = data.type || PluginType.OTHER
    this.priority = data.priority || PluginPriority.NORMAL
    this.dependencies = data.dependencies || []
    this.permissions = data.permissions || []
    this.config = data.config || {}
    this.entry = data.entry || 'index.js'
    this.language = data.language || 'js'
    this.enabled = data.enabled !== false
    this.autoStart = data.autoStart !== false
    this.status = PluginStatus.UNLOADED
    this.loadTime = null
    this.error = null
    this.instance = null
    this.filePath = data.filePath || ''
    this.dirPath = data.dirPath || ''
    this.watchFiles = new Set()
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  


  update(data) {
    Object.assign(this, data)
    this.updatedAt = new Date()
  }

  


  setStatus(status, error = null) {
    this.status = status
    this.error = error
    this.updatedAt = new Date()
  }

  


  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      type: this.type,
      priority: this.priority,
      dependencies: this.dependencies,
      permissions: this.permissions,
      enabled: this.enabled,
      autoStart: this.autoStart,
      status: this.status,
      loadTime: this.loadTime,
      error: this.error?.message || null,
      filePath: this.filePath,
      dirPath: this.dirPath,
      entry: this.entry,
      language: this.language,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  


  toJSON() {
    return this.getInfo()
  }
}




export class BasePlugin {
  constructor(info = {}) {
    this.info = new PluginInfo(info)
    this.logger = console 
    this.events = new Map() 
    this.timers = new Set() 
    this.resources = new Set() 
  }

  


  async initialize() {
    
  }

  


  async start() {
    
  }

  


  async stop() {
    
    for (const listenerId of this.events.values()) {
      eventManager.removeEventListener(listenerId)
    }
    this.events.clear()

    
    for (const timer of this.timers) {
      clearTimeout(timer)
      clearInterval(timer)
    }
    this.timers.clear()

    
    this.resources.clear()
  }

  


  async destroy() {
    await this.stop()
  }

  


  addEventListener(event, handler, options = {}) {
    const listenerId = eventManager.addEventListener(event, handler, {
      ...options,
      namespace: this.info.name
    })
    this.events.set(event, listenerId)
    return listenerId
  }

  


  removeEventListener(event) {
    const listenerId = this.events.get(event)
    if (listenerId) {
      eventManager.removeEventListener(listenerId)
      this.events.delete(event)
      return true
    }
    return false
  }

  


  emitEvent(event, data) {
    return eventManager.emitEvent(event, data)
  }

  


  setTimeout(callback, delay) {
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      callback()
    }, delay)
    this.timers.add(timer)
    return timer
  }

  


  setInterval(callback, interval) {
    const timer = setInterval(callback, interval)
    this.timers.add(timer)
    return timer
  }

  


  clearTimer(timer) {
    clearTimeout(timer)
    clearInterval(timer)
    this.timers.delete(timer)
  }

  


  addResource(resource) {
    this.resources.add(resource)
  }

  


  removeResource(resource) {
    this.resources.delete(resource)
  }

  


  getInfo() {
    return this.info.getInfo()
  }
}




export class PluginManager {
  constructor() {
    this.plugins = new Map() 
    this.pluginDirs = new Set() 
    this.watchers = new Map() 
    this.loadOrder = [] 
    this.stats = {
      totalPlugins: 0,
      loadedPlugins: 0,
      runningPlugins: 0,
      errorPlugins: 0,
      loadTime: 0
    }
    this.hotReload = true
    this.initialized = false
    
    this.scanDepth = 3
    this.entryCandidates = ['index.js', 'index.ts', 'index.mjs', 'index.cjs', 'index.py', 'main.js', 'main.ts', 'main.py']
  }

  


  async initialize(options = {}) {
    if (this.initialized) return

    try {
      this.hotReload = options.hotReload !== false
      
      
      this.scanDepth = Number(options.scanDepth ?? this.scanDepth)
      if (Array.isArray(options.entryCandidates) && options.entryCandidates.length > 0) {
        this.entryCandidates = options.entryCandidates
      }
      
      
      const defaultDirs = options.pluginDirs || ['plugins']
      for (const dir of defaultDirs) {
        this.addPluginDir(path.resolve(dir))
      }

      
      await this.scanPlugins()
      
      
      if (this.hotReload) {
        this.startWatching()
      }

      this.initialized = true
      await eventManager.emitEvent('plugin:manager:initialized', {
        totalPlugins: this.stats.totalPlugins
      })
    } catch (error) {
      throw error
    }
  }

  


  addPluginDir(dirPath) {
    const absolutePath = path.resolve(dirPath)
    if (fs.existsSync(absolutePath)) {
      this.pluginDirs.add(absolutePath)
      return true
    }
    return false
  }

  


  removePluginDir(dirPath) {
    const absolutePath = path.resolve(dirPath)
    return this.pluginDirs.delete(absolutePath)
  }

  


  async scanPlugins() {
    const startTime = Date.now()

    const maxDepth = Number(this.scanDepth ?? 3)
    const entryNames = Array.isArray(this.entryCandidates) && this.entryCandidates.length > 0
      ? this.entryCandidates
      : ['index.js', 'index.ts', 'index.mjs', 'index.cjs', 'index.py', 'main.js', 'main.ts', 'main.py']

    
    const allowedExts = Array.from(new Set(
      entryNames.map(n => path.extname(n)).filter(Boolean).concat(['.js', '.ts', '.mjs', '.cjs', '.py'])
    ))

    const ensureExists = async (p) => !!p && await fs.promises.access(p).then(() => true).catch(() => false)

    const isPluginCandidate = async (dir) => {
      if (await ensureExists(path.join(dir, 'package.json'))) return true
      if (await ensureExists(path.join(dir, 'plugin.json'))) return true
      for (const f of entryNames) {
        if (await ensureExists(path.join(dir, f))) return true
      }
      
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true })
        const files = items.filter(it => it.isFile() && allowedExts.includes(path.extname(it.name)))
        if (files.length === 1) {
          return true
        }
      } catch {}
      return false
    }

    const walk = async (dir, depthLeft) => {
      if (depthLeft < 0) return
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const sub = path.join(dir, entry.name)
        if (await isPluginCandidate(sub)) {
          await this.scanPlugin(sub)
          
          continue
        }
        await walk(sub, depthLeft - 1)
      }
    }

    for (const pluginDir of this.pluginDirs) {
      await walk(pluginDir, maxDepth)
    }

    this.stats.loadTime = Date.now() - startTime
  }

  


  async scanPlugin(pluginPath) {
    try {
      const packagePath = path.join(pluginPath, 'package.json')
      const configPath = path.join(pluginPath, 'plugin.json')
      
      let pluginConfig = {}
      
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8')
        pluginConfig = JSON.parse(configContent)
      } else if (fs.existsSync(packagePath)) {
        const packageContent = fs.readFileSync(packagePath, 'utf8')
        const packageData = JSON.parse(packageContent)
        pluginConfig = {
          name: packageData.name,
          version: packageData.version,
          description: packageData.description,
          author: packageData.author,
          ...packageData.yunzai
        }
      }

      
      pluginConfig.name = pluginConfig.name || path.basename(pluginPath)
      pluginConfig.dirPath = pluginPath

      
      const tryCandidates = Array.isArray(this.entryCandidates) && this.entryCandidates.length > 0
        ? this.entryCandidates
        : ['index.js', 'index.ts', 'index.mjs', 'index.cjs', 'index.py', 'main.js', 'main.ts', 'main.py']
      let resolvedEntry = pluginConfig.entry
      if (resolvedEntry) {
        const specifiedPath = path.join(pluginPath, resolvedEntry)
        if (!fs.existsSync(specifiedPath)) {
          
          resolvedEntry = null
        }
      }
      if (!resolvedEntry) {
        for (const candidate of tryCandidates) {
          const full = path.join(pluginPath, candidate)
          if (fs.existsSync(full)) {
            resolvedEntry = candidate
            break
          }
        }
      }

      
      if (!resolvedEntry) {
        const allowedExts = Array.from(new Set(
          tryCandidates.map(n => path.extname(n)).filter(Boolean).concat(['.js', '.ts', '.mjs', '.cjs', '.py'])
        ))
        try {
          const items = fs.readdirSync(pluginPath, { withFileTypes: true })
          const files = items
            .filter(d => d.isFile() && allowedExts.includes(path.extname(d.name)))
            .map(d => d.name)
          if (files.length > 0) {
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
            resolvedEntry = files[0]
          }
        } catch {}
      }

      if (!resolvedEntry) {
        console.warn(`Plugin entry file not found in ${pluginPath}`)
        return
      }

      pluginConfig.entry = resolvedEntry
      pluginConfig.filePath = path.join(pluginPath, resolvedEntry)
      const ext = path.extname(resolvedEntry).toLowerCase()
      pluginConfig.language = ext === '.ts' ? 'ts' : (ext === '.py' ? 'python' : 'js')

      
      const pluginInfo = new PluginInfo(pluginConfig)
      this.plugins.set(pluginInfo.name, pluginInfo)
      this.stats.totalPlugins++

    } catch (error) {
    }
  }

  


  async loadPlugin(name) {
    const pluginInfo = this.plugins.get(name)
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${name}`)
    }

    if (pluginInfo.status === PluginStatus.LOADED || 
        pluginInfo.status === PluginStatus.RUNNING) {
      return pluginInfo
    }

    try {
      pluginInfo.setStatus(PluginStatus.LOADING)
      
      
      await this.checkDependencies(pluginInfo)
      
      
      

      
      let moduleUrl
      if (pluginInfo.language === 'ts' || pluginInfo.filePath.endsWith('.ts')) {
        try {
          const esbuild = await import('esbuild')
          const outDir = path.join(process.cwd(), 'data', 'plugin-build', pluginInfo.name)
          const outFile = path.join(outDir, 'index.mjs')
          fs.mkdirSync(outDir, { recursive: true })
          await esbuild.build({
            entryPoints: [pluginInfo.filePath],
            outfile: outFile,
            bundle: true,
            platform: 'node',
            format: 'esm',
            target: 'node18',
            sourcemap: false,
            external: ['fs','path','url','os','events','stream','crypto','util','http','https','zlib','tty','node:*']
          })
          moduleUrl = pathToFileURL(outFile).href
        } catch (err) {
          if (err?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module 'esbuild'/.test(String(err?.message || ''))) {
            throw new Error('缺少依赖 esbuild，请先安装：pnpm add -D esbuild')
          }
          throw err
        }
      } else {
        moduleUrl = pathToFileURL(pluginInfo.filePath).href
      }
      const module = await import(`${moduleUrl}?t=${Date.now()}`)
      
      
      let instance
      if (module.default) {
        if (typeof module.default === 'function') {
          instance = new module.default(pluginInfo.config)
        } else {
          instance = module.default
        }
      } else {
        instance = new BasePlugin(pluginInfo.config)
      }

      
      if (instance.info) {
        instance.info.update(pluginInfo)
      }

      pluginInfo.instance = instance
      pluginInfo.loadTime = new Date()
      pluginInfo.setStatus(PluginStatus.LOADED)
      
      this.stats.loadedPlugins++
      
      await eventManager.emitEvent('plugin:loaded', {
        name,
        info: pluginInfo.getInfo()
      })
      
      return pluginInfo
    } catch (error) {
      pluginInfo.setStatus(PluginStatus.ERROR, error)
      this.stats.errorPlugins++
      console.error(`Failed to load plugin ${name}:`, error)
      
      
      await eventManager.emitEvent('plugin:error', {
        name,
        error: error.message,
        type: 'load'
      })
      
      throw error
    }
  }

  


  async unloadPlugin(name) {
    const pluginInfo = this.plugins.get(name)
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${name}`)
    }

    try {
      
      if (pluginInfo.status === PluginStatus.RUNNING) {
        await this.stopPlugin(name)
      }

      
      if (pluginInfo.instance && typeof pluginInfo.instance.destroy === 'function') {
        await pluginInfo.instance.destroy()
      }

      pluginInfo.instance = null
      pluginInfo.setStatus(PluginStatus.UNLOADED)
      
      if (this.stats.loadedPlugins > 0) {
        this.stats.loadedPlugins--
      }
      
      await eventManager.emitEvent('plugin:unloaded', {
        name,
        info: pluginInfo.getInfo()
      })
      
      return true
    } catch (error) {
      pluginInfo.setStatus(PluginStatus.ERROR, error)
      console.error(`Failed to unload plugin ${name}:`, error)
      
      
      await eventManager.emitEvent('plugin:error', {
        name,
        error: error.message,
        type: 'unload'
      })
      
      throw error
    }
  }

  


  async startPlugin(name) {
    const pluginInfo = this.plugins.get(name)
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${name}`)
    }

    if (!pluginInfo.enabled) {
      throw new Error(`Plugin is disabled: ${name}`)
    }

    if (pluginInfo.status === PluginStatus.RUNNING) {
      return pluginInfo
    }

    try {
      
      if (pluginInfo.status !== PluginStatus.LOADED) {
        await this.loadPlugin(name)
      }

      
      if (pluginInfo.instance && typeof pluginInfo.instance.initialize === 'function') {
        await pluginInfo.instance.initialize()
      }

      
      if (pluginInfo.instance && typeof pluginInfo.instance.start === 'function') {
        await pluginInfo.instance.start()
      }

      pluginInfo.setStatus(PluginStatus.RUNNING)
      this.stats.runningPlugins++
      
      await eventManager.emitEvent('plugin:started', {
        name,
        info: pluginInfo.getInfo()
      })
      
      return pluginInfo
    } catch (error) {
      pluginInfo.setStatus(PluginStatus.ERROR, error)
      this.stats.errorPlugins++
      console.error(`Failed to start plugin ${name}:`, error)
      
      
      await eventManager.emitEvent('plugin:error', {
        name,
        error: error.message,
        type: 'start'
      })
      
      throw error
    }
  }

  


  async stopPlugin(name) {
    const pluginInfo = this.plugins.get(name)
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${name}`)
    }

    if (pluginInfo.status !== PluginStatus.RUNNING) {
      return pluginInfo
    }

    try {
      
      if (pluginInfo.instance && typeof pluginInfo.instance.stop === 'function') {
        await pluginInfo.instance.stop()
      }

      pluginInfo.setStatus(PluginStatus.LOADED)
      
      if (this.stats.runningPlugins > 0) {
        this.stats.runningPlugins--
      }
      
    
      await eventManager.emitEvent('plugin:stopped', {
        name,
        info: pluginInfo.getInfo()
      })
      
      return pluginInfo
    } catch (error) {
      pluginInfo.setStatus(PluginStatus.ERROR, error)
      
      
      await eventManager.emitEvent('plugin:error', {
        name,
        error: error.message,
        type: 'stop'
      })
      
      throw error
    }
  }

  


  async reloadPlugin(name) {
    try {
      await this.unloadPlugin(name)
      await this.loadPlugin(name)
      
      const pluginInfo = this.plugins.get(name)
      if (pluginInfo && pluginInfo.autoStart) {
        await this.startPlugin(name)
      }
      
      
      await eventManager.emitEvent('plugin:reloaded', {
        name,
        info: pluginInfo?.getInfo()
      })
      
      return pluginInfo
    } catch (error) {
      console.error(`Failed to reload plugin ${name}:`, error)
      throw error
    }
  }

  


  async enablePlugin(name) {
    const pluginInfo = this.plugins.get(name)
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${name}`)
    }

    pluginInfo.enabled = true
    
    if (pluginInfo.autoStart) {
      await this.startPlugin(name)
    }
    
    return pluginInfo
  }

  


  async disablePlugin(name) {
    const pluginInfo = this.plugins.get(name)
    if (!pluginInfo) {
      throw new Error(`Plugin not found: ${name}`)
    }

    pluginInfo.enabled = false
    
    if (pluginInfo.status === PluginStatus.RUNNING) {
      await this.stopPlugin(name)
    }
    
    pluginInfo.setStatus(PluginStatus.DISABLED)
    
    return pluginInfo
  }

  


  async checkDependencies(pluginInfo) {
    for (const dep of pluginInfo.dependencies) {
      const depPlugin = this.plugins.get(dep)
      if (!depPlugin) {
        throw new Error(`Dependency not found: ${dep}`)
      }
      
      if (depPlugin.status !== PluginStatus.LOADED && 
          depPlugin.status !== PluginStatus.RUNNING) {
        await this.loadPlugin(dep)
      }
    }
  }

  


  async startAllPlugins() {
    const plugins = Array.from(this.plugins.values())
    
    
    plugins.sort((a, b) => b.priority - a.priority)
    
    for (const pluginInfo of plugins) {
      if (pluginInfo.enabled && pluginInfo.autoStart) {
        try {
          await this.startPlugin(pluginInfo.name)
        } catch (error) {
          console.error(`Failed to auto-start plugin ${pluginInfo.name}:`, error)
        }
      }
    }
  }

  


  async stopAllPlugins() {
    const runningPlugins = Array.from(this.plugins.values())
      .filter(p => p.status === PluginStatus.RUNNING)
      .sort((a, b) => a.priority - b.priority) 
    
    for (const pluginInfo of runningPlugins) {
      try {
        await this.stopPlugin(pluginInfo.name)
      } catch (error) {
        console.error(`Failed to stop plugin ${pluginInfo.name}:`, error)
      }
    }
  }

  


  startWatching() {
    if (!this.hotReload) return

    for (const pluginDir of this.pluginDirs) {
      const watcher = chokidar.watch(pluginDir, {
        ignored: /node_modules/,
        persistent: true,
        ignoreInitial: true
      })

      watcher.on('change', async (filePath) => {
        await this.handleFileChange(filePath)
      })

      watcher.on('add', async (filePath) => {
        await this.handleFileAdd(filePath)
      })

      watcher.on('unlink', async (filePath) => {
        await this.handleFileDelete(filePath)
      })

      this.watchers.set(pluginDir, watcher)
    }

  }

  


  stopWatching() {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
  }

  


  async handleFileChange(filePath) {
    const pluginName = this.getPluginNameByFile(filePath)
    if (pluginName) {
      console.log(`Plugin file changed: ${filePath}, reloading ${pluginName}`)
      try {
        await this.reloadPlugin(pluginName)
      } catch (error) {
        console.error(`Failed to reload plugin ${pluginName} after file change:`, error)
      }
    }
  }

  


  async handleFileAdd(filePath) {
    if (path.basename(filePath) === 'plugin.json' || path.basename(filePath) === 'package.json') {
      const pluginPath = path.dirname(filePath)
      await this.scanPlugin(pluginPath)
    }
  }

  


  async handleFileDelete(filePath) {
    const pluginName = this.getPluginNameByFile(filePath)
    if (pluginName) {
      console.log(`Plugin file deleted: ${filePath}, unloading ${pluginName}`)
      try {
        await this.unloadPlugin(pluginName)
        this.plugins.delete(pluginName)
        this.stats.totalPlugins--
      } catch (error) {
        console.error(`Failed to unload plugin ${pluginName} after file deletion:`, error)
      }
    }
  }

  


  getPluginNameByFile(filePath) {
    for (const [name, pluginInfo] of this.plugins) {
      if (filePath.startsWith(pluginInfo.dirPath)) {
        return name
      }
    }
    return null
  }

  


  getPlugin(name) {
    const pluginInfo = this.plugins.get(name)
    return pluginInfo ? pluginInfo.getInfo() : null
  }

  


  getAllPlugins() {
    return Array.from(this.plugins.values()).map(p => p.getInfo())
  }

  


  getPluginList(filter = {}) {
    let plugins = Array.from(this.plugins.values())
    
    if (filter.status) {
      plugins = plugins.filter(p => p.status === filter.status)
    }
    
    if (filter.type) {
      plugins = plugins.filter(p => p.type === filter.type)
    }
    
    if (filter.enabled !== undefined) {
      plugins = plugins.filter(p => p.enabled === filter.enabled)
    }
    
    return plugins.map(p => p.getInfo())
  }

  


  getStats() {
    
    this.stats.totalPlugins = this.plugins.size
    this.stats.loadedPlugins = Array.from(this.plugins.values())
      .filter(p => p.status === PluginStatus.LOADED || p.status === PluginStatus.RUNNING).length
    this.stats.runningPlugins = Array.from(this.plugins.values())
      .filter(p => p.status === PluginStatus.RUNNING).length
    this.stats.errorPlugins = Array.from(this.plugins.values())
      .filter(p => p.status === PluginStatus.ERROR).length
    
    return { ...this.stats }
  }

  


  getHealth() {
    const stats = this.getStats()
    const errorRate = stats.totalPlugins > 0 ? stats.errorPlugins / stats.totalPlugins : 0
    
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      totalPlugins: stats.totalPlugins,
      loadedPlugins: stats.loadedPlugins,
      runningPlugins: stats.runningPlugins,
      errorPlugins: stats.errorPlugins,
      errorRate: Math.round(errorRate * 10000) / 100, 
      hotReload: this.hotReload,
      watchingDirs: this.watchers.size
    }
  }

  


  async destroy() {
    try {
      
      await this.stopAllPlugins()
      
      
      for (const name of this.plugins.keys()) {
        try {
          await this.unloadPlugin(name)
        } catch (error) {
          console.error(`Error unloading plugin ${name}:`, error)
        }
      }
      
      
      this.stopWatching()
      
      
      this.plugins.clear()
      this.pluginDirs.clear()
      this.loadOrder = []
      
      this.initialized = false
    } catch (error) {
      throw error
    }
  }
}


const pluginManager = new PluginManager()


export default pluginManager
export const { loadPlugin, unloadPlugin, startPlugin, stopPlugin, reloadPlugin } = pluginManager