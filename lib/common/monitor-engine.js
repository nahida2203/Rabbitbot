import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import crypto from 'node:crypto'
import lodash from 'lodash'
import eventBus from './event-bus.js'




const MetricType = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
}




const AlertLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
}




class Metric {
  constructor(data = {}) {
    this.name = data.name || ''
    this.type = data.type || MetricType.GAUGE
    this.value = data.value || 0
    this.labels = data.labels || {}
    this.timestamp = data.timestamp || Date.now()
    this.description = data.description || ''
    this.unit = data.unit || ''
  }

  




  update(value, labels = {}) {
    this.value = value
    this.labels = { ...this.labels, ...labels }
    this.timestamp = Date.now()
  }

  



  increment(delta = 1) {
    if (this.type === MetricType.COUNTER) {
      this.value += delta
      this.timestamp = Date.now()
    }
  }

  


  toPrometheus() {
    const labelStr = Object.entries(this.labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',')
    
    const name = this.name.replace(/[^a-zA-Z0-9_]/g, '_')
    return `${name}{${labelStr}} ${this.value} ${this.timestamp}`
  }
}




class AlertRule {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID()
    this.name = data.name || ''
    this.metric = data.metric || ''
    this.condition = data.condition || 'gt'
    this.threshold = data.threshold || 0
    this.duration = data.duration || 60000 
    this.level = data.level || AlertLevel.WARNING
    this.message = data.message || ''
    this.enabled = data.enabled !== false
    this.labels = data.labels || {}
    this.annotations = data.annotations || {}
    this.lastTriggered = data.lastTriggered || 0
    this.triggerCount = data.triggerCount || 0
  }

  



  checkTrigger(value) {
    let triggered = false
    
    switch (this.condition) {
      case 'gt':
        triggered = value > this.threshold
        break
      case 'gte':
        triggered = value >= this.threshold
        break
      case 'lt':
        triggered = value < this.threshold
        break
      case 'lte':
        triggered = value <= this.threshold
        break
      case 'eq':
        triggered = value === this.threshold
        break
      case 'ne':
        triggered = value !== this.threshold
        break
    }
    
    return triggered
  }

  


  trigger() {
    this.lastTriggered = Date.now()
    this.triggerCount++
  }
}




class AlertEvent {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID()
    this.ruleId = data.ruleId || ''
    this.ruleName = data.ruleName || ''
    this.level = data.level || AlertLevel.WARNING
    this.message = data.message || ''
    this.value = data.value || 0
    this.threshold = data.threshold || 0
    this.timestamp = data.timestamp || Date.now()
    this.resolved = data.resolved || false
    this.resolvedAt = data.resolvedAt || null
    this.labels = data.labels || {}
    this.annotations = data.annotations || {}
  }

  


  resolve() {
    this.resolved = true
    this.resolvedAt = Date.now()
  }
}




class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.startTime = Date.now()
  }

  



  start(name) {
    this.metrics.set(name, {
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage()
    })
  }

  



  end(name) {
    const metric = this.metrics.get(name)
    if (!metric) return null
    
    const endTime = process.hrtime.bigint()
    const endMemory = process.memoryUsage()
    
    const duration = Number(endTime - metric.startTime) / 1000000 
    const memoryDelta = endMemory.heapUsed - metric.startMemory.heapUsed
    
    this.metrics.delete(name)
    
    return {
      duration,
      memoryDelta,
      startMemory: metric.startMemory,
      endMemory
    }
  }

  




  async measure(name, fn) {
    this.start(name)
    try {
      const result = await fn()
      const metrics = this.end(name)
      return { result, metrics }
    } catch (error) {
      this.end(name)
      throw error
    }
  }
}





