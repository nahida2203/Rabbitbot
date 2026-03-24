
import express from 'express'
import cors from 'cors'
import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https'

import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { Server as IOServer } from 'socket.io'
import { loggerManager } from '../common/logger.js'

import eventManager from '../common/event-manager.js'
import pluginEngine from '../plugins/plugin-engine.js'
import pluginManager from '../plugins/plugin-manager.js'
import authManager from '../common/auth-manager.js'

export const WebUIStatus = Object.freeze({ STARTING: 'starting', RUNNING: 'running', STOPPED: 'stopped', ERROR: 'error' })
export const WebUITheme = Object.freeze({ LIGHT: 'light', DARK: 'dark', AUTO: 'auto' })
export const WebUILanguage = Object.freeze({ ZH_CN: 'zh-CN', EN_US: 'en-US' })

export class WebUIConfig {
  constructor(options = {}) {
    this.title = options.title || 'Rabbit WebUI'
    this.host = options.host || '127.0.0.1'
    this.port = Number(options.port || 18888)
    this.https = !!options.https
    this.httpsOptions = options.httpsOptions || undefined
    this.apiPrefix = options.apiPrefix || '/api'
    this.socketPath = options.socketPath || '/ws'
    this.staticDir = options.staticDir || path.join(process.cwd(), 'webui', 'dist')
    this.cors = options.cors !== false
  }

  getServerUrl() {
    const protocol = this.https ? 'https' : 'http'
    return `${protocol}://${this.host}:${this.port}`
  }

  validate() {
    const errors = []
    if (!this.host) errors.push('host不能为空')
    if (!this.port || Number.isNaN(this.port)) errors.push('port无效')
    if (!String(this.apiPrefix || '').startsWith('/')) errors.push('apiPrefix必须以/开头')
    if (!String(this.socketPath || '').startsWith('/')) errors.push('socketPath必须以/开头')
    return errors
  }
}

export class WebSocketManager {
  constructor(server, config, manager) {
    this.server = server
    this.config = config
    this.manager = manager

    const allowEnv = (process.env.WS_ALLOWED_ORIGINS || '').trim()
    const socketCors = {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (!allowEnv || allowEnv === '*') return callback(null, true)
        const list = allowEnv.split(',').map((s) => s.trim()).filter(Boolean)
        if (list.includes(origin)) return callback(null, true)
        return callback(new Error('Origin not allowed'))
      },
      credentials: true
    }

    this.io = new IOServer(server, {
      path: (config && config.socketPath) || '/ws',
      transports: ['websocket', 'polling'],
      cors: socketCors,
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.io.use(async (socket, next) => {
      try {
        const auth = socket.handshake.auth || {}
        const headerToken = String(socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '')
        const token = auth.token || headerToken
        if (!token) return next()
        const user = await this.manager.verifyJWTToken(token)
        socket.data.user = user
        return next()
      } catch {
        return next()
      }
    })

    this.io.on('connection', (socket) => {
      socket.emit('auth:success', { user: socket.data.user || null, timestamp: Date.now() })
      socket.on('subscribe', (channel) => {
        if (typeof channel === 'string' && channel) socket.join(channel)
      })
      socket.on('unsubscribe', (channel) => {
        if (typeof channel === 'string' && channel) socket.leave(channel)
      })
      socket.on('ping', () => socket.emit('pong', { t: Date.now() }))
    })
  }

  getOnlineUsers() {
    return this.io ? this.io.sockets.sockets.size : 0
  }

  async close() {
    if (this.io) {
      await this.io.close()
      this.io = null
    }
  }
}

export class WebUIRouter {
  constructor(manager) {
    this.manager = manager
  }

  resolveHandler(handlerName) {
    const handler = this.manager?.[handlerName]
    if (typeof handler === 'function') {
      return handler.bind(this.manager)
    }
    return async (req, res) => {
      res.status(501).json({ success: false, error: `WebUI 接口未实现: ${handlerName}` })
    }
  }

  registerRoute(router, method, routePath, handlerName) {
    router[method](routePath, this.resolveHandler(handlerName))
  }

