// 过滤 Node 的 punycode 弃用告警，避免日志噪音
try {
  process.on('warning', (warning) => {
    if (warning?.code === 'DEP0040' || /punycode/i.test(String(warning?.message || ''))) {
      return
    }
  })
} catch {}

try {
  const { ensureSupportedNodeRuntime, reexecWithNodeRuntime } = await import("./lib/common/node-bootstrap.js")
  const nodeRuntime = await ensureSupportedNodeRuntime()
  if (nodeRuntime.action === "reexec" && nodeRuntime.nodeBinary) {
    console.log(
      `[Rabbit] 当前 Node.js ${nodeRuntime.currentVersion} 低于最低要求 ${nodeRuntime.minimumVersion}，` +
      `正在为 ${nodeRuntime.platform}/${nodeRuntime.arch} 准备稳定版 Node.js ${nodeRuntime.targetVersion}...`,
    )
    const exitCode = await reexecWithNodeRuntime(nodeRuntime.nodeBinary)
    process.exit(exitCode)
  }
} catch (error) {
  console.warn(`[Rabbit] Node.js 运行时自举失败：${error?.message || error}`)
}

switch (process.env.app_type || process.argv[2]) {
  case "stop": {
    const cfg = (await import("./lib/config/config.js")).default
    await fetch(`http://localhost:${cfg.server.port}/exit`, { headers: cfg.server.auth || undefined }).catch(() => {})
    process.exit()
  } case "daemon": {
    console.log("守护进程正在启动主进程")
    const { spawnSync } = await import("node:child_process")
    while (spawnSync(process.argv[0],
      [process.argv[1], "start", ...process.argv.slice(2)],
      { stdio: "inherit" },
    ).status !== 255)
      console.log("守护进程正在重启主进程")
    console.log("守护进程已停止")
    process.exit()
  } case "pm2":
    global.start_type = "pm2"
    break
  case "start":
    global.start_type = "external"
    break
  default:
    global.start_type = "internal"
}


try {
  const { default: taskScheduler } = await import("./lib/common/task-scheduler.js")
  await taskScheduler.init()
  const os = await import("node:os")
  const cpuCount = (os.cpus?.() || []).length || 1
  try { taskScheduler.createQueue("heavy", { concurrency: Math.max(1, Math.floor(cpuCount / 2)), maxSize: 500 }) } catch {}
  try { taskScheduler.createQueue("ai", { concurrency: Math.max(1, Math.floor(cpuCount / 2)), maxSize: 200 }) } catch {}
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
  } catch {}
} catch (e) {
 
}


try {
  const cfg = (await import("./lib/config/config.js")).default
  if (!cfg.uin || cfg.uin.length === 0) {
    console.log(`[TRSSYunzai][PM2] 实例 ${process.env.NODE_APP_INSTANCE ?? process.env.BOT_INDEX ?? 0} 未匹配到账号，安全退出。`)
    process.exit(0)
  }
} catch {}

global.Bot = new (await import("./lib/bot.js")).default

