import fs from "node:fs/promises"
import lodash from "lodash"
import cfg from "../config/config.js"
import plugin from "./plugin.js"
import schedule from "node-schedule"
import { segment } from "oicq"
import chokidar from "chokidar"
import moment from "moment"
import path from "node:path"
import Runtime from "./runtime.js"
import Handler from "./handler.js"
import pluginEngine, { PluginInfo } from "./plugin-engine.js"
import eventBus from "../common/event-bus.js"
import errorMapper from "../common/error-mapper.js"


global.plugin = plugin
global.segment = segment




class PluginsLoader {
  priority = []
  handler = {}
  task = []
  dir = "plugins"
  
  groupCD = {}
  singleCD = {}

  
  watcher = {}
  eventMap = {
    message: ["post_type", "message_type", "sub_type"],
    notice: ["post_type", "notice_type", "sub_type"],
    request: ["post_type", "request_type", "sub_type"],
  }

  msgThrottle = {}
  
  errorThrottle = {}
  
  replyDedup = {}
  
  
  engineSingleMap = {}

  async getPlugins() {
    const files = await fs.readdir(this.dir, { withFileTypes: true })
    const ret = []
    for (const val of files) {
      if (val.isFile()) continue
      const tmp = {
        name: val.name,
        path: `../../${this.dir}/${val.name}`,
      }


      if (await Bot.fsStat(`${this.dir}/${val.name}/index.js`)) {
        tmp.path = `${tmp.path}/index.js`
        ret.push(tmp)
        continue
      }

      const apps = await fs.readdir(`${this.dir}/${val.name}`, { withFileTypes: true })
      for (const app of apps) {
        if (!app.isFile()) continue
        
        const ext = path.extname(app.name).toLowerCase()
        const allow = val.name === "example" ? [".js", ".ts", ".py"] : [".js"]
        if (!allow.includes(ext)) continue
        ret.push({
          name: `${tmp.name}/${app.name}`,
          path: `${tmp.path}/${app.name}`,
        })
        
        this.watch(val.name, app.name)
      }
    }
    return ret
  }

  



  async load(isRefresh = false) {
    if (isRefresh) this.priority = []
    if (this.priority.length) return

    Bot.makeLog("info", "-----------", "Plugin")
    Bot.makeLog("info", "加载插件中...", "Plugin")

    const files = await this.getPlugins()
    this.pluginCount = 0
    const packageErr = []

    await Promise.allSettled(
      files.map(async file => {
        if (
          (await Bot.sleep(
            cfg.bot.plugin_load_timeout * 1000,
            this.importPlugin(file, packageErr),
          )) === Bot.sleepTimeout
        )
          Bot.makeLog("error", `插件加载超时 ${logger.red(file.name)}`, "Plugin")
      }),
    )

    this.packageTips(packageErr)
    this.createTask()

    Bot.makeLog("info", `加载定时任务[${this.task.length}个]`, "Plugin")
    
    try {
      const pe = global.rabbitCore?.pluginEngine || global.yunzaiCore?.pluginEngine || global.pluginEngine
      let pyCount = 0
      if (pe && typeof pe.getAllPlugins === 'function') {
        const ps = pe.getAllPlugins()
        
        Bot.makeLog("debug", `插件引擎扫描到 ${ps.length} 个插件`, "Plugin")
        if (ps.length > 0) {
          const pluginInfo = ps.map(p => `${p.id}(${p.language || 'unknown'}:${p.entry || 'no-entry'}:${p.status || 'no-status'})`).join(', ')
          Bot.makeLog("debug", `插件详情: ${pluginInfo}`, "Plugin")
        }
        
        const pyAll = ps.filter(p => (p?.language === 'python') || (typeof p?.entry === 'string' && p.entry.endsWith('.py')) || (p?.instance?.python === true))
        const pyLoaded = pyAll.filter(p => p?.status === 'loaded' || p?.status === 'running')
        
        pyCount = pyLoaded.length > 0 ? pyLoaded.length : pyAll.length
        if (pyAll.length > 0) {
          const pyInfo = pyAll.map(p => `${p.id}(${p.status})`).join(', ')
          Bot.makeLog("debug", `识别到的Python插件: ${pyInfo}`, "Plugin")
        }
      } else {
        Bot.makeLog("debug", `插件引擎不可用: pe=${!!pe}, getAllPlugins=${typeof pe?.getAllPlugins}`, "Plugin")
      }
      Bot.makeLog("info", `py插件加载[${pyCount}个]`, "Plugin")
    } catch (e) {
      Bot.makeLog("debug", `Python插件统计异常: ${e.message}`, "Plugin")
    }
    Bot.makeLog("info", `加载插件[${this.pluginCount}个]`, "Plugin")

    
    this.priority = lodash.orderBy(this.priority, ["priority"], ["asc"])
  }

