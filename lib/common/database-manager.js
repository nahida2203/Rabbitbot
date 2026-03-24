




import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import eventBus from './event-bus.js'




export const DatabaseType = {
  SQLITE: 'sqlite',
  MYSQL: 'mysql',
  POSTGRESQL: 'postgresql',
  MONGODB: 'mongodb',
  REDIS: 'redis',
  MEMORY: 'memory'
}




export const ConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting'
}




export const TransactionStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMMITTED: 'committed',
  ROLLED_BACK: 'rolled_back',
  ERROR: 'error'
}




export class DatabaseConfig {
  constructor(data = {}) {
    
    this.id = data.id || 'default'
    
    
    this.type = data.type || DatabaseType.SQLITE
    
    
    this.host = data.host || 'localhost'
    
    
    this.port = data.port || this.getDefaultPort()
    
    
    this.database = data.database || 'rabbit'
    
    
    this.username = data.username || ''
    
    
    this.password = data.password || ''
    
    
    this.filename = data.filename || ''
    
    
    this.options = {
      charset: 'utf8mb4',
      timezone: '+08:00',
      acquireTimeout: 60000,
      timeout: 60000,
      ...data.options
    }
    
    
    this.pool = {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      ...data.pool
    }
    
    
    this.ssl = data.ssl || false
    
    
    this.enabled = data.enabled !== false
    
    
    this.primary = data.primary || false
    
    
    this.tags = data.tags || []
    
    
    this.metadata = data.metadata || {}
  }

  


  getDefaultPort() {
    const ports = {
      [DatabaseType.MYSQL]: 3306,
      [DatabaseType.POSTGRESQL]: 5432,
      [DatabaseType.MONGODB]: 27017,
      [DatabaseType.REDIS]: 6379,
      [DatabaseType.SQLITE]: 0,
      [DatabaseType.MEMORY]: 0
    }
    return ports[this.type] || 0
  }

  


  getConnectionString() {
    switch (this.type) {
      case DatabaseType.MYSQL:
        return `mysql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`
      case DatabaseType.POSTGRESQL:
        return `postgresql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`
      case DatabaseType.MONGODB:
        return `mongodb://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`
      case DatabaseType.REDIS:
        return `redis://${this.username}:${this.password}@${this.host}:${this.port}`
      case DatabaseType.SQLITE:
        return this.filename || path.join(process.cwd(), 'data', `${this.database}.db`)
      default:
        return ''
    }
  }

  


  validate() {
    if (!this.id) {
      throw new Error('数据库连接ID不能为空')
    }
    
    if (!Object.values(DatabaseType).includes(this.type)) {
      throw new Error(`不支持的数据库类型: ${this.type}`)
    }
    
    if (this.type === DatabaseType.SQLITE && !this.filename) {
      this.filename = path.join(process.cwd(), 'data', `${this.database}.db`)
    }
    
    if ([DatabaseType.MYSQL, DatabaseType.POSTGRESQL].includes(this.type)) {
      if (!this.username) {
        throw new Error('数据库用户名不能为空')
      }
    }
  }

  


  toJSON() {
    return {
      id: this.id,
      type: this.type,
      host: this.host,
      port: this.port,
      database: this.database,
      username: this.username,
      filename: this.filename,
      options: this.options,
      pool: this.pool,
      ssl: this.ssl,
      enabled: this.enabled,
      primary: this.primary,
      tags: this.tags,
      metadata: this.metadata
    }
  }
}




export class DatabaseConnection {
  constructor(config, adapter) {
    
    this.config = config
    
    
    this.adapter = adapter
    
    
    this.status = ConnectionStatus.DISCONNECTED
    
    
    this.connection = null
    
    
    this.transactions = new Map()
    
    
    this.stats = {
      queries: 0,
      transactions: 0,
      errors: 0,
      connectTime: 0,
      lastQuery: 0,
      totalTime: 0
    }
    
    
    this.createdAt = Date.now()
    
    
    this.lastActivity = Date.now()
  }

  