class MonitorEngine extends EventEmitter {
  constructor() {
    super()
    
    
    this.metrics = new Map()
    
    
    this.alertRules = new Map()
    
    
    this.alertEvents = new Map()
    
    
    this.performance = new PerformanceMonitor()
    
    
    this.systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      hostname: os.hostname(),
      nodeVersion: process.version
    }
    
    
    this.config = {
      collectInterval: 5000, 
      retentionPeriod: 86400000, 
      maxMetrics: 10000,
      maxAlerts: 1000,
      enableSystemMetrics: true,
      enableProcessMetrics: true,
      enableCustomMetrics: true,
      alertCooldown: 300000, 
      exportEnabled: false,
      exportInterval: 60000, 
      exportPath: './metrics'
    }
    
    
    this.collectors = new Map()
    
    
    this.exporters = new Map()
    
    
    this.stats = {
      metricsCollected: 0,
      alertsTriggered: 0,
      alertsResolved: 0,
      collectionsRun: 0,
      errors: 0,
      startTime: Date.now()
    }
    
    
    this.collectorTimer = null
    
    
    this.exportTimer = null
  }

  



  async init(config = {}) {
    this.config = { ...this.config, ...config }
    
    
    this.registerDefaultCollectors()
    
    
    this.registerDefaultAlertRules()
    
    
    this.startCollection()
    
    
    if (this.config.exportEnabled) {
      this.startExport()
    }
    
    
    eventBus.register('system:shutdown', () => this.destroy(), {
      namespace: 'monitor-engine',
      priority: 80
    })
    
    logger?.info('监控引擎初始化完成')
  }

  


  registerDefaultCollectors() {
    
    if (this.config.enableSystemMetrics) {
      this.registerCollector('system', () => this.collectSystemMetrics())
    }
    
    
    if (this.config.enableProcessMetrics) {
      this.registerCollector('process', () => this.collectProcessMetrics())
    }
    
    
    this.registerCollector('nodejs', () => this.collectNodejsMetrics())
  }

  


  registerDefaultAlertRules() {
    
    this.addAlertRule(new AlertRule({
      name: 'high_cpu_usage',
      metric: 'system_cpu_usage_percent',
      condition: 'gt',
      threshold: 80,
      level: AlertLevel.WARNING,
      message: 'CPU使用率过高: {{value}}%'
    }))
    
    
    this.addAlertRule(new AlertRule({
      name: 'high_memory_usage',
      metric: 'system_memory_usage_percent',
      condition: 'gt',
      threshold: 85,
      level: AlertLevel.WARNING,
      message: '内存使用率过高: {{value}}%'
    }))
    
    
    this.addAlertRule(new AlertRule({
      name: 'high_process_memory',
      metric: 'process_memory_heap_used_bytes',
      condition: 'gt',
      threshold: 512 * 1024 * 1024, 
      level: AlertLevel.ERROR,
      message: '进程内存使用过高: {{value}} bytes'
    }))
    
    
    this.addAlertRule(new AlertRule({
      name: 'high_error_rate',
      metric: 'application_error_rate',
      condition: 'gt',
      threshold: 0.1, 
      level: AlertLevel.CRITICAL,
      message: '错误率过高: {{value}}%'
    }))
  }

  




  registerCollector(name, collector) {
    this.collectors.set(name, collector)
    logger?.debug(`监控收集器已注册: ${name}`)
  }

  




  registerExporter(name, exporter) {
    this.exporters.set(name, exporter)
    logger?.debug(`监控导出器已注册: ${name}`)
  }

  



  addMetric(metric) {
    if (!(metric instanceof Metric)) {
      metric = new Metric(metric)
    }
    
    const key = `${metric.name}_${JSON.stringify(metric.labels)}`
    this.metrics.set(key, metric)
    
    
    if (this.metrics.size > this.config.maxMetrics) {
      this.cleanupOldMetrics()
    }
    
    this.stats.metricsCollected++
    
    
    this.checkAlertRules(metric)
  }

  




  getMetric(name, labels = {}) {
    const key = `${name}_${JSON.stringify(labels)}`
    return this.metrics.get(key)
  }

  



  getMetrics(namePattern = null) {
    let metrics = Array.from(this.metrics.values())
    
    if (namePattern) {
      const regex = new RegExp(namePattern)
      metrics = metrics.filter(m => regex.test(m.name))
    }
    
    return metrics
  }

  





  updateMetric(name, value, labels = {}) {
    const key = `${name}_${JSON.stringify(labels)}`
    let metric = this.metrics.get(key)
    
    if (!metric) {
      metric = new Metric({ name, value, labels })
      this.metrics.set(key, metric)
    } else {
      metric.update(value, labels)
    }
    
    this.stats.metricsCollected++
    
    
    this.checkAlertRules(metric)
  }

  





  incrementCounter(name, delta = 1, labels = {}) {
    const key = `${name}_${JSON.stringify(labels)}`
    let metric = this.metrics.get(key)
    
    if (!metric) {
      metric = new Metric({ name, type: MetricType.COUNTER, value: 0, labels })
      this.metrics.set(key, metric)
    }
    
    metric.increment(delta)
    this.stats.metricsCollected++
    
    
    this.checkAlertRules(metric)
  }

  



  addAlertRule(rule) {
    if (!(rule instanceof AlertRule)) {
      rule = new AlertRule(rule)
    }
    
    this.alertRules.set(rule.id, rule)
    logger?.debug(`告警规则已添加: ${rule.name}`)
  }

  



  removeAlertRule(ruleId) {
    if (this.alertRules.delete(ruleId)) {
      logger?.debug(`告警规则已移除: ${ruleId}`)
    }
  }

  



  checkAlertRules(metric) {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.metric !== metric.name) continue
      
      
      if (Date.now() - rule.lastTriggered < this.config.alertCooldown) {
        continue
      }
      
      
      if (rule.checkTrigger(metric.value)) {
        this.triggerAlert(rule, metric)
      }
    }
  }

  




  triggerAlert(rule, metric) {
    rule.trigger()
    
    const alert = new AlertEvent({
      ruleId: rule.id,
      ruleName: rule.name,
      level: rule.level,
      message: rule.message.replace('{{value}}', metric.value),
      value: metric.value,
      threshold: rule.threshold,
      labels: { ...rule.labels, ...metric.labels },
      annotations: rule.annotations
    })
    
    this.alertEvents.set(alert.id, alert)
    
    
    if (this.alertEvents.size > this.config.maxAlerts) {
      this.cleanupOldAlerts()
    }
    
    this.stats.alertsTriggered++
    
    
    eventBus.emit('monitor:alert', { alert, rule, metric })
    this.emit('alert', alert)
    
    logger?.warn(`告警触发: ${rule.name}`, {
      level: rule.level,
      value: metric.value,
      threshold: rule.threshold
    })
  }

  



  resolveAlert(alertId) {
    const alert = this.alertEvents.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolve()
      this.stats.alertsResolved++
      
      eventBus.emit('monitor:alert-resolved', { alert })
      this.emit('alert-resolved', alert)
      
      logger?.info(`告警已解决: ${alert.ruleName}`)
    }
  }

  


  startCollection() {
    if (this.collectorTimer) {
      clearInterval(this.collectorTimer)
    }
    
    this.collectorTimer = setInterval(() => {
      this.runCollectors()
    }, this.config.collectInterval)
    
    logger?.debug('监控数据收集已启动')
  }

  


  stopCollection() {
    if (this.collectorTimer) {
      clearInterval(this.collectorTimer)
      this.collectorTimer = null
    }
    
    logger?.debug('监控数据收集已停止')
  }

  


  async runCollectors() {
    try {
      for (const [name, collector] of this.collectors) {
        try {
          await collector()
        } catch (error) {
          this.stats.errors++
          logger?.error(`收集器运行失败: ${name}`, error)
        }
      }
      
      this.stats.collectionsRun++
    } catch (error) {
      this.stats.errors++
      logger?.error('运行收集器失败', error)
    }
  }

  


  async collectSystemMetrics() {
    try {
      
      const cpus = os.cpus()
      let totalIdle = 0
      let totalTick = 0
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type]
        }
        totalIdle += cpu.times.idle
      }
      
      const cpuUsage = 100 - (totalIdle / totalTick * 100)
      this.updateMetric('system_cpu_usage_percent', cpuUsage)
      
      
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memUsage = (usedMem / totalMem) * 100
      
      this.updateMetric('system_memory_total_bytes', totalMem)
      this.updateMetric('system_memory_free_bytes', freeMem)
      this.updateMetric('system_memory_used_bytes', usedMem)
      this.updateMetric('system_memory_usage_percent', memUsage)
      
      
      const loadAvg = os.loadavg()
      this.updateMetric('system_load_1m', loadAvg[0])
      this.updateMetric('system_load_5m', loadAvg[1])
      this.updateMetric('system_load_15m', loadAvg[2])
      
      
      this.updateMetric('system_uptime_seconds', os.uptime())
      
    } catch (error) {
      logger?.error('收集系统指标失败', error)
    }
  }

  


  async collectProcessMetrics() {
    try {
      
      const memUsage = process.memoryUsage()
      this.updateMetric('process_memory_rss_bytes', memUsage.rss)
      this.updateMetric('process_memory_heap_total_bytes', memUsage.heapTotal)
      this.updateMetric('process_memory_heap_used_bytes', memUsage.heapUsed)
      this.updateMetric('process_memory_external_bytes', memUsage.external)
      
      
      const cpuUsage = process.cpuUsage()
      this.updateMetric('process_cpu_user_microseconds', cpuUsage.user)
      this.updateMetric('process_cpu_system_microseconds', cpuUsage.system)
      
      
      this.updateMetric('process_uptime_seconds', process.uptime())
      
      
      this.updateMetric('process_pid', process.pid)
      
    } catch (error) {
      logger?.error('收集进程指标失败', error)
    }
  }

  


  async collectNodejsMetrics() {
    try {
      
      const start = process.hrtime.bigint()
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1000000
        this.updateMetric('nodejs_eventloop_delay_milliseconds', delay)
      })
      
      
      if (global.gc) {
        const gcStats = process.memoryUsage()
        this.updateMetric('nodejs_gc_heap_size_bytes', gcStats.heapTotal)
        this.updateMetric('nodejs_gc_heap_used_bytes', gcStats.heapUsed)
      }
      
      
      this.updateMetric('nodejs_active_handles', process._getActiveHandles().length)
      this.updateMetric('nodejs_active_requests', process._getActiveRequests().length)
      
    } catch (error) {
      logger?.error('收集Node.js指标失败', error)
    }
  }

  


  startExport() {
    if (this.exportTimer) {
      clearInterval(this.exportTimer)
    }
    
    this.exportTimer = setInterval(() => {
      this.runExporters()
    }, this.config.exportInterval)
    
    logger?.debug('监控数据导出已启动')
  }

  


  stopExport() {
    if (this.exportTimer) {
      clearInterval(this.exportTimer)
      this.exportTimer = null
    }
    
    logger?.debug('监控数据导出已停止')
  }

  


  async runExporters() {
    try {
      for (const [name, exporter] of this.exporters) {
        try {
          await exporter(this.getMetrics())
        } catch (error) {
          logger?.error(`导出器运行失败: ${name}`, error)
        }
      }
    } catch (error) {
      logger?.error('运行导出器失败', error)
    }
  }

  


  exportPrometheus() {
    const lines = []
    
    for (const metric of this.metrics.values()) {
      lines.push(metric.toPrometheus())
    }
    
    return lines.join('\n')
  }

  


  exportJSON() {
    return {
      timestamp: Date.now(),
      metrics: Array.from(this.metrics.values()),
      alerts: Array.from(this.alertEvents.values()),
      stats: this.getStats()
    }
  }

  


  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.retentionPeriod
    
    for (const [key, metric] of this.metrics) {
      if (metric.timestamp < cutoff) {
        this.metrics.delete(key)
      }
    }
  }

  


  cleanupOldAlerts() {
    const cutoff = Date.now() - this.config.retentionPeriod
    
    for (const [key, alert] of this.alertEvents) {
      if (alert.timestamp < cutoff && alert.resolved) {
        this.alertEvents.delete(key)
      }
    }
  }

  


  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      metrics: this.metrics.size,
      alertRules: this.alertRules.size,
      alertEvents: this.alertEvents.size,
      collectors: this.collectors.size,
      exporters: this.exporters.size
    }
  }

  


  getHealth() {
    const stats = this.getStats()
    const activeAlerts = Array.from(this.alertEvents.values())
      .filter(a => !a.resolved)
    
    const criticalAlerts = activeAlerts.filter(a => a.level === AlertLevel.CRITICAL)
    const errorAlerts = activeAlerts.filter(a => a.level === AlertLevel.ERROR)
    
    let status = 'healthy'
    if (criticalAlerts.length > 0) {
      status = 'critical'
    } else if (errorAlerts.length > 0) {
      status = 'error'
    } else if (activeAlerts.length > 5) {
      status = 'warning'
    }
    
    return {
      status,
      uptime: stats.uptime,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      errorAlerts: errorAlerts.length,
      collectionsRun: stats.collectionsRun,
      errors: stats.errors
    }
  }

  


  getSystemInfo() {
    return {
      ...this.systemInfo,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      versions: process.versions
    }
  }

  


  async destroy() {
    
    this.stopCollection()
    this.stopExport()
    
    
    this.metrics.clear()
    this.alertRules.clear()
    this.alertEvents.clear()
    this.collectors.clear()
    this.exporters.clear()
    
    logger?.info('监控引擎已销毁')
  }
}


const monitorEngine = new MonitorEngine()


export default monitorEngine
export { MonitorEngine, Metric, AlertRule, AlertEvent, PerformanceMonitor, MetricType, AlertLevel }


if (typeof global !== 'undefined') {
  global.monitorEngine = monitorEngine
}