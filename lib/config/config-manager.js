import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import { watch } from 'chokidar'
import eventBus from '../common/event-bus.js'





export const ConfigType = {
  BOT: 'bot',
  SERVER: 'server',
  REDIS: 'redis',
  GROUP: 'group',
  RENDERER: 'renderer',
  OTHER: 'other',
  CUSTOM: 'custom'
}




export const ChangeType = {
  CREATED: 'created',
  MODIFIED: 'modified',
  DELETED: 'deleted',
  RENAMED: 'renamed'
}




export class ConfigInfo {
  constructor(options = {}) {
    this.name = options.name || ''
    this.type = options.type || ConfigType.CUSTOM
    this.path = options.path || ''
    this.defaultPath = options.defaultPath || ''
    this.data = options.data || {}
    this.schema = options.schema || null
    this.lastModified = options.lastModified || 0
    this.isWatched = options.isWatched || false
    this.isValid = options.isValid || true
    this.errors = options.errors || []
  }

  


  get(key, defaultValue = null) {
    if (!key) return this.data
    
    const keys = key.split('.')
    let value = this.data
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return defaultValue
      }
    }
    
    return value
  }

  


  set(key, value) {
    if (!key) {
      this.data = value
      return
    }
    
    const keys = key.split('.')
    let target = this.data
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {}
      }
      target = target[k]
    }
    
    target[keys[keys.length - 1]] = value
  }

  


  delete(key) {
    if (!key) {
      this.data = {}
      return
    }
    
    const keys = key.split('.')
    let target = this.data
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!target[k] || typeof target[k] !== 'object') {
        return false
      }
      target = target[k]
    }
    
    delete target[keys[keys.length - 1]]
    return true
  }

  


  has(key) {
    return this.get(key) !== null
  }

  


  validate() {
    this.errors = []
    this.isValid = true
    
    if (this.schema) {
      try {
        
        
        if (typeof this.data !== 'object') {
          this.errors.push('配置数据必须是对象')
          this.isValid = false
        }
      } catch (error) {
        this.errors.push(`配置验证失败: ${error.message}`)
        this.isValid = false
      }
    }
    
    return this.isValid
  }

  


  clone() {
    return new ConfigInfo({
      name: this.name,
      type: this.type,
      path: this.path,
      defaultPath: this.defaultPath,
      data: JSON.parse(JSON.stringify(this.data)),
      schema: this.schema,
      lastModified: this.lastModified,
      isWatched: this.isWatched,
      isValid: this.isValid,
      errors: [...this.errors]
    })
  }
}




export class ConfigManager {
  constructor() {
    
    this.configs = new Map()
    
    
    this.watchers = new Map()
    
    
    this.configDir = path.join(process.cwd(), 'config', 'config')
    this.defaultConfigDir = path.join(process.cwd(), 'config', 'default_config')
    
    
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 
    
    
    this.changeListeners = new Map()
    
    
    this.stats = {
      loadCount: 0,
      saveCount: 0,
      watchCount: 0,
      errorCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    
    
    this.isInitialized = false
    this.isDestroyed = false
    
    this.init()
  }

  


  async init() {
    try {
      
      await this.ensureConfigDirs()
      
      
      await this.loadDefaultConfigs()
      
      
      await this.loadUserConfigs()
      
      
      await this.startWatching()
      
      this.isInitialized = true
      
      eventBus.emit('config:initialized', {
        configCount: this.configs.size,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.stats.errorCount++
      throw error
    }
  }

  


  async ensureConfigDirs() {
    const dirs = [this.configDir, this.defaultConfigDir]
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
  }

  


  async loadDefaultConfigs() {
    if (!fs.existsSync(this.defaultConfigDir)) {
      return
    }

    
    const files = []
    const stack = [this.defaultConfigDir]
    while (stack.length > 0) {
      const dir = stack.pop()
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          stack.push(full)
        } else {
          const ext = path.extname(full).toLowerCase()
          if ([".yaml", ".yml", ".json"].includes(ext)) {
            files.push(full)
          }
        }
      }
    }

    for (const defaultFile of files) {
      const rel = path.relative(this.defaultConfigDir, defaultFile)
      const name = rel.replace(/\\/g, "/").replace(/\.(yaml|yml|json)$/i, "")

      
      const userCandidates = [".yaml", ".yml", ".json"].map(ext => path.join(this.configDir, name + ext))
      let userPath = null
      for (const p of userCandidates) {
        if (fs.existsSync(p)) { userPath = p; break }
      }

      try {
        await this.loadConfig(name, userPath, defaultFile)
      } catch (error) {
        console.error(`[ConfigManager] 加载默认配置失败 ${rel}:`, error)
      }
    }
  }

  


  async loadUserConfigs() {
    if (!fs.existsSync(this.configDir)) {
      return
    }

    
    const files = []
    const stack = [this.configDir]
    while (stack.length > 0) {
      const dir = stack.pop()
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          stack.push(full)
        } else {
          const ext = path.extname(full).toLowerCase()
          if ([".yaml", ".yml", ".json"].includes(ext)) {
            files.push(full)
          }
        }
      }
    }