  async connect() {
    if (this.status === ConnectionStatus.CONNECTED) {
      return this.connection
    }
    
    this.status = ConnectionStatus.CONNECTING
    
    try {
      const startTime = Date.now()
      this.connection = await this.adapter.connect(this.config)
      this.stats.connectTime = Date.now() - startTime
      
      this.status = ConnectionStatus.CONNECTED
      this.updateActivity()
      
      logger?.info(`数据库连接成功: ${this.config.id} (${this.config.type})`)
      
      return this.connection
      
    } catch (error) {
      this.status = ConnectionStatus.ERROR
      this.stats.errors++
      
      logger?.error(`数据库连接失败: ${this.config.id}`, error)
      throw error
    }
  }

  


  async disconnect() {
    if (this.status === ConnectionStatus.DISCONNECTED) {
      return
    }
    
    try {
      
      for (const transaction of this.transactions.values()) {
        if (transaction.status === TransactionStatus.ACTIVE) {
          await this.rollbackTransaction(transaction.id)
        }
      }
      
      if (this.connection && this.adapter.disconnect) {
        await this.adapter.disconnect(this.connection)
      }
      
      this.status = ConnectionStatus.DISCONNECTED
      this.connection = null
      
      logger?.info(`数据库连接已断开: ${this.config.id}`)
      
    } catch (error) {
      logger?.error(`断开数据库连接失败: ${this.config.id}`, error)
      throw error
    }
  }

  


  async reconnect() {
    this.status = ConnectionStatus.RECONNECTING
    
    try {
      await this.disconnect()
      await new Promise(resolve => setTimeout(resolve, 1000))
      await this.connect()
      
      logger?.info(`数据库重连成功: ${this.config.id}`)
      
    } catch (error) {
      this.status = ConnectionStatus.ERROR
      logger?.error(`数据库重连失败: ${this.config.id}`, error)
      throw error
    }
  }

  





  async query(sql, params = [], options = {}) {
    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new Error(`数据库未连接: ${this.config.id}`)
    }
    
    const startTime = Date.now()
    
