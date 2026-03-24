import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import { createServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import fs from 'fs'
import path from 'path'
import eventBus from '../common/event-bus.js'
import verificationRouter from '../api/verification.js'

import { loggerManager } from '../common/logger.js'




export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS'
}




export const AuthType = {
  NONE: 'none',
  BEARER: 'bearer',
  BASIC: 'basic',
  API_KEY: 'api_key',
  CUSTOM: 'custom'
}




export const ResponseStatus = {
  SUCCESS: 'success',
  ERROR: 'error',
  FAIL: 'fail'
}




export class ApiRoute {
  constructor(options = {}) {
    this.path = options.path || '/'
    this.method = options.method || HttpMethod.GET
    this.handler = options.handler || null
    this.middleware = options.middleware || []
    this.auth = options.auth || AuthType.NONE
    this.rateLimit = options.rateLimit || null
    this.description = options.description || ''
    this.tags = options.tags || []
    this.parameters = options.parameters || []
    this.responses = options.responses || {}
    this.deprecated = options.deprecated || false
    this.version = options.version || '1.0.0'
    this.createdAt = Date.now()
  }

  


  validate() {
    const errors = []
    
    if (!this.path || typeof this.path !== 'string') {
      errors.push('路径必须是有效的字符串')
    }
    
    if (!Object.values(HttpMethod).includes(this.method)) {
      errors.push('HTTP方法无效')
    }
    
    if (!this.handler || typeof this.handler !== 'function') {
      errors.push('处理函数必须是有效的函数')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  


  serialize() {
    return {
      path: this.path,
      method: this.method,
      auth: this.auth,
      description: this.description,
      tags: this.tags,
      parameters: this.parameters,
      responses: this.responses,
      deprecated: this.deprecated,
      version: this.version,
      createdAt: this.createdAt
    }
  }
}




export class ApiMiddleware {
  constructor(name, handler, options = {}) {
    this.name = name
    this.handler = handler
    this.priority = options.priority || 0
    this.enabled = options.enabled !== false
    this.description = options.description || ''
    this.createdAt = Date.now()
  }

  


  async execute(req, res, next) {
    if (!this.enabled) {
      return next()
    }
    
    try {
      await this.handler(req, res, next)
    } catch (error) {
      console.error(`[ApiMiddleware] 中间件执行失败 ${this.name}:`, error)
      next(error)
    }
  }
}




export class ApiResponse {
  


  static success(data = null, message = 'Success', code = 200) {
    return {
      status: ResponseStatus.SUCCESS,
      code,
      message,
      data,
      timestamp: Date.now()
    }
  }

  


  static error(message = 'Internal Server Error', code = 500, details = null) {
    return {
      status: ResponseStatus.ERROR,
      code,
      message,
      details,
      timestamp: Date.now()
    }
  }

  


  static fail(message = 'Request Failed', code = 400, errors = null) {
    return {
      status: ResponseStatus.FAIL,
      code,
      message,
      errors,
      timestamp: Date.now()
    }
  }

  


  static paginated(data, pagination, message = 'Success') {
    return {
      status: ResponseStatus.SUCCESS,
      code: 200,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      },
      timestamp: Date.now()
    }
  }
}




export class ApiManager {
  constructor() {
    
    this.app = express()
    
    
    this.server = null
    this.httpsServer = null
    
    
    this.routes = new Map()
    
    
    this.middlewares = new Map()
    
    
    this.config = {
      port: 3000,
      host: 'localhost',
      cors: {
        origin: '*',
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, 
        max: 100 
      },
      compression: true,
      helmet: true,
      bodyParser: {
        json: { limit: '10mb' },
        urlencoded: { extended: true, limit: '10mb' }
      },
      https: {
        enabled: false,
        port: 3443,
        key: null,
        cert: null
      },
      apiPrefix: '/api',
      apiVersion: 'v1'
    }
    
    
    this.stats = {
      routeCount: 0,
      middlewareCount: 0,
      requestCount: 0,
      errorCount: 0,
      startTime: 0,
      uptime: 0
    }
    
    
    this.isInitialized = false
    this.isRunning = false
    this.isDestroyed = false
    
    this.init()
  }

  


  async init() {
    try {
      
      this.setupBaseMiddleware()
      
      
      this.setupRoutes()
      
      
      this.setupErrorHandling()
      
      this.isInitialized = true
      
      eventBus.emit('api:initialized', {
        timestamp: Date.now()
      })
      
      
    } catch (error) {
      console.error('[ApiManager] 初始化失败:', error)
      throw error
    }
  }

  


