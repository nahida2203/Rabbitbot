import express from 'express'
import verificationHandler from './verification-handler.js'
import { loggerManager } from '../common/logger.js'

const router = express.Router()










router.post('/receive', async (req, res) => {
  try {
    await verificationHandler.receiveVerificationCode(req, res)
  } catch (error) {
    loggerManager.error('[API] 验证码接收API异常', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})





router.get('/status', async (req, res) => {
  try {
    const status = await verificationHandler.getStatus()
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    loggerManager.error('[API] 获取验证码状态失败', error)
    res.status(500).json({
      success: false,
      message: '获取状态失败'
    })
  }
})





router.post('/reload', async (req, res) => {
  try {
    verificationHandler.loadConfig()
    res.json({
      success: true,
      message: '配置重新加载成功'
    })
  } catch (error) {
    loggerManager.error('[API] 重新加载验证码配置失败', error)
    res.status(500).json({
      success: false,
      message: '重新加载配置失败'
    })
  }
})





router.get('/test', async (req, res) => {
  try {
    const testData = {
      message: '验证码API正常运行',
      timestamp: new Date().toISOString(),
      status: await verificationHandler.getStatus()
    }
    
    res.json({
      success: true,
      data: testData
    })
  } catch (error) {
    loggerManager.error('[API] 验证码测试失败', error)
    res.status(500).json({
      success: false,
      message: '测试失败'
    })
  }
})

export default router