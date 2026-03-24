




import { EventEmitter } from 'events'
import { Worker } from 'worker_threads'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import eventBus from './event-bus.js'




export const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  RETRYING: 'retrying'
}




export const TaskType = {
  CRON: 'cron',
  INTERVAL: 'interval',
  TIMEOUT: 'timeout',
  IMMEDIATE: 'immediate',
  DELAYED: 'delayed',
  WORKER: 'worker'
}




export const TaskPriority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  CRITICAL: 10
}




export class TaskInfo {
  constructor(data = {}) {
    
    this.id = data.id || this.generateId()
    
    
    this.name = data.name || ''
    
    
    this.type = data.type || TaskType.IMMEDIATE
    
    
    this.status = data.status || TaskStatus.PENDING
    
    
    this.priority = data.priority || TaskPriority.NORMAL
    
    
    this.handler = data.handler
    
    
    this.args = data.args || []
    
    
    this.config = data.config || {}
    
    
    this.cron = data.cron || ''
    
    
    this.interval = data.interval || 0
    
    
    this.delay = data.delay || 0
    
    
    this.timeout = data.timeout || 30000
    
    
    this.maxRetries = data.maxRetries || 0
    
    
    this.retries = data.retries || 0
    
    
    this.retryDelay = data.retryDelay || 1000
    
    
    this.enabled = data.enabled !== false
    
    
    this.createdAt = data.createdAt || Date.now()
    
    
    this.updatedAt = data.updatedAt || Date.now()
    
    
    this.nextRunAt = data.nextRunAt || null
    
    
    this.lastRunAt = data.lastRunAt || null
    
    
    this.runCount = data.runCount || 0
    
    
    this.error = data.error || null
    
    
    this.result = data.result || null
    
    
    this.duration = data.duration || 0
    
    
    this.tags = data.tags || []
    
    
    this.metadata = data.metadata || {}
  }

  


  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  



  update(data) {
    Object.assign(this, data)
    this.updatedAt = Date.now()
  }

  




  setStatus(status, extra = {}) {
    this.status = status
    this.updatedAt = Date.now()
    
    if (extra.error) this.error = extra.error
    if (extra.result !== undefined) this.result = extra.result
    if (extra.duration !== undefined) this.duration = extra.duration
  }

  


  incrementRetry() {
    this.retries++
    this.updatedAt = Date.now()
  }

  


  resetRetries() {
    this.retries = 0
    this.updatedAt = Date.now()
  }

  


  canRetry() {
    return this.retries < this.maxRetries
  }

  


  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      priority: this.priority,
      config: this.config,
      cron: this.cron,
      interval: this.interval,
      delay: this.delay,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      retries: this.retries,
      retryDelay: this.retryDelay,
      enabled: this.enabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      nextRunAt: this.nextRunAt,
      lastRunAt: this.lastRunAt,
      runCount: this.runCount,
      error: this.error,
      result: this.result,
      duration: this.duration,
      tags: this.tags,
      metadata: this.metadata
    }
  }
}




export class TaskQueue {
  constructor(name = 'default', options = {}) {
    
    this.name = name
    
    
    this.options = {
      concurrency: 5,
      maxSize: 1000,
      autoStart: true,
      ...options
    }
    
    
    this.tasks = []
    
    
    this.running = new Map()
    
    
    this.paused = false
    
    
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    }
  }

  



  add(task) {
    if (this.tasks.length >= this.options.maxSize) {
      throw new Error(`队列 ${this.name} 已满`)
    }
    
    
    let insertIndex = this.tasks.length
    for (let i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].priority < task.priority) {
        insertIndex = i
        break
      }
    }
    
    this.tasks.splice(insertIndex, 0, task)
    this.stats.total++
    
    return task
  }

  


  next() {
    return this.tasks.shift()
  }

  



  remove(taskId) {
    const index = this.tasks.findIndex(task => task.id === taskId)
    if (index !== -1) {
      return this.tasks.splice(index, 1)[0]
    }
    return null
  }

  



  find(taskId) {
    return this.tasks.find(task => task.id === taskId) || this.running.get(taskId)
  }

  


  size() {
    return this.tasks.length
  }

  


  runningCount() {
    return this.running.size
  }

  


  canRun() {
    return !this.paused && 
           this.running.size < this.options.concurrency && 
           this.tasks.length > 0
  }

  


  pause() {
    this.paused = true
  }

  


  resume() {
    this.paused = false
  }

  


  clear() {
    this.tasks.length = 0
  }

  


  getStats() {
    return {
      ...this.stats,
      pending: this.tasks.length,
      running: this.running.size
    }
  }
}




