import log4js from 'log4js'
import { Chalk } from 'chalk'
import fs from 'fs'
import path from 'path'
import util from 'util'
import eventBus from '../common/event-bus.js'
import cfg from '../config/config.js'




export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
  MARK: 'mark',
  OFF: 'off'
}




export const LogType = {
  CONSOLE: 'console',
  FILE: 'file',
  DATE_FILE: 'dateFile',
  ROTATING_FILE: 'rotating-file',
  STDOUT: 'stdout',
  STDERR: 'stderr'
}




export class LogConfig {
  constructor(options = {}) {
    this.level = options.level || LogLevel.INFO
    this.pattern = options.pattern || '%[[%d{hh:mm:ss.SSS}][%4.4p]%]%m'
    this.filename = options.filename || null
    this.maxLogSize = options.maxLogSize || '10MB'
    this.backups = options.backups || 5
    this.compress = options.compress || false
    this.alwaysIncludePattern = options.alwaysIncludePattern || true
    this.datePattern = options.datePattern || 'yyyy-MM-dd'
    this.keepFileExt = options.keepFileExt || true
    this.numBackups = options.numBackups || 15
  }
}




export class Logger {
  constructor(name = 'default', config = new LogConfig()) {
    this.name = name
    this.config = config
    this.logger = null
    this.chalk = new Chalk({ level: 3 })
    this.stats = {
      traceCount: 0,
      debugCount: 0,
      infoCount: 0,
      warnCount: 0,
      errorCount: 0,
      fatalCount: 0,
      markCount: 0
    }
    
    this.init()
  }

  


  init() {
    this.logger = log4js.getLogger(this.name)
    this.logger.level = this.config.level
  }

  


  formatMessage(level, ...args) {
    const messages = []
    
    for (const arg of args) {
      if (typeof arg === 'string') {
        messages.push(arg)
      } else if (arg instanceof Error) {
        messages.push(`${arg.message}\n${arg.stack}`)
      } else {
        messages.push(util.inspect(arg, {
          depth: 10,
          colors: true,
          showHidden: false,
          showProxy: false,
          maxArrayLength: 100,
          maxStringLength: 1000,
          breakLength: 100
        }))
      }
    }
    
    return messages.join(' ')
  }

  


  log(level, ...args) {
    if (!this.logger) return
    
    const message = this.formatMessage(level, ...args)
    
    const actualLevel = this.normalizeLevel(level, message)
    this.logger[actualLevel](message)
    
    
    if (this.stats[`${actualLevel}Count`] !== undefined) {
      this.stats[`${actualLevel}Count`]++
    }
    
    
    eventBus.emit('logger:message', {
      logger: this.name,
      level: actualLevel,
      message,
      timestamp: Date.now()
    })
  }

  




  normalizeLevel(level, message) {
    try {
      const enabled = cfg?.bot?.log_auto_fix_success_level !== false
      if (!enabled) return level
      if (level !== LogLevel.ERROR) return level
      if (typeof message !== 'string' || message.length === 0) return level

      
      const successKeywords = [
        '成功', '已启动', '启动完成', '初始化完成', '认证成功', '连接成功',
        '实例创建成功', '创建成功', '已创建', '已加载', '已添加', '已注册',
        '准备就绪', '重连完成', 'online', '上线成功', 'ready'
      ]
      
      const failKeywords = [
        '失败', '错误', '异常', '未', '不能', '无法', '拒绝', '断开', '超时',
        ' not ', ' error', ' fail', ' exception', ' timeout', ' denied'
      ]

      const hasSuccess = successKeywords.some(k => message.includes(k))
      if (!hasSuccess) return level
      const hasFail = failKeywords.some(k => message.includes(k))
      if (hasFail) return level

      return LogLevel.INFO
    } catch {
      return level
    }
  }

  


  trace(...args) {
    this.log(LogLevel.TRACE, ...args)
  }

  


  debug(...args) {
    this.log(LogLevel.DEBUG, ...args)
  }

  


  info(...args) {
    this.log(LogLevel.INFO, ...args)
  }

  


  warn(...args) {
    this.log(LogLevel.WARN, ...args)
  }

  


