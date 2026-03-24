import { EventEmitter } from 'events'
import lodash from 'lodash'





class EventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(0)
    
    
    this.handlers = new Map()
    
    
    this.middlewares = []
    
    
    this.stats = {
      emitted: 0,
      handled: 0,
      errors: 0,
      startTime: Date.now()
    }
    
    
    this.queue = []
    this.processing = false
    
    
    this.namespaces = new Map()
    
    
    this.filters = new Map()
    
    
    this.transformers = new Map()
  }

  





  register(event, handler, options = {}) {
    const {
      priority = 0,
      once = false,
      namespace = 'default',
      filter = null,
      transform = null
    } = options

    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }

    const handlerInfo = {
      handler,
      priority,
      once,
      namespace,
      filter,
      transform,
      id: this.generateId(),
      callCount: 0,
      lastCall: null,
      errors: 0
    }

    this.handlers.get(event).push(handlerInfo)
    this.sortHandlers(event)

    
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set())
    }
    this.namespaces.get(namespace).add(handlerInfo.id)

    logger?.debug(`事件处理器已注册: ${event} (${namespace})`)
    return handlerInfo.id
  }

  




  unregister(event, handler) {
    if (!this.handlers.has(event)) return false

    const handlers = this.handlers.get(event)
    const index = typeof handler === 'string' 
      ? handlers.findIndex(h => h.id === handler)
      : handlers.findIndex(h => h.handler === handler)

    if (index === -1) return false

    const removed = handlers.splice(index, 1)[0]
    
    
    for (const [ns, ids] of this.namespaces) {
      if (ids.has(removed.id)) {
        ids.delete(removed.id)
        break
      }
    }

    logger?.debug(`事件处理器已注销: ${event}`)
    return true
  }

  





  async emit(event, data, options = {}) {
    this.stats.emitted++
    
    const {
      async = true,
      timeout = 30000,
      stopOnError = false,
      namespace = null
    } = options

    const eventData = {
      event,
      data,
      timestamp: Date.now(),
      id: this.generateId(),
      namespace,
      handled: false,
      results: []
    }

    try {
      
      await this.runMiddlewares(eventData)

      if (async) {
        
        this.queue.push(eventData)
        this.processQueue()
        return eventData.id
      } else {
        
        return await this.processEvent(eventData, { timeout, stopOnError })
      }
    } catch (error) {
      this.stats.errors++
      logger?.error(`事件发射失败: ${event}`, error)
      throw error
    }
  }

  


  async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const eventData = this.queue.shift()
      try {
        await this.processEvent(eventData)
      } catch (error) {
        logger?.error(`队列事件处理失败: ${eventData.event}`, error)
      }
    }
    
    this.processing = false
  }

  




  async processEvent(eventData, options = {}) {
    const { timeout = 30000, stopOnError = false } = options
    const { event, data, namespace } = eventData

    if (!this.handlers.has(event)) {
      return eventData
    }

    const handlers = this.handlers.get(event)
    const results = []

    for (const handlerInfo of handlers) {
      
      if (namespace && handlerInfo.namespace !== namespace) {
        continue
      }

      try {
        
        if (handlerInfo.filter && !await this.applyFilter(handlerInfo.filter, data)) {
          continue
        }

        
        let transformedData = data
        if (handlerInfo.transform) {
          transformedData = await this.applyTransform(handlerInfo.transform, data)
        }

        
        const startTime = Date.now()
        let result

        if (timeout > 0) {
          result = await Promise.race([
            handlerInfo.handler(transformedData, eventData),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Handler timeout')), timeout)
            )
          ])
        } else {
          result = await handlerInfo.handler(transformedData, eventData)
        }

        
        handlerInfo.callCount++
        handlerInfo.lastCall = Date.now()
        
        results.push({
          handlerId: handlerInfo.id,
          result,
          duration: Date.now() - startTime
        })

        
        if (handlerInfo.once) {
          this.unregister(event, handlerInfo.id)
        }

        this.stats.handled++

      } catch (error) {
        handlerInfo.errors++
        this.stats.errors++
        
        logger?.error(`事件处理器执行失败: ${event} (${handlerInfo.id})`, error)
        
        if (stopOnError) {
          throw error
        }
      }
    }

    eventData.handled = true
    eventData.results = results
    
    
    super.emit('event:processed', eventData)
    
    return eventData
  }

  



  use(middleware) {
    this.middlewares.push(middleware)
    logger?.debug('事件中间件已添加')
  }

  



  async runMiddlewares(eventData) {
    for (const middleware of this.middlewares) {
      try {
        await middleware(eventData)
      } catch (error) {
        logger?.error('中间件执行失败', error)
        throw error
      }
    }
  }

  




  async applyFilter(filter, data) {
    if (typeof filter === 'function') {
      return await filter(data)
    }
    
    if (typeof filter === 'string' && this.filters.has(filter)) {
      return await this.filters.get(filter)(data)
    }
    
    return true
  }

  




  async applyTransform(transform, data) {
    if (typeof transform === 'function') {
      return await transform(data)
    }
    
    if (typeof transform === 'string' && this.transformers.has(transform)) {
      return await this.transformers.get(transform)(data)
    }
    
    return data
  }

  




  addFilter(name, filter) {
    this.filters.set(name, filter)
    logger?.debug(`过滤器已注册: ${name}`)
  }

  




  addTransform(name, transform) {
    this.transformers.set(name, transform)
    logger?.debug(`转换器已注册: ${name}`)
  }

  



  sortHandlers(event) {
    if (!this.handlers.has(event)) return
    
    const handlers = this.handlers.get(event)
    handlers.sort((a, b) => b.priority - a.priority)
  }

  


  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      handlers: this.getTotalHandlers(),
      namespaces: this.namespaces.size,
      queueSize: this.queue.length,
      processing: this.processing
    }
  }

  


  getTotalHandlers() {
    let total = 0
    for (const handlers of this.handlers.values()) {
      total += handlers.length
    }
    return total
  }

  


  getEvents() {
    return Array.from(this.handlers.keys())
  }

  


  getNamespaces() {
    return Array.from(this.namespaces.keys())
  }

  



  clearNamespace(namespace) {
    if (!this.namespaces.has(namespace)) return
    
    const handlerIds = this.namespaces.get(namespace)
    
    for (const [event, handlers] of this.handlers) {
      for (let i = handlers.length - 1; i >= 0; i--) {
        if (handlerIds.has(handlers[i].id)) {
          handlers.splice(i, 1)
        }
      }
    }
    
    this.namespaces.delete(namespace)
    logger?.debug(`命名空间已清理: ${namespace}`)
  }

  




  waitFor(event, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = timeout > 0 ? setTimeout(() => {
        this.off(event, handler)
        reject(new Error('Wait timeout'))
      }, timeout) : null
      
      const handler = (data) => {
        if (timer) clearTimeout(timer)
        resolve(data)
      }
      
      this.once(event, handler)
    })
  }

  


  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  


  resetStats() {
    this.stats = {
      emitted: 0,
      handled: 0,
      errors: 0,
      startTime: Date.now()
    }
  }

  


  destroy() {
    this.handlers.clear()
    this.middlewares = []
    this.namespaces.clear()
    this.filters.clear()
    this.transformers.clear()
    this.queue = []
    this.removeAllListeners()
    
    logger?.info('事件总线已销毁')
  }
}


const eventBus = new EventBus()


export default eventBus
export { EventBus }


if (typeof global !== 'undefined') {
  global.eventBus = eventBus
}