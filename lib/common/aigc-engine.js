import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { EventEmitter } from 'node:events'
import lodash from 'lodash'
import eventBus from './event-bus.js'




const ModelType = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  CODE: 'code',
  MULTIMODAL: 'multimodal'
}




const Provider = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  BAIDU: 'baidu',
  ALIBABA: 'alibaba',
  TENCENT: 'tencent',
  LOCAL: 'local',
  CUSTOM: 'custom'
}




const Role = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  FUNCTION: 'function'
}




class Message {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID()
    this.role = data.role || Role.USER
    this.content = data.content || ''
    this.timestamp = data.timestamp || Date.now()
    this.metadata = data.metadata || {}
    this.attachments = data.attachments || []
  }

  



  addAttachment(attachment) {
    this.attachments.push({
      id: crypto.randomUUID(),
      type: attachment.type,
      url: attachment.url,
      data: attachment.data,
      metadata: attachment.metadata || {},
      timestamp: Date.now()
    })
  }

  


  toAPI() {
    return {
      role: this.role,
      content: this.content,
      ...(this.attachments.length > 0 && { attachments: this.attachments })
    }
  }
}




class Conversation {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID()
    this.title = data.title || '新对话'
    this.messages = data.messages || []
    this.context = data.context || {}
    this.config = data.config || {}
    this.createdAt = data.createdAt || Date.now()
    this.updatedAt = data.updatedAt || Date.now()
    this.metadata = data.metadata || {}
  }

  



  addMessage(message) {
    if (!(message instanceof Message)) {
      message = new Message(message)
    }
    
    this.messages.push(message)
    this.updatedAt = Date.now()
    
    
    if (this.messages.length === 2 && this.title === '新对话') {
      this.generateTitle()
    }
  }

  



  getRecentMessages(count = 10) {
    return this.messages.slice(-count)
  }

  


  clearMessages() {
    this.messages = []
    this.updatedAt = Date.now()
  }

  


  generateTitle() {
    const firstUserMessage = this.messages.find(m => m.role === Role.USER)
    if (firstUserMessage) {
      this.title = firstUserMessage.content.substring(0, 30) + '...'
    }
  }

  


  toAPI() {
    return {
      messages: this.messages.map(m => m.toAPI()),
      ...this.config
    }
  }
}




class ModelConfig {
  constructor(data = {}) {
    this.id = data.id || ''
    this.name = data.name || ''
    this.provider = data.provider || Provider.OPENAI
    this.type = data.type || ModelType.TEXT
    this.endpoint = data.endpoint || ''
    this.apiKey = data.apiKey || ''
    this.maxTokens = data.maxTokens || 4096
    this.temperature = data.temperature || 0.7
    this.topP = data.topP || 1.0
    this.frequencyPenalty = data.frequencyPenalty || 0.0
    this.presencePenalty = data.presencePenalty || 0.0
    this.stopSequences = data.stopSequences || []
    this.systemPrompt = data.systemPrompt || ''
    this.enabled = data.enabled !== false
    this.rateLimit = data.rateLimit || { requests: 60, window: 60000 }
    this.timeout = data.timeout || 30000
    this.retries = data.retries || 3
    this.metadata = data.metadata || {}
  }

  


  validate() {
    const errors = []
    
    if (!this.id) errors.push('模型ID不能为空')
    if (!this.name) errors.push('模型名称不能为空')
    if (!this.provider) errors.push('提供商不能为空')
    if (!this.endpoint && this.provider !== Provider.LOCAL) errors.push('API端点不能为空')
    if (!this.apiKey && this.provider !== Provider.LOCAL) errors.push('API密钥不能为空')
    
    if (this.maxTokens <= 0) errors.push('最大令牌数必须大于0')
    if (this.temperature < 0 || this.temperature > 2) errors.push('温度值必须在0-2之间')
    if (this.topP < 0 || this.topP > 1) errors.push('TopP值必须在0-1之间')
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}





class AIGCEngine extends EventEmitter {
  constructor() {
    super()
    
    
    this.models = new Map()
    
    
    this.conversations = new Map()
    
    
    this.contexts = new Map()
    
    
    this.requestQueue = []
    
    
    this.rateLimits = new Map()
    
    
    this.cache = new Map()
    
    
    this.config = {
      defaultModel: '',
      maxConversations: 1000,
      maxContextLength: 8192,
      cacheEnabled: true,
      cacheTTL: 3600000, 
      streamEnabled: true,
      retryEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      concurrency: 5
    }
    
    
    this.stats = {
      requests: 0,
      responses: 0,
      errors: 0,
      tokens: 0,
      conversations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      startTime: Date.now()
    }
    
    
    this.activeRequests = new Map()
    
    
    this.plugins = new Map()
    
    
    this.tools = new Map()
  }

  