  setupApiRoutes(app, apiPrefix) {
    const router = express.Router()

    app.options('*', (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Encryption-Type, X-Encrypted-Key, X-Auth-Tag, X-IV')
      res.sendStatus(204)
    })

    this.setupAuthRoutes(router)

    this.registerRoute(router, 'get', '/system/settings', 'handleGetSettings')
    this.registerRoute(router, 'put', '/system/settings', 'handleUpdateSettings')
    this.registerRoute(router, 'get', '/system/settings/default', 'handleGetDefaultSettings')
    this.registerRoute(router, 'post', '/system/settings/test-email', 'handleTestEmailSettings')

    this.registerRoute(router, 'get', '/system/stats', 'handleGetStats')
    this.registerRoute(router, 'get', '/system/health', 'handleGetHealth')
    this.registerRoute(router, 'get', '/system/info', 'handleGetSystemInfo')
    this.registerRoute(router, 'get', '/system/monitoring/realtime', 'handleGetRealtimeMonitoring')
    this.registerRoute(router, 'get', '/plugins', 'handleGetPlugins')
    this.registerRoute(router, 'get', '/plugins/categories', 'handleGetPluginCategories')
    this.registerRoute(router, 'get', '/plugins/market', 'handleGetPluginMarket')
    this.registerRoute(router, 'get', '/plugins/:id', 'handleGetPluginDetail')
    this.registerRoute(router, 'get', '/plugins/:id/config', 'handleGetPluginConfig')
    this.registerRoute(router, 'put', '/plugins/:id/config', 'handleUpdatePluginConfig')
    this.registerRoute(router, 'patch', '/plugins/:id/toggle', 'handleTogglePlugin')
    this.registerRoute(router, 'post', '/plugins/:id/restart', 'handleRestartPlugin')
    this.registerRoute(router, 'post', '/plugins/update', 'handleUpdatePlugin')
    this.registerRoute(router, 'post', '/plugins/install', 'handleInstallPlugin')
    this.registerRoute(router, 'delete', '/plugins/:id', 'handleUninstallPlugin')
    this.registerRoute(router, 'get', '/logs', 'handleGetLogs')
    this.registerRoute(router, 'delete', '/logs/clear', 'handleClearLogs')
    this.registerRoute(router, 'get', '/notifications', 'handleGetNotifications')
    this.registerRoute(router, 'post', '/notifications/read', 'handleMarkNotificationsRead')

    app.use(apiPrefix, router)
  }

  setupAuthRoutes(router) {
    this.registerRoute(router, 'get', '/auth/public-key', 'handleGetPublicKey')
    this.registerRoute(router, 'post', '/auth/login', 'handleLogin')
    this.registerRoute(router, 'post', '/auth/register', 'handleRegister')
    this.registerRoute(router, 'post', '/auth/logout', 'handleLogout')
    this.registerRoute(router, 'post', '/auth/refresh', 'handleRefreshToken')
    this.registerRoute(router, 'get', '/auth/verify', 'handleVerifyToken')
    this.registerRoute(router, 'get', '/auth/user', 'handleGetCurrentUser')
  }
}

export class WebUIManager {
  constructor() {
    this.app = null
    this.router = null
    this.server = null
    this.wsManager = null
    this.status = WebUIStatus.STOPPED
    this.initialized = false
    this.startTime = 0
    this.stats = { requests: 0, errors: 0 }

    this.config = new WebUIConfig()

    this.rsaPublicKeyPem = null
    this.rsaPrivateKeyPem = null

    this.useExternalApp = false
    this.externalApp = null
    this.externalServer = null

    this.notificationsFile = path.join(process.cwd(), 'data', 'webui-notifications.json')
    this.notificationListenerIds = []
  }

