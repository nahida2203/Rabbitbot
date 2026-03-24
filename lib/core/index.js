





import eventBus from '../common/event-bus.js'
import hotReload from '../common/hot-reload.js'
import pluginEngine from '../plugins/plugin-engine.js'
import securityEngine from '../common/security-engine.js'
import aigcEngine from '../common/aigc-engine.js'
import monitorEngine from '../common/monitor-engine.js'

import taskScheduler from '../common/task-scheduler.js'
import databaseManager from '../common/database-manager.js'
import configManager from '../config/config-manager.js'
import loggerManager from '../common/logger.js'
import cacheManager from '../cache/cache-manager.js'
import apiManager from '../api/api-manager.js'
import eventManager from '../common/event-manager.js'
import pluginManager from '../plugins/plugin-manager.js'
import permissionManager from '../common/permission-manager.js'
import webUIManager from '../webui/webui-manager.js'
import authManager from '../common/auth-manager.js'


export { EventBus } from '../common/event-bus.js'
export { HotReloadManager } from '../common/hot-reload.js'
export { PluginEngine, PluginInfo as EnginePluginInfo, PluginStatus as EnginePluginStatus, PluginType as EnginePluginType } from '../plugins/plugin-engine.js'
export { SecurityEngine, SecurityEvent, SecurityLevel, ThreatType } from '../common/security-engine.js'
export { AIGCEngine, Message, Conversation, ModelConfig, ModelType, Provider, Role as AIGCRole } from '../common/aigc-engine.js'
export { MonitorEngine, Metric, AlertRule, AlertEvent, PerformanceMonitor, MetricType, AlertLevel } from '../common/monitor-engine.js'

export { TaskScheduler, TaskInfo, TaskQueue, TaskStatus, TaskType, TaskPriority } from '../common/task-scheduler.js'
export { DatabaseManager, DatabaseConfig, DatabaseConnection, DatabaseType, ConnectionStatus, TransactionStatus } from '../common/database-manager.js'
export { ConfigManager, ConfigInfo, ConfigType, ChangeType } from '../config/config-manager.js'
export { LoggerManager, Logger, LogConfig, LogLevel, LogType } from '../common/logger.js'
export { CacheManager, CacheItem, MemoryCache, FileCache, CacheType, CacheStrategy } from '../cache/cache-manager.js'

export { EventManager, EventListener, EventType, EventPriority } from '../common/event-manager.js'
export { PluginManager, PluginInfo, BasePlugin, PluginStatus, PluginType, PluginPriority } from '../plugins/plugin-manager.js'
export { PermissionManager, Permission, Role as PermissionRole, UserPermission, PermissionType, RoleType, PermissionLevel } from '../common/permission-manager.js'
export { WebUIManager, WebUIConfig, WebUIRouter, WebSocketManager, WebUIStatus, WebUITheme, WebUILanguage } from '../webui/webui-manager.js'
export { AuthManager } from '../common/auth-manager.js'


export {
  eventBus,
  hotReload,
  pluginEngine,
  securityEngine,
  aigcEngine,
  monitorEngine,
  
  taskScheduler,
  databaseManager,
  configManager,
  loggerManager,
  cacheManager,
  
    eventManager,
     pluginManager,
     permissionManager,
     webUIManager,
     authManager
}




class CoreSystem {
  constructor() {
    
    this.components = {
      eventBus,
      hotReload,
      pluginEngine,
      securityEngine,
      aigcEngine,
      monitorEngine,
      
      taskScheduler,
      databaseManager,
      configManager,
      loggerManager,
      cacheManager,
      
      eventManager,
      pluginManager,
      permissionManager,
      webUIManager
    }
    
    
    this.initialized = false
    
    
    this.startTime = null
    
    
    this.config = {
      autoInit: true,
      initTimeout: 30000,
      shutdownTimeout: 10000,
      enableHealthCheck: true,
      healthCheckInterval: 30000
    }
    
    
    this.healthCheckTimer = null
  }

  



  async init(config = {}) {
    if (this.initialized) {
      logger?.warn('核心系统已初始化')
      return
    }
    
    this.config = { ...this.config, ...config }
    this.startTime = Date.now()
  
    try {
      
      const initOrder = [
        'eventBus',
        'securityEngine',
        'monitorEngine',
        'loggerManager',
        'configManager',
        'cacheManager',
        
        'eventManager',
        'pluginManager',
        'permissionManager',
        'webUIManager',
        'databaseManager',
        'taskScheduler',
        
        'hotReload',
        'pluginEngine',
        'aigcEngine'
      ]
      
      for (const componentName of initOrder) {
        const component = this.components[componentName]
        if (component && typeof component.init === 'function') {
          
          logger?.info(`初始化组件: ${componentName}`)
          
          const componentConfig = config[componentName] || {}
          try {
            await component.init(componentConfig)
            
            logger?.info(`组件初始化完成: ${componentName}`)
          } catch (error) {
            logger?.error(`组件初始化失败: ${componentName}`, error)
            throw error
          }
        } else {
          
        }
      }
      
      
      if (this.config.enableHealthCheck) {
        this.startHealthCheck()
      }
      
      this.initialized = true
      
      
      eventBus.emit('system:started', {
        startTime: this.startTime,
        components: Object.keys(this.components)
      })
      
      const initTime = Date.now() - this.startTime
    
      
    } catch (error) {}
  }

  


  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
    
