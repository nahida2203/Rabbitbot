import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import lodash from 'lodash'
import eventBus from './event-bus.js'




const SecurityLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}




const ThreatType = {
  MALICIOUS_CODE: 'malicious_code',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  DATA_BREACH: 'data_breach',
  RESOURCE_ABUSE: 'resource_abuse',
  NETWORK_ATTACK: 'network_attack',
  INJECTION: 'injection',
  XSS: 'xss',
  CSRF: 'csrf'
}




class SecurityEvent {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID()
    this.type = data.type || ThreatType.MALICIOUS_CODE
    this.level = data.level || SecurityLevel.MEDIUM
    this.source = data.source || 'unknown'
    this.target = data.target || ''
    this.description = data.description || ''
    this.details = data.details || {}
    this.timestamp = data.timestamp || Date.now()
    this.resolved = data.resolved || false
    this.actions = data.actions || []
  }

  


  resolve(action = '') {
    this.resolved = true
    if (action) {
      this.actions.push({
        type: 'resolve',
        action,
        timestamp: Date.now()
      })
    }
  }

  


  addAction(type, action, details = {}) {
    this.actions.push({
      type,
      action,
      details,
      timestamp: Date.now()
    })
  }
}





class SecurityEngine {
  constructor() {
    
    this.config = {
      enableSandbox: true,
      enableCodeScan: true,
      enableRuntimeProtection: true,
      enableNetworkFilter: true,
      enableFileProtection: true,
      maxMemoryUsage: 512 * 1024 * 1024, 
      maxCpuUsage: 80, 
      maxFileSize: 10 * 1024 * 1024, 
      maxNetworkConnections: 100,
      sessionTimeout: 3600000, 
      maxLoginAttempts: 5,
      lockoutDuration: 900000, 
      encryptionAlgorithm: 'aes-256-gcm',
      hashAlgorithm: 'sha256'
    }

    
    
    
    const envMaxMbRaw = process.env.SECURITY_MAX_MEMORY_MB
      ?? process.env.RABBIT_MAX_MEMORY_MB
      ?? process.env.YUNZAI_MAX_MEMORY_MB
      ?? process.env.MAX_MEMORY_MB
    const envMaxMb = Number(envMaxMbRaw)
    if (Number.isFinite(envMaxMb) && envMaxMb > 0) {
      this.config.maxMemoryUsage = envMaxMb * 1024 * 1024
    }
    
    
    this.events = new Map()
    
    
    this.acl = new Map()
    
    
    this.sessions = new Map()
    
    
    this.loginAttempts = new Map()
    
    
    this.blacklist = new Set()
    
    
    this.whitelist = new Set()
    
    
    this.malwareSignatures = new Set()
    
    
    this.networkRules = []
    
    
    this.fileRules = []
    
    
    this.resourceMonitor = {
      memory: new Map(),
      cpu: new Map(),
      network: new Map(),
      files: new Map()
    }
    
    
    this.encryptionKey = null
    
    
    this.stats = {
      threatsDetected: 0,
      threatsBlocked: 0,
      sessionsCreated: 0,
      loginAttempts: 0,
      failedLogins: 0,
      filesScanned: 0,
      networkConnections: 0,
      startTime: Date.now()
    }
  }

  



  async init(config = {}) {
    this.config = { ...this.config, ...config }
    
    
    await this.generateEncryptionKey()
    
    
    await this.loadMalwareSignatures()
    
    
    this.startResourceMonitoring()
    
    
    eventBus.register('system:shutdown', () => this.destroy(), {
      namespace: 'security-engine',
      priority: 95
    })
    
    eventBus.register('plugin:loaded', (data) => this.scanPlugin(data.plugin), {
      namespace: 'security-engine'
    })
    
    logger?.info('安全引擎初始化完成')
  }

  


  async generateEncryptionKey() {
    this.encryptionKey = crypto.randomBytes(32)
    logger?.debug('加密密钥已生成')
  }

  


