import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import chokidar from 'chokidar'
import lodash from 'lodash'
import eventBus from './event-bus.js'





class HotReloadManager {
  constructor() {
    
    this.modules = new Map()
    
    
    this.dependencies = new Map()
    
    
    this.watchers = new Map()
    
    
    this.loading = new Set()
    
    
    this.config = {
      watchDelay: 300,
      maxRetries: 3,
      retryDelay: 1000,
      enableWatch: true,
      watchPatterns: ['**/*.js', '**/*.mjs'],
      ignorePatterns: ['node_modules/**', '.git/**', 'logs/**']
    }
    
    
    this.stats = {
      loaded: 0,
      unloaded: 0,
      reloaded: 0,
      errors: 0,
      startTime: Date.now()
    }
    
    
    this.cacheCleaners = new Map()
    
    
    this.hooks = {
      beforeLoad: [],
      afterLoad: [],
      beforeUnload: [],
      afterUnload: [],
      beforeReload: [],
      afterReload: []
    }
  }

  



  async init(config = {}) {
    this.config = { ...this.config, ...config }
    
    
    eventBus.register('system:shutdown', () => this.destroy(), {
      namespace: 'hot-reload',
      priority: 100
    })
    
    logger?.info('热加载管理器初始化完成')
  }

  




  async loadModule(modulePath, options = {}) {
    const {
      watch = this.config.enableWatch,
      force = false,
      dependencies = [],
      metadata = {}
    } = options

    const fullPath = path.resolve(modulePath)
    const moduleId = this.getModuleId(fullPath)

    
    if (this.modules.has(moduleId) && !force) {
      logger?.debug(`模块已存在: ${moduleId}`)
      return this.modules.get(moduleId)
    }

    
    if (this.loading.has(moduleId)) {
      logger?.debug(`模块正在加载: ${moduleId}`)
      return null
    }

    this.loading.add(moduleId)

    try {
      
      await this.runHooks('beforeLoad', { moduleId, modulePath: fullPath, options })

      
      await fs.access(fullPath)

      
      this.clearModuleCache(fullPath)

      
      const moduleUrl = pathToFileURL(fullPath).href + `?t=${Date.now()}`
      const moduleExports = await import(moduleUrl)

      
      const moduleInfo = {
        id: moduleId,
        path: fullPath,
        exports: moduleExports,
        dependencies: new Set(dependencies),
        dependents: new Set(),
        metadata: {
          ...metadata,
          loadTime: Date.now(),
          loadCount: (this.modules.get(moduleId)?.metadata.loadCount || 0) + 1
        },
        watcher: null
      }

      
      this.registerDependencies(moduleId, dependencies)

      
      this.modules.set(moduleId, moduleInfo)

      
      if (watch) {
        await this.watchModule(moduleId, fullPath)
      }

      
      await this.runHooks('afterLoad', { moduleId, moduleInfo, options })

      this.stats.loaded++
      
      eventBus.emit('module:loaded', {
        moduleId,
        path: fullPath,
        exports: moduleExports
      })

      logger?.info(`模块已加载: ${moduleId}`)
      return moduleInfo

    } catch (error) {
      this.stats.errors++
      logger?.error(`模块加载失败: ${moduleId}`, error)
      
      eventBus.emit('module:load-error', {
        moduleId,
        path: fullPath,
        error
      })
      
      throw error
    } finally {
      this.loading.delete(moduleId)
    }
  }

  




  async unloadModule(moduleId, options = {}) {
    const { force = false, cascade = true } = options

    if (!this.modules.has(moduleId)) {
      logger?.warn(`模块不存在: ${moduleId}`)
      return false
    }

    const moduleInfo = this.modules.get(moduleId)

    try {
      
      await this.runHooks('beforeUnload', { moduleId, moduleInfo, options })

      
      if (!force && moduleInfo.dependents.size > 0) {
        if (cascade) {
          
          for (const dependentId of moduleInfo.dependents) {
            await this.unloadModule(dependentId, { force: true, cascade: true })
          }
        } else {
          throw new Error(`模块被其他模块依赖: ${Array.from(moduleInfo.dependents).join(', ')}`)
        }
      }

      
      if (moduleInfo.watcher) {
        await moduleInfo.watcher.close()
        this.watchers.delete(moduleId)
      }

      
      if (moduleInfo.exports.default?.destroy) {
        await moduleInfo.exports.default.destroy()
      }
      
      if (moduleInfo.exports.destroy) {
        await moduleInfo.exports.destroy()
      }

      
      this.unregisterDependencies(moduleId)

      
      this.clearModuleCache(moduleInfo.path)

      
      this.modules.delete(moduleId)

      
      await this.runHooks('afterUnload', { moduleId, moduleInfo, options })

      this.stats.unloaded++
      
      eventBus.emit('module:unloaded', {
        moduleId,
        path: moduleInfo.path
      })

      logger?.info(`模块已卸载: ${moduleId}`)
      return true

    } catch (error) {
      this.stats.errors++
      logger?.error(`模块卸载失败: ${moduleId}`, error)
      
      eventBus.emit('module:unload-error', {
        moduleId,
        error
      })
      
      throw error
    }
  }

  




