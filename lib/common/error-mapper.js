









const ERROR_MESSAGES = {
  'zh-CN': {
    UNKNOWN_ERROR: '未知错误',
    NULL_ERROR: '未知错误',
    NETWORK_ERROR: '网络错误，请检查网络连接',
    SYSTEM_ERROR: '系统错误',
    
    HTTP_400: '请求参数错误（400），请检查参数格式是否正确',
    HTTP_401: '未授权或令牌失效（401），请检查凭证',
    HTTP_403: '没有访问权限（403），请确认账号具有所需权限',
    HTTP_404: '资源不存在（404）',
    HTTP_429: '请求频率过高（429）',
    HTTP_500: '服务器内部错误（500），请稍后重试',
    HTTP_502: '网关错误（502），请稍后重试',
    HTTP_503: '服务不可用（503），请稍后重试',
    HTTP_ERROR: 'HTTP错误',
    
    TIMEOUT: '请求超时，请检查网络连接或目标服务',
    ENOTFOUND: '无法解析域名，请检查网络连接',
    ECONNREFUSED: '连接被拒绝，请确认服务已启动',
    ECONNRESET: '连接被重置（ECONNRESET），请检查网络连接',
    
    EADDRINUSE: '端口已被占用，请更换端口或关闭占用进程',
    ETIMEDOUT: '操作超时（ETIMEDOUT），请检查网络连接或目标服务状态',
    EPIPE: '管道破裂（EPIPE），写入失败，可能是连接提前关闭',
    
    WORKER_TIMEOUT: '插件执行超时，任务可能较慢或卡住',
    WORKER_EXIT: '插件执行进程异常退出',
    MISSING_ESBUILD: '缺少依赖 esbuild，请安装：pnpm add -D esbuild',
    MISSING_PACKAGE: '插件缺少依赖包，请进入插件目录安装依赖',
    BOT_NOT_INIT: 'Bot 未初始化，无法发送消息，请检查启动顺序',
    FORBIDDEN_METHOD: '插件尝试调用受限方法，已阻止（安全策略），请确认具有所需权限',
    MISSING_PARAM: '插件参数缺失，请提供正确的参数格式',
    
    INTERFACE: '接口',
    TARGET: '目标',
    PORT: '端口',
    ADDRESS: '地址',
    CAUSE: '原因',
    UNKNOWN_INTERFACE: '未知接口',
    UNKNOWN_TARGET: '未知'
  },
  'en-US': {
    UNKNOWN_ERROR: 'Unknown error',
    NULL_ERROR: 'Unknown error',
    NETWORK_ERROR: 'Network error, please check network connection',
    SYSTEM_ERROR: 'System error',
    
    HTTP_400: 'Bad request (400), please check parameter format',
    HTTP_401: 'Unauthorized (401), please check credentials',
    HTTP_403: 'Access forbidden (403), please ensure account has required permissions',
    HTTP_404: 'Resource not found (404)',
    HTTP_429: 'Too many requests (429)',
    HTTP_500: 'Internal server error (500), please retry later',
    HTTP_502: 'Bad gateway (502), please retry later',
    HTTP_503: 'Service unavailable (503), please retry later',
    HTTP_ERROR: 'HTTP error',
    
    TIMEOUT: 'Request timeout, please check network connection or target service',
    ENOTFOUND: 'Cannot resolve domain name, please check network connection',
    ECONNREFUSED: 'Connection refused, please ensure service is running',
    ECONNRESET: 'Connection reset (ECONNRESET), please check network connection',
    
    EADDRINUSE: 'Port already in use, please change port or stop the process',
    ETIMEDOUT: 'Operation timeout (ETIMEDOUT), please check network connection or service status',
    EPIPE: 'Broken pipe (EPIPE), write failed, connection may be closed',
    
    WORKER_TIMEOUT: 'Plugin execution timeout, task may be slow or stuck',
    WORKER_EXIT: 'Plugin process exited unexpectedly',
    MISSING_ESBUILD: 'Missing dependency esbuild, please install: pnpm add -D esbuild',
    MISSING_PACKAGE: 'Plugin missing dependencies, please install in plugin directory',
    BOT_NOT_INIT: 'Bot not initialized, cannot send message, please check startup order',
    FORBIDDEN_METHOD: 'Plugin attempted to call restricted method, blocked (security policy), please ensure required permissions',
    MISSING_PARAM: 'Plugin parameter missing, please provide correct parameter format',
    
    INTERFACE: 'Interface',
    TARGET: 'Target',
    PORT: 'Port',
    ADDRESS: 'Address',
    CAUSE: 'Cause',
    UNKNOWN_INTERFACE: 'unknown interface',
    UNKNOWN_TARGET: 'unknown'
  }
}







