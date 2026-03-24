import setLog, { loggerManager } from "../common/logger.js"
import cfg from "./config.js"
import redisInit from "./redis.js"

if (!Promise.withResolvers) {
  const { deprecate } = await import("node:util")
  Promise.withResolvers = deprecate(() => {
    const r = {}
    r.promise = new Promise((resolve, reject) => {
      r.resolve = resolve
      r.reject = reject
    })
    return r
  }, "请更新 Node.js")
}


process.title = `Rabbit v${cfg.package.version} © 2025 - 2026`


process.env.TZ = "Asia/Shanghai"

for (const i of ["SIGHUP", "SIGTERM"]) process.on(i, (signal, code) => process.exit(code))


setLog()


for (const i of ["uncaughtException", "unhandledRejection"])
  process.on(i, e => {
    try {
      if (global.Bot && typeof global.Bot.makeLog === 'function') {
        global.Bot.makeLog("error", e, i)
      } else {
        console.error(`[${i}]`, e)
      }
    } catch (err) {
      console.error(i, e, err)
      process.exit()
    }
  })

loggerManager.mark("----^_^----")
loggerManager.mark(`Rabbit v${cfg.package.version} 启动中...`)

let stack
export default async function init() {
  if (stack !== undefined) return
  stack = ""

  const redis = await redisInit()
  const exit = process.exit
  process.exit = code => {
    stack = Error().stack
    return exit(code)
  }

  
  process.on("exit", code => {
    if (global.Bot && typeof global.Bot.makeLog === 'function') {
      global.Bot.makeLog(
        "mark",
        logger.magenta(`Rabbit 已停止运行，本次运行时长：${global.Bot.getTimeDiff()} (${code})`),
        "exit",
      )
      global.Bot.makeLog("trace", stack || Error().stack, "exit")
    } else {
      console.log(`Rabbit 已停止运行 (${code})`)
    }
  })
}