  async reloadModule(moduleId, options = {}) {
    if (!this.modules.has(moduleId)) {
      logger?.warn(`模块不存在: ${moduleId}`)
      return false
    }

    const moduleInfo = this.modules.get(moduleId)
    const originalPath = moduleInfo.path
    const originalOptions = {
      watch: !!moduleInfo.watcher,
      dependencies: Array.from(moduleInfo.dependencies),
      metadata: moduleInfo.metadata
    }

    try {
      
      await this.runHooks('beforeReload', { moduleId, moduleInfo, options })

      
      await this.unloadModule(moduleId, { force: true, cascade: false })

      
      const newModuleInfo = await this.loadModule(originalPath, {
        ...originalOptions,
        ...options,
        force: true
      })

      
      await this.runHooks('afterReload', { moduleId, oldModuleInfo: moduleInfo, newModuleInfo, options })

      this.stats.reloaded++
      
      eventBus.emit('module:reloaded', {
        moduleId,
        path: originalPath,
        oldExports: moduleInfo.exports,
        newExports: newModuleInfo.exports
      })

      logger?.info(`模块已重载: ${moduleId}`)
      return newModuleInfo

    } catch (error) {
      this.stats.errors++
      logger?.error(`模块重载失败: ${moduleId}`, error)
      
      eventBus.emit('module:reload-error', {
        moduleId,
        error
      })
      
      
      try {
        await this.loadModule(originalPath, originalOptions)
        logger?.info(`模块已恢复: ${moduleId}`)
      } catch (restoreError) {
        logger?.error(`模块恢复失败: ${moduleId}`, restoreError)
      }
      
      throw error
    }
  }

  




  async watchModule(moduleId, filePath) {
    if (this.watchers.has(moduleId)) {
      await this.watchers.get(moduleId).close()
    }

    const watcher = chokidar.watch(filePath, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.config.watchDelay,
        pollInterval: 100
      }
    })

    let reloadTimer = null

    watcher.on('change', () => {
      if (reloadTimer) {
        clearTimeout(reloadTimer)
      }
      
      reloadTimer = setTimeout(async () => {
        try {
          logger?.debug(`文件变化，重载模块: ${moduleId}`)
          await this.reloadModule(moduleId)
        } catch (error) {
          logger?.error(`自动重载失败: ${moduleId}`, error)
        }
      }, this.config.watchDelay)
    })

    watcher.on('unlink', async () => {
      try {
        logger?.debug(`文件删除，卸载模块: ${moduleId}`)
        await this.unloadModule(moduleId)
      } catch (error) {
        logger?.error(`自动卸载失败: ${moduleId}`, error)
      }
    })

    this.watchers.set(moduleId, watcher)
    
    if (this.modules.has(moduleId)) {
      this.modules.get(moduleId).watcher = watcher
    }
  }

  




  registerDependencies(moduleId, dependencies) {
    for (const depId of dependencies) {
      if (!this.dependencies.has(depId)) {
        this.dependencies.set(depId, new Set())
      }
      this.dependencies.get(depId).add(moduleId)
      
      
      if (this.modules.has(depId)) {
        this.modules.get(depId).dependents.add(moduleId)
      }
    }
  }

  



  unregisterDependencies(moduleId) {
    const moduleInfo = this.modules.get(moduleId)
    if (!moduleInfo) return

    
    for (const depId of moduleInfo.dependencies) {
      if (this.dependencies.has(depId)) {
        this.dependencies.get(depId).delete(moduleId)
        if (this.dependencies.get(depId).size === 0) {
          this.dependencies.delete(depId)
        }
      }
      
      
      if (this.modules.has(depId)) {
        this.modules.get(depId).dependents.delete(moduleId)
      }
    }

    
    for (const dependentId of moduleInfo.dependents) {
      if (this.modules.has(dependentId)) {
        this.modules.get(dependentId).dependencies.delete(moduleId)
      }
    }
  }

  



  clearModuleCache(modulePath) {
    
    delete require.cache[require.resolve(modulePath)]
    
    
    
    
    
    const cleaner = this.cacheCleaners.get(modulePath)
    if (cleaner) {
      cleaner()
    }
  }

  




  registerCacheCleaner(modulePath, cleaner) {
    this.cacheCleaners.set(modulePath, cleaner)
  }

  




  addHook(hook, handler) {
    if (this.hooks[hook]) {
      this.hooks[hook].push(handler)
      logger?.debug(`钩子已添加: ${hook}`)
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

  



  getModuleId(modulePath) {
    return path.resolve(modulePath)
  }

  



  getModule(moduleId) {
    return this.modules.get(moduleId)
  }

  


  getAllModules() {
    return Array.from(this.modules.values())
  }

  



  isLoaded(moduleId) {
    return this.modules.has(moduleId)
  }

  


  getDependencyGraph() {
    const graph = {}
    
    for (const [moduleId, moduleInfo] of this.modules) {
      graph[moduleId] = {
        dependencies: Array.from(moduleInfo.dependencies),
        dependents: Array.from(moduleInfo.dependents)
      }
    }
    
    return graph
  }

  


  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      modules: this.modules.size,
      watchers: this.watchers.size,
      loading: this.loading.size
    }
  }

  


  async destroy() {
    
    for (const watcher of this.watchers.values()) {
      await watcher.close()
    }
    
    
    for (const moduleId of this.modules.keys()) {
      try {
        await this.unloadModule(moduleId, { force: true })
      } catch (error) {
        logger?.error(`销毁时卸载模块失败: ${moduleId}`, error)
      }
    }
    
    
    this.modules.clear()
    this.dependencies.clear()
    this.watchers.clear()
    this.loading.clear()
    this.cacheCleaners.clear()
    
    logger?.info('热加载管理器已销毁')
  }
}


const hotReload = new HotReloadManager()


export default hotReload
export { HotReloadManager }


if (typeof global !== 'undefined') {
  global.hotReload = hotReload
}