    logger?.debug('健康检查已启动')
  }

  


  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
    
    logger?.debug('健康检查已停止')
  }

  


  async performHealthCheck() {
    try {
      const health = await this.getHealth()
      
      
      eventBus.emit('system:health-check', health)
      
      
      const criticalComponents = Object.entries(health.components)
        .filter(([name, status]) => status.status === 'critical')
      
      if (criticalComponents.length > 0) {
        logger?.error('检测到严重健康问题', {
          critical: criticalComponents.map(([name]) => name)
        })
        
        eventBus.emit('system:health-critical', {
          components: criticalComponents
        })
      }
      
    } catch (error) {
      logger?.error('健康检查失败', error)
    }
  }

  



  getComponent(name) {
    return this.components[name]
  }

  


  getAllComponents() {
    return { ...this.components }
  }

  


  getStatus() {
    return {
      initialized: this.initialized,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      components: Object.keys(this.components)
    }
  }

  


  getStats() {
    const stats = {
      system: this.getStatus(),
      components: {}
    }
    
    for (const [name, component] of Object.entries(this.components)) {
      if (component && typeof component.getStats === 'function') {
        try {
          stats.components[name] = component.getStats()
        } catch (error) {
          stats.components[name] = { error: error.message }
        }
      }
    }
    
    return stats
  }

  


  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      components: {}
    }
    
    let overallStatus = 'healthy'
    
    for (const [name, component] of Object.entries(this.components)) {
      if (component && typeof component.getHealth === 'function') {
        try {
          const componentHealth = await component.getHealth()
          health.components[name] = componentHealth
          
          
          if (componentHealth.status === 'critical') {
            overallStatus = 'critical'
          } else if (componentHealth.status === 'unhealthy' && overallStatus !== 'critical') {
            overallStatus = 'unhealthy'
          } else if (componentHealth.status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded'
          }
        } catch (error) {
          health.components[name] = {
            status: 'error',
            error: error.message
          }
          if (overallStatus !== 'critical') {
            overallStatus = 'unhealthy'
          }
        }
      } else {
        health.components[name] = {
          status: 'unknown',
          message: '组件不支持健康检查'
        }
      }
    }
    
    health.status = overallStatus
    return health
  }

  



  async restartComponent(componentName) {
    const component = this.components[componentName]
    if (!component) {
      throw new Error(`组件不存在: ${componentName}`)
    }
    
    logger?.info(`重启组件: ${componentName}`)
    
    try {
      
      if (typeof component.destroy === 'function') {
        await component.destroy()
      }
      
      
      if (typeof component.init === 'function') {
        await component.init()
      }
      
      logger?.info(`组件重启完成: ${componentName}`)
      
      eventBus.emit('system:component-restarted', {
        component: componentName,
        timestamp: Date.now()
      })
      
    } catch (error) {
      logger?.error(`组件重启失败: ${componentName}`, error)
      throw error
    }
  }

  


  async shutdown() {
    if (!this.initialized) {
      logger?.warn('核心系统未初始化')
      return
    }
    
    logger?.info('开始关闭 Rabbit 0.0.1 核心系统...')
    
    try {
      
      this.stopHealthCheck()
      
      
      eventBus.emit('system:shutdown', {
        timestamp: Date.now()
      })
      
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      
      const destroyOrder = [
        'aigcEngine',
        'pluginEngine',
        'hotReload',
        'adapterManager',
        'taskScheduler',
        'databaseManager',
        
        'permissionManager',
        'pluginManager',
        'eventManager',
        
        'cacheManager',
        'configManager',
        'loggerManager',
        'monitorEngine',
        'securityEngine',
        'eventBus'
      ]
      
      for (const componentName of destroyOrder) {
        const component = this.components[componentName]
        if (component && typeof component.destroy === 'function') {
          logger?.info(`销毁组件: ${componentName}`)
          
          try {
            await Promise.race([
              component.destroy(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('销毁超时')), 5000)
              )
            ])
            
            logger?.info(`组件销毁完成: ${componentName}`)
          } catch (error) {
            logger?.error(`组件销毁失败: ${componentName}`, error)
          }
        }
      }
      
      this.initialized = false
      
      const shutdownTime = Date.now() - this.startTime
      logger?.info(`Rabbit 0.0.1 核心系统关闭完成 (运行时间: ${shutdownTime}ms)`)
      
    } catch (error) {
      logger?.error('核心系统关闭失败', error)
      throw error
    }
  }

  


  async restart() {
    logger?.info('重启 Rabbit 0.0.1 核心系统...')
    
    await this.shutdown()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await this.init()
    
    logger?.info('核心系统重启完成')
  }
}


const coreSystem = new CoreSystem()


export default coreSystem
export { CoreSystem }


if (typeof global !== 'undefined') {
  global.coreSystem = coreSystem
  global.rabbitCore = {
    eventBus,
    hotReload,
    pluginEngine,
    securityEngine,
    aigcEngine,
    monitorEngine,
    configManager,
    apiManager,
    cacheManager,
    coreSystem
  }
  global.yunzaiCore = {
    eventBus,
    hotReload,
    pluginEngine,
    securityEngine,
    aigcEngine,
    monitorEngine,
    
    taskScheduler,
    databaseManager,
    configManager,
    loggerManager,
    cacheManager,
    
    eventManager,
    pluginManager,
    permissionManager,
    webUIManager,
    authManager,
    coreSystem
  }
}


export const init = (config) => coreSystem.init(config)
export const shutdown = () => coreSystem.shutdown()
export const restart = () => coreSystem.restart()
export const getHealth = () => coreSystem.getHealth()
export const getStats = () => coreSystem.getStats()
export const getStatus = () => coreSystem.getStatus()