    for (const userFile of files) {
      const rel = path.relative(this.configDir, userFile)
      const name = rel.replace(/\\/g, "/").replace(/\.(yaml|yml|json)$/i, "")

      
      if (this.configs.has(name)) continue

      
      const defaultCandidates = [".yaml", ".yml", ".json"].map(ext => path.join(this.defaultConfigDir, name + ext))
      let defaultPath = null
      for (const p of defaultCandidates) {
        if (fs.existsSync(p)) { defaultPath = p; break }
      }

      try {
        await this.loadConfig(name, userFile, defaultPath)
      } catch (error) {
        console.error(`[ConfigManager] 加载用户配置失败 ${rel}:`, error)
      }
    }
  }

  


  async loadConfig(name, configPath = null, defaultPath = null) {
    try {
      let data = {}
      let actualPath = configPath

      
      if (defaultPath && fs.existsSync(defaultPath)) {
        const defaultContent = fs.readFileSync(defaultPath, 'utf8')
        const ext = path.extname(defaultPath).toLowerCase()
        if (ext === '.json') {
          data = JSON.parse(defaultContent || '{}')
        } else {
          data = yaml.parse(defaultContent) || {}
        }
      }

      
      if (configPath && fs.existsSync(configPath)) {
        const userContent = fs.readFileSync(configPath, 'utf8')
        const uext = path.extname(configPath).toLowerCase()
        const userData = (uext === '.json') ? (JSON.parse(userContent || '{}')) : (yaml.parse(userContent) || {})
        data = this.mergeConfig(data, userData)
        actualPath = configPath
      } else if (defaultPath) {
        actualPath = defaultPath
      }

      const config = new ConfigInfo({
        name,
        type: this.getConfigType(name),
        path: actualPath,
        defaultPath,
        data,
        lastModified: actualPath ? fs.statSync(actualPath).mtime.getTime() : 0
      })

      config.validate()
      this.configs.set(name, config)
      this.stats.loadCount++

      
      this.cache.delete(name)

      eventBus.emit('config:loaded', {
        name,
        path: actualPath,
        timestamp: Date.now()
      })

      return config
    } catch (error) {
      this.stats.errorCount++
     
      throw error
    }
  }

  


  async saveConfig(name, data = null) {
    try {
      const config = this.configs.get(name)
      if (!config) {
        throw new Error(`配置不存在: ${name}`)
      }
      
      if (data !== null) {
        config.data = data
      }
      
      const configPath = path.join(this.configDir, `${name}.yaml`)
      const yamlContent = yaml.stringify(config.data, {
        indent: 2,
        lineWidth: 120
      })
      
      
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      
      
      fs.writeFileSync(configPath, yamlContent, 'utf8')
      
      config.path = configPath
      config.lastModified = Date.now()
      this.stats.saveCount++
      
      
      this.cache.delete(name)
      
      eventBus.emit('config:saved', {
        name,
        path: configPath,
        timestamp: Date.now()
      })
      
      
      return true
    } catch (error) {
      this.stats.errorCount++
      console.error(`[ConfigManager] 保存配置失败 ${name}:`, error)
      throw error
    }
  }

  


  getConfig(name) {
    const cacheKey = `config:${name}`
    
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        this.stats.cacheHits++
        return cached.config
      }
      this.cache.delete(cacheKey)
    }
    
    this.stats.cacheMisses++
    const config = this.configs.get(name)
    
    if (config) {
      
      this.cache.set(cacheKey, {
        config: config.clone(),
        timestamp: Date.now()
      })
    }
    
    return config
  }

  


  get(configName, key = null, defaultValue = null) {
    const config = this.getConfig(configName)
    if (!config) {
      return defaultValue
    }
    
    return config.get(key, defaultValue)
  }

  


  set(configName, key, value) {
    const config = this.getConfig(configName)
    if (!config) {
      throw new Error(`配置不存在: ${configName}`)
    }
    
    config.set(key, value)
    
    
    this.cache.delete(`config:${configName}`)
    
    eventBus.emit('config:changed', {
      name: configName,
      key,
      value,
      timestamp: Date.now()
    })
  }

  


  delete(configName, key) {
    const config = this.getConfig(configName)
    if (!config) {
      return false
    }
    
    const result = config.delete(key)
    
    if (result) {
      
      this.cache.delete(`config:${configName}`)
      
      eventBus.emit('config:changed', {
        name: configName,
        key,
        value: undefined,
        timestamp: Date.now()
      })
    }
    
    return result
  }

  


  has(configName, key = null) {
    const config = this.getConfig(configName)
    if (!config) {
      return false
    }
    
    return key ? config.has(key) : true
  }

  


  async reloadConfig(name) {
    try {
      const config = this.configs.get(name)
      if (!config) {
        throw new Error(`配置不存在: ${name}`)
      }
      
      await this.loadConfig(name, config.path, config.defaultPath)
      
      eventBus.emit('config:reloaded', {
        name,
        timestamp: Date.now()
      })
      
      return true
    } catch (error) {
      this.stats.errorCount++
     
      throw error
    }
  }

  


  async reloadAll() {
    try {
      const names = Array.from(this.configs.keys())
      
      for (const name of names) {
        await this.reloadConfig(name)
      }
      
      eventBus.emit('config:reloaded_all', {
        count: names.length,
        timestamp: Date.now()
      })
      
      return true
    } catch (error) {
      this.stats.errorCount++
      throw error
    }
  }

  


  async startWatching() {
    try {
      const watchPaths = [this.configDir, this.defaultConfigDir]
      
      for (const watchPath of watchPaths) {
        if (fs.existsSync(watchPath)) {
          const watcher = watch(watchPath, {
            ignored: /(^|[\/\\])\../, 
            persistent: true,
            ignoreInitial: true
          })
          
          watcher.on('change', async (filePath) => {
            await this.handleFileChange(filePath, ChangeType.MODIFIED)
          })
          
          watcher.on('add', async (filePath) => {
            await this.handleFileChange(filePath, ChangeType.CREATED)
          })
          
          watcher.on('unlink', async (filePath) => {
            await this.handleFileChange(filePath, ChangeType.DELETED)
          })
          
          this.watchers.set(watchPath, watcher)
          this.stats.watchCount++
        }
      }
      
    } catch (error) {
      console.error('[ConfigManager] 启动文件监听失败:', error)
    }
  }

  


  async handleFileChange(filePath, changeType) {
    try {
      const ext = path.extname(filePath).toLowerCase()
      if (!['.yaml', '.yml', '.json'].includes(ext)) {
        return
      }

      const isUser = filePath.startsWith(this.configDir)
      const baseDir = isUser ? this.configDir : this.defaultConfigDir
      const rel = path.relative(baseDir, filePath)
      const name = rel.replace(/\\/g, '/').replace(/\.(yaml|yml|json)$/i, '')

      if (changeType === ChangeType.DELETED) {
        if (isUser) {
          
          const defaultCandidates = ['.yaml', '.yml', '.json'].map(ext => path.join(this.defaultConfigDir, name + ext))
          let defaultPath = null
          for (const p of defaultCandidates) { if (fs.existsSync(p)) { defaultPath = p; break } }
          if (defaultPath) {
            await this.loadConfig(name, null, defaultPath)
          }
        } else {
          
          const userCandidates = ['.yaml', '.yml', '.json'].map(ext => path.join(this.configDir, name + ext))
          let userPath = null
          for (const p of userCandidates) { if (fs.existsSync(p)) { userPath = p; break } }
          if (userPath) {
            await this.loadConfig(name, userPath, null)
          }
        }
      } else {
        
        if (isUser) {
          const defaultCandidates = ['.yaml', '.yml', '.json'].map(ext => path.join(this.defaultConfigDir, name + ext))
          let defaultPath = null
          for (const p of defaultCandidates) { if (fs.existsSync(p)) { defaultPath = p; break } }
          await this.loadConfig(name, filePath, defaultPath)
        } else {
          const userCandidates = ['.yaml', '.yml', '.json'].map(ext => path.join(this.configDir, name + ext))
          let userPath = null
          for (const p of userCandidates) { if (fs.existsSync(p)) { userPath = p; break } }
          await this.loadConfig(name, userPath, filePath)
        }
      }

      eventBus.emit('config:file_changed', {
        name,
        path: filePath,
        changeType,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error(`[ConfigManager] 处理文件变更失败 ${filePath}:`, error)
    }
  }

  


  async stopWatching() {
    try {
      for (const [path, watcher] of this.watchers) {
        await watcher.close()
      }
      
      this.watchers.clear()
    } catch (error) {
      console.error('[ConfigManager] 停止文件监听失败:', error)
    }
  }

  


  mergeConfig(defaultConfig, userConfig) {
    if (!userConfig || typeof userConfig !== 'object') {
      return defaultConfig
    }
    
    const result = { ...defaultConfig }
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.mergeConfig(result[key] || {}, value)
      } else {
        result[key] = value
      }
    }
    
    return result
  }

  


  getConfigType(name) {
    const last = (name || '').split('/').pop()
    const typeMap = {
      bot: ConfigType.BOT,
      server: ConfigType.SERVER,
      redis: ConfigType.REDIS,
      group: ConfigType.GROUP,
      renderer: ConfigType.RENDERER,
      other: ConfigType.OTHER
    }
    return typeMap[last] || ConfigType.CUSTOM
  }

  


  getConfigNames() {
    return Array.from(this.configs.keys())
  }

  


  getAllConfigs() {
    const result = {}
    
    for (const [name, config] of this.configs) {
      result[name] = config.clone()
    }
    
    return result
  }

  


  clearCache() {
    this.cache.clear()
  }

  


  getStats() {
    return {
      ...this.stats,
      configCount: this.configs.size,
      cacheSize: this.cache.size,
      watcherCount: this.watchers.size,
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed
    }
  }

  


  getHealth() {
    const stats = this.getStats()
    
    return {
      status: this.isInitialized && !this.isDestroyed ? 'healthy' : 'unhealthy',
      configCount: stats.configCount,
      errorRate: stats.loadCount > 0 ? stats.errorCount / stats.loadCount : 0,
      cacheHitRate: stats.cacheHits + stats.cacheMisses > 0 ? 
        stats.cacheHits / (stats.cacheHits + stats.cacheMisses) : 0,
      lastCheck: Date.now()
    }
  }

  


  async destroy() {
    try {
      
      await this.stopWatching()
      
      
      this.clearCache()
      
      
      this.configs.clear()
      
      this.isDestroyed = true
      
      eventBus.emit('config:destroyed', {
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('[ConfigManager] 销毁配置管理器失败:', error)
      throw error
    }
  }
}


const configManager = new ConfigManager()


export default configManager
export const getConfig = (name, key, defaultValue) => configManager.get(name, key, defaultValue)
export const setConfig = (name, key, value) => configManager.set(name, key, value)
export const hasConfig = (name, key) => configManager.has(name, key)
export const reloadConfig = (name) => configManager.reloadConfig(name)
export const saveConfig = (name, data) => configManager.saveConfig(name, data)