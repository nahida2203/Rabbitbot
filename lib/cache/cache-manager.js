import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import eventBus from '../common/event-bus.js'




export const CacheType = {
  MEMORY: 'memory',
  FILE: 'file',
  REDIS: 'redis',
  HYBRID: 'hybrid'
}




export const CacheStrategy = {
  LRU: 'lru',        
  LFU: 'lfu',        
  FIFO: 'fifo',      
  TTL: 'ttl',        
  CUSTOM: 'custom'   
}




export class CacheItem {
  constructor(key, value, options = {}) {
    this.key = key
    this.value = value
    this.createdAt = Date.now()
    this.lastAccessed = Date.now()
    this.accessCount = 0
    this.ttl = options.ttl || 0 
    this.tags = options.tags || []
    this.metadata = options.metadata || {}
    this.size = this.calculateSize(value)
  }

  


  calculateSize(value) {
    if (typeof value === 'string') {
      return Buffer.byteLength(value, 'utf8')
    } else if (Buffer.isBuffer(value)) {
      return value.length
    } else {
      return Buffer.byteLength(JSON.stringify(value), 'utf8')
    }
  }

  


  isExpired() {
    if (this.ttl === 0) return false
    return Date.now() - this.createdAt > this.ttl
  }

  


  access() {
    this.lastAccessed = Date.now()
    this.accessCount++
  }

  


  getRemainingTTL() {
    if (this.ttl === 0) return -1
    const remaining = this.ttl - (Date.now() - this.createdAt)
    return Math.max(0, remaining)
  }

  


  serialize() {
    return {
      key: this.key,
      value: this.value,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      accessCount: this.accessCount,
      ttl: this.ttl,
      tags: this.tags,
      metadata: this.metadata,
      size: this.size
    }
  }

  


  static deserialize(data) {
    const item = new CacheItem(data.key, data.value, {
      ttl: data.ttl,
      tags: data.tags,
      metadata: data.metadata
    })
    
    item.createdAt = data.createdAt
    item.lastAccessed = data.lastAccessed
    item.accessCount = data.accessCount
    item.size = data.size
    
    return item
  }
}




export class MemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100 * 1024 * 1024 
    this.maxItems = options.maxItems || 10000
    this.strategy = options.strategy || CacheStrategy.LRU
    this.defaultTTL = options.defaultTTL || 0
    
    this.cache = new Map()
    this.currentSize = 0
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    }
  }

  


  get(key) {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }
    
    if (item.isExpired()) {
      this.delete(key)
      this.stats.misses++
      return null
    }
    
    item.access()
    this.stats.hits++
    return item.value
  }

  


  set(key, value, options = {}) {
    const ttl = options.ttl || this.defaultTTL
    const item = new CacheItem(key, value, { ...options, ttl })
    
    
    this.ensureSpace(item.size)
    
    
    if (this.cache.has(key)) {
      this.delete(key)
    }
    
    this.cache.set(key, item)
    this.currentSize += item.size
    this.stats.sets++
    
    return true
  }

  


  delete(key) {
    const item = this.cache.get(key)
    if (item) {
      this.cache.delete(key)
      this.currentSize -= item.size
      this.stats.deletes++
      return true
    }
    return false
  }

  


  has(key) {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (item.isExpired()) {
      this.delete(key)
      return false
    }
    
    return true
  }

  


  clear() {
    this.cache.clear()
    this.currentSize = 0
  }

  


  ensureSpace(requiredSize) {
    
    while (this.cache.size >= this.maxItems) {
      this.evictOne()
    }
    
    
    while (this.currentSize + requiredSize > this.maxSize && this.cache.size > 0) {
      this.evictOne()
    }
  }

  


  evictOne() {
    let keyToEvict = null
    
    switch (this.strategy) {
      case CacheStrategy.LRU:
        keyToEvict = this.findLRUKey()
        break
      case CacheStrategy.LFU:
        keyToEvict = this.findLFUKey()
        break
      case CacheStrategy.FIFO:
        keyToEvict = this.findFIFOKey()
        break
      default:
        keyToEvict = this.cache.keys().next().value
    }
    
    if (keyToEvict) {
      this.delete(keyToEvict)
      this.stats.evictions++
    }
  }

  


  findLRUKey() {
    let oldestKey = null
    let oldestTime = Date.now()
    
    for (const [key, item] of this.cache) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed
        oldestKey = key
      }
    }
    
    return oldestKey
  }

  


  findLFUKey() {
    let leastUsedKey = null
    let leastCount = Infinity
    
    for (const [key, item] of this.cache) {
      if (item.accessCount < leastCount) {
        leastCount = item.accessCount
        leastUsedKey = key
      }
    }
    
    return leastUsedKey
  }

  


  findFIFOKey() {
    let oldestKey = null
    let oldestTime = Date.now()
    
    for (const [key, item] of this.cache) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt
        oldestKey = key
      }
    }
    
    return oldestKey
  }

  


  cleanupExpired() {
    const expiredKeys = []
    
    for (const [key, item] of this.cache) {
      if (item.isExpired()) {
        expiredKeys.push(key)
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key)
    }
    
    return expiredKeys.length
  }

  


  deleteByTag(tag) {
    const keysToDelete = []
    
    for (const [key, item] of this.cache) {
      if (item.tags.includes(tag)) {
        keysToDelete.push(key)
      }
    }
    
    for (const key of keysToDelete) {
      this.delete(key)
    }
    
    return keysToDelete.length
  }

  


  keys() {
    return Array.from(this.cache.keys())
  }

  


  size() {
    return this.cache.size
  }

  


  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      maxItems: this.maxItems,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }
}