    try {
      const result = await this.adapter.query(this.connection, sql, params, options)
      
      const duration = Date.now() - startTime
      this.stats.queries++
      this.stats.totalTime += duration
      this.stats.lastQuery = Date.now()
      this.updateActivity()
      
      logger?.debug(`查询执行完成: ${this.config.id} (${duration}ms)`, { sql, params })
      
      return result
      
    } catch (error) {
      this.stats.errors++
      logger?.error(`查询执行失败: ${this.config.id}`, { sql, params, error })
      throw error
    }
  }

  



  async beginTransaction(options = {}) {
    if (this.status !== ConnectionStatus.CONNECTED) {
      throw new Error(`数据库未连接: ${this.config.id}`)
    }
    
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const transaction = await this.adapter.beginTransaction(this.connection, options)
      
      const txInfo = {
        id: transactionId,
        transaction,
        status: TransactionStatus.ACTIVE,
        startTime: Date.now(),
        options
      }
      
      this.transactions.set(transactionId, txInfo)
      this.stats.transactions++
      this.updateActivity()
      
      logger?.debug(`事务已开始: ${this.config.id} (${transactionId})`)
      
      return transactionId
      
    } catch (error) {
      this.stats.errors++
      logger?.error(`开始事务失败: ${this.config.id}`, error)
      throw error
    }
  }

  



  async commitTransaction(transactionId) {
    const txInfo = this.transactions.get(transactionId)
    if (!txInfo) {
      throw new Error(`事务不存在: ${transactionId}`)
    }
    
    if (txInfo.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务状态无效: ${txInfo.status}`)
    }
    
    try {
      await this.adapter.commitTransaction(txInfo.transaction)
      
      txInfo.status = TransactionStatus.COMMITTED
      txInfo.endTime = Date.now()
      
      this.transactions.delete(transactionId)
      this.updateActivity()
      
      logger?.debug(`事务已提交: ${this.config.id} (${transactionId})`)
      
    } catch (error) {
      txInfo.status = TransactionStatus.ERROR
      this.stats.errors++
      
      logger?.error(`提交事务失败: ${this.config.id} (${transactionId})`, error)
      throw error
    }
  }

  



  async rollbackTransaction(transactionId) {
    const txInfo = this.transactions.get(transactionId)
    if (!txInfo) {
      throw new Error(`事务不存在: ${transactionId}`)
    }
    
    if (txInfo.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务状态无效: ${txInfo.status}`)
    }
    
    try {
      await this.adapter.rollbackTransaction(txInfo.transaction)
      
      txInfo.status = TransactionStatus.ROLLED_BACK
      txInfo.endTime = Date.now()
      
      this.transactions.delete(transactionId)
      this.updateActivity()
      
      logger?.debug(`事务已回滚: ${this.config.id} (${transactionId})`)
      
    } catch (error) {
      txInfo.status = TransactionStatus.ERROR
      this.stats.errors++
      
      logger?.error(`回滚事务失败: ${this.config.id} (${transactionId})`, error)
      throw error
    }
  }

  






  async queryInTransaction(transactionId, sql, params = [], options = {}) {
    const txInfo = this.transactions.get(transactionId)
    if (!txInfo) {
      throw new Error(`事务不存在: ${transactionId}`)
    }
    
    if (txInfo.status !== TransactionStatus.ACTIVE) {
      throw new Error(`事务状态无效: ${txInfo.status}`)
    }
    
    const startTime = Date.now()
    
    try {
      const result = await this.adapter.queryInTransaction(
        txInfo.transaction, 
        sql, 
        params, 
        options
      )
      
      const duration = Date.now() - startTime
      this.stats.queries++
      this.stats.totalTime += duration
      this.updateActivity()
      
      logger?.debug(`事务查询执行完成: ${this.config.id} (${transactionId}, ${duration}ms)`, { sql, params })
      
      return result
      
    } catch (error) {
      this.stats.errors++
      logger?.error(`事务查询执行失败: ${this.config.id} (${transactionId})`, { sql, params, error })
      throw error
    }
  }

  


  updateActivity() {
    this.lastActivity = Date.now()
  }

  


  getStatus() {
    return {
      id: this.config.id,
      type: this.config.type,
      status: this.status,
      connected: this.status === ConnectionStatus.CONNECTED,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      uptime: Date.now() - this.createdAt,
      stats: {
        ...this.stats,
        activeTransactions: this.transactions.size,
        avgQueryTime: this.stats.queries > 0 ? this.stats.totalTime / this.stats.queries : 0
      }
    }
  }

  


  async checkHealth() {
    try {
      if (this.status !== ConnectionStatus.CONNECTED) {
        return {
          status: 'unhealthy',
          message: '数据库未连接'
        }
      }
      
      
      const startTime = Date.now()
      await this.adapter.healthCheck(this.connection)
      const responseTime = Date.now() - startTime
      
      return {
        status: 'healthy',
        responseTime,
        lastActivity: this.lastActivity
      }
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        error: error.name
      }
    }
  }
}