  load_time = {}
  async importPlugin(file, packageErr) {
    const start_time = Date.now()
    try {
      
      const isNonJs = !file.path.endsWith('.js')
      if (isNonJs) {
        const [dirName, appName] = [file.name.split('/')[0], file.name.split('/').slice(1).join('/')]
        await this.importSingleFileViaEngine(dirName, appName)
        
        this.load_time[file.name] = Date.now() - start_time
        return
      }

      let app = await import(file.path)
      if (app.apps) app = { ...app.apps }
      const pluginArray = []
      lodash.forEach(app, p => pluginArray.push(this.loadPlugin(file, p)))
      for (const i of await Promise.allSettled(pluginArray))
        if (i?.status && i.status !== "fulfilled")
          Bot.makeLog("error", [`插件加载错误 ${logger.red(file.name)}`, i], "Plugin")
    } catch (error) {
      if (packageErr && error.stack.includes("Cannot find package")) {
        packageErr.push({ error, file })
      } else {
        Bot.makeLog("error", [`插件加载错误 ${logger.red(file.name)}`, error], "Plugin")
      }
    }
    this.load_time[file.name] = Date.now() - start_time
  }

  
  async importSingleFileViaEngine(dirName, appName) {
    try {
      const key = `${dirName}/${appName}`
      const base = path.basename(appName, path.extname(appName))
      const pluginId = `sf-${dirName}-${base}` 
      this.engineSingleMap[key] = pluginId

      const absDir = path.resolve(process.cwd(), this.dir, dirName)

      
      const ext = path.extname(appName).toLowerCase()
      if (ext === '.py' && pluginEngine?.config?.enableSandbox !== true) {
        try {
          await pluginEngine.init({ enableSandbox: true })
          Bot.makeLog("info", `已开启插件引擎沙箱模式以运行 Python 单文件插件`, "Plugin")
        } catch (e) {
          Bot.makeLog("warn", [`启用沙箱失败，Python 插件可能无法运行`, e?.message || e], "Plugin")
        }
      }

      const exist = typeof pluginEngine?.getPlugin === 'function' ? pluginEngine.getPlugin(pluginId) : null
      if (!exist) {
        
        const info = new PluginInfo({
          id: pluginId,
          name: `${dirName}/${appName}`,
          path: absDir,
          entry: appName,
        })
        await pluginEngine.registerPlugin(info)
        Bot.makeLog("info", `注册单文件插件 ${logger.cyan(info.id)} -> ${info.entry}`, "Plugin")
      }
      
      if (exist && (exist.status === 'loaded' || exist.status === 'running' || exist.status === 'error')) {
        await pluginEngine.reloadPlugin(pluginId).catch(async () => {
          
          try { await pluginEngine.unloadPlugin(pluginId) } catch {}
          await pluginEngine.loadPlugin(pluginId)
        })
      } else {
        await pluginEngine.loadPlugin(pluginId)
      }
      Bot.makeLog("info", `委派加载单文件插件 ${logger.cyan(pluginId)} (${appName})`, "Plugin")
    } catch (e) {
      Bot.makeLog("error", [`委派加载单文件插件失败 [${dirName}/${appName}]`, e], "Plugin")
    }
  }

  async loadPlugin(file, p) {
    if (!p?.prototype) return
    this.pluginCount++
    
    let plugin = new p()
    Bot.makeLog("debug", `加载插件 [${file.name}][${plugin.name}]`, "Plugin")
    
    if (plugin.init && (await plugin.init()) === "return") return
    
    this.collectTask(plugin.task, plugin.name, plugin)
    
    plugin = new p()
    
    if (plugin.rule)
      for (const i of plugin.rule) if (!(i.reg instanceof RegExp)) i.reg = new RegExp(i.reg)

    this.priority.push({
      plugin,
      class: p,
      key: file.name,
      name: plugin.name,
      priority: plugin.priority,
    })
    if (plugin.handler) {
      lodash.forEach(plugin.handler, ({ fn, key, priority }) => {
        Handler.add({
          ns: plugin.namespace || file.name,
          key,
          self: plugin,
          property: priority ?? plugin.priority,
          fn: plugin[fn],
        })
      })
    }
  }