  error(...args) {
    this.log(LogLevel.ERROR, ...args)
  }

  


  fatal(...args) {
    this.log(LogLevel.FATAL, ...args)
  }

  


  mark(...args) {
    this.log(LogLevel.MARK, ...args)
  }

  


  setLevel(level) {
    this.config.level = level
    if (this.logger) {
      this.logger.level = level
    }
  }

  


  getStats() {
    return { ...this.stats }
  }

  


  resetStats() {
    for (const key in this.stats) {
      this.stats[key] = 0
    }
  }
}




export class LoggerManager {
  constructor() {
    
    this.loggers = new Map()
    
    
    this.globalConfig = {
      logDir: 'logs',
      level: cfg.bot?.log_level || LogLevel.INFO,
      maxLogSize: '10MB',
      backups: 5,
      compress: false,
      pattern: '%[[%d{hh:mm:ss.SSS}][%4.4p]%]%m',
      align: cfg.bot?.log_align || 'TRSSYz'
    }
    
    
    this.stats = {
      loggerCount: 0,
      totalMessages: 0,
      errorCount: 0
    }
    
    
    this.isInitialized = false
    this.isDestroyed = false
    
    this.init()
  }

  


  async init() {
    try {
      
      this.ensureLogDir()
      
      
      this.configureLog4js()
      
      
      this.createDefaultLoggers()
      
      
      this.setupGlobalLogger()
      
      
      if (!this._onLogMessageBound) {
        this._onLogMessageBound = this._onLogMessage?.bind(this) || ((e) => this._onLogMessage(e))
        eventBus.on('logger:message', this._onLogMessageBound)
      }
      if (!this.recentLogs) this.recentLogs = new Map()
      if (!this.maxRecentLogs) this.maxRecentLogs = 5000
      
      this.isInitialized = true
      
      eventBus.emit('logger:initialized', {
        loggerCount: this.loggers.size,
        timestamp: Date.now()
      })
      
      this.info('[LoggerManager] 日志管理器初始化完成')
    } catch (error) {
      this.stats.errorCount++
      console.error('[LoggerManager] 初始化失败:', error)
      throw error
    }
  }

  


  ensureLogDir() {
    if (!fs.existsSync(this.globalConfig.logDir)) {
      fs.mkdirSync(this.globalConfig.logDir, { recursive: true })
    }
  }

  