if (process.env.TEST_PLUGIN_ENGINE === '1' || process.argv.includes('test-pe')) {
  try {
    console.log('[PluginEngineTest] 测试模式已启用')
    const runTestOnce = async ({ force = false } = {}) => {
      try { console.log('[PluginEngineTest] runTestOnce 调用', 'force=', force) } catch {}
      if (global.__PE_TEST_RAN__) { try { console.log('[PluginEngineTest] 已执行过，跳过本次调用') } catch {}; return }
      try {
        const pe = global.pluginEngine || global.yunzaiCore?.pluginEngine
       
        let hasPlugins = false, hasCmds = false
        try { const ps = pe?.getAllPlugins?.(); hasPlugins = Array.isArray(ps) && ps.length > 0 } catch {}
        try { const cs = pe?.getAllCommands?.(); hasCmds = (Array.isArray(cs) && cs.length > 0) || (!!cs && typeof cs.size === 'number' && cs.size > 0) } catch {}
        const ready = !!pe && (hasPlugins || hasCmds)
        try { console.log('[PluginEngineTest] 检查 pluginEngine 是否存在:', !!pe, 'hasPlugins=', hasPlugins, 'hasCmds=', hasCmds) } catch {}
        if (!force && !ready) {
          console.log('[PluginEngineTest] 跳过执行：pluginEngine 未就绪（尚无插件/命令）')
          return
        }
        console.log('[PluginEngineTest] 触发测试脚本加载', force ? '(force)' : '')
        try { console.log('[PluginEngineTest] 准备 import ./test-plugin-engine.js') } catch {}
        await import('./test-plugin-engine.js')
        try { console.log('[PluginEngineTest] 已成功 import ./test-plugin-engine.js') } catch {}
        global.__PE_TEST_RAN__ = true
      } catch (e) {
        console.error('[PluginEngineTest] 测试脚本加载失败:', e)
      }
    }

    try { console.log('[PluginEngineTest] 启动阶段进行一次非强制探测调用 runTestOnce()') } catch {}
    await runTestOnce()

    try {
      setTimeout(() => runTestOnce(), 0)
      console.log('[PluginEngineTest] 已安排一次立即(非force)尝试')
    } catch {}

    try {
      if (!Object.prototype.hasOwnProperty.call(global, 'pluginEngine')) {
        let __pe_val__
        Object.defineProperty(global, 'pluginEngine', {
          configurable: true,
          enumerable: true,
          get() { return __pe_val__ },
          set(v) {
            __pe_val__ = v
            try { console.log('[PluginEngineTest] 捕获到 global.pluginEngine 赋值，准备执行测试') } catch {}
            runTestOnce()
          }
        })
        console.log('[PluginEngineTest] 已安装 global.pluginEngine setter 监听')
      }
    } catch (e) {
      try { console.warn('[PluginEngineTest] 安装 global.pluginEngine 监听失败:', e?.message || e) } catch {}
    }

    try {
      if (!Object.prototype.hasOwnProperty.call(global, 'yunzaiCore')) {
        let __yc_val__
        Object.defineProperty(global, 'yunzaiCore', {
          configurable: true,
          enumerable: true,
          get() { return __yc_val__ },
          set(v) {
            __yc_val__ = v
            try { console.log('[PluginEngineTest] 捕获到 global.yunzaiCore 赋值') } catch {}
            try {
              if (v && !v.__pe_wrapped__) {
                let __yc_pe__
                Object.defineProperty(v, 'pluginEngine', {
                  configurable: true,
                  enumerable: true,
                  get() { return __yc_pe__ },
                  set(val) {
                    __yc_pe__ = val
                    try { console.log('[PluginEngineTest] 捕获到 yunzaiCore.pluginEngine 赋值，准备执行测试') } catch {}
                    runTestOnce()
                  }
                })
                Object.defineProperty(v, '__pe_wrapped__', { value: true, enumerable: false })
                console.log('[PluginEngineTest] 已安装 yunzaiCore.pluginEngine setter 监听')
              }
            } catch {}
          }
        })
        console.log('[PluginEngineTest] 已安装 global.yunzaiCore setter 监听')
      }
    } catch (e) {
      try { console.warn('[PluginEngineTest] 安装 global.yunzaiCore 监听失败:', e?.message || e) } catch {}
    }

    try {
      if (Bot?.on) {
        Bot.on('online', () => {
          console.log('[PluginEngineTest] 捕获到 Bot online 事件，准备执行测试')
          runTestOnce()
        })
        console.log('[PluginEngineTest] 已注册 Bot online 事件监听')
      } else {
        console.warn('[PluginEngineTest] Bot.on 不可用，跳过 online 事件监听')
      }
    } catch (e) {
      try { console.warn('[PluginEngineTest] Bot.on("online") 监听失败:', e?.message || e) } catch {}
    }

    try {
      if (global.yunzaiCore?.eventBus?.on) {
        global.yunzaiCore.eventBus.on('system:started', () => {
          console.log('[PluginEngineTest] 捕获到 system:started 事件，准备执行测试')
          runTestOnce()
        })
        console.log('[PluginEngineTest] 已注册 system:started 事件监听')
      } else {
        console.warn('[PluginEngineTest] yunzaiCore.eventBus.on 不可用，跳过 system:started 事件监听')
      }
    } catch (e) {
      try { console.warn('[PluginEngineTest] 监听 system:started 失败:', e?.message || e) } catch {}
    }

    try {
      let attempts = 0
      console.log('[PluginEngineTest] 开始轮询等待 pluginEngine 就绪（最多30秒）')
      const timer = setInterval(() => {
        attempts++
        const pe = global.pluginEngine || global.yunzaiCore?.pluginEngine
        let hasPlugins = false, hasCmds = false
        try { const ps = pe?.getAllPlugins?.(); hasPlugins = Array.isArray(ps) && ps.length > 0 } catch {}
        try { const cs = pe?.getAllCommands?.(); hasCmds = (Array.isArray(cs) && cs.length > 0) || (!!cs && typeof cs.size === 'number' && cs.size > 0) } catch {}
        const ready = !!pe && (hasPlugins || hasCmds)
        if (ready) {
          console.log('[PluginEngineTest] 检测到 pluginEngine 已就绪（已存在插件/命令），准备执行测试')
          clearInterval(timer)
          runTestOnce()
        } else {
          if (attempts % 5 === 0) {
            console.log(`[PluginEngineTest] 轮询中（${attempts}/30）……`)
          }
          if (attempts >= 30) {
            console.warn('[PluginEngineTest] 轮询等待超时，强制执行测试脚本（可能无插件）')
            clearInterval(timer)
            runTestOnce({ force: true })
          }
        }
      }, 1000)
    } catch {}

    setTimeout(() => runTestOnce(), 1000)

    setTimeout(() => {
      if (!global.__PE_TEST_RAN__) {
        console.warn('[PluginEngineTest] 5 秒快速兜底触发，准备执行测试')
        runTestOnce()
      }
    }, 5000)

    console.log('[PluginEngineTest] 已设置 15 秒兜底触发器')
    setTimeout(() => {
      if (!global.__PE_TEST_RAN__) {
        console.warn('[PluginEngineTest] 15 秒兜底触发，准备执行测试')
        runTestOnce({ force: true })
      }
    }, 15000)
  } catch (e) {
    try { console.error('[PluginEngineTest] 测试初始化错误:', e) } catch {}
  }
}
Bot.run()