function getLocalizedMessage(key, locale = 'zh-CN') {
  
  const messages = ERROR_MESSAGES[locale] || ERROR_MESSAGES['zh-CN']
  return messages[key] || ERROR_MESSAGES['zh-CN'][key] || key
}





function safeDebugLog(message) {
  try {
    if (typeof logger !== 'undefined' && logger?.debug) {
      logger.debug(message)
    }
  } catch (e) {
    
  }
}







function truncateErrorMessage(message, maxLength) {
  if (!message || typeof message !== 'string') {
    return message
  }

  
  if (message.length <= maxLength) {
    return message
  }

  
  
  const truncatePoint = maxLength - 3 

  
  const punctuationMarks = ['。', '，', '、', '；', '：', '.', ',', ';', ':', ')', '）', '}', ']']
  let bestCutPoint = truncatePoint

  for (let i = truncatePoint; i > Math.max(0, truncatePoint - 20); i--) {
    if (punctuationMarks.includes(message[i])) {
      bestCutPoint = i + 1
      break
    }
  }

  
  const truncated = message.substring(0, bestCutPoint).trim()
  return truncated + '...'
}

function mapAxiosError(err, locale = 'zh-CN') {
  
  const status = err?.response?.status
  const url = err?.config?.url || err?.response?.config?.url
  const unknownTarget = getLocalizedMessage('UNKNOWN_TARGET', locale)
  const interfaceLabel = getLocalizedMessage('INTERFACE', locale)
  const targetLabel = getLocalizedMessage('TARGET', locale)
  
  if (status) {
    const statusKey = `HTTP_${status}`
    const statusMsg = getLocalizedMessage(statusKey, locale) || 
                      `${getLocalizedMessage('HTTP_ERROR', locale)}（${status}）`
    return `${statusMsg}，${interfaceLabel}：${url || unknownTarget}`
  }
  
  const code = err?.code
  const msg = err?.message || ''
  if (code === 'ECONNABORTED' || /timeout/i.test(msg)) {
    return `${getLocalizedMessage('TIMEOUT', locale)}（${url || getLocalizedMessage('UNKNOWN_INTERFACE', locale)}）`
  }
  if (code === 'ENOTFOUND') {
    return `${getLocalizedMessage('ENOTFOUND', locale)}，${targetLabel}：${url || unknownTarget}`
  }
  if (code === 'ECONNREFUSED') {
    return `${getLocalizedMessage('ECONNREFUSED', locale)}，${targetLabel}：${url || unknownTarget}`
  }
  if (code === 'ECONNRESET') {
    return `${getLocalizedMessage('ECONNRESET', locale)}，${targetLabel}：${url || unknownTarget}`
  }
  return msg || getLocalizedMessage('NETWORK_ERROR', locale)
}

function mapNodeError(err, locale = 'zh-CN') {
  const code = err?.code
  const syscall = err?.syscall
  const port = err?.port
  const address = err?.address

  switch (code) {
    case 'EADDRINUSE': {
      const portLabel = getLocalizedMessage('PORT', locale)
      const addressLabel = getLocalizedMessage('ADDRESS', locale)
      return `${getLocalizedMessage('EADDRINUSE', locale)}${port ? `（${portLabel}：${port}）` : ''}${address ? `，${addressLabel}：${address}` : ''}`
    }
    case 'ECONNREFUSED': {
      const targetLabel = getLocalizedMessage('TARGET', locale)
      return `${getLocalizedMessage('ECONNREFUSED', locale)}${address ? `（${targetLabel}：${address}${port ? `:${port}` : ''}）` : ''}`
    }
    case 'ECONNRESET':
      return getLocalizedMessage('ECONNRESET', locale)
    case 'ETIMEDOUT':
      return getLocalizedMessage('ETIMEDOUT', locale)
    case 'ENOTFOUND':
      return getLocalizedMessage('ENOTFOUND', locale)
    case 'EPIPE':
      return getLocalizedMessage('EPIPE', locale)
    default:
      break
  }

  
  const msg = String(err?.message || err || '')
  if (/等待 Worker 响应超时/i.test(msg)) return getLocalizedMessage('WORKER_TIMEOUT', locale)
  if (/Worker 提前退出/i.test(msg)) return getLocalizedMessage('WORKER_EXIT', locale)
  if (/缺少 esbuild/i.test(msg)) return getLocalizedMessage('MISSING_ESBUILD', locale)
  if (/Cannot find package/i.test(msg)) return getLocalizedMessage('MISSING_PACKAGE', locale)
  if (/Bot 未初始化/i.test(msg)) return getLocalizedMessage('BOT_NOT_INIT', locale)
  if (/禁止调用方法/i.test(msg)) return getLocalizedMessage('FORBIDDEN_METHOD', locale)
  if (/缺少 (groupId|userId|method)/i.test(msg)) {
    return `${getLocalizedMessage('MISSING_PARAM', locale)}：${msg.replace(/^Error:\s*/, '')}`
  }

  return err?.message || getLocalizedMessage('SYSTEM_ERROR', locale)
}