  async init(config = {}) {
    this.config = { ...this.config, ...config }
    
    
    await this.loadDefaultModels()
    
    
    this.startRequestProcessor()
    
    
    this.startCacheCleaner()
    
    
    eventBus.register('system:shutdown', () => this.destroy(), {
      namespace: 'aigc-engine',
      priority: 85
    })
    
    logger?.info('AIGC引擎初始化完成')
  }

  


  async loadDefaultModels() {
    try {
      
      const configPath = path.join(process.cwd(), 'config', 'config', 'AIGC_config.yaml')
      let aigcConfig = null
      
      try {
        const configContent = await fs.readFile(configPath, 'utf8')
        const yaml = await import('yaml')
        aigcConfig = yaml.parse(configContent)
      } catch (error) {
        return
      }
      
      if (!aigcConfig || !aigcConfig.models || !Array.isArray(aigcConfig.models)) {
        logger?.info('AIGC配置无效，跳过模型加载')
        return
      }
      
      
      for (const modelData of aigcConfig.models) {
        try {
          
          if (!modelData.apiKey && modelData.provider !== 'local') {
            logger?.warn(`模型 ${modelData.id} 缺少API密钥，跳过加载`)
            continue
          }
          
          const model = new ModelConfig(modelData)
          const validation = model.validate()
          
          if (validation.valid) {
            this.models.set(model.id, model)
            this.rateLimits.set(model.id, {
              requests: [],
              window: model.rateLimit.window
            })
            logger?.info(`模型已加载: ${model.id} (${model.name})`)
          } else {
            logger?.warn(`模型配置无效，跳过: ${modelData.id} - ${validation.errors.join(', ')}`)
          }
        } catch (error) {
          logger?.warn(`加载模型失败，跳过: ${modelData.id} - ${error.message}`)
        }
      }
      
      
      if (aigcConfig.defaultModel && this.models.has(aigcConfig.defaultModel)) {
        this.config.defaultModel = aigcConfig.defaultModel
      } else if (!this.config.defaultModel && this.models.size > 0) {
        this.config.defaultModel = Array.from(this.models.keys())[0]
      }
      
    } catch (error) {
      logger?.warn(`AIGC引擎初始化失败: ${error.message}`)
    }
  }

  



  addModel(model) {
    if (!(model instanceof ModelConfig)) {
      model = new ModelConfig(model)
    }
    
    const validation = model.validate()
    if (!validation.valid) {
      logger?.warn(`模型配置无效，跳过添加: ${model.id} - ${validation.errors.join(', ')}`)
      return false
    }
    
    this.models.set(model.id, model)
    this.rateLimits.set(model.id, {
      requests: [],
      window: model.rateLimit.window
    })
    
    logger?.info(`模型已添加: ${model.id} (${model.name})`)
    return true
  }

  



  removeModel(modelId) {
    if (this.models.delete(modelId)) {
      this.rateLimits.delete(modelId)
      logger?.info(`模型已移除: ${modelId}`)
    }
  }

  



  getModel(modelId) {
    return this.models.get(modelId)
  }

  


  getAllModels() {
    return Array.from(this.models.values())
  }

  



  createConversation(options = {}) {
    const conversation = new Conversation(options)
    
    
    if (this.conversations.size >= this.config.maxConversations) {
      
      const oldestId = Array.from(this.conversations.keys())[0]
      this.conversations.delete(oldestId)
    }
    
    this.conversations.set(conversation.id, conversation)
    this.stats.conversations++
    
    logger?.debug(`对话已创建: ${conversation.id}`)
    return conversation.id
  }

  



  getConversation(conversationId) {
    return this.conversations.get(conversationId)
  }

  



  deleteConversation(conversationId) {
    if (this.conversations.delete(conversationId)) {
      logger?.debug(`对话已删除: ${conversationId}`)
    }
  }

  




