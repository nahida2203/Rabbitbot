import EventEmitter from 'events'




export const EventType = {
  
  SYSTEM_START: 'system:start',
  SYSTEM_STOP: 'system:stop',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_READY: 'system:ready',
  
  
  MESSAGE_RECEIVE: 'message:receive',
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECALL: 'message:recall',
  MESSAGE_ERROR: 'message:error',
  
  
  USER_JOIN: 'user:join',
  USER_LEAVE: 'user:leave',
  USER_MUTE: 'user:mute',
  USER_UNMUTE: 'user:unmute',
  
  
  GROUP_JOIN: 'group:join',
  GROUP_LEAVE: 'group:leave',
  GROUP_INVITE: 'group:invite',
  GROUP_ADMIN: 'group:admin',
  
  
  PLUGIN_LOAD: 'plugin:load',
  PLUGIN_UNLOAD: 'plugin:unload',
  PLUGIN_ERROR: 'plugin:error',
  PLUGIN_RELOAD: 'plugin:reload',
  
  
  CONFIG_CHANGE: 'config:change',
  CONFIG_RELOAD: 'config:reload',
  CONFIG_ERROR: 'config:error',
  
  
  DB_CONNECT: 'db:connect',
  DB_DISCONNECT: 'db:disconnect',
  DB_ERROR: 'db:error',
  DB_QUERY: 'db:query',
  
  
  CACHE_HIT: 'cache:hit',
  CACHE_MISS: 'cache:miss',
  CACHE_SET: 'cache:set',
  CACHE_DELETE: 'cache:delete',
  
  
  API_REQUEST: 'api:request',
  API_RESPONSE: 'api:response',
  API_ERROR: 'api:error',
  
  
  TASK_START: 'task:start',
  TASK_COMPLETE: 'task:complete',
  TASK_ERROR: 'task:error',
  TASK_TIMEOUT: 'task:timeout'
}




export const EventPriority = {
  HIGHEST: 1000,
  HIGH: 750,
  NORMAL: 500,
  LOW: 250,
  LOWEST: 0
}




export class EventListener {
  constructor(event, handler, options = {}) {
    this.id = this.generateId()
    this.event = event
    this.handler = handler
    this.priority = options.priority || EventPriority.NORMAL
    this.once = options.once || false
    this.namespace = options.namespace || 'default'
    this.filter = options.filter || null
    this.timeout = options.timeout || 0
    this.maxCalls = options.maxCalls || 0
    this.callCount = 0
    this.createdAt = new Date()
    this.lastCalledAt = null
    this.enabled = true
  }

  


  generateId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  


  canExecute(data) {
    if (!this.enabled) return false
    if (this.maxCalls > 0 && this.callCount >= this.maxCalls) return false
    if (this.filter && !this.filter(data)) return false
    return true
  }

  


  async execute(data) {
    if (!this.canExecute(data)) return false

    try {
      this.callCount++
      this.lastCalledAt = new Date()

      if (this.timeout > 0) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Event handler timeout')), this.timeout)
        })
        await Promise.race([this.handler(data), timeoutPromise])
      } else {
        await this.handler(data)
      }

      return true
    } catch (error) {
      console.error(`Event handler error for ${this.event}:`, error)
      return false
    }
  }

  


  enable() {
    this.enabled = true
  }

  


  disable() {
    this.enabled = false
  }

  


  getInfo() {
    return {
      id: this.id,
      event: this.event,
      priority: this.priority,
      once: this.once,
      namespace: this.namespace,
      callCount: this.callCount,
      createdAt: this.createdAt,
      lastCalledAt: this.lastCalledAt,
      enabled: this.enabled
    }
  }
}




export class EventManager extends EventEmitter {
  constructor() {
    super()
    this.listeners = new Map() 
    this.namespaces = new Map() 
    this.stats = {
      totalEvents: 0,
      totalListeners: 0,
      eventCounts: new Map(),
      errorCounts: new Map()
    }
    this.maxListeners = 100
    this.initialized = false
  }

  


  async init(config = {}) {
    return await this.initialize()
  }

  


  async initialize() {
    if (this.initialized) return

    try {
      
      this.initialized = true
      
      
      this.setMaxListeners(this.maxListeners)

      
      this.on('error', (error) => {
        console.error('EventManager error:', error)
        this.updateErrorStats('system', error)
      })

    } catch (error) {
      this.initialized = false
      console.error('Failed to initialize EventManager:', error)
      throw error
    }
  }

  


  addEventListener(event, handler, options = {}) {
    if (!this.initialized) {
      throw new Error('EventManager not initialized')
    }

    const listener = new EventListener(event, handler, options)

    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(listener)

    
    if (!this.namespaces.has(listener.namespace)) {
      this.namespaces.set(listener.namespace, new Set())
    }
    this.namespaces.get(listener.namespace).add(listener)

    
    this.stats.totalListeners++

    return listener.id
  }

  