export default function errorMapper(err, options = {}) {
  const { locale = 'zh-CN', maxLength = 200 } = options
  
  try {
    
    if (err === null || err === undefined) {
      safeDebugLog('[errorMapper] 收到 null/undefined 错误对象')
      return truncateErrorMessage(getLocalizedMessage('NULL_ERROR', locale), maxLength)
    }

    
    if (typeof err === 'string') {
      return truncateErrorMessage(err || getLocalizedMessage('UNKNOWN_ERROR', locale), maxLength)
    }

    
    if (err?.isAxiosError || err?.response || err?.config) {
      const r = mapAxiosError(err, locale)
      const result = r || getLocalizedMessage('NETWORK_ERROR', locale)
      
      return truncateErrorMessage(appendCauseInfo(result, err, locale), maxLength)
    }

    
    if (err?.code) {
      const r = mapNodeError(err, locale)
      const result = r || err?.message || getLocalizedMessage('SYSTEM_ERROR', locale)
      return truncateErrorMessage(appendCauseInfo(result, err, locale), maxLength)
    }

    
    if (err?.message) {
      const r = mapNodeError(err, locale)
      const result = r || err.message
      return truncateErrorMessage(appendCauseInfo(result, err, locale), maxLength)
    }

    
    
    try {
      const serialized = JSON.stringify(err)
      if (serialized && serialized !== '{}') {
        safeDebugLog(`[errorMapper] 无法识别的错误格式，已序列化: ${serialized}`)
        return truncateErrorMessage(serialized, maxLength)
      }
    } catch (serializeErr) {
      safeDebugLog(`[errorMapper] 序列化错误对象失败: ${serializeErr.message}`)
    }

    
    try {
      const strValue = String(err)
      if (strValue && strValue !== '[object Object]') {
        safeDebugLog(`[errorMapper] 使用 toString 转换错误: ${strValue}`)
        return truncateErrorMessage(strValue, maxLength)
      }
    } catch (toStringErr) {
      safeDebugLog(`[errorMapper] toString 转换失败: ${toStringErr.message}`)
    }

    
    safeDebugLog(`[errorMapper] 无法识别的错误格式，类型: ${typeof err}, 构造函数: ${err?.constructor?.name || 'unknown'}`)
    const result = getLocalizedMessage('UNKNOWN_ERROR', locale)
    return truncateErrorMessage(result, maxLength)
  } catch (e) {
    
    safeDebugLog(`[errorMapper] 映射过程异常: ${e.message}`)
    try {
      const fallbackMsg = err?.message || String(err) || getLocalizedMessage('UNKNOWN_ERROR', locale)
      return truncateErrorMessage(fallbackMsg, maxLength)
    } catch {
      return truncateErrorMessage(getLocalizedMessage('UNKNOWN_ERROR', locale), maxLength)
    }
  }
}








function appendCauseInfo(baseMessage, err, locale = 'zh-CN') {
  if (!err?.cause) return baseMessage

  try {
    let causeMsg = ''
    if (typeof err.cause === 'string') {
      causeMsg = err.cause
    } else if (err.cause?.message) {
      causeMsg = err.cause.message
    } else {
      try {
        causeMsg = JSON.stringify(err.cause)
      } catch {
        causeMsg = String(err.cause)
      }
    }

    if (causeMsg && causeMsg !== baseMessage) {
      const causeLabel = getLocalizedMessage('CAUSE', locale)
      return `${baseMessage}（${causeLabel}：${causeMsg}）`
    }
  } catch (e) {
    safeDebugLog(`[errorMapper] 提取 cause 信息失败: ${e.message}`)
  }

  return baseMessage
}