  async sendMessage(content, options = {}) {
    const {
      conversationId,
      modelId = this.config.defaultModel,
      stream = this.config.streamEnabled,
      context = {},
      attachments = [],
      tools = []
    } = options
    
    
    let conversation
    if (conversationId) {
      conversation = this.getConversation(conversationId)
      if (!conversation) {
        throw new Error(`对话不存在: ${conversationId}`)
      }
    } else {
      const newConversationId = this.createConversation()
      conversation = this.getConversation(newConversationId)
    }
    
    
    const userMessage = new Message({
      role: Role.USER,
      content,
      attachments
    })
    
    conversation.addMessage(userMessage)
    
    try {
      
      const response = await this.generateResponse(conversation, {
        modelId,
        stream,
        context,
        tools
      })
      
      
      const assistantMessage = new Message({
        role: Role.ASSISTANT,
        content: response.content,
        metadata: response.metadata
      })
      
      conversation.addMessage(assistantMessage)
      
      return {
        conversationId: conversation.id,
        message: assistantMessage,
        usage: response.usage
      }
      
    } catch (error) {
      logger?.error('消息发送失败', error)
      throw error
    }
  }

  




  async generateResponse(conversation, options = {}) {
    const {
      modelId = this.config.defaultModel,
      stream = false,
      context = {},
      tools = []
    } = options
    
    const model = this.getModel(modelId)
    if (!model) {
      throw new Error(`模型不存在: ${modelId}`)
    }
    
    if (!model.enabled) {
      throw new Error(`模型已禁用: ${modelId}`)
    }
    
    
    await this.checkRateLimit(modelId)
    
    
    const requestData = this.prepareRequest(conversation, model, context, tools)
    
    
    if (this.config.cacheEnabled && !stream) {
      const cacheKey = this.generateCacheKey(requestData)
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        this.stats.cacheHits++
        return cached.response
      }
      this.stats.cacheMisses++
    }
    
    
    const requestId = crypto.randomUUID()
    this.activeRequests.set(requestId, {
      id: requestId,
      modelId,
      startTime: Date.now(),
      conversation: conversation.id
    })
    
    try {
      let response
      
      if (stream) {
        response = await this.streamRequest(model, requestData, requestId)
      } else {
        response = await this.normalRequest(model, requestData)
      }
      
      
      this.stats.requests++
      this.stats.responses++
      if (response.usage?.totalTokens) {
        this.stats.tokens += response.usage.totalTokens
      }
      
      
      if (this.config.cacheEnabled && !stream) {
        const cacheKey = this.generateCacheKey(requestData)
        this.cache.set(cacheKey, {
          response,
          timestamp: Date.now()
        })
      }
      
      return response
      
    } catch (error) {
      this.stats.errors++
      throw error
    } finally {
      this.activeRequests.delete(requestId)
    }
  }

  






  prepareRequest(conversation, model, context, tools) {
    const messages = conversation.getRecentMessages()
    
    
    if (model.systemPrompt) {
      messages.unshift(new Message({
        role: Role.SYSTEM,
        content: model.systemPrompt
      }))
    }
    
    
    const processedMessages = this.truncateContext(messages, model.maxTokens)
    
    return {
      model: model.id,
      messages: processedMessages.map(m => m.toAPI()),
      max_tokens: model.maxTokens,
      temperature: model.temperature,
      top_p: model.topP,
      frequency_penalty: model.frequencyPenalty,
      presence_penalty: model.presencePenalty,
      stop: model.stopSequences,
      ...(tools.length > 0 && { tools }),
      ...context
    }
  }

  




  truncateContext(messages, maxTokens) {
    
    const estimateTokens = (text) => Math.ceil(text.length / 4)
    
    let totalTokens = 0
    const result = []
    
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const tokens = estimateTokens(message.content)
      
      if (totalTokens + tokens > maxTokens * 0.8) { 
        break
      }
      
      result.unshift(message)
      totalTokens += tokens
    }
    