  packageTips(packageErr) {
    if (!packageErr.length) return
    Bot.makeLog("error", "--------- 插件加载错误 ---------", "Plugin")
    for (const i of packageErr) {
      const pack = i.error.stack.match(/'(.+?)'/g)[0].replace(/'/g, "")
      Bot.makeLog("error", `${logger.cyan(i.file.name)} 缺少依赖 ${logger.red(pack)}`, "Plugin")
    }
    Bot.makeLog("error", `安装插件后请 ${logger.red("pnpm i")} 安装依赖`, "Plugin")
    Bot.makeLog("error", `仍报错${logger.red("进入插件目录")} pnpm add 依赖`, "Plugin")
    Bot.makeLog("error", "--------------------------------", "Plugin")
  }

  





  async deal(e) {
    this.count(e, "receive", e.message)
    
    
    try {
      const ev = await eventBus.emit('message:receive', e, { async: false, timeout: 15000, stopOnError: false })
      if (ev && Array.isArray(ev.results)) {
        
        const handled = ev.results.some(r => !!r?.result)
        if (handled) return
      }
    } catch (err) {
      Bot.makeLog("error", ["事件总线处理 message:receive 发生异常", err?.stack || err?.message || err], "Plugin")
    }

    
    if (!this.checkBlack(e)) return
    
    if (!this.checkLimit(e)) return
    
    this.dealEvent(e)
    
    this.reply(e)
    
    await Runtime.init(e)

    const priority = []
    for (const i of this.priority) {
      
      if (this.checkDisable(Object.assign(i.plugin, { e })) && this.filtEvent(e, i.plugin))
        priority.push(i)
    }

    for (const i of priority) {
      
      if (!i.plugin.getContext) continue
      const context = {
        ...i.plugin.getContext(),
        ...i.plugin.getContext(false, true),
      }
      if (!lodash.isEmpty(context)) {
        let ret
        for (const fnc in context)
          ret ||= await Object.assign(new i.class(e), { e })[fnc](context[fnc])
        if (ret === "continue") continue
        return
      }
    }

    
    if (!this.onlyReplyAt(e)) return
    
    this.setLimit(e)

    
    if (typeof global.pluginEngine?.getCommandHandler === 'function') {
      const commandHandler = global.pluginEngine.getCommandHandler(e.msg?.trim())
      if (commandHandler) {
        try {
          e.logFnc = `${logger.blue(`[插件引擎:${commandHandler.plugin}]`)}`
          Bot.makeLog(
            "info", 
            `${e.logText}${e.logFnc}${logger.yellow("[开始处理]")}`,
            false
          )
          
          const start_time = Date.now()
          const res = await commandHandler.handler(e)
          
          Bot.makeLog(
            "mark",
            `${e.logText}${e.logFnc}${logger.green(`[完成${Bot.getTimeDiff(start_time)}]`)}`,
            false
          )
          
          return 
        } catch (error) {
          Bot.makeLog("error", [`${e.logText}${e.logFnc}`, error], false)
          
          await this._maybeAutoReplyError(e, error, `engine:${commandHandler.plugin}`)
          return
        }
      }
    }

    
    for (const i of priority)
      if (i.plugin.accept) {
        const res = await Object.assign(new i.class(e), { e }).accept(e)
        if (res === "return") return
        if (res) break
      }

    for (const i of priority) {
      if (i.plugin.rule)
        for (const v of i.plugin.rule) {
          
          if (v.event && !this.filtEvent(e, v)) continue

          
          if (!v.reg.test(e.msg)) continue
          const plugin = Object.assign(new i.class(e), { e })
          e.logFnc = `${logger.blue(`[${plugin.name}(${v.fnc})]`)}`

          Bot.makeLog(
            v.log === false ? "debug" : "info",
            `${e.logText}${e.logFnc}${logger.yellow("[开始处理]")}`,
            false,
          )

          
          if (this.filtPermission(e, v))
            try {
              const start_time = Date.now()
              const res = plugin[v.fnc] && (await plugin[v.fnc](e))
              if (res === false) continue
              Bot.makeLog(
                v.log === false ? "debug" : "mark",
                `${e.logText}${e.logFnc}${logger.green(`[完成${Bot.getTimeDiff(start_time)}]`)}`,
                false,
              )
            } catch (err) {
              Bot.makeLog("error", [`${e.logText}${e.logFnc}`, err], false)
              
              await this._maybeAutoReplyError(e, err, i.plugin?.name || "unknown-plugin")
            }
          return
        }
    }

    Bot.makeLog("debug", `${e.logText}${logger.blue(`[暂无插件处理]`)}`, false)
  }

  
  filtEvent(e, v) {
    if (!v.event) return false
    const event = v.event.split(".")
    const eventMap = this.eventMap[e.post_type] || []
    const newEvent = []
    for (const i in event) {
      if (event[i] === "*") newEvent.push(event[i])
      else newEvent.push(e[eventMap[i]])
    }
    return v.event === newEvent.join(".")
  }

  
  filtPermission(e, v) {
    if (!v.permission || e.isMaster) return true

    if (v.permission === "master") {
      e.reply("暂无权限，只有主人才能操作")
      return false
    }

    if (e.isGroup) {
      if (v.permission === "owner" && !e.member.is_owner) {
        e.reply("暂无权限，只有群主才能操作")
        return false
      }
      if (v.permission === "admin" && !e.member.is_owner && !e.member.is_admin) {
        e.reply("暂无权限，只有管理员才能操作")
        return false
      }
    }

    return true
  }

  dealText(text = "") {
    if (cfg.bot["/→#"]) text = text.replace(/^\s*\/\s*/, "#")
    
    
    text = text.replace(/^(?:\s*[\[\(（【][^\]\)）】]{1,20}[\]\)）】]\s*)+/, "")
    return text
      .replace(/^\s*[＃井]\s*/, "#")
      .replace(/^\s*[＊※]\s*/, "*")
      .trim()
  }

  












  dealEvent(e) {
    if (e.message)
      for (const i of e.message) {
        switch (i.type) {
          case "text":
            e.msg = (e.msg || "") + this.dealText(i.text)
            break
          case "image":
            if (Array.isArray(e.img)) e.img.push(i.url)
            else e.img = [i.url]
            break
          case "at":
            if (i.qq == e.self_id) e.atBot = true
            else e.at = i.qq
            break
          case "reply":
            e.reply_id = i.id
            if (e.group?.getMsg) e.getReply = () => e.group.getMsg(e.reply_id)
            else if (e.friend?.getMsg) e.getReply = () => e.friend.getMsg(e.reply_id)
            break
          case "file":
            e.file = i
            break
          case "xml":
          case "json":
            e.msg = (e.msg || "") + (typeof i.data === "string" ? i.data : JSON.stringify(i.data))
            break
        }
      }

    e.logText = ""
    e.sender && (e.sender.card ||= e.sender.nickname)
    if (e.message_type === "private" || e.notice_type === "friend") {
      e.isPrivate = true
      e.logText = `[${e.sender?.nickname ? `${e.sender.nickname}(${e.user_id})` : e.user_id}]`

      if (!e.recall && e.message_id && e.friend?.recallMsg)
        e.recall = e.friend.recallMsg.bind(e.friend, e.message_id)
    } else if (e.message_type === "group" || e.notice_type === "group") {
      e.isGroup = true
      e.logText = `[${e.group_name ? `${e.group_name}(${e.group_id})` : e.group_id}, ${e.sender?.card ? `${e.sender.card}(${e.user_id})` : e.user_id}]`

      if (!e.recall && e.message_id && e.group?.recallMsg)
        e.recall = e.group.recallMsg.bind(e.group, e.message_id)
    }

    e.logText = `${logger.cyan(e.logText)}${logger.red(`[${lodash.truncate(e.msg || e.raw_message || Bot.String(e), { length: 100 })}]`)}`

    if (e.user_id && cfg.master[e.self_id]?.includes(String(e.user_id))) e.isMaster = true

    
    if (e.msg && e.isGroup && !e.atBot) {
      const alias = cfg.getGroup(e.self_id, e.group_id).botAlias
      for (const i of Array.isArray(alias) ? alias : [alias])
        if (e.msg.startsWith(i)) {
          e.msg = e.msg.replace(i, "")
          e.hasAlias = true
          break
        }
    }
  }

  
  reply(e) {
    if (!e.reply?.bind) return
    const reply = e.reply.bind(e)

    





    e.reply = async (msg = "", quote = false, data = {}) => {
      if (!msg) return false

      let { recallMsg = 0, at = "" } = data

      if (at && e.isGroup) {
        if (at === true) at = e.user_id
        if (Array.isArray(msg)) msg.unshift(segment.at(at), "\n")
        else msg = [segment.at(at), "\n", msg]
      }

      if (quote && e.message_id) {
        if (Array.isArray(msg)) msg.unshift(segment.reply(e.message_id))
        else msg = [segment.reply(e.message_id), msg]
      }

      
      const extractText = (m) => {
        try {
          if (Array.isArray(m)) {
            const parts = []
            for (const it of m) {
              if (typeof it === 'string') parts.push(it)
              else if (it && typeof it === 'object') {
                const t = it.type
                
                if (t === 'text' && it.data?.text) parts.push(String(it.data.text))
              }
            }
            return parts.join('').trim()
          }
          if (typeof m === 'string') return m.trim()
          return ''
        } catch { return '' }
      }
      const dedupText = extractText(msg)
      const dedupKey = `${e.self_id || ''}:${e.group_id || e.user_id || ''}:${dedupText}`
      if (dedupText) {
        const last = this.replyDedup[dedupKey]
        if (last && Date.now() - last < 1000) {
          
          e.$hasReplied = true
          e.$lastReplyAt = Date.now()
          return false
        }
        this.replyDedup[dedupKey] = Date.now()
        setTimeout(() => delete this.replyDedup[dedupKey], 5000)
      }

      let res
      try {
        res = await reply(msg)
      } catch (err) {
        Bot.makeLog("error", ["发送消息错误", msg, err], e.self_id)
        res = { error: [err] }
      }

      if (recallMsg > 0 && res?.message_id) {
        if (e.group?.recallMsg)
          setTimeout(() => {
            e.group.recallMsg(res.message_id)
            if (e.message_id) e.group.recallMsg(e.message_id)
          }, recallMsg * 1000)
        else if (e.friend?.recallMsg)
          setTimeout(() => {
            e.friend.recallMsg(res.message_id)
            if (e.message_id) e.friend.recallMsg(e.message_id)
          }, recallMsg * 1000)
      }

      
      e.$hasReplied = true
      e.$lastReplyAt = Date.now()
      this.count(e, "send", msg)
      return res
    }
  }

  async count(e, type, msg) {
    if (cfg.bot.msg_type_count)
      for (const i of Array.isArray(msg) ? msg : [msg])
        await this.saveCount(e, `${type}:${i?.type || "text"}`)
    await this.saveCount(e, `${type}:msg`)
  }

  




  async _maybeAutoReplyError(e, err, tag = "") {
    try {
      
      if (e.$hasReplied) return
      const rawKey = `${e.self_id || ''}:${e.user_id || ''}:${e.group_id || ''}:${tag}`
      const key = `${rawKey}:${String(err?.message || err).slice(0,128)}`
      if (this.errorThrottle[key]) return
      
      this.errorThrottle[key] = true
      setTimeout(() => delete this.errorThrottle[key], 5000)

      const msg = errorMapper(err)
      
      await e.reply(msg)
    } catch (e2) {
      Bot.makeLog("error", ["自动回复错误信息失败", e2], false)
    }
  }

  async saveCount(e, type) {
    const key = []

    const day = moment().format("YYYY:MM:DD")
    const month = moment().format("YYYY:MM")
    const year = moment().format("YYYY")
    for (const i of [day, month, year, "total"]) {
      key.push(`total:${i}`)
      if (e.self_id) key.push(`bot:${e.self_id}:${i}`)
      if (e.user_id) key.push(`user:${e.user_id}:${i}`)
      if (e.group_id) key.push(`group:${e.group_id}:${i}`)
    }

    for (const i of key) await redis.incr(`Yz:count:${type}:${i}`)
  }

  
  collectTask(task, name, instance) {
    if (!task) return
    for (const i of Array.isArray(task) ? task : [task])
      if (i.cron && i.fnc) {
        i.name ??= name
        
        if (typeof i.fnc === "string") {
          const fn = instance?.[i.fnc]
          if (typeof fn === "function") {
            i.fnc = fn.bind(instance)
          } else {
            Bot.makeLog(
              "warn",
              `定时任务 ${logger.blue(`[${i.name}(${i.cron})]`)} 的 fnc=${logger.red(i.fnc)} 不是有效方法，已跳过`,
              "Task",
            )
            continue
          }
        } else if (typeof i.fnc !== "function") {
          
          Bot.makeLog(
            "warn",
            `定时任务 ${logger.blue(`[${i.name}(${i.cron})]`)} 的 fnc 非函数，已跳过`,
            "Task",
          )
          continue
        }
        this.task.push(i)
      }
  }

  async startTask(name, i) {
    try {
      const start_time = Date.now()
      Bot.makeLog(
        i.log === false ? "debug" : "mark",
        `${name}${logger.yellow("[开始处理]")}`,
        false,
      )
      await i.fnc()
      Bot.makeLog(
        i.log === false ? "debug" : "mark",
        `${name}${logger.green(`[完成${Bot.getTimeDiff(start_time)}]`)}`,
        false,
      )
    } catch (err) {
      Bot.makeLog("error", [name, err], false)
    }
  }

  
  createTask() {
    const created = new Set()
    for (const i of this.task) {
      if (i.job?.cancel) i.job.cancel()
      const name = `${logger.blue(`[${i.name}(${i.cron})]`)}`
      if (created.has(name)) {
        Bot.makeLog("warn", `重复定时任务 ${name} 已跳过`, "Task")
        continue
      }
      created.add(name)
      Bot.makeLog("debug", `加载定时任务 ${name}`, "Task")
      i.job = schedule.scheduleJob(
        i.cron.split(/\s+/).slice(0, 6).join(" "),
        this.startTask.bind(this, name, i),
      )
    }
  }

  
  checkLimit(e) {
    
    if (
      e.group &&
      (e.group.mute_left > 0 || (e.group.all_muted && !e.group.is_admin && !e.group.is_owner))
    )
      return false
    if (!e.message || e.isPrivate) return true

    const config = cfg.getGroup(e.self_id, e.group_id)

    if (config.groupCD && this.groupCD[e.group_id]) return false

    if (config.singleCD && this.singleCD[`${e.group_id}.${e.user_id}`]) return false

    const msgId = `${e.self_id}:${e.user_id}:${e.raw_message}`
    if (this.msgThrottle[msgId]) return false

    this.msgThrottle[msgId] = true
    setTimeout(() => delete this.msgThrottle[msgId], 1000)

    return true
  }

  
  setLimit(e) {
    if (e.isPrivate) return
    const config = cfg.getGroup(e.self_id, e.group_id)

    if (config.groupCD) {
      this.groupCD[e.group_id] = true
      setTimeout(() => delete this.groupCD[e.group_id], config.groupCD)
    }
    if (config.singleCD) {
      const key = `${e.group_id}.${e.user_id}`
      this.singleCD[key] = true
      setTimeout(() => delete this.singleCD[key], config.singleCD)
    }
  }

  
  onlyReplyAt(e) {
    if (!e.message || e.isPrivate) return true

    let groupCfg = cfg.getGroup(e.self_id, e.group_id)

    
    if (groupCfg.onlyReplyAt === 0 || !groupCfg.botAlias) return true

    
    if (groupCfg.onlyReplyAt === 2 && e.isMaster) return true

    
    if (e.atBot) return true

    
    if (e.hasAlias) return true

    return false
  }

  
  checkBlack(e) {
    const other = cfg.getOther()

    
    if (other.blackUser?.length && other.blackUser.includes(Number(e.user_id) || String(e.user_id)))
      return false
    
    if (
      other.whiteUser?.length &&
      !other.whiteUser.includes(Number(e.user_id) || String(e.user_id))
    )
      return false

    if (e.group_id) {
      
      if (
        other.blackGroup?.length &&
        other.blackGroup.includes(Number(e.group_id) || String(e.group_id))
      )
        return false
      
      if (
        other.whiteGroup?.length &&
        !other.whiteGroup.includes(Number(e.group_id) || String(e.group_id))
      )
        return false
    }

    return true
  }

  
  checkDisable(p) {
    const groupCfg = cfg.getGroup(p.e.self_id, p.e.group_id)
    if (groupCfg.disable?.length && groupCfg.disable.includes(p.name)) return false
    if (groupCfg.enable?.length && !groupCfg.enable.includes(p.name)) return false
    return true
  }

  async changePlugin(key) {
    try {
      let app = await import(`../../${this.dir}/${key}?${moment().format("x")}`)
      if (app.apps) app = { ...app.apps }
      lodash.forEach(app, p => {
        if (!p?.prototype) return
        const plugin = new p()
        if (plugin.rule)
          for (const i of plugin.rule) if (!(i.reg instanceof RegExp)) i.reg = new RegExp(i.reg)
        for (const i of this.priority)
          if (i.key === key && i.name === plugin.name)
            Object.assign(i, {
              plugin,
              class: p,
              priority: plugin.priority,
            })
      })
      this.priority = lodash.orderBy(this.priority, ["priority"], ["asc"])
    } catch (err) {
      Bot.makeLog("error", [`插件加载错误 ${logger.red(key)}`, err], "Plugin")
    }
  }

  
  watch(dirName, appName) {
    this.watchDir(dirName)
    if (this.watcher[`${dirName}.${appName}`]) return

    const file = `./${this.dir}/${dirName}/${appName}`
    const watcher = chokidar.watch(file)
    const key = `${dirName}/${appName}`

    const ext = path.extname(appName).toLowerCase()

    if (ext !== '.js') {
      
      watcher.on(
        "change",
        lodash.debounce(async () => {
          const pluginId = this.engineSingleMap[key] || `sf-${dirName}-${path.basename(appName, ext)}`
          Bot.makeLog("mark", `[修改插件][${dirName}][${appName}] (engine)`, "Plugin")
          try {
            await pluginEngine.reloadPlugin(pluginId)
          } catch (err) {
            Bot.makeLog("warn", [`重载失败，尝试重新加载 ${logger.cyan(pluginId)}`, err], "Plugin")
            try { await pluginEngine.unloadPlugin(pluginId) } catch {}
            try { await pluginEngine.loadPlugin(pluginId) } catch (e) {
              Bot.makeLog("error", [`重新加载失败 ${logger.cyan(pluginId)}`, e], "Plugin")
            }
          }
        }, 5000),
      )

      watcher.on(
        "unlink",
        lodash.debounce(async () => {
          const pluginId = this.engineSingleMap[key] || `sf-${dirName}-${path.basename(appName, ext)}`
          Bot.makeLog("mark", `[卸载插件][${dirName}][${appName}] (engine)`, "Plugin")
          try { await pluginEngine.unloadPlugin(pluginId) } catch {}
          delete this.engineSingleMap[key]
        }, 5000),
      )

      this.watcher[`${dirName}.${appName}`] = watcher
      return
    }

    
    watcher.on(
      "change",
      lodash.debounce(() => {
        Bot.makeLog("mark", `[修改插件][${dirName}][${appName}]`, "Plugin")
        this.changePlugin(key)
      }, 5000),
    )

    
    watcher.on(
      "unlink",
      lodash.debounce(async () => {
        Bot.makeLog("mark", `[卸载插件][${dirName}][${appName}]`, "Plugin")
        
        this.watcher[`${dirName}.${appName}`].removeAllListeners("change")
        this.priority = this.priority.filter(i => i.key !== key)
      }, 5000),
    )
    this.watcher[`${dirName}.${appName}`] = watcher
  }

  
  watchDir(dirName) {
    if (this.watcher[dirName]) return
    const watcher = chokidar.watch(`./${this.dir}/${dirName}/`)
    
    Bot.once("online", () => {
      
      watcher.on(
        "add",
        lodash.debounce(async PluPath => {
          const appName = path.basename(PluPath)
          const ext = path.extname(appName).toLowerCase()
          const allow = dirName === "example" ? [".js", ".ts", ".py"] : [".js"]
          if (!allow.includes(ext)) return

          Bot.makeLog("mark", `[新增插件][${dirName}][${appName}]`, "Plugin")
          const key = `${dirName}/${appName}`

          if (ext === '.js') {
            await this.importPlugin({
              name: key,
              path: `../../${this.dir}/${key}?${moment().format("X")}`,
            })
            
            this.priority = lodash.orderBy(this.priority, ["priority"], ["asc"])
          } else {
            await this.importSingleFileViaEngine(dirName, appName)
          }

          this.watch(dirName, appName)
        }, 5000),
      )
    })
    this.watcher[dirName] = watcher
  }
}

export default new PluginsLoader()