  removeEventListener(listenerId) {
    for (const [event, listeners] of this.listeners) {
      for (const listener of listeners) {
        if (listener.id === listenerId) {
          listeners.delete(listener)
          if (listeners.size === 0) {
            this.listeners.delete(event)
          }

          
          const nsListeners = this.namespaces.get(listener.namespace)
          if (nsListeners) {
            nsListeners.delete(listener)
            if (nsListeners.size === 0) {
              this.namespaces.delete(listener.namespace)
            }
          }

          this.stats.totalListeners--
          return true
        }
      }
    }
    return false
  }

  


  removeNamespace(namespace) {
    const listeners = this.namespaces.get(namespace)
    if (!listeners) return 0

    let count = 0
    for (const listener of listeners) {
      this.removeEventListener(listener.id)
      count++
    }

    return count
  }

  


  async emitEvent(event, data = {}) {
    if (!this.initialized) {
      throw new Error('EventManager not initialized')
    }

    try {
      
      this.stats.totalEvents++
      this.updateEventStats(event)

      const listeners = this.listeners.get(event)
      if (!listeners || listeners.size === 0) {
        return { success: true, executed: 0, errors: 0 }
      }

      
      const sortedListeners = Array.from(listeners).sort((a, b) => b.priority - a.priority)

      let executed = 0
      let errors = 0
      const toRemove = []

      
      for (const listener of sortedListeners) {
        try {
          const success = await listener.execute(data)
          if (success) {
            executed++
            
            
            if (listener.once) {
              toRemove.push(listener.id)
            }
          }
        } catch (error) {
          errors++
          this.updateErrorStats(event, error)
          console.error(`Error executing listener for event ${event}:`, error)
        }
      }

      
      for (const listenerId of toRemove) {
        this.removeEventListener(listenerId)
      }

      return { success: true, executed, errors }
    } catch (error) {
      this.updateErrorStats(event, error)
      throw error
    }
  }

  


  once(event, handler, options = {}) {
    return this.addEventListener(event, handler, { ...options, once: true })
  }

  


  on(event, handler, options = {}) {
    return this.addEventListener(event, handler, options)
  }

  


  off(listenerId) {
    return this.removeEventListener(listenerId)
  }

  


  emit(event, data) {
    return this.emitEvent(event, data)
  }

  


  getEventListeners(event) {
    const listeners = this.listeners.get(event)
    if (!listeners) return []
    return Array.from(listeners).map(listener => listener.getInfo())
  }

  


  getNamespaceListeners(namespace) {
    const listeners = this.namespaces.get(namespace)
    if (!listeners) return []
    return Array.from(listeners).map(listener => listener.getInfo())
  }

  


  getAllEvents() {
    return Array.from(this.listeners.keys())
  }

  


  getAllNamespaces() {
    return Array.from(this.namespaces.keys())
  }

  


  toggleListener(listenerId, enabled) {
    for (const listeners of this.listeners.values()) {
      for (const listener of listeners) {
        if (listener.id === listenerId) {
          if (enabled) {
            listener.enable()
          } else {
            listener.disable()
          }
          return true
        }
      }
    }
    return false
  }

  


  clear() {
    this.listeners.clear()
    this.namespaces.clear()
    this.stats.totalListeners = 0
  }

  


  updateEventStats(event) {
    const count = this.stats.eventCounts.get(event) || 0
    this.stats.eventCounts.set(event, count + 1)
  }

  


  updateErrorStats(event, error) {
    const count = this.stats.errorCounts.get(event) || 0
    this.stats.errorCounts.set(event, count + 1)
  }

  


  getStats() {
    return {
      totalEvents: this.stats.totalEvents,
      totalListeners: this.stats.totalListeners,
      eventCounts: Object.fromEntries(this.stats.eventCounts),
      errorCounts: Object.fromEntries(this.stats.errorCounts),
      eventsCount: this.listeners.size,
      namespacesCount: this.namespaces.size
    }
  }

  


  getHealth() {
    const stats = this.getStats()
    const errorRate = stats.totalEvents > 0 ? 
      Object.values(stats.errorCounts).reduce((a, b) => a + b, 0) / stats.totalEvents : 0

    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      totalEvents: stats.totalEvents,
      totalListeners: stats.totalListeners,
      errorRate: Math.round(errorRate * 10000) / 100, 
      memoryUsage: process.memoryUsage().heapUsed
    }
  }

  


  async destroy() {
    try {
      this.clear()
      this.removeAllListeners()
      this.initialized = false
    } catch (error) {
    
      throw error
    }
  }
}


const eventManager = new EventManager()


export default eventManager
export const { addEventListener, removeEventListener, emitEvent, once, on, off, emit } = eventManager