  async loadMalwareSignatures() {
    const signatures = [
      
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(\s*["'`][^"'`]*["'`]/,
      /setInterval\s*\(\s*["'`][^"'`]*["'`]/,
      
      
      /exec\s*\(/,
      /spawn\s*\(/,
      /child_process/,
      
      
      /fs\.unlink/,
      /fs\.rmdir/,
      /fs\.writeFile.*\.\.\/\.\.\//, 
      
      
      /http\.request.*localhost/,
      /fetch.*127\.0\.0\.1/,
      
      
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /vbscript:/i,
      
      
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i
    ]
    
    for (const signature of signatures) {
      this.malwareSignatures.add(signature)
    }
    
    logger?.debug(`恶意代码特征库已加载: ${signatures.length}条规则`)
  }

  




  async scanCode(code, source = 'unknown') {
    if (!this.config.enableCodeScan) return { safe: true }
    
    const threats = []
    
    
    for (const signature of this.malwareSignatures) {
      if (signature.test(code)) {
        threats.push({
          type: ThreatType.MALICIOUS_CODE,
          level: SecurityLevel.HIGH,
          description: `检测到恶意代码特征: ${signature}`,
          location: this.findCodeLocation(code, signature)
        })
      }
    }
    
    
    const dangerousAPIs = [
      'require("fs")',
      'require("child_process")',
      'require("os")',
      'require("cluster")',
      'process.exit',
      'process.kill'
    ]
    
    for (const api of dangerousAPIs) {
      if (code.includes(api)) {
        threats.push({
          type: ThreatType.PRIVILEGE_ESCALATION,
          level: SecurityLevel.CRITICAL,
          description: `检测到危险API调用: ${api}`,
          location: code.indexOf(api)
        })
      }
    }
    
    
    const complexity = this.calculateComplexity(code)
    if (complexity > 100) {
      threats.push({
        type: ThreatType.RESOURCE_ABUSE,
        level: SecurityLevel.MEDIUM,
        description: `代码复杂度过高: ${complexity}`,
        details: { complexity }
      })
    }
    
    
    if (threats.length > 0) {
      const event = new SecurityEvent({
        type: ThreatType.MALICIOUS_CODE,
        level: Math.max(...threats.map(t => this.getLevelValue(t.level))),
        source,
        description: `代码扫描发现${threats.length}个威胁`,
        details: { threats, codeLength: code.length }
      })
      
      this.recordSecurityEvent(event)
      this.stats.threatsDetected += threats.length
    }
    
    this.stats.filesScanned++
    
    return {
      safe: threats.length === 0,
      threats,
      complexity
    }
  }

  



  async scanPlugin(plugin) {
    try {
      const entryPath = path.join(plugin.path, plugin.entry)
      const code = await fs.readFile(entryPath, 'utf8')
      
      const result = await this.scanCode(code, `plugin:${plugin.id}`)
      
      if (!result.safe) {
        logger?.warn(`插件安全扫描发现威胁: ${plugin.id}`, result.threats)
        
        
        const criticalThreats = result.threats.filter(t => t.level === SecurityLevel.CRITICAL)
        if (criticalThreats.length > 0) {
          throw new Error(`插件包含严重安全威胁，已阻止加载: ${plugin.id}`)
        }
      }
      
      return result
      
    } catch (error) {
      logger?.error(`插件安全扫描失败: ${plugin.id}`, error)
      throw error
    }
  }

  




  createSession(userId, metadata = {}) {
    const sessionId = crypto.randomUUID()
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      metadata,
      permissions: new Set(),
      ipAddress: metadata.ipAddress || 'unknown',
      userAgent: metadata.userAgent || 'unknown'
    }
    
    this.sessions.set(sessionId, session)
    this.stats.sessionsCreated++
    
    
    setTimeout(() => {
      this.destroySession(sessionId)
    }, this.config.sessionTimeout)
    
    eventBus.emit('security:session-created', { session })
    logger?.debug(`会话已创建: ${sessionId} (用户: ${userId})`)
    
    return sessionId
  }

  



  validateSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { valid: false, reason: 'session_not_found' }
    }
    
    
    const now = Date.now()
    if (now - session.lastActivity > this.config.sessionTimeout) {
      this.destroySession(sessionId)
      return { valid: false, reason: 'session_expired' }
    }
    
    
    session.lastActivity = now
    
    return { valid: true, session }
  }

  



  destroySession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.sessions.delete(sessionId)
      eventBus.emit('security:session-destroyed', { session })
      logger?.debug(`会话已销毁: ${sessionId}`)
    }
  }

  





  async validateLogin(userId, password, metadata = {}) {
    const clientId = metadata.ipAddress || 'unknown'
    
    
    const attempts = this.loginAttempts.get(clientId)
    if (attempts && attempts.count >= this.config.maxLoginAttempts) {
      const lockoutEnd = attempts.lastAttempt + this.config.lockoutDuration
      if (Date.now() < lockoutEnd) {
        this.recordSecurityEvent(new SecurityEvent({
          type: ThreatType.PRIVILEGE_ESCALATION,
          level: SecurityLevel.HIGH,
          source: clientId,
          description: '尝试在锁定期间登录',
          details: { userId, attempts: attempts.count }
        }))
        
        return {
          success: false,
          reason: 'account_locked',
          lockoutEnd
        }
      }
    }
    
    this.stats.loginAttempts++
    
    
    const isValid = await this.verifyCredentials(userId, password)
    
    if (isValid) {
      
      this.loginAttempts.delete(clientId)
      
      
      const sessionId = this.createSession(userId, metadata)
      
      eventBus.emit('security:login-success', { userId, sessionId, metadata })
      logger?.info(`用户登录成功: ${userId}`)
      
      return {
        success: true,
        sessionId
      }
    } else {
      
      const currentAttempts = this.loginAttempts.get(clientId) || { count: 0, lastAttempt: 0 }
      currentAttempts.count++
      currentAttempts.lastAttempt = Date.now()
      this.loginAttempts.set(clientId, currentAttempts)
      
      this.stats.failedLogins++
      
      
      this.recordSecurityEvent(new SecurityEvent({
        type: ThreatType.PRIVILEGE_ESCALATION,
        level: SecurityLevel.MEDIUM,
        source: clientId,
        description: '登录失败',
        details: { userId, attempts: currentAttempts.count }
      }))
      
      eventBus.emit('security:login-failed', { userId, metadata, attempts: currentAttempts.count })
      logger?.warn(`用户登录失败: ${userId} (尝试次数: ${currentAttempts.count})`)
      
      return {
        success: false,
        reason: 'invalid_credentials',
        attemptsRemaining: this.config.maxLoginAttempts - currentAttempts.count
      }
    }
  }

  




  async verifyCredentials(userId, password) {
    logger?.info(`[安全引擎] 正在验证用户凭据: ${userId}`)
    try {
      const crypto = await import('crypto')
      const fs = await import('fs/promises')
      const path = await import('path')
      const yaml = await import('yaml')
      
      
      if (!userId || !password) {
        throw new Error('用户ID和密码不能为空')
      }
      
      
      const { default: permissionManager } = await import('./permission-manager.js')
      
      if (permissionManager && typeof permissionManager.getUser === 'function') {
        const user = await permissionManager.getUser(userId)
        if (!user) {
          return { valid: false, reason: '用户不存在' }
        }
        
        if (!user.active) {
          return { valid: false, reason: '用户已被禁用' }
        }
        
        
        const isValid = await this.verifyPasswordHash(password, user.passwordHash, user.salt)
        
        if (isValid) {
          
          if (typeof permissionManager.updateUserLastLogin === 'function') {
            await permissionManager.updateUserLastLogin(userId)
          }
          
          return {
            valid: true,
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              permissions: user.permissions || [],
              lastLogin: new Date().toISOString()
            }
          }
        } else {
          return { valid: false, reason: '密码错误' }
        }
      } else {
        
        const configPath = path.join(process.cwd(), 'config', 'config', 'user.yaml')
        
        try {
          const content = await fs.readFile(configPath, 'utf8')
          const userConfig = yaml.parse(content) || {}
          
          const user = userConfig.users?.[userId]
          if (!user) {
            return { valid: false, reason: '用户不存在' }
          }
          
          if (user.active === false) {
            return { valid: false, reason: '用户已被禁用' }
          }
          
          
          let isValid = false
          if (user.passwordHash && user.salt) {
            
            isValid = await this.verifyPasswordHash(password, user.passwordHash, user.salt)
          } else if (user.password) {
            
            isValid = password === user.password
            
            
            if (isValid) {
              const { hash, salt } = await this.hashPassword(password)
              user.passwordHash = hash
              user.salt = salt
              delete user.password
              
              
              await fs.writeFile(configPath, yaml.stringify(userConfig), 'utf8')
            }
          } else {
            return { valid: false, reason: '用户密码配置错误' }
          }
          
          if (isValid) {
            
            user.lastLogin = new Date().toISOString()
            await fs.writeFile(configPath, yaml.stringify(userConfig), 'utf8')
            
            return {
              valid: true,
              user: {
                id: userId,
                username: user.username || userId,
                role: user.role || 'user',
                permissions: user.permissions || [],
                lastLogin: user.lastLogin
              }
            }
          } else {
            return { valid: false, reason: '密码错误' }
          }
          
        } catch (fileError) {
          
          if (userId === 'admin') {
            
            const defaultPassword = process.env.RABBIT_ADMIN_PASSWORD || process.env.YUNZAI_ADMIN_PASSWORD || 'admin123'
            
            if (password === defaultPassword) {
              return {
                valid: true,
                user: {
                  id: 'admin',
                  username: 'Administrator',
                  role: 'admin',
                  permissions: ['*'],
                  lastLogin: new Date().toISOString(),
                  isDefault: true
                }
              }
            }
          }
          
          return { valid: false, reason: '用户配置不存在' }
        }
      }
      
    } catch (error) {
      console.error('验证凭据错误:', error)
      return { valid: false, reason: '验证过程中发生错误' }
    }
  }
  
  





  async verifyPasswordHash(password, hash, salt) {
    try {
      const crypto = await import('crypto')
      const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
      return computedHash === hash
    } catch (error) {
      console.error('密码哈希验证错误:', error)
      return false
    }
  }
  
  



  async hashPassword(password) {
    try {
      const crypto = await import('crypto')
      const salt = crypto.randomBytes(32).toString('hex')
      const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
      return { hash, salt }
    } catch (error) {
      console.error('密码哈希生成错误:', error)
      throw new Error('密码哈希生成失败')
    }
  }

  




  checkPermission(sessionId, permission) {
    const validation = this.validateSession(sessionId)
    if (!validation.valid) {
      return false
    }
    
    const session = validation.session
    return session.permissions.has(permission) || session.permissions.has('*')
  }

  




  grantPermission(sessionId, permission) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.permissions.add(permission)
      logger?.debug(`权限已授予: ${permission} (会话: ${sessionId})`)
    }
  }

  




  revokePermission(sessionId, permission) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.permissions.delete(permission)
      logger?.debug(`权限已撤销: ${permission} (会话: ${sessionId})`)
    }
  }

  



  encrypt(data) {
    
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(this.config.encryptionAlgorithm, this.encryptionKey, iv)
    cipher.setAAD(Buffer.from('rabbit-security', 'utf8'))

    
    const encryptedBuf = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return {
      encrypted: encryptedBuf.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    }
  }

  



  decrypt(encryptedData) {
    const { encrypted, iv, authTag } = encryptedData

    
    const decipher = crypto.createDecipheriv(this.config.encryptionAlgorithm, this.encryptionKey, Buffer.from(iv, 'hex'))
    decipher.setAAD(Buffer.from('rabbit-security', 'utf8'))
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    const decryptedBuf = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()])
    return decryptedBuf.toString('utf8')
  }

  



  hash(data) {
    return crypto.createHash(this.config.hashAlgorithm).update(data).digest('hex')
  }

  


  startResourceMonitoring() {
    if (!this.config.enableRuntimeProtection) return
    
    setInterval(() => {
      this.monitorResources()
    }, 5000) 
  }

  


  monitorResources() {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    
    if (memUsage.heapUsed > this.config.maxMemoryUsage) {
      
      
      
      
      const ratio = memUsage.heapUsed / this.config.maxMemoryUsage
      let level = SecurityLevel.MEDIUM
      if (ratio > 1.5) {
        level = SecurityLevel.CRITICAL
      } else if (ratio > 1.2) {
        level = SecurityLevel.HIGH
      }

      this.recordSecurityEvent(new SecurityEvent({
        type: ThreatType.RESOURCE_ABUSE,
        level,
        source: 'system',
        description: '内存使用超限',
        details: { memUsage, limit: this.config.maxMemoryUsage, ratio }
      }))
    }
    
    
    this.resourceMonitor.memory.set(Date.now(), memUsage)
    this.resourceMonitor.cpu.set(Date.now(), cpuUsage)
    
    
    const oneHourAgo = Date.now() - 3600000
    for (const [timestamp] of this.resourceMonitor.memory) {
      if (timestamp < oneHourAgo) {
        this.resourceMonitor.memory.delete(timestamp)
      }
    }
  }

  



  recordSecurityEvent(event) {
    this.events.set(event.id, event)
    
    
    eventBus.emit('security:threat-detected', { event })
    
    
    this.handleThreat(event)
    
    logger?.warn(`安全事件: ${event.description}`, {
      id: event.id,
      type: event.type,
      level: event.level,
      source: event.source
    })
  }

  



  handleThreat(event) {
    
    if (event.type === ThreatType.RESOURCE_ABUSE) {
      const ratio = event?.details?.ratio
      if (Number.isFinite(ratio) && ratio < 3) {
        this.monitorThreat(event)
        return
      }
    }
    switch (event.level) {
      case SecurityLevel.CRITICAL:
        
        this.blockThreat(event)
        this.stats.threatsBlocked++
        break
        
      case SecurityLevel.HIGH:
        
        this.blockThreat(event)
        this.stats.threatsBlocked++
        break
        
      case SecurityLevel.MEDIUM:
        
        this.monitorThreat(event)
        break
        
      case SecurityLevel.LOW:
        
        break
    }
  }

  



  blockThreat(event) {
    
    if (event.source && event.source !== 'unknown') {
      this.blacklist.add(event.source)
    }
    
    
    event.addAction('block', '威胁已被阻止')
    
    logger?.error(`威胁已阻止: ${event.description}`, event)
  }

  



  monitorThreat(event) {
    
    event.addAction('monitor', '威胁已被监控')
    
    logger?.warn(`威胁监控: ${event.description}`, event)
  }

  



  calculateComplexity(code) {
    let complexity = 1
    
    
    const patterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g
    ]
    
    for (const pattern of patterns) {
      const matches = code.match(pattern)
      if (matches) {
        complexity += matches.length
      }
    }
    
    return complexity
  }

  




  findCodeLocation(code, pattern) {
    const match = code.match(pattern)
    if (match) {
      const index = code.indexOf(match[0])
      const lines = code.substring(0, index).split('\n')
      return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
        match: match[0]
      }
    }
    return null
  }

  



  getLevelValue(level) {
    const values = {
      [SecurityLevel.LOW]: 1,
      [SecurityLevel.MEDIUM]: 2,
      [SecurityLevel.HIGH]: 3,
      [SecurityLevel.CRITICAL]: 4
    }
    return values[level] || 1
  }

  



  getSecurityEvent(eventId) {
    return this.events.get(eventId)
  }

  



  getSecurityEvents(filter = {}) {
    let events = Array.from(this.events.values())
    
    if (filter.type) {
      events = events.filter(e => e.type === filter.type)
    }
    
    if (filter.level) {
      events = events.filter(e => e.level === filter.level)
    }
    
    if (filter.resolved !== undefined) {
      events = events.filter(e => e.resolved === filter.resolved)
    }
    
    if (filter.since) {
      events = events.filter(e => e.timestamp >= filter.since)
    }
    
    return events.sort((a, b) => b.timestamp - a.timestamp)
  }

  


  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      events: this.events.size,
      sessions: this.sessions.size,
      blacklist: this.blacklist.size,
      whitelist: this.whitelist.size
    }
  }

  


  getHealth() {
    const recentEvents = this.getSecurityEvents({
      since: Date.now() - 3600000 
    })
    
    const criticalEvents = recentEvents.filter(e => e.level === SecurityLevel.CRITICAL)
    const highEvents = recentEvents.filter(e => e.level === SecurityLevel.HIGH)
    
    let status = 'healthy'
    if (criticalEvents.length > 0) {
      status = 'critical'
    } else if (highEvents.length > 5) {
      status = 'warning'
    } else if (recentEvents.length > 20) {
      status = 'degraded'
    }
    
    return {
      status,
      events: recentEvents.length,
      critical: criticalEvents.length,
      high: highEvents.length,
      uptime: Date.now() - this.stats.startTime
    }
  }

  


  async destroy() {
    
    for (const sessionId of this.sessions.keys()) {
      this.destroySession(sessionId)
    }
    
    
    this.events.clear()
    this.acl.clear()
    this.loginAttempts.clear()
    this.blacklist.clear()
    this.whitelist.clear()
    
    logger?.info('安全引擎已销毁')
  }
}


const securityEngine = new SecurityEngine()


export default securityEngine
export { SecurityEngine, SecurityEvent, SecurityLevel, ThreatType }


if (typeof global !== 'undefined') {
  global.securityEngine = securityEngine
}