  async initialize(config = {}) {
    if (this.initialized) return

    try {
      const mergedConfig = config?.config && typeof config.config === 'object'
        ? { ...config, ...config.config }
        : config
      const { app, server, config: _nested, ...restConfig } = mergedConfig || {}

      this.config = new WebUIConfig({ ...this.config, ...restConfig })

      const errors = this.config.validate()
      if (errors.length > 0) {
        throw new Error(`配置验证失败: ${errors.join(', ')}`)
      }

      this.app = app || express()
      this.externalApp = app || null
      this.useExternalApp = !!app
      this.externalServer = server || null

      if (!this.useExternalApp) {
        this.setupMiddleware()
      }

      this.router = new WebUIRouter(this)
      this.app.use(this.config.apiPrefix, this.decryptMiddleware.bind(this))
      this.router.setupApiRoutes(this.app, this.config.apiPrefix)

      if (!this.useExternalApp) {
        this.setupStaticFiles()
        this.setupErrorHandling()
      } else {
        try {
          await fs.access(this.config.staticDir)
          this.app.use(express.static(this.config.staticDir))
        } catch {}
      }

      await this.ensureRSAKeys()
      await this.ensureNotificationStore()
      this.registerNotificationListeners()

      this.initialized = true
    } catch (error) {
      this.status = WebUIStatus.ERROR
      console.error('WebUI管理器初始化失败:', error)
      throw error
    }
  }

  setupMiddleware() {
    if (!this.app) return
    if (this.config.cors) {
      this.app.use(cors({ origin: true, credentials: true }))
    }
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    this.app.use((req, res, next) => {
      this.stats.requests++
      next()
    })
  }

  setupStaticFiles() {
    if (!this.app) return
    this.app.use(express.static(this.config.staticDir))
    this.app.get('*', async (req, res, next) => {
      if (String(req.path || '').startsWith(this.config.apiPrefix) || String(req.path || '').startsWith(this.config.socketPath)) {
        return next()
      }
      const indexFile = path.join(this.config.staticDir, 'index.html')
      try {
        await fs.access(indexFile)
        return res.sendFile(indexFile)
      } catch {
        return next()
      }
    })
  }

  setupErrorHandling() {
    if (!this.app) return
    this.app.use((err, req, res, next) => {
      this.stats.errors++
      res.status(err?.status || 500).json({ success: false, error: err?.message || '内部错误' })
      void next
    })
  }

  async start() {
    if (!this.initialized) {
      await this.initialize()
    }
    if (this.status === WebUIStatus.RUNNING) return

    this.status = WebUIStatus.STARTING
    this.startTime = Date.now()

    if (this.externalServer) {
      this.server = this.externalServer
    } else {
      this.server = this.config.https
        ? createHttpsServer(this.config.httpsOptions || {}, this.app)
        : createHttpServer(this.app)
      await new Promise((resolve, reject) => {
        this.server.once('error', reject)
        this.server.listen(this.config.port, this.config.host, () => resolve())
      })
    }

    if (!this.wsManager && this.server) {
      this.wsManager = new WebSocketManager(this.server, this.config, this)
    }

    this.status = WebUIStatus.RUNNING
    try {
      eventManager?.emit?.('webui:started', { url: this.config.getServerUrl(), timestamp: Date.now() })
    } catch {}
  }

  async stop() {
    if (this.wsManager) {
      await this.wsManager.close()
      this.wsManager = null
    }

    if (this.server && !this.externalServer) {
      await new Promise((resolve) => this.server.close(() => resolve()))
      this.server = null
    }

    this.status = WebUIStatus.STOPPED
    try {
      eventManager?.emit?.('webui:stopped', { uptime: this.startTime ? Date.now() - this.startTime : 0, timestamp: Date.now() })
    } catch {}
  }

  async restart() {
    await this.stop()
    await this.start()
  }

  async updateConfig(nextConfig = {}) {
    this.config = new WebUIConfig({ ...this.config, ...nextConfig })
    return this.config
  }

