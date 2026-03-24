import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import { loggerManager } from '../common/logger.js'



class AuthManager {
  constructor() {
    this.config = null
    this.configPath = path.join(process.cwd(), 'config/config/auth.yaml')
    this.defaultConfigPath = path.join(process.cwd(), 'config/default_config/auth.yaml')
    this.isInitialized = false
    
    this.loadConfig()
  }

  


  loadConfig() {
    try {
      
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8')
        this.config = yaml.parse(configContent)
      } else {
        
        if (fs.existsSync(this.defaultConfigPath)) {
          const defaultContent = fs.readFileSync(this.defaultConfigPath, 'utf8')
          
          
          const configDir = path.dirname(this.configPath)
          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true })
          }
          
          fs.writeFileSync(this.configPath, defaultContent)
          this.config = yaml.parse(defaultContent)
          loggerManager.info('[认证] 已创建默认认证配置文件')
        } else {
          throw new Error('默认认证配置文件不存在')
        }
      }
      
      
      this.initializeLocalAuth()
      
      this.isInitialized = true
      loggerManager.info('[认证] 认证管理器初始化完成')
      
    } catch (error) {
      loggerManager.error('[认证] 认证配置失败', error)
      this.isInitialized = false
    }
  }

  


  initializeLocalAuth() {
    if (!this.config.auth.local.key || this.config.auth.local.key.length !== 32) {
      
      this.config.auth.local.key = this.generateLocalAuthKey()
      this.config.auth.local.generated_at = new Date().toISOString()
      this.config.auth.local.status = 'active'
      
      
      if (!this.config.auth.local.yunzai_id) {
        this.config.auth.local.yunzai_id = this.generateYunzaiId()
      }
      
      
      if (!this.config.auth.local.instance_name) {
        this.config.auth.local.instance_name = `Rabbit-${Date.now()}`
      }
      
      this.saveConfig()
      loggerManager.info('[认证] 已生成新的32位本地认证密钥')
    }
  }

  


  generateLocalAuthKey() {
    return crypto.randomBytes(16).toString('hex') 
  }

  
  generateYunzaiId() {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(8).toString('hex')
    return `rabbit_${timestamp}_${random}`
  }

  
  saveConfig() {
    try {
      const yamlContent = yaml.stringify(this.config, {
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0
      })
      
      fs.writeFileSync(this.configPath, yamlContent, 'utf8')
      loggerManager.debug('[认证] 配置文件已保存')
    } catch (error) {
      loggerManager.error('[认证] 保存配置文件失败', error)
    }
  }

  
  getLocalAuthKey() {
    if (!this.isInitialized) {
      throw new Error('认证管理器未初始化')
    }
    return this.config.auth.local.key
  }

  
  getInstanceInfo() {
    if (!this.isInitialized) {
      throw new Error('认证管理器未初始化')
    }
    
    return {
      yunzaiId: this.config.auth.local.yunzai_id,
      rabbitId: this.config.auth.local.yunzai_id,
      instanceName: this.config.auth.local.instance_name,
      localAuthKey: this.config.auth.local.key,
      status: this.config.auth.local.status,
      generatedAt: this.config.auth.local.generated_at
    }
  }

  


  setRelayAuthKey(authKey) {
    if (!authKey || authKey.length !== 120) {
      throw new Error('中转服务认证密钥必须为120位')
    }
    
    this.config.auth.relay.auth_key = authKey
    this.config.auth.relay.enabled = true
    this.saveConfig()
    
    loggerManager.info('[认证] 已设置中转服务认证密钥')
  }

  


  getRelayAuthKey() {
    return this.config.auth.relay.auth_key
  }

  


  setRelayEnabled(enabled) {
    this.config.auth.relay.enabled = enabled
    this.saveConfig()
    
    loggerManager.info(`[认证] 中转服务已${enabled ? '启用' : '禁用'}`)
  }

  


  isRelayEnabled() {
    return this.config.auth.relay.enabled
  }

  


  regenerateLocalAuthKey() {
    const oldKey = this.config.auth.local.key
    this.config.auth.local.key = this.generateLocalAuthKey()
    this.config.auth.local.generated_at = new Date().toISOString()
    this.saveConfig()
    
    loggerManager.info('[认证] 已重新生成32位本地认证密钥')
    
    return {
      oldKey,
      newKey: this.config.auth.local.key
    }
  }

  


  validateLocalAuthKey(providedKey) {
    if (!this.isInitialized) {
      return false
    }
    
    return this.config.auth.local.key === providedKey && 
           this.config.auth.local.status === 'active'
  }

  


  async registerWithRelayService() {
    if (!this.config.auth.relay.enabled) {
      throw new Error('中转服务未启用')
    }
    
    if (!this.config.auth.relay.auth_key) {
      throw new Error('中转服务认证密钥未设置')
    }
    
    try {
      const instanceInfo = this.getInstanceInfo()
      const url = `${this.config.auth.relay.server_url}/api/auth/register-instance`
      const body = {
        yunzaiId: instanceInfo.yunzaiId,
        instanceName: instanceInfo.instanceName,
        localAuthKey: instanceInfo.localAuthKey,
        relayAuthKey: this.config.auth.relay.auth_key
      }
      const data = await this.postJson(url, body, this.config.auth.relay.timeout, {
        'Content-Type': 'application/json',
        'User-Agent': 'Rabbit-Framework/0.0.1'
      })

      if (data?.success) {
        loggerManager.info('[认证] Rabbit 实例注册成功')
        return data
      } else {
        throw new Error(data?.message || '注册失败')
      }

    } catch (error) {
      loggerManager.error('[认证] Rabbit 实例注册失败', error.message || String(error))
      throw error
    }
  }

  


  getAuthStatus() {
    return {
      initialized: this.isInitialized,
      localAuth: {
        hasKey: !!this.config?.auth?.local?.key,
        keyLength: this.config?.auth?.local?.key?.length || 0,
        status: this.config?.auth?.local?.status,
        generatedAt: this.config?.auth?.local?.generated_at
      },
      relayService: {
        enabled: this.config?.auth?.relay?.enabled || false,
        hasAuthKey: !!this.config?.auth?.relay?.auth_key,
        serverUrl: this.config?.auth?.relay?.server_url
      }
    }
  }

  
  async postJson(url, body, timeoutMs = 10000, headers = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      })
      clearTimeout(timer)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      return await res.json()
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        err.message = `timeout after ${timeoutMs}ms`
      }
      throw err
    }
  }
}

const authManager = new AuthManager()

export default authManager
export { AuthManager }