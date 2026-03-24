




import { parentPort, workerData } from 'worker_threads'
import { performance } from 'perf_hooks'




let workerState = {
  id: `worker_${process.pid}_${Date.now()}`,
  startTime: Date.now(),
  tasksExecuted: 0,
  errors: 0,
  busy: false
}




const safeConsole = {
  log: (...args) => {
    parentPort?.postMessage({
      type: 'log',
      level: 'info',
      message: args.join(' '),
      timestamp: Date.now()
    })
  },
  error: (...args) => {
    parentPort?.postMessage({
      type: 'log',
      level: 'error',
      message: args.join(' '),
      timestamp: Date.now()
    })
  },
  warn: (...args) => {
    parentPort?.postMessage({
      type: 'log',
      level: 'warn',
      message: args.join(' '),
      timestamp: Date.now()
    })
  },
  debug: (...args) => {
    parentPort?.postMessage({
      type: 'log',
      level: 'debug',
      message: args.join(' '),
      timestamp: Date.now()
    })
  }
}




const safeSetTimeout = (callback, delay) => {
  if (delay > 60000) { 
    throw new Error('setTimeout延迟时间过长')
  }
  return setTimeout(callback, delay)
}




const safeSetInterval = (callback, interval) => {
  if (interval < 100) { 
    throw new Error('setInterval间隔时间过短')
  }
  if (interval > 300000) { 
    throw new Error('setInterval间隔时间过长')
  }
  return setInterval(callback, interval)
}




function createSafeEnvironment() {
  return {
    console: safeConsole,
    setTimeout: safeSetTimeout,
    setInterval: safeSetInterval,
    clearTimeout,
    clearInterval,
    Date,
    Math,
    JSON,
    Promise,
    Buffer,
    process: {
      env: process.env,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    performance,
    
    require: undefined,
    global: undefined,
    __dirname: undefined,
    __filename: undefined,
    module: undefined,
    exports: undefined
  }
}







async function executeTask(handlerCode, args = [], config = {}) {
  const startTime = performance.now()
  
  try {
    workerState.busy = true
    workerState.tasksExecuted++
    
    
    const env = createSafeEnvironment()
    
    
    let handler
    
    if (typeof handlerCode === 'string') {
      
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
      
      
      const wrappedCode = `
        const { ${Object.keys(env).join(', ')} } = arguments[arguments.length - 1];
        return (${handlerCode}).apply(this, Array.prototype.slice.call(arguments, 0, -1));
      `
      
      handler = new AsyncFunction(wrappedCode)
    } else if (typeof handlerCode === 'function') {
      handler = handlerCode
    } else {
      throw new Error('无效的处理函数类型')
    }
    
    
    const timeout = config.timeout || 30000
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('任务执行超时')), timeout)
    })
    
    
    const taskPromise = Promise.resolve(handler(...args, env))
    
    const result = await Promise.race([taskPromise, timeoutPromise])
    
    const duration = performance.now() - startTime
    
    
    parentPort?.postMessage({
      type: 'result',
      success: true,
      result,
      duration,
      stats: {
        ...workerState,
        uptime: Date.now() - workerState.startTime
      }
    })
    
  } catch (error) {
    workerState.errors++
    
    const duration = performance.now() - startTime
    
    
    parentPort?.postMessage({
      type: 'result',
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      duration,
      stats: {
        ...workerState,
        uptime: Date.now() - workerState.startTime
      }
    })
  } finally {
    workerState.busy = false
  }
}




function handleHeartbeat() {
  parentPort?.postMessage({
    type: 'heartbeat',
    timestamp: Date.now(),
    stats: {
      ...workerState,
      uptime: Date.now() - workerState.startTime
    }
  })
}




function handleStatus() {
  parentPort?.postMessage({
    type: 'status',
    stats: {
      ...workerState,
      uptime: Date.now() - workerState.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  })
}




function handleReset() {
  workerState.tasksExecuted = 0
  workerState.errors = 0
  workerState.startTime = Date.now()
  
  parentPort?.postMessage({
    type: 'reset',
    success: true,
    timestamp: Date.now()
  })
}




function handleConfig(config) {
  
  if (config.id) {
    workerState.id = config.id
  }
  
  parentPort?.postMessage({
    type: 'config',
    success: true,
    config: workerState
  })
}




if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      const { type, data } = message
      
      switch (type) {
        case 'task':
          await executeTask(data.handler, data.args, data.config)
          break
          
        case 'heartbeat':
          handleHeartbeat()
          break
          
        case 'status':
          handleStatus()
          break
          
        case 'reset':
          handleReset()
          break
          
        case 'config':
          handleConfig(data)
          break
          
        case 'terminate':
          
          parentPort?.postMessage({
            type: 'terminated',
            timestamp: Date.now(),
            stats: {
              ...workerState,
              uptime: Date.now() - workerState.startTime
            }
          })
          process.exit(0)
          break
          
        default:
          parentPort?.postMessage({
            type: 'error',
            error: {
              message: `未知的消息类型: ${type}`,
              timestamp: Date.now()
            }
          })
          break
      }
      
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          timestamp: Date.now()
        }
      })
    }
  })
  
  
  parentPort.on('error', (error) => {
    workerState.errors++
    
    parentPort?.postMessage({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: Date.now()
      }
    })
  })
  
  
  parentPort.postMessage({
    type: 'ready',
    workerId: workerState.id,
    timestamp: Date.now()
  })
}




process.on('uncaughtException', (error) => {
  workerState.errors++
  
  parentPort?.postMessage({
    type: 'uncaughtException',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: Date.now()
    }
  })
  
  
  setTimeout(() => {
    process.exit(1)
  }, 100)
})




process.on('unhandledRejection', (reason, promise) => {
  workerState.errors++
  
  parentPort?.postMessage({
    type: 'unhandledRejection',
    error: {
      message: reason?.message || String(reason),
      stack: reason?.stack,
      name: reason?.name || 'UnhandledRejection',
      timestamp: Date.now()
    }
  })
})




process.on('SIGTERM', () => {
  parentPort?.postMessage({
    type: 'terminated',
    reason: 'SIGTERM',
    timestamp: Date.now(),
    stats: {
      ...workerState,
      uptime: Date.now() - workerState.startTime
    }
  })
  
  process.exit(0)
})

process.on('SIGINT', () => {
  parentPort?.postMessage({
    type: 'terminated',
    reason: 'SIGINT',
    timestamp: Date.now(),
    stats: {
      ...workerState,
      uptime: Date.now() - workerState.startTime
    }
  })
  
  process.exit(0)
})


setInterval(() => {
  if (!workerState.busy) {
    handleHeartbeat()
  }
}, 30000) 


setInterval(() => {
  if (global.gc && !workerState.busy) {
    try {
      global.gc()
    } catch (error) {
      
    }
  }
}, 300000) 