  setupBaseMiddleware() {
    
    if (this.config.helmet) {
      this.app.use(helmet())
    }
    
    
    if (this.config.cors) {
      this.app.use(cors(this.config.cors))
    }
    
    
    if (this.config.compression) {
      this.app.use(compression())
    }
    
    
    this.app.use(express.json(this.config.bodyParser.json))
    this.app.use(express.urlencoded(this.config.bodyParser.urlencoded))
    
    
    if (this.config.rateLimit) {
      const limiter = rateLimit(this.config.rateLimit)
      this.app.use(limiter)
    }
    
    
    this.app.use((req, res, next) => {
      this.stats.requestCount++
      
      const startTime = Date.now()
      
      res.on('finish', () => {
        const duration = Date.now() - startTime
        
        eventBus.emit('api:request', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          timestamp: Date.now()
        })
      })
      
      next()
    })
    
    
    this.app.use((req, res, next) => {
    
    next();
    });
  }

  


  setupRoutes() {
    
    const apiRouter = express.Router()
    
    
    apiRouter.get('/health', (req, res) => {
      res.json(ApiResponse.success(this.getHealth(), '服务健康'))
    })
    
    
    apiRouter.get('/stats', (req, res) => {
      res.json(ApiResponse.success(this.getStats(), '统计信息'))
    })
    
    
    apiRouter.get('/routes', (req, res) => {
      const routes = Array.from(this.routes.values()).map(route => route.serialize())
      res.json(ApiResponse.success(routes, '路由列表'))
    })
    
    
    apiRouter.use('/verification', verificationRouter)

    
    this.addRoute({
      path: '/api/plugins/:id/logs',
      method: HttpMethod.GET,
      description: '获取指定插件的最近日志',
      tags: ['plugins', 'logs'],
      parameters: [
        { name: 'id', in: 'path', required: true, description: '插件ID/名称' },
        { name: 'level', in: 'query', required: false, description: '日志级别（debug/info/warn/error等）' },
        { name: 'limit', in: 'query', required: false, description: '返回条数，默认100' },
        { name: 'offset', in: 'query', required: false, description: '偏移量，默认0' }
      ],
      handler: async (req, res) => {
        try {
          const id = req.params.id
          
          const level = typeof req.query.level === 'string' ? req.query.level : undefined
          let limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100
          let offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0
          if (!Number.isFinite(limit) || limit <= 0) limit = 100
          if (limit > 1000) limit = 1000
          if (!Number.isFinite(offset) || offset < 0) offset = 0

          let logs = await loggerManager.getLogs({ loggerName: id, level, limit, offset })
          
          if (!logs || logs.length === 0) {
            const fallbackLimit = Math.max(limit + offset, 500)
            const allLogs = await loggerManager.getLogs({ level, limit: fallbackLimit, offset: 0 })
            const filtered = (allLogs || []).filter(x => {
              const msg = typeof x?.message === 'string' ? x.message : Array.isArray(x?.message) ? x.message.join(' ') : String(x?.message ?? '')
              return msg.includes(id)
            })
            logs = filtered.slice(offset, offset + limit)
          }
          res.json(ApiResponse.success(logs, '插件日志获取成功'))
        } catch (error) {
          res.status(500).json(ApiResponse.error(error?.message || '获取插件日志失败', 500))
        }
      }
    })

    
    this.addRoute({
      path: '/api/logs',
      method: HttpMethod.GET,
      description: '获取最近日志（支持按级别与来源过滤，分页）',
      tags: ['logs'],
      parameters: [
        { name: 'level', in: 'query', required: false, description: '日志级别（trace/debug/info/warn/error/fatal）' },
        { name: 'source', in: 'query', required: false, description: '日志来源（logger 名称），可重复' },
        { name: 'page', in: 'query', required: false, description: '页码，默认1' },
        { name: 'size', in: 'query', required: false, description: '每页数量，默认100，最大1000' }
      ],
      handler: async (req, res) => {
        try {
          const q = req.query || {}
          const level = typeof q.level === 'string' ? q.level : undefined
          
          let loggerName
          if (Array.isArray(q.source)) {
            loggerName = typeof q.source[0] === 'string' ? q.source[0] : undefined
          } else if (typeof q.source === 'string') {
            loggerName = q.source
          }
          let page = q.page ? parseInt(String(q.page), 10) : 1
          let size = q.size ? parseInt(String(q.size), 10) : 100
          if (!Number.isFinite(page) || page <= 0) page = 1
          if (!Number.isFinite(size) || size <= 0) size = 100
          if (size > 1000) size = 1000
          const offset = (page - 1) * size

          
          const bigLimit = Math.max(offset + size, 500)
          const allLogs = await loggerManager.getLogs({ loggerName, level, limit: bigLimit, offset: 0 })
          const total = allLogs.length
          const items = allLogs.slice(offset, offset + size)

          
          res.json(ApiResponse.success({
            items,
            total,
            page,
            size,
            pages: Math.ceil(total / size)
          }, '日志获取成功'))
        } catch (error) {
          res.status(500).json(ApiResponse.error(error?.message || '获取日志失败', 500))
        }
      }
    })

    
    this.addRoute({
      path: '/api/logs/clear',
      method: HttpMethod.DELETE,
      description: '清空日志（磁盘与内存缓冲）',
      tags: ['logs'],
      handler: async (req, res) => {
        try {
          const result = await loggerManager.clearLogs()
          if (result?.success) {
            res.json(ApiResponse.success({ cleared: true }, '日志已清空'))
          } else {
            res.status(500).json(ApiResponse.error(result?.message || '清空日志失败', 500))
          }
        } catch (error) {
          res.status(500).json(ApiResponse.error(error?.message || '清空日志失败', 500))
        }
      }
    })
    
    
    this.app.use(`${this.config.apiPrefix}/${this.config.apiVersion}`, apiRouter)
    
    
    this.app.get('/', (req, res) => {
      res.json(ApiResponse.success({
        name: 'Rabbit API Server',
        version: this.config.apiVersion,
        uptime: this.getUptime()
      }, '欢迎使用 Rabbit API'))
    })
  }

 
  setupErrorHandling() {
    this.app.use((req, res, next) => {
    
      next()
    })
    
    
    this.app.use((error, req, res, next) => {
      this.stats.errorCount++
      
      console.error('[ApiManager] 请求错误:', error)
      
      eventBus.emit('api:error', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
        timestamp: Date.now()
      })
      
      const statusCode = error.statusCode || error.status || 500
      res.status(statusCode).json(ApiResponse.error(
        error.message || '服务器内部错误',
        statusCode,
        process.env.NODE_ENV === 'development' ? error.stack : null
      ))
    })
  }

  
  addMiddleware(name, handler, options = {}) {
    const middleware = new ApiMiddleware(name, handler, options)
    this.middlewares.set(name, middleware)
    this.stats.middlewareCount++
    
    eventBus.emit('api:middleware_added', {
      name,
      timestamp: Date.now()
    })
    
    return middleware
  }

 
  removeMiddleware(name) {
    if (this.middlewares.has(name)) {
      this.middlewares.delete(name)
      this.stats.middlewareCount--
      
      eventBus.emit('api:middleware_removed', {
        name,
        timestamp: Date.now()
      })
      
      return true
    }
    return false
  }

  
  addRoute(routeConfig) {
    const route = new ApiRoute(routeConfig)
    const validation = route.validate()
    
    if (!validation.isValid) {
      throw new Error(`路由配置无效: ${validation.errors.join(', ')}`)
    }
    
    const routeKey = `${route.method}:${route.path}`
    
    
    const middlewareChain = []
    
    for (const middlewareName of route.middleware) {
      const middleware = this.middlewares.get(middlewareName)
      if (middleware) {
        middlewareChain.push((req, res, next) => middleware.execute(req, res, next))
      }
    }
    
    
    if (route.auth !== AuthType.NONE) {
      middlewareChain.push(this.createAuthMiddleware(route.auth))
    }
    
    if (route.rateLimit) {
      middlewareChain.push(rateLimit(route.rateLimit))
    }
    
    
    const wrappedHandler = async (req, res, next) => {
      try {
        await route.handler(req, res, next)
      } catch (error) {
        next(error)
      }
    }
    
    
    const method = route.method.toLowerCase()
    if (this.app[method]) {
      this.app[method](route.path, ...middlewareChain, wrappedHandler)
    }
    
    this.routes.set(routeKey, route)
    this.stats.routeCount++
    
    eventBus.emit('api:route_added', {
      path: route.path,
      method: route.method,
      timestamp: Date.now()
    })
    
    return route
  }

  


  removeRoute(method, path) {
    const routeKey = `${method}:${path}`
    
    if (this.routes.has(routeKey)) {
      this.routes.delete(routeKey)
      this.stats.routeCount--
      
      eventBus.emit('api:route_removed', {
        path,
        method,
        timestamp: Date.now()
      })
      
     
      console.warn('[ApiManager] Express不支持动态移除路由，建议重启服务器')
      
      return true
    }
    return false
  }

  
  createAuthMiddleware(authType) {
    return (req, res, next) => {
      switch (authType) {
        case AuthType.BEARER:
          const bearerToken = req.headers.authorization?.replace('Bearer ', '')
          if (!bearerToken) {
            return res.status(401).json(ApiResponse.error('缺少Bearer Token', 401))
          }
          req.auth = { type: AuthType.BEARER, token: bearerToken }
          break
          
        case AuthType.BASIC:
          const basicAuth = req.headers.authorization?.replace('Basic ', '')
          if (!basicAuth) {
            return res.status(401).json(ApiResponse.error('缺少Basic认证', 401))
          }
          const [username, password] = Buffer.from(basicAuth, 'base64').toString().split(':')
          req.auth = { type: AuthType.BASIC, username, password }
          break
          
        case AuthType.API_KEY:
          const apiKey = req.headers['x-api-key'] || req.query.api_key
          if (!apiKey) {
            return res.status(401).json(ApiResponse.error('缺少API Key', 401))
          }
          req.auth = { type: AuthType.API_KEY, key: apiKey }
          break
          
        default:
          break
      }
      
      next()
    }
  }

  
  async start(config = {}) {
    try {
      this.config = { ...this.config, ...config }
      
      await this.startHttpServer()
      
      if (this.config.https.enabled) {
        await this.startHttpsServer()
      }
      
      this.isRunning = true
      this.stats.startTime = Date.now()
      
      eventBus.emit('api:started', {
        port: this.config.port,
        httpsPort: this.config.https.enabled ? this.config.https.port : null,
        timestamp: Date.now()
      })
      
      console.log(`[ApiManager] HTTP服务器启动: http://${this.config.host}:${this.config.port}`)
      
      if (this.config.https.enabled) {
        console.log(`[ApiManager] HTTPS服务器启动: https://${this.config.host}:${this.config.https.port}`)
      }
    } catch (error) {
      console.error('[ApiManager] 启动服务器失败:', error)
      throw error
    }
  }

 
  async startHttpServer() {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app)
      
      this.server.listen(this.config.port, this.config.host, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
      
      this.server.on('error', (error) => {
        console.error('[ApiManager] HTTP服务器错误:', error)
        eventBus.emit('api:server_error', {
          type: 'http',
          error: error.message,
          timestamp: Date.now()
        })
      })
    })
  }

  
  async startHttpsServer() {
    return new Promise((resolve, reject) => {
      if (!this.config.https.key || !this.config.https.cert) {
        reject(new Error('HTTPS配置缺少密钥或证书'))
        return
      }
      
      const httpsOptions = {
        key: fs.readFileSync(this.config.https.key),
        cert: fs.readFileSync(this.config.https.cert)
      }
      
      this.httpsServer = createHttpsServer(httpsOptions, this.app)
      
      this.httpsServer.listen(this.config.https.port, this.config.host, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
      
      this.httpsServer.on('error', (error) => {
        console.error('[ApiManager] HTTPS服务器错误:', error)
        eventBus.emit('api:server_error', {
          type: 'https',
          error: error.message,
          timestamp: Date.now()
        })
      })
    })
  }

 
  async stop() {
    try {
      const promises = []
      
      if (this.server) {
        promises.push(new Promise((resolve) => {
          this.server.close(resolve)
        }))
      }
      
      if (this.httpsServer) {
        promises.push(new Promise((resolve) => {
          this.httpsServer.close(resolve)
        }))
      }
      
      await Promise.all(promises)
      
      this.isRunning = false
      
      eventBus.emit('api:stopped', {
        timestamp: Date.now()
      })
      
      
    } catch (error) {
      console.error('[ApiManager] 停止服务器失败:', error)
      throw error
    }
  }

  
  async restart(config = {}) {
    await this.stop()
    await this.start(config)
  }

  
  getUptime() {
    if (!this.isRunning || !this.stats.startTime) {
      return 0
    }
    return Date.now() - this.stats.startTime
  }

 
  getRoutes() {
    return Array.from(this.routes.values())
  }

  
  getMiddlewares() {
    return Array.from(this.middlewares.values())
  }

  
  getStats() {
    return {
      ...this.stats,
      uptime: this.getUptime(),
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      isDestroyed: this.isDestroyed
    }
  }

  
  getHealth() {
    return {
      status: this.isRunning ? 'healthy' : 'unhealthy',
      uptime: this.getUptime(),
      routeCount: this.stats.routeCount,
      requestCount: this.stats.requestCount,
      errorRate: this.stats.requestCount > 0 ? this.stats.errorCount / this.stats.requestCount : 0,
      lastCheck: Date.now()
    }
  }

  
  async destroy() {
    try {
      
      if (this.isRunning) {
        await this.stop()
      }
      
      
      this.routes.clear()
      this.middlewares.clear()
      
      this.isDestroyed = true
      
      eventBus.emit('api:destroyed', {
        timestamp: Date.now()
      })
      
    } catch (error) {
      throw error
    }
  }
}

const apiManager = new ApiManager()

export default apiManager
export const addRoute = (config) => apiManager.addRoute(config)
export const removeRoute = (method, path) => apiManager.removeRoute(method, path)
export const addMiddleware = (name, handler, options) => apiManager.addMiddleware(name, handler, options)
export const removeMiddleware = (name) => apiManager.removeMiddleware(name)
export const startServer = (config) => apiManager.start(config)
export const stopServer = () => apiManager.stop()
export const restartServer = (config) => apiManager.restart(config)