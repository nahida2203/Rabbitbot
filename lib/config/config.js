import YAML from "yaml"
import fs from "node:fs"
import chokidar from "chokidar"
import _ from "lodash"
import EventEmitter from "node:events"


export default new (class Cfg {
  constructor() {
    this.config = {}
    this.watcher = {}
    this.initCfg()

    if (this.getAllCfg("bot").file_watch === false) {
      class FSWatcher extends EventEmitter {
        constructor() {
          super()
        }
        on() {
          return this
        }
        addListener() {
          return this
        }
        start() {}
        close() {}
        ref() {
          return this
        }
        unref() {
          return this
        }
      }
      const watch = new FSWatcher()
      fs.watch = () => watch
      chokidar.watch = () => watch
      chokidar.FSWatcher = FSWatcher

      for (const i in this.watcher) {
        this.watcher[i].close()
        delete this.watcher[i]
      }
      this.watch = () => {}
    }

    return new Proxy(this, {
      get: (target, prop) => target[prop] ?? target.getAllCfg(String(prop)),
    })
  }

  
  initCfg() {
    const path = "config/config/"
    const pathDef = "config/default_config/"
    const files = fs.readdirSync(pathDef).filter(file => file.endsWith(".yaml"))
    for (const file of files)
      if (!fs.existsSync(`${path}${file}`)) fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
    for (const i of ["data", "temp"]) if (!fs.existsSync(i)) fs.mkdirSync(i)
  }

  
  get masterQQ() {
    const other = this.getAllCfg("other")
    if (other.masterQQs) return other.masterQQs
    let masterQQ = other.masterQQ || []

    if (!Array.isArray(masterQQ)) masterQQ = [masterQQ]

    return (this.config["config.other"].masterQQs = masterQQ.map(i => Number(i) || i))
  }

  
  get master() {
    const other = this.getAllCfg("other")
    if (other.masters) return other.masters
    let master = other.master || []

    if (!Array.isArray(master)) master = [master]

    const masters = {}
    for (let i of master) {
      i = i.split(":")
      const bot_id = i.shift()
      const user_id = i.join(":")
      if (Array.isArray(masters[bot_id])) masters[bot_id].push(user_id)
      else masters[bot_id] = [user_id]
    }

    
    let filtered = masters
    try {
      const uinList = process.env.UIN_LIST
      const botUin = process.env.BOT_UIN
      const idxStr = process.env.BOT_INDEX ?? process.env.NODE_APP_INSTANCE

      
      if (uinList && typeof uinList === 'string') {
        const allow = new Set(uinList.split(',').map(s => s.trim()).filter(Boolean))
        filtered = Object.fromEntries(Object.entries(masters).filter(([k]) => allow.has(String(k))))
      } else if (botUin) {
        
        const key = String(botUin)
        if (masters[key]) filtered = { [key]: masters[key] }
        else filtered = {}
      } else if (idxStr !== undefined) {
        
        const uins = Object.keys(masters)
        if (uins.length > 0) {
          const idx = Math.abs(parseInt(idxStr, 10)) || 0
          const strategy = (process.env.SHARD_STRATEGY?.toLowerCase?.() === 'strict' || process.env.STRICT_SHARDING === '1') ? 'strict' : 'mod'
          if (strategy === 'strict') {
            if (idx >= uins.length) {
              filtered = {}
            } else {
              const pick = uins[idx]
              filtered = { [pick]: masters[pick] }
            }
          } else {
            const pick = uins[idx % uins.length]
            filtered = { [pick]: masters[pick] }
          }
        }
      }
    } catch {}

    return (this.config["config.other"].masters = filtered)
  }

  
  get uin() {
    return Object.keys(this.master)
  }
  get qq() {
    return this.uin
  }

  
  get server() {
    const s = { ...(this.getAllCfg("server") || {}) }
    
    const idxStr = process.env.BOT_INDEX ?? process.env.NODE_APP_INSTANCE
    const idx = Number.isFinite(Number(idxStr)) ? Math.abs(parseInt(idxStr, 10)) : 0
    const sharding = !["0", "false", "off"].includes(String(process.env.PORT_SHARDING || "1").toLowerCase())

    const baseHttp = Number(process.env.SERVER_PORT || process.env.PORT || s.port) || s.port
    const baseHttps = Number(process.env.SERVER_HTTPS_PORT || s.https?.port) || s.https?.port

    if (typeof baseHttp !== 'undefined') {
      s.port = sharding ? (Number(baseHttp) + (idx || 0)) : Number(baseHttp)
    }
    if (s.https && typeof baseHttps !== 'undefined') {
      s.https.port = sharding ? (Number(baseHttps) + (idx || 0)) : Number(baseHttps)
    }

    
    const host = process.env.SERVER_HOST || process.env.HOST || s.host
    if (host) s.host = host

    const url = process.env.SERVER_URL || s.url
    if (!url) {
      const scheme = s.https?.enabled ? 'https' : 'http'
      const h = s.host || process.env.SERVER_HOST || '127.0.0.1'
      const p = (scheme === 'https' ? s.https?.port : s.port) || ''
      const portPart = p ? `:${p}` : ''
      s.url = `${scheme}://${h}${portPart}`
    } else {
      s.url = url
    }

    
    if (process.env.SERVER_REDIRECT) s.redirect = process.env.SERVER_REDIRECT

    return s
  }

  
  get package() {
    if (this._package) return this._package
    return (this._package = JSON.parse(fs.readFileSync("package.json", "utf8")))
  }

  
  getGroup(bot_id = "", group_id = "") {
    const config = this.getAllCfg("group")
    return {
      ...config.default,
      ...config[`${bot_id}:default`],
      ...config[group_id],
      ...config[`${bot_id}:${group_id}`],
    }
  }

  
  getOther() {
    return this.getAllCfg("other")
  }

  



  getdefSet(name) {
    return this.getYaml("default_config", name)
  }

  
  getConfig(name) {
    return this.getYaml("config", name)
  }

  getAllCfg(name) {
    return {
      ...this.getdefSet(name),
      ...this.getConfig(name),
    }
  }

  




  getYaml(type, name) {
    const key = `${type}.${name}`
    if (key in this.config) return this.config[key]
    const file = `config/${type}/${name}.yaml`

    try {
      this.config[key] = YAML.parse(fs.readFileSync(file, "utf8"))
    } catch (err) {
      
      if (global.Bot && typeof global.Bot.makeLog === 'function') {
        global.Bot.makeLog("trace", ["读取配置文件", file, "错误", err], "Config")
      } else {
        console.warn(`[Config] 读取配置文件 ${file} 错误:`, err)
      }
      return (this.config[key] = undefined)
    }

    this.watch(file, name, type)
    return this.config[key]
  }

  
  watch(file, name, type = "default_config") {
    const key = `${type}.${name}`
    if (this.watcher[key]) return

    this.watcher[key] = chokidar.watch(file)
    this.watcher[key].on(
      "change",
      _.debounce(() => {
        delete this.config[key]
        
        if (global.Bot && typeof global.Bot.makeLog === 'function') {
          global.Bot.makeLog("mark", `[修改配置文件][${type}][${name}]`, "Config")
        } else {
          console.log(`[Config] 修改配置文件 [${type}][${name}]`)
        }
        if (`change_${name}` in this) this[`change_${name}`]()
      }, 5000),
    )
  }

  async change_bot() {
    
    ;(await import("./log.js")).default()
  }
})()
