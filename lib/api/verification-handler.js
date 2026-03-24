import crypto from 'crypto'

import { loggerManager } from '../common/logger.js'

import fs from 'fs'
import path from 'path'
import yaml from 'yaml'




class VerificationHandler {
  constructor() {
    this.config = null
    this.isEnabled = false
    this.loadConfig()
  }

  


  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config/config/bot/code.yaml')
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8')
        this.config = yaml.parse(configContent)
        this.isEnabled = this.config?.code?.enabled || false
        
        if (this.isEnabled) {
          loggerManager.info('[验证码] 验证码处理器已启用')
          this.startPolling()
        } else {
          loggerManager.info('[验证码] 验证码处理器已禁用')
        }
      } else {
        loggerManager.warn('[验证码] 配置文件不存在，验证码功能已禁用')
      }
    } catch (error) {
      loggerManager.error('[验证码] 配置文件加载失败', error)
      this.isEnabled = false
    }
  }

  


  startPolling() {
    if (!this.isEnabled) return
    
    const interval = this.config.code.relay_server.check_interval || 5000
    
    setInterval(async () => {
      try {
        await this.checkForVerificationCodes()
      } catch (error) {
        loggerManager.error('[验证码] 轮询检查失败', error)
      }
    }, interval)
    
    loggerManager.info(`[验证码] 开始轮询检查，间隔 ${interval}ms`)
  }

  


  async checkForVerificationCodes() {
    try {
      const relayUrl = this.config.code.relay_server.url
      const timeout = this.config.code.relay_server.timeout || 10000
      
      
      const listData = await this.getJson(`${relayUrl}/api/auth/verification-codes`, timeout)
      
      if (listData?.success && Array.isArray(listData.data) && listData.data.length > 0) {
        for (const verificationId of listData.data) {
          await this.processVerificationCode(verificationId)
        }
      }
    } catch (error) {
      
      if (error.code !== 'ECONNREFUSED' && error.code !== 'ECONNRESET' && !error.message.includes('timeout')) {
        loggerManager.error('[验证码] 检查验证码失败', error.message)
      }
    }
  }

  


  async processVerificationCode(verificationId) {
    try {
      const relayUrl = this.config.code.relay_server.url
      const timeout = this.config.code.relay_server.timeout || 10000
      
      
      const detailData = await this.getJson(`${relayUrl}/api/auth/verification-code/${verificationId}`, timeout)
      
      if (detailData?.success) {
        const verificationData = detailData.data
        await this.decryptAndOutput(verificationData)
        
        
        await this.markAsProcessed(verificationId)
      }
    } catch (error) {
      loggerManager.error(`[验证码] 处理验证码失败 ${verificationId}`, error.message)
    }
  }

  


  async receiveVerificationCode(req, res) {
    try {
      if (!this.isEnabled) {
        return res.status(503).json({
          success: false,
          message: '验证码功能未启用'
        })
      }

      const { encryptedCode, timestamp, deviceId, source } = req.body
      
      
      if (!encryptedCode || !timestamp) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        })
      }

      
      if (this.config.code.security.validate_timestamp) {
        const currentTime = Date.now()
        const maxDrift = this.config.code.security.max_time_drift || 300000
        
        if (Math.abs(currentTime - timestamp) > maxDrift) {
          loggerManager.warn('[验证码] 时间戳验证失败', { timestamp, currentTime, drift: currentTime - timestamp })
          return res.status(400).json({
            success: false,
            message: '时间戳验证失败'
          })
        }
      }

      
      const verificationData = {
        encryptedCode,
        timestamp,
        deviceId: deviceId || 'unknown',
        source: source || 'direct',
        receivedAt: Date.now()
      }
      
      await this.decryptAndOutput(verificationData)
      
      res.json({
        success: true,
        message: '验证码接收成功',
        timestamp: Date.now()
      })
      
    } catch (error) {
      loggerManager.error('[验证码] 接收验证码失败', error)
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }

  


  async decryptAndOutput(verificationData) {
    try {
      const { encryptedCode, timestamp, deviceId, source, receivedAt } = verificationData
      
      
      const decryptedCode = await this.decryptVerificationCode(encryptedCode, deviceId)
      
      if (decryptedCode) {
        
        const outputData = {
          deviceId,
          code: decryptedCode,
          timestamp: new Date(timestamp).toLocaleString('zh-CN'),
          source,
          receivedAt: new Date(receivedAt).toLocaleString('zh-CN')
        }
        
        
        this.outputVerificationCode(outputData)
        
        
        if (global.redis) {
          const storageKey = `rabbit:verification:${deviceId}:${timestamp}`
          await global.redis.setex(storageKey, 600, JSON.stringify(outputData))
        }
        
        return decryptedCode
      } else {
        loggerManager.error('[验证码] 解密失败', { deviceId, timestamp })
        return null
      }
    } catch (error) {
      loggerManager.error('[验证码] 解密和输出失败', error)
      return null
    }
  }

  


  async decryptVerificationCode(encryptedData, deviceId) {
    try {
      const { encryptedData: encrypted, iv } = encryptedData
      
      
      const key = crypto.createHash('sha256').update(deviceId).digest()
      
      
      const algorithm = this.config.code.encryption.algorithm || 'aes-256-cbc'
      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'))
      
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      loggerManager.info('[验证码] 解密成功', { deviceId, codeLength: decrypted.length })
      return decrypted
      
    } catch (error) {
      loggerManager.error('[验证码] 解密失败', { deviceId, error: error.message })
      return null
    }
  }

  



  async getJson(url, timeoutMs = 10000) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
         
          'User-Agent': 'Rabbit-Framework/0.0.1'
        },
        signal: controller.signal
      })

      clearTimeout(timer)
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      if (contentType.includes('application/json')) {
        return await res.json()
      }
      
      return {}
    } catch (err) {
      clearTimeout(timer)
      
      if (err?.name === 'AbortError') {
        const e = new Error(`timeout after ${timeoutMs}ms`)
        e.name = err.name
        
        e.code = 'ETIMEDOUT'
        
        e.cause = err
        throw e
      }
      throw err
    }
  }

  


  outputVerificationCode(outputData) {
    const template = this.config.code.output.template || `
=== 收到验证码 ===
设备ID: {deviceId}
验证码: {code}
接收时间: {timestamp}
==================`
    
    
    let output = template
    Object.keys(outputData).forEach(key => {
      output = output.replace(new RegExp(`\\{${key}\\}`, 'g'), outputData[key])
    })
    
    
    const format = this.config.code.output.format || 'console'
    
    if (format === 'console' || format === 'both') {
      console.log(output)
    }
    
    if (this.config.code.logging.enabled) {
      loggerManager.info('[验证码] 验证码接收', outputData)
    }
    
    
    if (format === 'file' || format === 'both') {
      this.writeToFile(output, outputData)
    }
  }

  


  writeToFile(output, outputData) {
    try {
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      
      const logFile = path.join(logDir, `verification-codes-${new Date().toISOString().split('T')[0]}.log`)
      const logEntry = `${new Date().toISOString()} - ${JSON.stringify(outputData)}\n`
      
      fs.appendFileSync(logFile, logEntry)
    } catch (error) {
      loggerManager.error('[验证码] 写入文件失败', error)
    }
  }

  


  async markAsProcessed(verificationId) {
    try {
      const relayUrl = this.config.code.relay_server.url
      
      await axios.delete(`${relayUrl}/api/auth/verification-code/${verificationId}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Rabbit-Framework/0.0.1'
        }
      })
      
      loggerManager.debug(`[验证码] 已标记为处理完成: ${verificationId}`)
    } catch (error) {
      loggerManager.warn(`[验证码] 标记处理状态失败: ${verificationId}`, error.message)
    }
  }

  
  async getStatus() {
    return {
      enabled: this.isEnabled,
      config: this.config?.code || null,
      uptime: process.uptime()
    }
  }
}

const verificationHandler = new VerificationHandler()

export default verificationHandler
export { VerificationHandler }