export class TaskScheduler extends EventEmitter {
  constructor() {
    super()
    
    
    this.queues = new Map()
    
    
    this.cronJobs = new Map()
    
    
    this.intervals = new Map()
    
    
    this.timeouts = new Map()
    
    
    this.workers = new Map()
    
    
    this.config = {
      defaultQueue: 'default',
      maxWorkers: os.cpus()?.length || 1,
      workerTimeout: 60000,
      cleanupInterval: 300000, 
      maxTaskHistory: 1000
    }
    
    
    this.taskHistory = []
    
    
    this.schedulerTimer = null
    
    
    this.cleanupTimer = null
    
    
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      startTime: Date.now()
    }
    
    
    this.initialized = false
  }

  



  async init(config = {}) {
    if (this.initialized) {
      logger?.warn('任务调度器已初始化')
      return
    }
    
    this.config = { ...this.config, ...config }
    
    logger?.info('初始化任务调度器...')
    
    try {
      
      this.createQueue(this.config.defaultQueue)
      
      
      this.startScheduler()
      
      
      this.startCleanup()
      
      
      this.setupEventListeners()
      
      this.initialized = true
      
      logger?.info('任务调度器初始化完成')
      
      this.emit('initialized')
      eventBus.emit('scheduler:initialized')
      
    } catch (error) {
      logger?.error('任务调度器初始化失败', error)
      throw error
    }
  }

  


  setupEventListeners() {
    
    eventBus.on('system:shutdown', () => {
      this.destroy()
    })
    
    
    eventBus.on('config:changed', (data) => {
      if (data.section === 'scheduler') {
        this.handleConfigChange(data)
      }
    })
  }

  



  handleConfigChange(data) {
    try {
      logger?.info('任务调度器配置发生变更', data)
      
      
      this.config = { ...this.config, ...data.config }
      
      
      this.restartScheduler()
      
    } catch (error) {
      logger?.error('处理任务调度器配置变更失败', error)
    }
  }

  


  startScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer)
    }
    
    this.schedulerTimer = setInterval(() => {
      this.processQueues()
    }, 100) 
    
    logger?.debug('任务调度器已启动')
  }

  


  stopScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
    
    logger?.debug('任务调度器已停止')
  }

  


  restartScheduler() {
    this.stopScheduler()
    this.startScheduler()
    
    logger?.info('任务调度器已重启')
  }

  


  startCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    
    this.cleanupTimer = setInterval(() => {
      this.performCleanup()
    }, this.config.cleanupInterval)
    
    logger?.debug('任务清理已启动')
  }

  


  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    logger?.debug('任务清理已停止')
  }

  


  performCleanup() {
    try {
      
      if (this.taskHistory.length > this.config.maxTaskHistory) {
        const removeCount = this.taskHistory.length - this.config.maxTaskHistory
        this.taskHistory.splice(0, removeCount)
      }
      
      
      for (const [id, job] of this.cronJobs) {
        if (job.status === TaskStatus.COMPLETED || job.status === TaskStatus.FAILED) {
          this.cronJobs.delete(id)
        }
      }
      
      
      this.cleanupWorkers()
      
      logger?.debug('任务清理完成')
      
    } catch (error) {
      logger?.error('任务清理失败', error)
    }
  }

  


  cleanupWorkers() {
    const now = Date.now()
    
    for (const [id, worker] of this.workers) {
      if (now - worker.lastUsed > this.config.workerTimeout) {
        try {
          worker.terminate()
          this.workers.delete(id)
          logger?.debug(`Worker ${id} 已清理`)
        } catch (error) {
          logger?.error(`清理Worker ${id} 失败`, error)
        }
      }
    }
  }

  


  processQueues() {
    for (const queue of this.queues.values()) {
      while (queue.canRun()) {
        const task = queue.next()
        if (!task) break
        
        this.executeTask(task, queue)
      }
    }
  }

  




  createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      throw new Error(`队列 ${name} 已存在`)
    }
    
    const queue = new TaskQueue(name, options)
    this.queues.set(name, queue)
    
    logger?.info(`队列已创建: ${name}`)
    
    this.emit('queue-created', queue)
    eventBus.emit('scheduler:queue-created', queue)
    
    return queue
  }

  



  deleteQueue(name) {
    if (name === this.config.defaultQueue) {
      throw new Error('不能删除默认队列')
    }
    
    const queue = this.queues.get(name)
    if (!queue) {
      throw new Error(`队列 ${name} 不存在`)
    }
    
    
    for (const task of queue.tasks) {
      task.setStatus(TaskStatus.CANCELLED)
      this.addToHistory(task)
    }
    
    this.queues.delete(name)
    
    logger?.info(`队列已删除: ${name}`)
    
    this.emit('queue-deleted', queue)
    eventBus.emit('scheduler:queue-deleted', queue)
  }

  



  getQueue(name) {
    return this.queues.get(name)
  }

  




  addTask(taskData, queueName = this.config.defaultQueue) {
    const task = taskData instanceof TaskInfo ? taskData : new TaskInfo(taskData)
    
    
    this.validateTask(task)
    
    
    let queue = this.queues.get(queueName)
    if (!queue) {
      queue = this.createQueue(queueName)
    }
    
    
    queue.add(task)
    this.stats.totalTasks++
    
    logger?.debug(`任务已添加: ${task.id} -> ${queueName}`)
    
    this.emit('task-added', task)
    eventBus.emit('scheduler:task-added', task)
    
    return task
  }

  



  validateTask(task) {
    if (!task.handler && task.type !== TaskType.WORKER) {
      throw new Error('任务必须有处理函数')
    }
    
    if (task.type === TaskType.CRON && !task.cron) {
      throw new Error('Cron任务必须有cron表达式')
    }
    
    if (task.type === TaskType.INTERVAL && !task.interval) {
      throw new Error('间隔任务必须有间隔时间')
    }
    
    if (task.type === TaskType.DELAYED && !task.delay) {
      throw new Error('延时任务必须有延时时间')
    }
  }

  




  async executeTask(task, queue) {
    if (!task.enabled) {
      task.setStatus(TaskStatus.CANCELLED, { error: '任务已禁用' })
      this.addToHistory(task)
      return
    }
    
    
    queue.running.set(task.id, task)
    task.setStatus(TaskStatus.RUNNING)
    task.lastRunAt = Date.now()
    task.runCount++
    
    logger?.debug(`开始执行任务: ${task.id}`)
    
    this.emit('task-started', task)
    eventBus.emit('scheduler:task-started', task)
    
    const startTime = Date.now()
    
    try {
      let result
      
      
      switch (task.type) {
        case TaskType.WORKER:
          result = await this.executeWorkerTask(task)
          break
        default:
          result = await this.executeNormalTask(task)
          break
      }
      
      const duration = Date.now() - startTime
      task.setStatus(TaskStatus.COMPLETED, { result, duration })
      
      queue.stats.completed++
      this.stats.completedTasks++
      
      logger?.debug(`任务执行完成: ${task.id} (${duration}ms)`)
      
      this.emit('task-completed', task)
      eventBus.emit('scheduler:task-completed', task)
      
    } catch (error) {
      const duration = Date.now() - startTime
      task.setStatus(TaskStatus.FAILED, { error: error.message, duration })
      
      queue.stats.failed++
      this.stats.failedTasks++
      
      logger?.error(`任务执行失败: ${task.id}`, error)
      
      this.emit('task-failed', task)
      eventBus.emit('scheduler:task-failed', task)
      
      
      if (task.canRetry()) {
        await this.retryTask(task, queue)
        return
      }
    } finally {
      
      queue.running.delete(task.id)
      
      
      this.addToHistory(task)
      
      
      this.handleRecurringTask(task, queue)
    }
  }

  



  async executeNormalTask(task) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('任务执行超时')), task.timeout)
    })
    
    const taskPromise = Promise.resolve(task.handler(...task.args))
    
    return Promise.race([taskPromise, timeoutPromise])
  }

  



  async executeWorkerTask(task) {
    const worker = await this.getWorker()
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { worker.terminate() } catch {}
        this.workers.delete(worker.id)
        reject(new Error('Worker任务执行超时'))
      }, task.timeout)
      
      const onMessage = (payload) => {
        try {
          if (!payload || typeof payload !== 'object') return
          if (payload.type === 'result') {
            clearTimeout(timeout)
            worker.lastUsed = Date.now()
            worker.busy = false
            worker.off('message', onMessage)
            if (payload.success) resolve(payload.result)
            else reject(new Error(payload.error?.message || 'Worker任务执行失败'))
          } else if (payload.type === 'error') {
            clearTimeout(timeout)
            worker.lastUsed = Date.now()
            worker.busy = false
            worker.off('message', onMessage)
            reject(new Error(payload.error?.message || 'Worker内部错误'))
          } else if (payload.type === 'log') {
            const level = payload.level || 'info'
            logger?.[level]?.(`[Worker ${worker.id}]`, payload.message)
          }
          
        } catch (e) {
          clearTimeout(timeout)
          worker.busy = false
          worker.off('message', onMessage)
          reject(e)
        }
      }
      
      worker.on('message', onMessage)
      
      worker.once('error', (error) => {
        clearTimeout(timeout)
        try { worker.terminate() } catch {}
        this.workers.delete(worker.id)
        worker.off('message', onMessage)
        reject(error)
      })
      
      worker.postMessage({
        type: 'task',
        data: {
          handler: task.handler?.toString?.() || task.handler,
          args: task.args,
          config: task.config
        }
      })
    })
  }

  


  async getWorker() {
    
    for (const worker of this.workers.values()) {
      if (!worker.busy) {
        worker.busy = true
        return worker
      }
    }
    
    
    if (this.workers.size < this.config.maxWorkers) {
      return this.createWorker()
    }
    
    
    return new Promise((resolve) => {
      const checkWorker = () => {
        for (const worker of this.workers.values()) {
          if (!worker.busy) {
            worker.busy = true
            resolve(worker)
            return
          }
        }
        setTimeout(checkWorker, 100)
      }
      checkWorker()
    })
  }

  


  createWorker() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const workerPath = path.join(__dirname, 'task-worker.js')
    
    const worker = new Worker(workerPath)
    worker.id = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    worker.busy = false
    worker.lastUsed = Date.now()
    
    this.workers.set(worker.id, worker)
    
    logger?.debug(`Worker已创建: ${worker.id}`)
    
    return worker
  }

  




  async retryTask(task, queue) {
    task.incrementRetry()
    task.setStatus(TaskStatus.RETRYING)
    
    logger?.info(`重试任务: ${task.id} (${task.retries}/${task.maxRetries})`)
    
    this.emit('task-retrying', task)
    eventBus.emit('scheduler:task-retrying', task)
    
    
    setTimeout(() => {
      task.setStatus(TaskStatus.PENDING)
      queue.add(task)
    }, task.retryDelay)
  }

  




  handleRecurringTask(task, queue) {
    if (task.type === TaskType.INTERVAL && task.status === TaskStatus.COMPLETED) {
      
      const newTask = new TaskInfo({
        ...task.toJSON(),
        id: task.generateId(),
        status: TaskStatus.PENDING,
        retries: 0,
        error: null,
        result: null,
        duration: 0
      })
      
      setTimeout(() => {
        queue.add(newTask)
      }, task.interval)
    }
  }

  



  addToHistory(task) {
    this.taskHistory.push({
      ...task.toJSON(),
      completedAt: Date.now()
    })
    
    
    if (this.taskHistory.length > this.config.maxTaskHistory) {
      this.taskHistory.shift()
    }
  }

  



  addCronTask(taskData) {
    const task = new TaskInfo({ ...taskData, type: TaskType.CRON })
    
    
    task.nextRunAt = this.parseCron(task.cron)
    
    this.cronJobs.set(task.id, task)
    
    logger?.info(`Cron任务已添加: ${task.id} (${task.cron})`)
    
    this.emit('cron-added', task)
    eventBus.emit('scheduler:cron-added', task)
    
    return task
  }

  



  addIntervalTask(taskData) {
    const task = new TaskInfo({ ...taskData, type: TaskType.INTERVAL })
    
    const intervalId = setInterval(() => {
      if (task.enabled) {
        this.addTask(task)
      }
    }, task.interval)
    
    this.intervals.set(task.id, { task, intervalId })
    
    logger?.info(`间隔任务已添加: ${task.id} (${task.interval}ms)`)
    
    this.emit('interval-added', task)
    eventBus.emit('scheduler:interval-added', task)
    
    return task
  }

  



  addDelayedTask(taskData) {
    const task = new TaskInfo({ ...taskData, type: TaskType.DELAYED })
    
    const timeoutId = setTimeout(() => {
      if (task.enabled) {
        this.addTask(task)
      }
      this.timeouts.delete(task.id)
    }, task.delay)
    
    this.timeouts.set(task.id, { task, timeoutId })
    
    logger?.info(`延时任务已添加: ${task.id} (${task.delay}ms)`)
    
    this.emit('delayed-added', task)
    eventBus.emit('scheduler:delayed-added', task)
    
    return task
  }

  



  parseCron(cron) {
    
    
    const parts = cron.split(' ')
    if (parts.length !== 5) {
      throw new Error('无效的Cron表达式')
    }
    
    
    return Date.now() + 60000 
  }

  



  cancelTask(taskId) {
    
    for (const queue of this.queues.values()) {
      const task = queue.remove(taskId)
      if (task) {
        task.setStatus(TaskStatus.CANCELLED)
        this.addToHistory(task)
        
        queue.stats.cancelled++
        this.stats.cancelledTasks++
        
        logger?.info(`任务已取消: ${taskId}`)
        
        this.emit('task-cancelled', task)
        eventBus.emit('scheduler:task-cancelled', task)
        
        return task
      }
    }
    
    
    if (this.cronJobs.has(taskId)) {
      const task = this.cronJobs.get(taskId)
      task.setStatus(TaskStatus.CANCELLED)
      this.cronJobs.delete(taskId)
      return task
    }
    
    
    if (this.intervals.has(taskId)) {
      const { task, intervalId } = this.intervals.get(taskId)
      clearInterval(intervalId)
      task.setStatus(TaskStatus.CANCELLED)
      this.intervals.delete(taskId)
      return task
    }
    
    
    if (this.timeouts.has(taskId)) {
      const { task, timeoutId } = this.timeouts.get(taskId)
      clearTimeout(timeoutId)
      task.setStatus(TaskStatus.CANCELLED)
      this.timeouts.delete(taskId)
      return task
    }
    
    throw new Error(`任务 ${taskId} 不存在`)
  }

  



  getTask(taskId) {
    
    for (const queue of this.queues.values()) {
      const task = queue.find(taskId)
      if (task) return task
    }
    
    
    if (this.cronJobs.has(taskId)) {
      return this.cronJobs.get(taskId)
    }
    
    
    if (this.intervals.has(taskId)) {
      return this.intervals.get(taskId).task
    }
    
    
    if (this.timeouts.has(taskId)) {
      return this.timeouts.get(taskId).task
    }
    
    
    return this.taskHistory.find(task => task.id === taskId)
  }

  


  getAllTasks() {
    const tasks = []
    
    
    for (const queue of this.queues.values()) {
      tasks.push(...queue.tasks)
      tasks.push(...Array.from(queue.running.values()))
    }
    
    
    tasks.push(...Array.from(this.cronJobs.values()))
    
    
    for (const { task } of this.intervals.values()) {
      tasks.push(task)
    }
    
    
    for (const { task } of this.timeouts.values()) {
      tasks.push(task)
    }
    
    return tasks
  }

  


  getStats() {
    const queueStats = {}
    for (const [name, queue] of this.queues) {
      queueStats[name] = queue.getStats()
    }
    
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      queues: queueStats,
      cronJobs: this.cronJobs.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      workers: this.workers.size,
      taskHistory: this.taskHistory.length
    }
  }

  


  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      scheduler: {
        running: !!this.schedulerTimer,
        queues: this.queues.size,
        workers: this.workers.size
      },
      queues: {}
    }
    
    let hasUnhealthy = false
    
    for (const [name, queue] of this.queues) {
      const queueHealth = {
        status: 'healthy',
        size: queue.size(),
        running: queue.runningCount(),
        paused: queue.paused
      }
      
      
      if (queue.paused) {
        queueHealth.status = 'paused'
      } else if (queue.size() > queue.options.maxSize * 0.8) {
        queueHealth.status = 'degraded'
        queueHealth.message = '队列接近满载'
      }
      
      if (queueHealth.status !== 'healthy') {
        hasUnhealthy = true
      }
      
      health.queues[name] = queueHealth
    }
    
    if (hasUnhealthy) {
      health.status = 'degraded'
    }
    
    return health
  }

  


  async destroy() {
    if (!this.initialized) {
      return
    }
    
    logger?.info('销毁任务调度器...')
    
    try {
      
      this.stopScheduler()
      this.stopCleanup()
      
      
      for (const [id] of this.cronJobs) {
        this.cancelTask(id)
      }
      
      
      for (const [id] of this.intervals) {
        this.cancelTask(id)
      }
      
      
      for (const [id] of this.timeouts) {
        this.cancelTask(id)
      }
      
      
      for (const worker of this.workers.values()) {
        try {
          await worker.terminate()
        } catch (error) {
          logger?.error('终止Worker失败', error)
        }
      }
      
      
      this.queues.clear()
      this.cronJobs.clear()
      this.intervals.clear()
      this.timeouts.clear()
      this.workers.clear()
      this.taskHistory.length = 0
      this.removeAllListeners()
      
      this.initialized = false
      
      logger?.info('任务调度器销毁完成')
      
    } catch (error) {
      logger?.error('任务调度器销毁失败', error)
      throw error
    }
  }
}


const taskScheduler = new TaskScheduler()


export default taskScheduler
export { taskScheduler }


if (typeof global !== 'undefined') {
  global.taskScheduler = taskScheduler
}


export const addTask = (taskData, queueName) => taskScheduler.addTask(taskData, queueName)
export const addCronTask = (taskData) => taskScheduler.addCronTask(taskData)
export const addIntervalTask = (taskData) => taskScheduler.addIntervalTask(taskData)
export const addDelayedTask = (taskData) => taskScheduler.addDelayedTask(taskData)
export const cancelTask = (taskId) => taskScheduler.cancelTask(taskId)
export const getTask = (taskId) => taskScheduler.getTask(taskId)
export const getAllTasks = () => taskScheduler.getAllTasks()
export const createQueue = (name, options) => taskScheduler.createQueue(name, options)
export const getQueue = (name) => taskScheduler.getQueue(name)