export class DatabaseManager extends EventEmitter {
  constructor() {
    super()
    
    
    this.connections = new Map()
    
    
    this.adapters = new Map()
    
    
    this.config = {
      defaultConnection: 'default',
      healthCheckInterval: 30000,
      reconnectAttempts: 3,
      reconnectDelay: 5000,
      queryTimeout: 30000
    }
    
    
    this.healthCheckTimer = null
    
    
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalQueries: 0,
      totalTransactions: 0,
      totalErrors: 0,
      startTime: Date.now()
    }
    
    
    this.initialized = false
  }

  



  async init(config = {}) {
    if (this.initialized) {
      logger?.warn('数据库管理器已初始化')
      return
    }
    
    this.config = { ...this.config, ...config }
    
    logger?.info('初始化数据库管理器...')
    
    try {
      
      this.registerBuiltinAdapters()
      
      
      this.startHealthCheck()
      
      
      this.setupEventListeners()
      
      this.initialized = true
      
      logger?.info('数据库管理器初始化完成')
      
      this.emit('initialized')
      eventBus.emit('database:manager-initialized')
      
    } catch (error) {
      logger?.error('数据库管理器初始化失败', error)
      throw error
    }
  }

  


  registerBuiltinAdapters() {
    
    this.registerAdapter(DatabaseType.SQLITE, {
      async connect(config) {
        
        
        const Database = await import('better-sqlite3').catch(() => null)
        if (!Database) {
          throw new Error('SQLite驱动未安装，请运行: npm install better-sqlite3')
        }
        
        
        const dir = path.dirname(config.filename)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        return new Database.default(config.filename, config.options)
      },
      
      async disconnect(connection) {
        if (connection && typeof connection.close === 'function') {
          connection.close()
        }
      },
      
      async query(connection, sql, params = []) {
        if (sql.trim().toLowerCase().startsWith('select')) {
          return connection.prepare(sql).all(params)
        } else {
          return connection.prepare(sql).run(params)
        }
      },
      
      async beginTransaction(connection) {
        return connection.transaction(() => {})
      },
      
      async commitTransaction(transaction) {
        
      },
      
      async rollbackTransaction(transaction) {
        throw new Error('事务回滚')
      },
      
      async queryInTransaction(transaction, sql, params = []) {
        return transaction(sql, params)
      },
      
      async healthCheck(connection) {
        connection.prepare('SELECT 1').get()
      }
    })
    
    
    this.registerAdapter(DatabaseType.MEMORY, {
      data: new Map(),
      
      async connect(config) {
        return { type: 'memory', data: this.data }
      },
      
      async disconnect(connection) {
        
      },
      
      async query(connection, sql, params = []) {
        
        const [action, table] = sql.toLowerCase().split(' ')
        
        switch (action) {
          case 'select':
            return Array.from(connection.data.values())
          case 'insert':
            const id = Date.now().toString()
            connection.data.set(id, { id, ...params[0] })
            return { insertId: id }
          case 'update':
            
            return { affectedRows: 1 }
          case 'delete':
            
            return { affectedRows: 1 }
          default:
            throw new Error(`不支持的操作: ${action}`)
        }
      },
      
      async beginTransaction(connection) {
        return { type: 'memory-transaction', data: new Map(connection.data) }
      },
      
      async commitTransaction(transaction) {
        
      },
      
      async rollbackTransaction(transaction) {
        
      },
      
      async queryInTransaction(transaction, sql, params = []) {
        return this.query(transaction, sql, params)
      },
      
      async healthCheck(connection) {
        
      }
    })
  }

  


  setupEventListeners() {
    
    eventBus.on('system:shutdown', () => {
      this.destroy()
    })
    
    
    eventBus.on('config:changed', (data) => {
      if (data.section === 'database') {
        this.handleConfigChange(data)
      }
    })
  }

  



  async handleConfigChange(data) {
    try {
      logger?.info('数据库配置发生变更', data)
      
      
      for (const [id, connection] of this.connections) {
        if (data.connectionId && data.connectionId !== id) continue
        
        await this.reconnectDatabase(id)
      }
      
    } catch (error) {
      logger?.error('处理数据库配置变更失败', error)
    }
  }

  


  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
    
    logger?.debug('数据库健康检查已启动')
  }

  


  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
    
    logger?.debug('数据库健康检查已停止')
  }

  


  async performHealthCheck() {
    try {
      for (const [id, connection] of this.connections) {
        const health = await connection.checkHealth()
        
        if (health.status === 'unhealthy') {
          logger?.warn(`数据库连接不健康: ${id}`, health)
          
          
          try {
            await this.reconnectDatabase(id)
          } catch (error) {
            logger?.error(`数据库重连失败: ${id}`, error)
          }
        }
      }
      
    } catch (error) {
      logger?.error('数据库健康检查失败', error)
    }
  }

  




  registerAdapter(type, adapter) {
    if (!type || !adapter) {
      throw new Error('数据库类型和适配器不能为空')
    }
    
    
    const requiredMethods = ['connect', 'disconnect', 'query', 'healthCheck']
    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        throw new Error(`适配器缺少必需的方法: ${method}`)
      }
    }
    
    this.adapters.set(type, adapter)
    
    logger?.info(`数据库适配器已注册: ${type}`)
    
    this.emit('adapter-registered', { type, adapter })
    eventBus.emit('database:adapter-registered', { type, adapter })
  }

  



  async addConnection(configData) {
    const config = configData instanceof DatabaseConfig ? 
      configData : new DatabaseConfig(configData)
    
    
    config.validate()
    
    if (this.connections.has(config.id)) {
      throw new Error(`数据库连接 ${config.id} 已存在`)
    }
    
    
    const adapter = this.adapters.get(config.type)
    if (!adapter) {
      throw new Error(`不支持的数据库类型: ${config.type}`)
    }
    
    
    const connection = new DatabaseConnection(config, adapter)
    
    
    await connection.connect()
    
    this.connections.set(config.id, connection)
    this.stats.totalConnections++
    this.stats.activeConnections++
    
    logger?.info(`数据库连接已添加: ${config.id} (${config.type})`)
    
    this.emit('connection-added', connection)
    eventBus.emit('database:connection-added', connection)
    
    return connection
  }

  



  async removeConnection(connectionId) {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`数据库连接 ${connectionId} 不存在`)
    }
    
    
    await connection.disconnect()
    
    this.connections.delete(connectionId)
    this.stats.activeConnections--
    
    logger?.info(`数据库连接已移除: ${connectionId}`)
    
    this.emit('connection-removed', connection)
    eventBus.emit('database:connection-removed', connection)
    
    return connection
  }

  



  async reconnectDatabase(connectionId) {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`数据库连接 ${connectionId} 不存在`)
    }
    
    await connection.reconnect()
    
    logger?.info(`数据库重连完成: ${connectionId}`)
    
    this.emit('connection-reconnected', connection)
    eventBus.emit('database:connection-reconnected', connection)
  }

  



  getConnection(connectionId = this.config.defaultConnection) {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`数据库连接 ${connectionId} 不存在`)
    }
    return connection
  }

  


  getAllConnections() {
    return Array.from(this.connections.values())
  }

  





  async query(sql, params = [], options = {}) {
    const connectionId = options.connection || this.config.defaultConnection
    const connection = this.getConnection(connectionId)
    
    const result = await connection.query(sql, params, options)
    
    this.stats.totalQueries++
    
    return result
  }

  




  async transaction(callback, options = {}) {
    const connectionId = options.connection || this.config.defaultConnection
    const connection = this.getConnection(connectionId)
    
    const transactionId = await connection.beginTransaction(options)
    
    try {
      const result = await callback({
        query: (sql, params, opts) => 
          connection.queryInTransaction(transactionId, sql, params, opts)
      })
      
      await connection.commitTransaction(transactionId)
      
      this.stats.totalTransactions++
      
      return result
      
    } catch (error) {
      await connection.rollbackTransaction(transactionId)
      this.stats.totalErrors++
      throw error
    }
  }

  


  getStats() {
    const connectionStats = {}
    for (const [id, connection] of this.connections) {
      connectionStats[id] = connection.getStatus()
    }
    
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      connections: connectionStats
    }
  }

  


  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      connections: {}
    }
    
    let hasUnhealthy = false
    let hasCritical = false
    
    for (const [id, connection] of this.connections) {
      const connectionHealth = await connection.checkHealth()
      health.connections[id] = connectionHealth
      
      if (connectionHealth.status === 'unhealthy') {
        if (connection.config.primary) {
          hasCritical = true
        } else {
          hasUnhealthy = true
        }
      }
    }
    
    
    if (hasCritical) {
      health.status = 'critical'
    } else if (hasUnhealthy) {
      health.status = 'unhealthy'
    }
    
    return health
  }

  


  async destroy() {
    if (!this.initialized) {
      return
    }
    
    logger?.info('销毁数据库管理器...')
    
    try {
      
      this.stopHealthCheck()
      
      
      const disconnectPromises = Array.from(this.connections.keys()).map(id => 
        this.removeConnection(id).catch(error => {
          logger?.error(`断开数据库连接失败: ${id}`, error)
        })
      )
      
      await Promise.all(disconnectPromises)
      
      
      this.connections.clear()
      this.adapters.clear()
      this.removeAllListeners()
      
      this.initialized = false
      
      logger?.info('数据库管理器销毁完成')
      
    } catch (error) {
      logger?.error('数据库管理器销毁失败', error)
      throw error
    }
  }
}


const databaseManager = new DatabaseManager()


export default databaseManager
export { databaseManager }


if (typeof global !== 'undefined') {
  global.databaseManager = databaseManager
}


export const addConnection = (config) => databaseManager.addConnection(config)
export const getConnection = (id) => databaseManager.getConnection(id)
export const query = (sql, params, options) => databaseManager.query(sql, params, options)
export const transaction = (callback, options) => databaseManager.transaction(callback, options)
export const registerAdapter = (type, adapter) => databaseManager.registerAdapter(type, adapter)
export const getAllConnections = () => databaseManager.getAllConnections()