  configureLog4js() {
    log4js.configure({
      appenders: {
        console: {
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: this.globalConfig.pattern
          }
        },
        command: {
          type: 'dateFile',
          filename: path.join(this.globalConfig.logDir, 'command'),
          pattern: 'yyyy-MM-dd.log',
          numBackups: 15,
          alwaysIncludePattern: true,
          layout: {
            type: 'pattern',
            pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m'
          }
        },
        error: {
          type: 'file',
          filename: path.join(this.globalConfig.logDir, 'error.log'),
          alwaysIncludePattern: true,
          layout: {
            type: 'pattern',
            pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m'
          }
        },
        debug: {
          type: 'dateFile',
          filename: path.join(this.globalConfig.logDir, 'debug'),
          pattern: 'yyyy-MM-dd.log',
          numBackups: 7,
          alwaysIncludePattern: true,
          layout: {
            type: 'pattern',
            pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m'
          }
        }
      },
      categories: {
        default: { 
          appenders: ['console'], 
          level: this.globalConfig.level 
        },
        command: { 
          appenders: ['console', 'command'], 
          level: 'warn' 
        },
        error: { 
          appenders: ['console', 'command', 'error'], 
          level: 'error' 
        },
        debug: {
          appenders: ['debug'],
          level: 'debug'
        }
      }
    })
  }

  


  createDefaultLoggers() {
    const defaultLoggers = [
      { name: 'default', category: 'default' },
      { name: 'command', category: 'command' },
      { name: 'error', category: 'error' },
      { name: 'debug', category: 'debug' }
    ]
    
    for (const { name, category } of defaultLoggers) {
      const logger = new Logger(category)
      this.loggers.set(name, logger)
      this.stats.loggerCount++
    }
  }

  


  setupGlobalLogger() {
    const chalk = new Chalk({ level: 3 })
    const defaultLogger = this.loggers.get('default')
    const commandLogger = this.loggers.get('command')
    const errorLogger = this.loggers.get('error')
    
    
    chalk.logger = {
      defaultLogger: defaultLogger?.logger,
      commandLogger: commandLogger?.logger,
      errorLogger: errorLogger?.logger,
      trace: (...args) => defaultLogger?.trace(...args),
      debug: (...args) => defaultLogger?.debug(...args),
      info: (...args) => defaultLogger?.info(...args),
      warn: (...args) => commandLogger?.warn(...args),
      error: (...args) => errorLogger?.error(...args),
      fatal: (...args) => errorLogger?.fatal(...args),
      mark: (...args) => commandLogger?.mark(...args)
    }
    
    
    const defid = chalk.blue(`[${this.globalConfig.align}]`)
    for (const method in chalk.logger) {
      if (typeof chalk.logger[method] === 'function') {
        chalk[method] = (...args) => chalk.logger[method](defid, ...args)
      }
    }
    
    
    global.logger = chalk

    
    if (typeof console !== 'undefined') {
      const self = this
      const toDefault = (fn) => (...args) => self.loggers.get('default')?.[fn]?.(...args)
      const toCommand = (fn) => (...args) => self.loggers.get('command')?.[fn]?.(...args)
      const toError = (fn) => (...args) => self.loggers.get('error')?.[fn]?.(...args)

      console.log = toDefault('info')
      console.info = toDefault('info')
      console.debug = toDefault('debug')
      console.warn = toCommand('warn')
      console.error = toError('error')
    }
  }

  


  createLogger(name, config = new LogConfig()) {
    if (this.loggers.has(name)) {
      return this.loggers.get(name)
    }
    
    const logger = new Logger(name, config)
    this.loggers.set(name, logger)
    this.stats.loggerCount++
    
    eventBus.emit('logger:created', {
      name,
      timestamp: Date.now()
    })
    
    return logger
  }

  


  getLogger(name) {
    return this.loggers.get(name)
  }

  


  removeLogger(name) {
    if (this.loggers.has(name)) {
      this.loggers.delete(name)
      this.stats.loggerCount--
      
      eventBus.emit('logger:removed', {
        name,
        timestamp: Date.now()
      })
      
      return true
    }
    return false
  }

  


  setGlobalLevel(level) {
    this.globalConfig.level = level
    
    for (const logger of this.loggers.values()) {
      logger.setLevel(level)
    }
    
    eventBus.emit('logger:level_changed', {
      level,
      timestamp: Date.now()
    })
  }

  


  getLoggerNames() {
    return Array.from(this.loggers.keys())
  }

  


  log(loggerName, level, ...args) {
    const logger = this.loggers.get(loggerName)
    if (logger) {
      logger.log(level, ...args)
      this.stats.totalMessages++
    }
  }

  


  trace(...args) {
    this.log('default', LogLevel.TRACE, ...args)
  }

  


  debug(...args) {
    this.log('default', LogLevel.DEBUG, ...args)
  }

  


  info(...args) {
    this.log('default', LogLevel.INFO, ...args)
  }

  


  warn(...args) {
    this.log('command', LogLevel.WARN, ...args)
  }

  


  error(...args) {
    this.log('error', LogLevel.ERROR, ...args)
  }

  


  fatal(...args) {
    this.log('error', LogLevel.FATAL, ...args)
  }

  


  mark(...args) {
    this.log('command', LogLevel.MARK, ...args)
  }

  


  _onLogMessage(evt) {
    try {
      const { logger: name = 'default', level = 'info', message = '', timestamp = Date.now() } = evt || {}
      if (!this.recentLogs) this.recentLogs = new Map()
      let arr = this.recentLogs.get(name)
      if (!arr) {
        arr = []
        this.recentLogs.set(name, arr)
      }
      arr.push({ logger: name, level, message, timestamp })
      
      if (arr.length > (this.maxRecentLogs || 5000)) {
        arr.splice(0, arr.length - (this.maxRecentLogs || 5000))
      }
    } catch (_) {
      
    }
  }

  




  async getLogs(options = {}) {
    const { loggerName, level, limit = 100, offset = 0 } = options
    const normalize = (s) => (s || '').toLowerCase()
    const wantLevel = normalize(level)
    const pick = (arr) => {
      let list = Array.isArray(arr) ? arr : []
      if (wantLevel) list = list.filter((x) => normalize(x.level) === wantLevel)
      
      list = list.slice().sort((a, b) => b.timestamp - a.timestamp)
      return list.slice(offset, offset + limit)
    }

    if (loggerName) {
      const arr = this.recentLogs?.get(loggerName) || []
      return pick(arr)
    }

    
    const all = []
    if (this.recentLogs) {
      for (const arr of this.recentLogs.values()) all.push(...arr)
    }
    return pick(all)
  }

  



  async getLogFile(date) {
    const logsDir = path.join(process.cwd(), this.globalConfig.logDir)
    const readSafe = async (file) => {
      try { return await fs.promises.readFile(file, 'utf8') } catch { return '' }
    }

    if (date) {
      const debugFile = path.join(logsDir, `debug-${date}.log`)
      const cmdFile = path.join(logsDir, `command-${date}.log`)
      const content = [await readSafe(debugFile), await readSafe(cmdFile)].filter(Boolean).join('\n')
      if (content) return content
    }

    
    try {
      const files = await fs.promises.readdir(logsDir)
      const debugFiles = files.filter(f => /^debug-\d{4}-\d{2}-\d{2}\.log$/.test(f)).sort().reverse()
      if (debugFiles.length > 0) {
        return await readSafe(path.join(logsDir, debugFiles[0]))
      }
      const cmdFiles = files.filter(f => /^command-\d{4}-\d{2}-\d{2}\.log$/.test(f)).sort().reverse()
      if (cmdFiles.length > 0) {
        return await readSafe(path.join(logsDir, cmdFiles[0]))
      }
    } catch {}

    
    return await readSafe(path.join(logsDir, 'error.log'))
  }

  


  async clearLogs() {
    try {
      const logsDir = path.join(process.cwd(), this.globalConfig.logDir)
      try {
        const files = await fs.promises.readdir(logsDir)
        const targets = files.filter(f => f.endsWith('.log'))
        await Promise.all(targets.map(f => fs.promises.writeFile(path.join(logsDir, f), '', 'utf8')))
      } catch {}
      
      if (this.recentLogs) this.recentLogs.clear()
      return { success: true }
    } catch (e) {
      return { success: false, message: e?.message || 'clear logs failed' }
    }
  }

  


  getHealth() {
    return {
      status: this.isInitialized && !this.isDestroyed ? 'healthy' : 'unhealthy',
      loggerCount: this.loggers.size,
      totalMessages: this.stats.totalMessages,
      errorCount: this.stats.errorCount,
      lastCheck: Date.now()
    }
  }

  


  resetStats() {
    this.stats.totalMessages = 0
    this.stats.errorCount = 0
    
    for (const logger of this.loggers.values()) {
      logger.resetStats()
    }
  }

  


  async destroy() {
    try {
      
      this.loggers.clear()
      
      
      log4js.shutdown()
      
      this.isDestroyed = true
      
      eventBus.emit('logger:destroyed', {
        timestamp: Date.now()
      })
      
      
    } catch (error) {
      console.error('[LoggerManager] 销毁日志管理器失败:', error)
      throw error
    }
  }
}


const loggerManager = new LoggerManager()




function setLog() {
  
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true })
  }
  
  
  if (!global.logger && loggerManager.isInitialized) {
    loggerManager.setupGlobalLogger()
  }
  
  return loggerManager
}


export default setLog
export { loggerManager }
export const createLogger = (name, config) => loggerManager.createLogger(name, config)
export const getLogger = (name) => loggerManager.getLogger(name)
export const setGlobalLevel = (level) => loggerManager.setGlobalLevel(level)


export const trace = (...args) => loggerManager.trace(...args)
export const debug = (...args) => loggerManager.debug(...args)
export const info = (...args) => loggerManager.info(...args)
export const warn = (...args) => loggerManager.warn(...args)
export const error = (...args) => loggerManager.error(...args)
export const fatal = (...args) => loggerManager.fatal(...args)
export const mark = (...args) => loggerManager.mark(...args)