export class FileCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache')
    this.maxSize = options.maxSize || 1024 * 1024 * 1024 
    this.defaultTTL = options.defaultTTL || 0
    this.compression = options.compression || false
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }
    
    this.ensureCacheDir()
  }

  


  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  


  getFilePath(key) {
    const hash = crypto.createHash('md5').update(key).digest('hex')
    return path.join(this.cacheDir, `${hash}.cache`)
  }

  


  async get(key) {
    try {
      const filePath = this.getFilePath(key)
      
      if (!fs.existsSync(filePath)) {
        this.stats.misses++
        return null
      }
      
      const data = fs.readFileSync(filePath, 'utf8')
      const item = CacheItem.deserialize(JSON.parse(data))
      
      if (item.isExpired()) {
        await this.delete(key)
        this.stats.misses++
        return null
      }
      
      item.access()
      this.stats.hits++
      
      
      await this.updateAccessInfo(filePath, item)
      
      return item.value
    } catch (error) {
      this.stats.misses++
      return null
    }
  }

  


  async set(key, value, options = {}) {
    try {
      const ttl = options.ttl || this.defaultTTL
      const item = new CacheItem(key, value, { ...options, ttl })
      
      const filePath = this.getFilePath(key)
      const data = JSON.stringify(item.serialize())
      
      fs.writeFileSync(filePath, data, 'utf8')
      this.stats.sets++
      
      return true
    } catch (error) {
      return false
    }
  }

  


  async delete(key) {
    try {
      const filePath = this.getFilePath(key)
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        this.stats.deletes++
        return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  


  async has(key) {
    const filePath = this.getFilePath(key)
    
    if (!fs.existsSync(filePath)) {
      return false
    }
    
    try {
      const data = fs.readFileSync(filePath, 'utf8')
      const item = CacheItem.deserialize(JSON.parse(data))
      
      if (item.isExpired()) {
        await this.delete(key)
        return false
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  


  async clear() {
    try {
      const files = fs.readdirSync(this.cacheDir)
      
      for (const file of files) {
        if (file.endsWith('.cache')) {
          fs.unlinkSync(path.join(this.cacheDir, file))
        }
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  


  async updateAccessInfo(filePath, item) {
    try {
      const data = JSON.stringify(item.serialize())
      fs.writeFileSync(filePath, data, 'utf8')
    } catch (error) {
      
    }
  }

  


  async cleanupExpired() {
    try {
      const files = fs.readdirSync(this.cacheDir)
      let cleanedCount = 0
      
      for (const file of files) {
        if (file.endsWith('.cache')) {
          const filePath = path.join(this.cacheDir, file)
          
          try {
            const data = fs.readFileSync(filePath, 'utf8')
            const item = CacheItem.deserialize(JSON.parse(data))
            
            if (item.isExpired()) {
              fs.unlinkSync(filePath)
              cleanedCount++
            }
          } catch (error) {
            
            fs.unlinkSync(filePath)
            cleanedCount++
          }
        }
      }
      
      return cleanedCount
    } catch (error) {
      return 0
    }
  }

  


  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }
}




export class CacheManager {
  constructor() {
    
    this.caches = new Map()
    
    
    this.defaultConfig = {
      type: CacheType.MEMORY,
      maxSize: 100 * 1024 * 1024, 
      maxItems: 10000,
      strategy: CacheStrategy.LRU,
      defaultTTL: 0,
      cacheDir: path.join(process.cwd(), 'cache')
    }
    
    
    this.stats = {
      cacheCount: 0,
      totalHits: 0,
      totalMisses: 0,
      totalSets: 0,
      totalDeletes: 0
    }
    
    
    this.cleanupInterval = null
    this.cleanupIntervalMs = 5 * 60 * 1000 
    
    
    this.isInitialized = false
    this.isDestroyed = false
    
    this.init()
  }

  


  async init() {
    try {
      
      this.createCache('default')
      
      
      this.startCleanupTimer()
      
      this.isInitialized = true
      
      eventBus.emit('cache:initialized', {
        cacheCount: this.caches.size,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('[CacheManager] 初始化失败:', error)
      throw error
    }
  }

  


  createCache(name, config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config }
    let cache
    
    switch (finalConfig.type) {
      case CacheType.MEMORY:
        cache = new MemoryCache(finalConfig)
        break
      case CacheType.FILE:
        cache = new FileCache(finalConfig)
        break
      default:
        cache = new MemoryCache(finalConfig)
    }
    
    this.caches.set(name, cache)
    this.stats.cacheCount++
    
    eventBus.emit('cache:created', {
      name,
      type: finalConfig.type,
      timestamp: Date.now()
    })
    
    return cache
  }

  


  getCache(name = 'default') {
    return this.caches.get(name)
  }

  


  async removeCache(name) {
    const cache = this.caches.get(name)
    if (cache) {
      if (cache.clear) {
        await cache.clear()
      }
      
      this.caches.delete(name)
      this.stats.cacheCount--
      
      eventBus.emit('cache:removed', {
        name,
        timestamp: Date.now()
      })
      
      return true
    }
    return false
  }

  


  async get(key, cacheName = 'default') {
    const cache = this.getCache(cacheName)
    if (!cache) return null
    
    const result = await cache.get(key)
    this.updateStats(cache)
    
    return result
  }

  


  async set(key, value, options = {}, cacheName = 'default') {
    const cache = this.getCache(cacheName)
    if (!cache) return false
    
    const result = await cache.set(key, value, options)
    this.updateStats(cache)
    
    eventBus.emit('cache:set', {
      cacheName,
      key,
      timestamp: Date.now()
    })
    
    return result
  }

  


  async delete(key, cacheName = 'default') {
    const cache = this.getCache(cacheName)
    if (!cache) return false
    
    const result = await cache.delete(key)
    this.updateStats(cache)
    
    eventBus.emit('cache:delete', {
      cacheName,
      key,
      timestamp: Date.now()
    })
    
    return result
  }

  


  async has(key, cacheName = 'default') {
    const cache = this.getCache(cacheName)
    if (!cache) return false
    
    return await cache.has(key)
  }

  


  async clear(cacheName = 'default') {
    const cache = this.getCache(cacheName)
    if (!cache) return false
    
    await cache.clear()
    
    eventBus.emit('cache:cleared', {
      cacheName,
      timestamp: Date.now()
    })
    
    return true
  }

  


  async clearAll() {
    for (const [name, cache] of this.caches) {
      if (cache.clear) {
        await cache.clear()
      }
    }
    
    eventBus.emit('cache:cleared_all', {
      count: this.caches.size,
      timestamp: Date.now()
    })
  }

  


  startCleanupTimer() {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpired()
    }, this.cleanupIntervalMs)
  }

  


  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  


  async cleanupExpired() {
    let totalCleaned = 0
    
    for (const [name, cache] of this.caches) {
      if (cache.cleanupExpired) {
        const cleaned = await cache.cleanupExpired()
        totalCleaned += cleaned
      }
    }
    
    if (totalCleaned > 0) {
      eventBus.emit('cache:cleanup', {
        cleanedCount: totalCleaned,
        timestamp: Date.now()
      })
    }
    
    return totalCleaned
  }

  


  updateStats(cache) {
    if (cache.getStats) {
      const stats = cache.getStats()
      this.stats.totalHits = 0
      this.stats.totalMisses = 0
      this.stats.totalSets = 0
      this.stats.totalDeletes = 0
      
      for (const c of this.caches.values()) {
        if (c.getStats) {
          const s = c.getStats()
          this.stats.totalHits += s.hits || 0
          this.stats.totalMisses += s.misses || 0
          this.stats.totalSets += s.sets || 0
          this.stats.totalDeletes += s.deletes || 0
        }
      }
    }
  }

  


  getCacheNames() {
    return Array.from(this.caches.keys())
  }

  


  getStats() {
    const cacheStats = {}
    
    for (const [name, cache] of this.caches) {
      if (cache.getStats) {
        cacheStats[name] = cache.getStats()
      }
    }
    
    return {
      ...this.stats,
      caches: cacheStats,
      hitRate: this.stats.totalHits / (this.stats.totalHits + this.stats.totalMisses) || 0,
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed
    }
  }

  


  getHealth() {
    const stats = this.getStats()
    
    return {
      status: this.isInitialized && !this.isDestroyed ? 'healthy' : 'unhealthy',
      cacheCount: this.caches.size,
      hitRate: stats.hitRate,
      totalItems: Object.values(stats.caches).reduce((sum, cache) => sum + (cache.size || 0), 0),
      lastCheck: Date.now()
    }
  }

  


  async destroy() {
    try {
      
      this.stopCleanupTimer()
      
      
      await this.clearAll()
      
      
      this.caches.clear()
      
      this.isDestroyed = true
      
      eventBus.emit('cache:destroyed', {
        timestamp: Date.now()
      })
      
    } catch (error) {
      throw error
    }
  }
}


const cacheManager = new CacheManager()


export default cacheManager
export const createCache = (name, config) => cacheManager.createCache(name, config)
export const getCache = (name) => cacheManager.getCache(name)
export const get = (key, cacheName) => cacheManager.get(key, cacheName)
export const set = (key, value, options, cacheName) => cacheManager.set(key, value, options, cacheName)
export const del = (key, cacheName) => cacheManager.delete(key, cacheName)
export const has = (key, cacheName) => cacheManager.has(key, cacheName)
export const clear = (cacheName) => cacheManager.clear(cacheName)