  async ensureRSAKeys() {
    if (this.rsaPublicKeyPem && this.rsaPrivateKeyPem) return
    const keyDir = path.join(process.cwd(), 'config', 'secure')
    const publicKeyFile = path.join(keyDir, 'webui_rsa_public.pem')
    const privateKeyFile = path.join(keyDir, 'webui_rsa_private.pem')
    try {
      this.rsaPublicKeyPem = await fs.readFile(publicKeyFile, 'utf8')
      this.rsaPrivateKeyPem = await fs.readFile(privateKeyFile, 'utf8')
      return
    } catch {}

    await fs.mkdir(keyDir, { recursive: true })
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    })
    this.rsaPublicKeyPem = publicKey
    this.rsaPrivateKeyPem = privateKey
    await fs.writeFile(publicKeyFile, publicKey, 'utf8')
    await fs.writeFile(privateKeyFile, privateKey, 'utf8')
  }

  async decryptMiddleware(req, res, next) {
    try {
      const encryptionType = String(req.headers['x-encryption-type'] || '').trim().toLowerCase()
      if (!encryptionType || encryptionType === 'none') {
        return next()
      }

      const encryptedKey = req.headers['x-encrypted-key']
      const authTag = req.headers['x-auth-tag']
      const iv = req.headers['x-iv']
      const encryptedPayload = req.body?.ciphertext ?? req.body?.encryptedData ?? req.body?.data ?? req.body?.payload

      if (!encryptedKey || !authTag || !iv || !encryptedPayload) {
        return res.status(400).json({ success: false, error: '加密请求缺少必要参数' })
      }

      if (!this.rsaPrivateKeyPem) {
        await this.ensureRSAKeys()
      }

      const aesKey = crypto.privateDecrypt(
        { key: this.rsaPrivateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
        Buffer.from(String(encryptedKey), 'base64')
      )
      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, Buffer.from(String(iv), 'base64'))
      decipher.setAuthTag(Buffer.from(String(authTag), 'base64'))

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(String(encryptedPayload), 'base64')),
        decipher.final()
      ]).toString('utf8')

      const parsed = JSON.parse(decrypted)
      req.body = parsed && typeof parsed === 'object' ? parsed : { value: parsed }
      return next()
    } catch (error) {
      return res.status(400).json({ success: false, error: `请求解密失败: ${error.message}` })
    }
  }

  async ensureNotificationStore() {
    try {
      await fs.mkdir(path.dirname(this.notificationsFile), { recursive: true })
      await fs.access(this.notificationsFile)
    } catch {
      await fs.writeFile(this.notificationsFile, JSON.stringify({ items: [] }, null, 2), 'utf8')
    }
  }

  async readNotifications() {
    await this.ensureNotificationStore()
    try {
      const raw = await fs.readFile(this.notificationsFile, 'utf8')
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed?.items) ? parsed.items : []
    } catch {
      return []
    }
  }

  async writeNotifications(items) {
    await this.ensureNotificationStore()
    await fs.writeFile(this.notificationsFile, JSON.stringify({ items }, null, 2), 'utf8')
  }

  async addNotification(notification) {
    const items = await this.readNotifications()
    const record = {
      id: notification.id || `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: notification.title || '',
      message: notification.message || '',
      type: notification.type || 'info',
      read: notification.read === true,
      userId: notification.userId || 'system',
      createdAt: notification.createdAt || new Date().toISOString(),
      data: notification.data || {}
    }
    items.unshift(record)
    await this.writeNotifications(items.slice(0, 500))
    return record
  }

  registerNotificationListeners() {
    if (this.notificationListenerIds.length > 0) return

    const bindings = [
      {
        event: 'plugin:loaded',
        handler: async (data) => this.addNotification({
          title: '插件已加载',
          message: `${data?.name || data?.info?.name || 'unknown'} 已成功加载`,
          type: 'success',
          data
        })
      },
      {
        event: 'plugin:started',
        handler: async (data) => this.addNotification({
          title: '插件已启动',
          message: `${data?.name || data?.info?.name || 'unknown'} 已启动`,
          type: 'success',
          data
        })
      },
      {
        event: 'plugin:stopped',
        handler: async (data) => this.addNotification({
          title: '插件已停止',
          message: `${data?.name || data?.info?.name || 'unknown'} 已停止`,
          type: 'info',
          data
        })
      },
      {
        event: 'plugin:error',
        handler: async (data) => this.addNotification({
          title: '插件异常',
          message: `${data?.name || 'unknown'}: ${data?.error || '发生未知错误'}`,
          type: 'error',
          data
        })
      },
      {
        event: 'webui:started',
        handler: async (data) => this.addNotification({
          title: 'WebUI 已启动',
          message: data?.url || 'WebUI 服务已启动',
          type: 'success',
          data
        })
      },
      {
        event: 'webui:stopped',
        handler: async (data) => this.addNotification({
          title: 'WebUI 已停止',
          message: `运行时长 ${Math.round((data?.uptime || 0) / 1000)} 秒`,
          type: 'info',
          data
        })
      }
    ]

    for (const binding of bindings) {
      try {
        const listenerId = eventManager.addEventListener(binding.event, binding.handler, {
          namespace: 'webui-notifications'
        })
        this.notificationListenerIds.push(listenerId)
      } catch {}
    }
  }

  getAllRuntimePlugins() {
    try {
      const source = pluginEngine?.plugins || pluginManager?.plugins
      if (!source) return []
      const plugins = source instanceof Map
        ? Array.from(source.values())
        : Array.isArray(source)
          ? source
          : Object.values(source)
      return plugins.map((plugin) => ({
        id: plugin.id,
        name: plugin.name || plugin.id,
        displayName: plugin.displayName || plugin.name || plugin.id,
        description: plugin.description || '',
        version: plugin.version || '',
        author: plugin.author || '',
        homepage: plugin.homepage,
        repository: plugin.repository,
        license: plugin.license,
        keywords: this.normalizeKeywords(plugin),
        status: plugin.status,
        path: plugin.path,
        entry: plugin.entry
      }))
    } catch {
      return []
    }
  }

  normalizeKeywords(plugin) {
    if (Array.isArray(plugin?.keywords)) return plugin.keywords.filter(Boolean)
    if (Array.isArray(plugin?.tags)) return plugin.tags.filter(Boolean)
    return []
  }

  getPluginInfo(pluginId) {
    return this.getAllRuntimePlugins().find((plugin) => String(plugin.id) === String(pluginId)) || null
  }

  getPluginList() {
    return this.getAllRuntimePlugins()
  }

  getDefaultWebUIRoles() {
    return [
      'admin',
      'super_admin',
      'plugin_manager',
      'config_manager',
      'log_viewer',
      'monitor_viewer',
      'user_manager',
      'ai_user',
      'developer'
    ]
  }

  getDefaultWebUIPermissions() {
    return [
      '*',
      'plugin.read',
      'plugin.write',
      'plugin.install',
      'config.read',
      'config.write',
      'config.system',
      'system.read',
      'system.write',
      'system.monitor',
      'log.read',
      'log.clear',
      'user.read',
      'user.write',
      'ai.use',
      'tools.use'
    ]
  }

  getAuthSecret() {
    try {
      if (typeof authManager?.getLocalAuthKey === 'function') {
        const key = authManager.getLocalAuthKey()
        if (key) return key
      }
    } catch {}
    return process.env.WEBUI_AUTH_SECRET || 'rabbit-webui-local-secret'
  }

  encodeBase64Url(input) {
    return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  decodeBase64Url(input) {
    const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/')
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    return Buffer.from(normalized + padding, 'base64').toString('utf8')
  }

  signToken(payload) {
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = this.encodeBase64Url(header)
    const encodedPayload = this.encodeBase64Url(payload)
    const data = `${encodedHeader}.${encodedPayload}`
    const signature = crypto
      .createHmac('sha256', this.getAuthSecret())
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    return `${data}.${signature}`
  }

  verifySignedToken(token) {
    const [encodedHeader, encodedPayload, signature] = String(token || '').split('.')
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new Error('token invalid')
    }
    const data = `${encodedHeader}.${encodedPayload}`
    const expected = crypto
      .createHmac('sha256', this.getAuthSecret())
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    if (expected !== signature) {
      throw new Error('token signature invalid')
    }
    const payload = JSON.parse(this.decodeBase64Url(encodedPayload))
    const now = Math.floor(Date.now() / 1000)
    if (payload?.exp && payload.exp < now) {
      throw new Error('token expired')
    }
    return payload
  }

  buildCurrentUser(overrides = {}) {
    const now = new Date().toISOString()
    const username = String(overrides.username || 'admin')
    return {
      id: String(overrides.id || 'webui-admin'),
      username,
      email: String(overrides.email || `${username}@localhost`),
      nickname: String(overrides.nickname || username),
      avatar: overrides.avatar || '',
      roles: Array.isArray(overrides.roles) && overrides.roles.length ? overrides.roles : this.getDefaultWebUIRoles(),
      permissions: Array.isArray(overrides.permissions) && overrides.permissions.length ? overrides.permissions : this.getDefaultWebUIPermissions(),
      status: 'active',
      createdAt: String(overrides.createdAt || now),
      updatedAt: String(overrides.updatedAt || now),
      lastLoginTime: String(overrides.lastLoginTime || now),
      lastLoginIp: String(overrides.lastLoginIp || ''),
      loginCount: Number(overrides.loginCount || 1)
    }
  }

  createAuthTokens(user) {
    const now = Math.floor(Date.now() / 1000)
    const accessPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      type: 'access',
      iat: now,
      exp: now + 48 * 60 * 60,
      iss: 'rabbit-webui'
    }
    const refreshPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
      type: 'refresh',
      iat: now,
      exp: now + 7 * 24 * 60 * 60,
      iss: 'rabbit-webui'
    }
    return {
      token: this.signToken(accessPayload),
      refreshToken: this.signToken(refreshPayload),
      expiresIn: 48 * 60 * 60
    }
  }

  async verifyJWTToken(token) {
    if (!token) throw new Error('token required')
    const payload = this.verifySignedToken(token)
    return this.buildCurrentUser({
      id: payload.sub,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions
    })
  }

  async handleGetPublicKey(req, res) {
    await this.ensureRSAKeys()
    res.json({ success: true, data: { publicKey: this.rsaPublicKeyPem } })
  }

  async handleLogin(req, res) {
    try {
      const username = String(req.body?.username || 'admin').trim()
      const password = String(req.body?.password || '').trim()
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名或密码不能为空', code: 400 })
      }
      const user = this.buildCurrentUser({
        username,
        nickname: username,
        lastLoginIp: req.ip || req.socket?.remoteAddress || ''
      })
      const tokens = this.createAuthTokens(user)
      return res.json({
        success: true,
        message: '登录成功',
        data: {
          ...tokens,
          user
        }
      })
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, code: 500 })
    }
  }

  async handleRegister(req, res) {
    return res.status(501).json({ success: false, error: 'WebUI 注册接口未实现' })
  }

  async handleLogout(req, res) {
    return res.json({ success: true, message: '已退出登录' })
  }

  async handleRefreshToken(req, res) {
    try {
      const refreshToken = String(req.body?.refreshToken || '').trim()
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'refreshToken不能为空', code: 400 })
      }
      const payload = this.verifySignedToken(refreshToken)
      if (payload.type !== 'refresh') {
        return res.status(401).json({ success: false, message: 'refreshToken无效', code: 401 })
      }
      const user = this.buildCurrentUser({
        id: payload.sub,
        username: payload.username,
        roles: payload.roles,
        permissions: payload.permissions
      })
      const tokens = this.createAuthTokens(user)
      return res.json({ success: true, message: '刷新成功', data: tokens })
    } catch (error) {
      return res.status(401).json({ success: false, message: error.message, code: 401 })
    }
  }

  async handleVerifyToken(req, res) {
    try {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
      const user = await this.verifyJWTToken(token)
      return res.json({ success: true, data: user })
    } catch (error) {
      return res.status(401).json({ success: false, error: error.message })
    }
  }

  async handleGetCurrentUser(req, res) {
    return this.handleVerifyToken(req, res)
  }

  async handleGetSettings(req, res) {
    res.json({ success: true, data: this.config })
  }

  async handleUpdateSettings(req, res) {
    const nextConfig = await this.updateConfig(req.body || {})
    res.json({ success: true, data: nextConfig, message: '设置更新成功' })
  }

  async handleGetDefaultSettings(req, res) {
    res.json({ success: true, data: new WebUIConfig() })
  }

  async handleTestEmailSettings(req, res) {
    res.status(501).json({ success: false, error: '邮件测试接口未实现' })
  }

  async handleGetStats(req, res) {
    res.json({
      success: true,
      data: {
        ...this.stats,
        status: this.status,
        startTime: this.startTime,
        uptime: this.startTime ? Date.now() - this.startTime : 0,
        onlineUsers: this.wsManager?.getOnlineUsers?.() || 0,
        hostname: os.hostname()
      }
    })
  }

  async handleGetHealth(req, res) {
    res.json({ success: true, data: { status: this.status, initialized: this.initialized } })
  }

  async handleGetSystemInfo(req, res) {
    res.json({
      success: true,
      data: {
        platform: process.platform,
        nodeVersion: process.version,
        hostname: os.hostname(),
        cpus: os.cpus()?.length || 0,
        memory: { total: os.totalmem(), free: os.freemem() }
      }
    })
  }

  async handleGetRealtimeMonitoring(req, res) {
    return this.handleGetStats(req, res)
  }

  async handleGetPluginCategories(req, res) {
    const categories = Array.from(new Set(this.getAllRuntimePlugins().flatMap((plugin) => this.normalizeKeywords(plugin)))).sort()
    res.json({ success: true, data: categories })
  }

  async handleGetPluginConfig(req, res) {
    const plugin = await this.getPluginInfo(req.params.id)
    if (!plugin) return res.status(404).json({ success: false, message: '插件不存在' })
    res.json({ success: true, data: {} })
  }

  async handleUpdatePluginConfig(req, res) {
    res.status(501).json({ success: false, error: '插件配置更新接口未实现' })
  }

  async handleTogglePlugin(req, res) {
    res.status(501).json({ success: false, error: '插件启停接口未实现' })
  }

  async handleRestartPlugin(req, res) {
    res.status(501).json({ success: false, error: '插件重启接口未实现' })
  }

  async handleUpdatePlugin(req, res) {
    res.status(501).json({ success: false, error: '插件更新接口未实现' })
  }

  async handleInstallPlugin(req, res) {
    res.status(501).json({ success: false, error: '插件安装接口未实现' })
  }

  async handleUninstallPlugin(req, res) {
    res.status(501).json({ success: false, error: '插件卸载接口未实现' })
  }

  async handleGetLogs(req, res) {
    const logger = loggerManager?.getLogger?.('webui') || null
    res.json({ success: true, data: { available: !!logger } })
  }

  async handleClearLogs(req, res) {
    res.json({ success: true, message: '日志清理请求已接收' })
  }

  async buildLocalPluginMarketIndex() {
    const plugins = this.getAllRuntimePlugins()
    return {
      items: plugins.map((plugin) => ({
        ...plugin,
        source: 'local',
        installed: true
      })),
      total: plugins.length
    }
  }

  


  async handleGetNotifications(req, res) {
    try {
      const { page = 1, size = 10, read, type } = req.query
      let filteredNotifications = await this.readNotifications()
      
      
      if (read !== undefined) {
        const isRead = read === 'true'
        filteredNotifications = filteredNotifications.filter(n => n.read === isRead)
      }
      
      
      if (type) {
        filteredNotifications = filteredNotifications.filter(n => n.type === type)
      }
      
      
      const pageNum = parseInt(page) || 1
      const pageSize = parseInt(size) || 10
      const startIndex = (pageNum - 1) * pageSize
      const endIndex = startIndex + pageSize
      const items = filteredNotifications.slice(startIndex, endIndex)
      
      res.json({
        success: true,
        data: {
          items,
          total: filteredNotifications.length,
          page: pageNum,
          size: pageSize,
          totalPages: Math.max(1, Math.ceil(filteredNotifications.length / pageSize))
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async handleMarkNotificationsRead(req, res) {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []
      const items = await this.readNotifications()
      let changed = 0
      const nextItems = items.map((item) => {
        if (ids.length === 0 || ids.includes(String(item.id))) {
          if (!item.read) changed++
          return { ...item, read: true }
        }
        return item
      })
      await this.writeNotifications(nextItems)
      res.json({ success: true, data: { changed }, message: '通知状态更新成功' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async handleDeleteNotification(req, res) {
    try {
      const id = String(req.params.id)
      const items = await this.readNotifications()
      const nextItems = items.filter((item) => String(item.id) !== id)
      await this.writeNotifications(nextItems)
      res.json({ success: true, message: '通知已删除' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async handleClearNotifications(req, res) {
    try {
      await this.writeNotifications([])
      res.json({ success: true, message: '通知已清空' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async handleGetUnreadNotificationCount(req, res) {
    try {
      const items = await this.readNotifications()
      const count = items.filter(item => item.read !== true).length
      res.json({
        success: true,
        data: { count }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async handleGetPluginMarket(req, res) {
    try {
      const page = Math.max(1, Number(req.query.page || 1))
      const size = Math.max(1, Number(req.query.size || 20))
      const keyword = String(req.query.keyword || '').trim().toLowerCase()

      const category = String(req.query.category || '').trim()
      const market = await this.buildLocalPluginMarketIndex()
      let items = market.items

      if (keyword) {
        items = items.filter((plugin) =>
          plugin.name.toLowerCase().includes(keyword) ||
          plugin.displayName.toLowerCase().includes(keyword) ||
          plugin.description.toLowerCase().includes(keyword) ||
          plugin.author.toLowerCase().includes(keyword)
        )
      }

      if (category) {
        items = items.filter((plugin) => Array.isArray(plugin.keywords) && plugin.keywords.includes(category))
      }

      const total = items.length
      const startIndex = (page - 1) * size
      const endIndex = startIndex + size
      const pagedItems = items.slice(startIndex, endIndex)

      res.json({
        success: true,
        data: {
          items: pagedItems,
          total,
          page,
          size,
          totalPages: Math.max(1, Math.ceil(total / size)),
          source: 'local-index'
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, message: '获取插件市场失败', error: error.message })
    }
  }

  async handleGetPlugins(req, res) {
    return this.handleGetPluginList(req, res)
  }

  async handleGetPluginDetail(req, res) {
    return this.handleGetPluginInfo(req, res)
  }

  


  async handleGetPluginInfo(req, res) {
    try {
      const plugin = await this.getPluginInfo(req.params.id)
      if (!plugin) {
        return res.status(404).json({
          success: false,
          message: '插件不存在'
        })
      }
      const pluginViewModel = {
        id: plugin.id,
        name: plugin.name,
        displayName: plugin.displayName,
        description: plugin.description || '',
        version: plugin.version || '',
        author: plugin.author || '',
        homepage: plugin.homepage,
        repository: plugin.repository,
        license: plugin.license,
        keywords: this.normalizeKeywords(plugin)
      }
      res.json({
        success: true,
        data: pluginViewModel,
        message: '获取插件信息成功'
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  


  async handleGetPluginList(req, res) {
    try {
      const plugins = await this.getPluginList()
      const pluginViewModels = plugins.map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        displayName: plugin.displayName,
        description: plugin.description || '',
        version: plugin.version || '',
        author: plugin.author || '',
        homepage: plugin.homepage,
        repository: plugin.repository,
        license: plugin.license,
        keywords: this.normalizeKeywords(plugin)
      }))
      res.json({
        success: true,
        data: pluginViewModels,
        message: '获取插件列表成功'
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}


const webUIManager = new WebUIManager()


export default webUIManager
export const start = (...args) => webUIManager.start(...args)
export const stop = (...args) => webUIManager.stop(...args)
export const restart = (...args) => webUIManager.restart(...args)
export const updateConfig = (...args) => webUIManager.updateConfig(...args)