    return result
  }

  




  async normalRequest(model, requestData) {
    const response = await this.makeAPIRequest(model, requestData)
    
    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      metadata: {
        model: model.id,
        finishReason: response.choices[0].finish_reason,
        timestamp: Date.now()
      }
    }
  }

  





  async streamRequest(model, requestData, requestId) {
    const streamData = { ...requestData, stream: true }
    
    return new Promise((resolve, reject) => {
      let content = ''
      let usage = null
      
      const stream = this.makeAPIStream(model, streamData)
      
      stream.on('data', (chunk) => {
        const delta = chunk.choices[0]?.delta
        if (delta?.content) {
          content += delta.content
          
          
          this.emit('stream', {
            requestId,
            content: delta.content,
            accumulated: content
          })
        }
        
        if (chunk.usage) {
          usage = chunk.usage
        }
      })
      
      stream.on('end', () => {
        resolve({
          content,
          usage,
          metadata: {
            model: model.id,
            timestamp: Date.now(),
            stream: true
          }
        })
      })
      
      stream.on('error', reject)
    })
  }

  




  async makeAPIRequest(model, data) {
    try {
      const fetch = (await import('node-fetch')).default
      
      
      const requestConfig = this.buildRequestConfig(model, data)
      
      const response = await fetch(requestConfig.url, {
        method: 'POST',
        headers: requestConfig.headers,
        body: JSON.stringify(requestConfig.body),
        timeout: model.timeout || 30000
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`)
      }
      
      const result = await response.json()
      
      
      return this.normalizeResponse(model.provider, result)
      
    } catch (error) {
      console.error('AIGC API请求错误:', error)
      
      
      throw new Error(`AI服务调用失败: ${error.message}`)
    }
  }

  




  async makeAPIStream(model, data) {
    try {
      const fetch = (await import('node-fetch')).default
      const { EventEmitter } = require('events')
      const stream = new EventEmitter()
      
      
      const requestConfig = this.buildRequestConfig(model, { ...data, stream: true })
      
      const response = await fetch(requestConfig.url, {
        method: 'POST',
        headers: requestConfig.headers,
        body: JSON.stringify(requestConfig.body),
        timeout: model.timeout || 60000
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        stream.emit('error', new Error(`流式API请求失败: ${response.status} ${response.statusText} - ${errorText}`))
        return stream
      }
      
      
      this.handleStreamResponse(response, stream, model.provider)
      
      return stream
      
    } catch (error) {
      console.error('AIGC 流式API请求错误:', error)
      const { EventEmitter } = require('events')
      const stream = new EventEmitter()
      
      
      setTimeout(() => {
        stream.emit('error', new Error(`AI流式服务调用失败: ${error.message}`))
      }, 0)
      
      return stream
    }
  }

  




  buildRequestConfig(model, data) {
    const config = {
      url: model.endpoint || this.getDefaultEndpoint(model.provider),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rabbit-Bot/0.0.1'
      },
      body: {}
    }

    
    switch (model.provider.toLowerCase()) {
      case 'openai':
        config.headers['Authorization'] = `Bearer ${model.apiKey}`
        config.body = {
          model: model.id,
          messages: data.messages || [{ role: 'user', content: data.message }],
          temperature: data.temperature || 0.7,
          max_tokens: data.maxTokens || 2048,
          stream: data.stream || false
        }
        break

      case 'anthropic':
        config.headers['x-api-key'] = model.apiKey
        config.headers['anthropic-version'] = '2023-06-01'
        config.body = {
          model: model.id,
          messages: data.messages || [{ role: 'user', content: data.message }],
          max_tokens: data.maxTokens || 2048,
          temperature: data.temperature || 0.7,
          stream: data.stream || false
        }
        break

      case 'baidu':
        
        config.body = {
          messages: data.messages || [{ role: 'user', content: data.message }],
          temperature: data.temperature || 0.7,
          max_output_tokens: data.maxTokens || 2048,
          stream: data.stream || false
        }
        
        break

      case 'alibaba':
        
        config.headers['Authorization'] = `Bearer ${model.apiKey}`
        config.body = {
          model: model.id,
          input: {
            messages: data.messages || [{ role: 'user', content: data.message }]
          },
          parameters: {
            temperature: data.temperature || 0.7,
            max_tokens: data.maxTokens || 2048
          }
        }
        break

      default:
        
        config.headers['Authorization'] = `Bearer ${model.apiKey}`
        config.body = {
          model: model.id,
          messages: data.messages || [{ role: 'user', content: data.message }],
          temperature: data.temperature || 0.7,
          max_tokens: data.maxTokens || 2048,
          stream: data.stream || false
        }
    }

    return config
  }

  



  getDefaultEndpoint(provider) {
    const endpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/messages',
      baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
      alibaba: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    }
    return endpoints[provider.toLowerCase()] || null
  }

  




  normalizeResponse(provider, response) {
    switch (provider.toLowerCase()) {
      case 'openai':
        return response 

      case 'anthropic':
        return {
          choices: [{
            message: {
              content: response.content?.[0]?.text || ''
            },
            finish_reason: response.stop_reason || 'stop'
          }],
          usage: {
            prompt_tokens: response.usage?.input_tokens || 0,
            completion_tokens: response.usage?.output_tokens || 0,
            total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
          }
        }

      case 'baidu':
        return {
          choices: [{
            message: {
              content: response.result || ''
            },
            finish_reason: response.is_truncated ? 'length' : 'stop'
          }],
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          }
        }

      case 'alibaba':
        return {
          choices: [{
            message: {
              content: response.output?.text || ''
            },
            finish_reason: response.output?.finish_reason || 'stop'
          }],
          usage: {
            prompt_tokens: response.usage?.input_tokens || 0,
            completion_tokens: response.usage?.output_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
          }
        }

      default:
        return response
    }
  }

  





  async handleStreamResponse(response, stream, provider) {
    try {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' 

        for (const line of lines) {
          if (line.trim() === '') continue
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              stream.emit('end')
              return
            }

            try {
              const parsed = JSON.parse(data)
              const normalized = this.normalizeStreamChunk(provider, parsed)
              if (normalized) {
                stream.emit('data', normalized)
              }
            } catch (parseError) {
              console.warn('解析流式数据失败:', parseError)
            }
          }
        }
      }

      stream.emit('end')
    } catch (error) {
      stream.emit('error', error)
    }
  }

  




  normalizeStreamChunk(provider, chunk) {
    switch (provider.toLowerCase()) {
      case 'openai':
        return chunk 

      case 'anthropic':
        if (chunk.type === 'content_block_delta') {
          return {
            choices: [{
              delta: {
                content: chunk.delta?.text || ''
              }
            }]
          }
        }
        return null

      case 'baidu':
        return {
          choices: [{
            delta: {
              content: chunk.result || ''
            }
          }]
        }

      case 'alibaba':
        return {
          choices: [{
            delta: {
              content: chunk.output?.text || ''
            }
          }]
        }

      default:
        return chunk
    }
  }

  



  async checkRateLimit(modelId) {
    const model = this.getModel(modelId)
    if (!model || !model.rateLimit) return
    
    const limit = this.rateLimits.get(modelId)
    const now = Date.now()
    
    
    limit.requests = limit.requests.filter(time => now - time < limit.window)
    
    
    if (limit.requests.length >= model.rateLimit.requests) {
      const waitTime = limit.window - (now - limit.requests[0])
      throw new Error(`速率限制：请等待 ${Math.ceil(waitTime / 1000)} 秒`)
    }
    
    
    limit.requests.push(now)
  }

  



  generateCacheKey(requestData) {
    const key = JSON.stringify(requestData)
    return crypto.createHash('md5').update(key).digest('hex')
  }

  


  startRequestProcessor() {
    setInterval(() => {
      this.processRequestQueue()
    }, 100)
  }

  


  processRequestQueue() {
    if (this.requestQueue.length === 0) return
    if (this.activeRequests.size >= this.config.concurrency) return
    
    const request = this.requestQueue.shift()
    if (request) {
      this.processRequest(request)
    }
  }

  



  async processRequest(request) {
    try {
      const result = await request.handler()
      request.resolve(result)
    } catch (error) {
      request.reject(error)
    }
  }

  


  startCacheCleaner() {
    setInterval(() => {
      this.cleanCache()
    }, 300000) 
  }

  


  cleanCache() {
    const now = Date.now()
    
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.config.cacheTTL) {
        this.cache.delete(key)
      }
    }
  }

  




  registerPlugin(name, plugin) {
    this.plugins.set(name, plugin)
    
    if (plugin.init) {
      plugin.init(this)
    }
    
    logger?.info(`AIGC插件已注册: ${name}`)
  }

  




  registerTool(name, handler) {
    this.tools.set(name, handler)
    logger?.debug(`AIGC工具已注册: ${name}`)
  }

  




  async callTool(name, params) {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`工具不存在: ${name}`)
    }
    
    return await tool(params)
  }

  


  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      models: this.models.size,
      conversations: this.conversations.size,
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length,
      cacheSize: this.cache.size
    }
  }

  


  getHealth() {
    const stats = this.getStats()
    const errorRate = stats.requests > 0 ? stats.errors / stats.requests : 0
    
    let status = 'healthy'
    if (errorRate > 0.1) {
      status = 'degraded'
    }
    if (errorRate > 0.5 || stats.activeRequests > this.config.concurrency * 0.8) {
      status = 'unhealthy'
    }
    
    return {
      status,
      errorRate,
      uptime: stats.uptime,
      requests: stats.requests,
      errors: stats.errors
    }
  }

  


  async destroy() {
    
    this.conversations.clear()
    
    
    this.cache.clear()
    
    
    this.requestQueue.length = 0
    
    
    while (this.activeRequests.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    logger?.info('AIGC引擎已销毁')
  }
}

const aigcEngine = new AIGCEngine()


export default aigcEngine
export { AIGCEngine, Message, Conversation, ModelConfig, ModelType, Provider, Role }


if (typeof global !== 'undefined') {
  global.aigcEngine = aigcEngine
}