import init from "./config/init.js"
import cfg from "./config/config.js"
import PluginsLoader from "./plugins/loader.js"
import ListenerLoader from "./listener/loader.js"
import { EventEmitter } from "events"
import util from "./util.js"
import express from "express"
import http from "node:http"
import { WebSocketServer } from "ws"
import fs from "node:fs/promises"
import fetch from "node-fetch"
import { ulid } from "ulid"
import { monitorEventLoopDelay } from "node:perf_hooks"
import { webUIManager, init as coreInit, getHealth as coreGetHealth } from "./core/index.js"
import imageBedManager from "./common/image-bed.js"

import verificationHandler from "./api/verification-handler.js"
import rateLimit from "express-rate-limit"

import apiManager from "./api/api-manager.js"

class Rabbit extends EventEmitter {
  stat = { start_time: Date.now() / 1000, online: 0 }
  bot = this
  bots = {}
  uin = Object.assign([], {
    toJSON() {
      if (!this.now) {
        switch (this.length) {
          case 0:
            return ""
          case 1:
          case 2:
            return this[this.length - 1]
        }
        const array = this.slice(1)
        this.now = array[Math.floor(Math.random() * array.length)]
        setTimeout(() => delete this.now, 60000)
      }
      return this.now
    },
    toString(raw, ...args) {
      return raw === true
        ? this.__proto__.toString.apply(this, args)
        : this.toJSON().toString(raw, ...args)
    },
    includes(value) {
      return this.some(i => i == value)
    },
  })
  adapter = []

  express = Object.assign(express(), { skip_auth: ["/api"], quiet: [] })
    .use(this.serverAuth.bind(this))
    .use("/status", this.serverStatus.bind(this))
    .use(express.urlencoded({ extended: false }))
    .use(express.json())
    .use(express.raw())
    .use(express.text())
    .use((req, res, next) => {
      try {
        const xfProto = req.headers["x-forwarded-proto"]
        const isHttps = xfProto === "https" || req.protocol === "https"
        if (this.httpsServer && !isHttps) {
          const host = req.headers.host
          return res.redirect(301, `https://${host}${req.originalUrl}`)
        }
        if (this.httpsServer || isHttps) {
          res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        }
      } catch {}
      next()
    })
    .use(rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
      max: Number(process.env.RATE_LIMIT_MAX || 600),
      standardHeaders: true,
      legacyHeaders: false
    }))
    .use(this.serverHandle.bind(this))
    .use("/exit", this.serverExit.bind(this))
    .use("/File", this.fileSend.bind(this))
    
    .use(apiManager.app)

  server = http
    .createServer(this.express)
    .on("error", err => {
      if (typeof this[`server${err.code}`] === "function") return this[`server${err.code}`](err)
      util.makeLog("error", err, "Server")
    })
    .on("upgrade", this.wsConnect.bind(this))

  
  wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024, perMessageDeflate: false })
  wsf = Object.create(null)
  fs = Object.create(null)

  constructor() {
    super()

    
    this.setMaxListeners(100)

    for (const name of [404, "timeout"])
      this.fileToUrl(`resources/http/File/${name}.jpg`, { name, time: false, times: false })

    return new Proxy(this.bots, {
      get: (target, prop) => {
        const value = this[prop] ?? util[prop] ?? target[prop]
        if (value !== undefined) return value
        for (const i of [this.uin.toString(), ...this.uin])
          if (target[i]?.[prop] !== undefined) {
            util.makeLog("trace", `因不存在 Bot.${prop} 而重定向到 Bot.${i}.${prop}`)
            if (typeof target[i][prop]?.bind === "function") return target[i][prop].bind(target[i])
            return target[i][prop]
          }
        util.makeLog("trace", `不存在 Bot.${prop}`)
      },
    })
  }

  serverAuth(req) {
    if (this.stat.online !== 2) return this.once("online", this.serverAuth.bind(this, req))

    req.rid ??= `${req.ip}:${req.socket.remotePort}`
    req.sid ??= `${req.protocol}://${req.hostname}:${req.socket.localPort}${req.originalUrl}`
    if (!cfg.server.auth || !Object.keys(cfg.server.auth).length) return req.next?.()

    for (const i of req.app?.skip_auth || []) if (req.originalUrl.startsWith(i)) return req.next()

    for (const i in cfg.server.auth) {
      if (
        req.headers[i.toLowerCase()] === cfg.server.auth[i] ||
        req.query[i] === cfg.server.auth[i]
      )
        continue
      req.res?.sendStatus(401)

      
      const _headers = { ...req.headers }
      for (const k of ['authorization','x-token','x-onebot-token','cookie']) if (_headers[k]) _headers[k] = '***'
      const _query = { ...req.query }
      for (const k of ['access_token','token']) if (_query[k]) _query[k] = '***'
      const msg = { headers: _headers }
      if (Object.keys(_query).length) msg.query = _query
      util.makeLog(
        "error",
        ["HTTP", req.method, "请求", i, "鉴权失败", msg],
        `${req.sid} <≠ ${req.rid}`,
        true,
      )
      return false
    }
    req.next?.()
  }

  serverStatus(req) {
    req.res.type("json")
    req.res.send(
      JSON.stringify(process.report.getReport()).replace(
        /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g,
        "[IPv4]",
      ),
    )
  }

  serverHandle(req) {
    let quiet = false
    for (const i of req.app.quiet)
      if (req.originalUrl.startsWith(i)) {
        quiet = true
        break
      }

    const msg = { headers: req.headers }
    for (const i of ["query", "body"]) if (Object.keys(req[i]).length) msg[i] = req[i]
    util.makeLog(
      quiet ? "debug" : "mark",
      ["HTTP", req.method, "请求", msg],
      `${req.sid} <= ${req.rid}`,
      true,
    )
    req.next()
  }

  async serverExit(req) {
    if (req.ip !== "::1" && req.ip !== "::ffff:127.0.0.1") return
    this.exit(1)
  }

  wsConnect(req, socket, head) {
    if (this.stat.online !== 2)
      return this.once("online", this.wsConnect.bind(this, req, socket, head))

    
    const isSecure = !!req.socket.encrypted || req.headers["x-forwarded-proto"] === "https"

    
    if (this.httpsServer && !isSecure) {
      socket.write("HTTP/1.1 426 Upgrade Required\r\nConnection: close\r\n\r\nUse WSS (wss://) instead of WS.\r\n")
      return socket.destroy()
    }

    
    const origin = req.headers.origin || req.headers["sec-websocket-origin"] || ""
    const allowEnv = (process.env.WS_ALLOWED_ORIGINS || "").trim()
    if (allowEnv && allowEnv !== "*") {
      const allowList = allowEnv.split(",").map(s => s.trim()).filter(Boolean)
      if (!allowList.includes(origin)) {
        util.makeLog("warn", ["拒绝不在白名单中的 WebSocket 来源", origin], "WS")
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\nOrigin not allowed.\r\n")
        return socket.destroy()
      }
    }

    
    this._wsConnCounts ||= new Map()
    const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    const ipRaw = xff || req.socket.remoteAddress || 'unknown'
    const ip = ipRaw && ipRaw.startsWith('::ffff:') ? ipRaw.slice(7) : ipRaw
    const now = Date.now()
    const windowMs = 60 * 1000
    const maxPerMin = Number(process.env.WS_MAX_CONNECTIONS_PER_MIN || 30)
    let bucket = this._wsConnCounts.get(ip) || []
    bucket = bucket.filter(t => now - t < windowMs)
    if (bucket.length >= maxPerMin) {
      util.makeLog("warn", ["WebSocket 握手过于频繁，已拒绝", ip], "WS")
      socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\nRate limit exceeded.\r\n")
      return socket.destroy()
    }
    bucket.push(now)
    this._wsConnCounts.set(ip, bucket)

    req.rid = `${req.socket.remoteAddress}:${req.socket.remotePort}-${req.headers["sec-websocket-key"]}`
    const scheme = isSecure ? "wss" : "ws"
    req.sid = `${scheme}://${req.headers["x-forwarded-host"] || req.headers.host || `${req.socket.localAddress}:${req.socket.localPort}`}${req.url}`
    req.query = Object.fromEntries(new URL(req.sid).searchParams.entries())
    if (this.serverAuth(req) === false) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n")
      return socket.destroy()
    }

    const msg = { headers: req.headers }
    if (Object.keys(req.query).length) msg.query = req.query

    const path = req.url.split("/")[1]
    
    
    if (path === 'ws') {
      return
    }
    
    
    const onebotPath = (process.env.ONEBOTV11_PATH || 'OneBotv11').replace(/^\//, '')
    if (path === onebotPath) {
          const xfip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
          const remoteRaw = xfip || req.socket.remoteAddress
          const remote = remoteRaw && remoteRaw.startsWith('::ffff:') ? remoteRaw.slice(7) : remoteRaw
          const isLocal = remote === '::1' || remote === '127.0.0.1'
       const trusted = (process.env.ONEBOTV11_TRUSTED_IPS || '').split(',').map(s=>s.trim()).filter(Boolean)
       const tokenEnv = (process.env.ONEBOTV11_TOKEN || '').trim()
       const bearer = (req.headers['authorization'] || '').startsWith('Bearer ') ? String(req.headers['authorization']).slice(7) : ''
       const tokenFromReq = req.query.access_token || bearer || req.headers['x-onebot-token'] || req.headers['x-token']
       if (!isLocal && !trusted.includes(remote)) {
         
         if (!tokenEnv || tokenFromReq !== tokenEnv) {
           
           util.makeLog('warn', ['[注意] 收到来自非本地/未信任 IP 的 OneBotv11 连接，已放行。IP:', remote, 'Token匹配:', tokenFromReq === tokenEnv], 'WS')
           
           
           
           
         }
       }
    }
    
    
    util.makeLog("mark", ["收到 WS 连接请求，路径:", path], "DEBUG")

    if (!(path in this.wsf)) {
      util.makeLog(
        "error",
        ["WebSocket 处理器", path, "不存在", msg],
        `${req.sid} <≠> ${req.rid}`,
        true,
      )
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n")
      return socket.destroy()
    }

    this.wss.handleUpgrade(req, socket, head, conn => {
      util.makeLog("mark", ["建立连接", msg], `${req.sid} <=> ${req.rid}`, true)
      conn.on("error", (...args) => util.makeLog("error", args, `${req.sid} <=> ${req.rid}`, true))
      conn.on("close", () => util.makeLog("mark", "断开连接", `${req.sid} <≠> ${req.rid}`, true))
      conn.on("message", msg =>
        util.makeLog("debug", ["消息", util.String(msg)], `${req.sid} <= ${req.rid}`, true),
      )
      conn.sendMsg = msg => {
        if (!Buffer.isBuffer(msg)) msg = util.String(msg)
        util.makeLog("debug", ["消息", msg], `${req.sid} => ${req.rid}`, true)
        return conn.send(msg)
      }
      for (const i of this.wsf[path]) i(conn, req, socket, head)
    })
  }

  async serverEADDRINUSE(err, https) {
    util.makeLog(
      "error",
      ["监听端口", https ? cfg.server.https.port : cfg.server.port, "错误", err],
      "Server",
    )
    if (https) return
    try {
      await fetch(`http://localhost:${cfg.server.port}/exit`, {
        headers: cfg.server.auth || undefined,
      })
    } catch {}
    this.server_listen_time = (this.server_listen_time || 0) + 1
    await util.sleep(this.server_listen_time * 1000)
    this.server.listen(cfg.server.port)
  }

  async serverLoad(https) {
    const server = https ? "httpsServer" : "server"
    const host = cfg.server?.host
    if (host) this[server].listen(https ? cfg.server.https.port : cfg.server.port, host)
    else this[server].listen(https ? cfg.server.https.port : cfg.server.port)
     try {
       await util.promiseEvent(this[server], "listening", https && "error")
     } catch (err) {
       return
     }
     const { address, port } = this[server].address()
     util.makeLog(
       "mark",
       [
         `启动 HTTP${https ? "S" : ""} 服务器`,
         logger.green(`http${https ? "s" : ""}://[${address}]:${port}`),
       ],
       "Server",
     )
     
     const _idx = process.env.BOT_INDEX ?? process.env.NODE_APP_INSTANCE
     util.makeLog("debug", ["实例索引", _idx ?? "-", "监听端口", port], "Server")
     this.url = (https && cfg.server.https.url) || cfg.server.url
   }

  async httpsLoad() {
    try {
      this.httpsServer = (await import("node:https"))
        .createServer(
          {
            key: await fs.readFile(cfg.server.https.key),
            cert: await fs.readFile(cfg.server.https.cert),
          },
          this.express,
        )
        .on("error", err => {
          if (typeof this[`server${err.code}`] === "function")
            return this[`server${err.code}`](err, true)
          util.makeLog("error", err, "Server")
        })
        .on("upgrade", this.wsConnect.bind(this))
      return this.serverLoad(true)
    } catch (err) {
      util.makeLog("error", ["创建 HTTPS 服务器错误", err], "Server")
    }
  }

  async run() {
    if (this.stat.online !== 0) {
      return
    }
    this.stat.online = 1
    await init()
    
    try {
      await coreInit({
        pluginEngine: cfg.getAllCfg('plugin')
      })
    } catch (error) {
      console.error('核心系统初始化失败:', error)
      throw error
    }
    await this.serverLoad()
    if (cfg.server.https && cfg.server.https.key && cfg.server.https.cert) await this.httpsLoad()
    
    
    if (Array.isArray(this.express.skip_auth)) {
      for (const p of ['/status', '/api/health', '/api/system/info']) {
        if (!this.express.skip_auth.includes(p)) this.express.skip_auth.push(p)
      }
    }

    
    this.express.use('/api', (req, res, next) => {
      
      const env = (process.env.API_ALLOWED_ORIGINS || '').trim()
      let allowed = []
      if (env) allowed = env.split(',').map(s => s.trim()).filter(Boolean)
      const origin = req.headers.origin
      const host = req.headers.host
      const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))
      const isSameOrigin = origin && origin === `http${req.secure ? 's' : ''}://${host}`
      
      if (!origin || (allowed.length === 0 && (isSameOrigin || isLocalhost)) || (allowed.length > 0 && (allowed.includes(origin) || allowed.includes('*')))) {
        if (origin) res.header('Access-Control-Allow-Origin', origin)
        res.header('Vary', 'Origin')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With')
        res.header('Access-Control-Allow-Credentials', 'true')
        if (req.method === 'OPTIONS') {
          return res.sendStatus(200)
        }
        return next()
      }
      return res.status(403).send('Origin not allowed')
    })
    
    
    if (!this._eventLoopDelay) {
      try {
        this._eventLoopDelay = monitorEventLoopDelay({ resolution: 20 })
        this._eventLoopDelay.enable()
      } catch (err) {
        util.makeLog("warn", ["事件循环延迟监控不可用", err?.message || err], "Server")
      }
    }

    
    this.express.get('/api/health', async (req, res) => {
      try {
        const instanceIndex = process.env.BOT_INDEX ?? process.env.NODE_APP_INSTANCE
        const coreHealth = typeof coreGetHealth === 'function' ? await coreGetHealth() : null
        const data = {
          status: (coreHealth && coreHealth.status) ? coreHealth.status : 'ok',
          timestamp: Date.now(),
          uptime: process.uptime(),
          pid: process.pid,
          instanceIndex: (instanceIndex !== undefined && instanceIndex !== null) ? Number(instanceIndex) : null,
          ports: {
            http: cfg.server?.port,
            https: cfg.server?.https?.port
          },
          url: (this.httpsServer && cfg.server?.https?.url) || cfg.server?.url || this.url,
          memory: process.memoryUsage(),
          core: coreHealth || undefined,
          eventLoopDelay: this._eventLoopDelay ? {
            min: Number(this._eventLoopDelay.min || 0),
            max: Number(this._eventLoopDelay.max || 0),
            mean: Number(this._eventLoopDelay.mean || 0),
            stddev: Number(this._eventLoopDelay.stddev || 0),
            exceeds: Number(this._eventLoopDelay.exceeds || 0),
            percentiles: {
              p50: Number(this._eventLoopDelay.percentile(50) || 0),
              p90: Number(this._eventLoopDelay.percentile(90) || 0),
              p99: Number(this._eventLoopDelay.percentile(99) || 0)
            }
          } : undefined,
          version: (cfg.package && cfg.package.version) ? cfg.package.version : 'unknown'
        }
        res.json({ success: true, data, message: '服务正常', code: 200 })
      } catch (error) {
        util.makeLog("error", ["/api/health 处理失败", error], "Server")
        res.status(500).json({ success: false, message: '健康检查失败', code: 500 })
      }
    })
    
    
    this.express.get('/api/system/info', (req, res) => {
      const instanceIndex = process.env.BOT_INDEX ?? process.env.NODE_APP_INSTANCE
      res.json({
        success: true,
        data: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          rabbitVersion: (cfg.package && cfg.package.version) ? cfg.package.version : 'unknown',
          yunzaiVersion: (cfg.package && cfg.package.version) ? cfg.package.version : 'unknown',
          instanceIndex: (instanceIndex !== undefined && instanceIndex !== null) ? Number(instanceIndex) : null,
          ports: {
            http: cfg.server?.port,
            https: cfg.server?.https?.port
          }
        },
        message: '获取系统信息成功',
        code: 200
      })
    })
    
    
    this.express.post('/api/verification/receive', async (req, res) => {
      try {
        await verificationHandler.receiveVerificationCode(req, res)
      } catch (error) {
        util.makeLog("error", ["验证码接收失败:", error], "验证码")
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    })
    
    
    this.express.get('/api/verification/status', async (req, res) => {
      try {
        const status = await verificationHandler.getStatus()
        res.json({
          success: true,
          data: status
        })
      } catch (error) {
        util.makeLog("error", ["获取验证码状态失败:", error], "验证码")
        res.status(500).json({
          success: false,
          message: '获取状态失败'
        })
      }
    })
    
    util.makeLog("info", "WebUI API路由已启动", "WebUI")
    
    await PluginsLoader.load()
    await ListenerLoader.load()
    
    
    try {
      await webUIManager.initialize({
        port: cfg.server.https?.port || cfg.server.port,
        host: '0.0.0.0',
        cors: true,
        app: this.express,
        server: this.server,
        apiPrefix: '/',
        socketPath: '/ws'
      })
      await webUIManager.start()
      util.makeLog("info", "WebUI管理器已启动", "WebUI")
    } catch (error) {
      util.makeLog("error", ["WebUI管理器启动失败:", error], "WebUI")
    }

    this.stat.online = 2
    
    this.express.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
        return next()
      }
      try {
        const redirectUrl = cfg.server.redirect
        const selfUrl = cfg.server.url
        if (redirectUrl && redirectUrl !== selfUrl) {
          return res.redirect(redirectUrl)
        }
      } catch (_) {}
      
      return next()
    })
    const wsBaseUrl = `${this.url.replace(/^http/, "ws")}/`
    const wsPaths = Object.keys(this.wsf)
    const wsTargets = wsPaths.length
      ? wsPaths.map(path => `${wsBaseUrl}${path}`)
      : [wsBaseUrl]
    util.makeLog(
      "info",
      ["连接地址：", ...wsTargets.map((path, index) => `${index ? " | " : ""}${logger.blue(path)}`)],
      "WebSocket",
    )
    this.emit("online", this)
  }

  async fileToUrl(file, opts = {}) {
    const {
      name,
      time = cfg.bot.file_to_url_time * 60000,
      times = cfg.bot.file_to_url_times,
    } = opts

    file =
      (typeof file === "object" && !Buffer.isBuffer(file) && { ...file }) ||
      (await util.fileType({ file, name }, { http: true }))
    if (!Buffer.isBuffer(file.buffer)) return file.buffer
    file.name = file.name ? encodeURIComponent(file.name) : ulid()

    if (typeof times === "number") file.times = times
    this.fs[file.name] = file
    if (time) setTimeout(() => (this.fs[file.name] = this.fs.timeout), time)
    return `${this.url}/File/${file.name}`
  }

  fileSend(req) {
    const url = req.url.replace(/^\//, "")
    let file = this.fs[url] || this.fs[404]

    if (typeof file.times === "number") {
      if (file.times > 0) file.times--
      else file = this.fs.timeout
    }

    if (file.type?.mime) req.res.setHeader("Content-Type", file.type.mime)

    util.makeLog(
      "mark",
      `发送文件：${file.name}(${file.url} ${(file.buffer.length / 1024).toFixed(2)}KB)`,
      `${req.sid} => ${req.rid}`,
      true,
    )
    req.res.send(file.buffer)
  }

  async transformOutgoingArgs(args) {
    return imageBedManager.transformArgs(args)
  }

  prepareEvent(data) {
    if (!this.bots[data.self_id]) return
    if (!data.bot)
      Object.defineProperty(data, "bot", {
        value: this.bots[data.self_id],
      })

    if (data.user_id) {
      if (!data.friend)
        Object.defineProperty(data, "friend", {
          value: data.bot.pickFriend(data.user_id),
        })
      data.sender ||= { user_id: data.user_id }
      data.sender.nickname ||= data.friend.name || data.friend.nickname
    }

    if (data.group_id) {
      if (!data.group)
        Object.defineProperty(data, "group", {
          value: data.bot.pickGroup(data.group_id),
        })
      data.group_name ||= data.group.name || data.group.group_name
    }

    if (data.group && data.user_id) {
      if (!data.member)
        Object.defineProperty(data, "member", {
          value: data.group.pickMember(data.user_id),
        })
      data.sender.nickname ||= data.member.name || data.member.nickname
      data.sender.card ||= data.member.card
    }

    if (data.bot.adapter?.id) data.adapter_id = data.bot.adapter.id
    if (data.bot.adapter?.name) data.adapter_name = data.bot.adapter.name

    for (const i of [data.friend, data.group, data.member]) {
      if (typeof i !== "object") continue
      i.sendMsg = imageBedManager.wrapSend(i.sendMsg?.bind(i))
      i.reply = imageBedManager.wrapSend(i.reply?.bind(i))
      i.sendFile ??= (file, name) => i.sendMsg(segment.file(file, name))
      i.makeForwardMsg ??= this.makeForwardMsg
      i.sendForwardMsg ??= msg => this.sendForwardMsg(msg => i.sendMsg(msg), msg)
      i.getInfo ??= () => i.info || i
    }

    if (!data.reply) {
      if (data.group?.sendMsg) data.reply = data.group.sendMsg.bind(data.group)
      else if (data.friend?.sendMsg) data.reply = data.friend.sendMsg.bind(data.friend)
    }
    data.reply = imageBedManager.wrapSend(data.reply)
  }

  em(name = "", data = {}) {
    this.prepareEvent(data)
    while (true) {
      this.emit(name, data)
      const i = name.lastIndexOf(".")
      if (i === -1) break
      name = name.slice(0, i)
    }
  }

  getFriendArray() {
    const array = []
    for (const bot_id of this.uin)
      for (const [id, i] of this.bots[bot_id].fl || []) array.push({ ...i, bot_id })
    return array
  }

  getFriendList() {
    const array = []
    for (const bot_id of this.uin) array.push(...(this.bots[bot_id].fl?.keys() || []))
    return array
  }

  getFriendMap() {
    const map = new Map()
    for (const bot_id of this.uin)
      for (const [id, i] of this.bots[bot_id].fl || []) map.set(id, { ...i, bot_id })
    return map
  }
  get fl() {
    return this.getFriendMap()
  }

  getGroupArray() {
    const array = []
    for (const bot_id of this.uin)
      for (const [id, i] of this.bots[bot_id].gl || []) array.push({ ...i, bot_id })
    return array
  }

  getGroupList() {
    const array = []
    for (const bot_id of this.uin) array.push(...(this.bots[bot_id].gl?.keys() || []))
    return array
  }

  getGroupMap() {
    const map = new Map()
    for (const bot_id of this.uin)
      for (const [id, i] of this.bots[bot_id].gl || []) map.set(id, { ...i, bot_id })
    return map
  }
  get gl() {
    return this.getGroupMap()
  }
  get gml() {
    const map = new Map()
    for (const bot_id of this.uin)
      for (const [id, i] of this.bots[bot_id].gml || [])
        map.set(id, Object.assign(new Map(i), { bot_id }))
    return map
  }

  pickFriend(user_id, strict) {
    user_id = Number(user_id) || user_id
    if (this.bots[this.uin]?.fl.has(user_id)) return this.bots[this.uin].pickFriend(user_id)
    let user = this.fl.get(user_id)
    if (!user)
      for (const [id, ml] of this.gml) {
        user = ml.get(user_id)
        if (user) {
          user.bot_id = ml.bot_id
          break
        }
      }
    if (user) return this.bots[user.bot_id].pickFriend(user_id)
    if (strict) return false
    util.makeLog("debug", ["因不存在用户", user_id, "而随机选择Bot", this.uin.toJSON()])
    return this.bots[this.uin].pickFriend(user_id)
  }
  get pickUser() {
    return this.pickFriend
  }

  pickGroup(group_id, strict) {
    group_id = Number(group_id) || group_id
    if (this.bots[this.uin]?.gl.has(group_id)) return this.bots[this.uin].pickGroup(group_id)
    const group = this.gl.get(group_id)
    if (group) return this.bots[group.bot_id].pickGroup(group_id)
    if (strict) return false
    util.makeLog("debug", ["因不存在群", group_id, "而随机选择Bot", this.uin.toJSON()])
    return this.bots[this.uin].pickGroup(group_id)
  }

  pickMember(group_id, user_id) {
    return this.pickGroup(group_id).pickMember(user_id)
  }

  sendFriendMsg(bot_id, user_id, ...args) {
    try {
      return (async () => {
        args = await this.transformOutgoingArgs(args)
        if (!bot_id) return this.pickFriend(user_id).sendMsg(...args)

        if (this.uin.includes(bot_id) && this.bots[bot_id])
          return this.bots[bot_id].pickFriend(user_id).sendMsg(...args)

        if (this.pickFriend(bot_id, true)) return this.pickFriend(bot_id).sendMsg(user_id, ...args)

        const { promise, resolve, reject } = Promise.withResolvers()
        const listener = data => {
          resolve(data.bot.pickFriend(user_id).sendMsg(...args))
          clearTimeout(timeout)
        }
        const timeout = setTimeout(() => {
          reject(Object.assign(Error("等待 Bot 上线超时"), { bot_id, user_id, args }))
          this.off(`connect.${bot_id}`, listener)
        }, 300000)
        this.once(`connect.${bot_id}`, listener)
        return promise
      })()
    } catch (err) {
      util.makeLog("error", ["发送好友消息错误", args, err], `${bot_id} => ${user_id}`, true)
    }
  }

  sendGroupMsg(bot_id, group_id, ...args) {
    try {
      return (async () => {
        args = await this.transformOutgoingArgs(args)
        if (!bot_id) return this.pickGroup(group_id).sendMsg(...args)

        if (this.uin.includes(bot_id) && this.bots[bot_id])
          return this.bots[bot_id].pickGroup(group_id).sendMsg(...args)

        if (this.pickGroup(bot_id, true)) return this.pickGroup(bot_id).sendMsg(group_id, ...args)

        const { promise, resolve, reject } = Promise.withResolvers()
        const listener = data => {
          resolve(data.bot.pickGroup(group_id).sendMsg(...args))
          clearTimeout(timeout)
        }
        const timeout = setTimeout(() => {
          reject(Object.assign(Error("等待 Bot 上线超时"), { bot_id, group_id, args }))
          this.off(`connect.${bot_id}`, listener)
        }, 300000)
        this.once(`connect.${bot_id}`, listener)
        return promise
      })()
    } catch (err) {
      util.makeLog("error", ["发送群消息错误", args, err], `${bot_id} => ${group_id}`, true)
    }
  }

  getTextMsg(fnc = () => true) {
    if (typeof fnc !== "function") {
      const { self_id, user_id } = fnc
      fnc = data => data.self_id == self_id && data.user_id == user_id
    }

    const { promise, resolve } = Promise.withResolvers()
    const listener = data => {
      try {
        if (!fnc(data)) return

        let msg = ""
        for (const i of data.message) if (i.type === "text" && i.text) msg += i.text.trim()
        if (!msg) return

        resolve(msg)
        this.off("message", listener)
      } catch (err) {
        util.makeLog("error", err, data.self_id)
      }
    }
    this.on("message", listener)
    return promise
  }

  getMasterMsg() {
    return this.getTextMsg(data => cfg.master[data.self_id]?.includes(String(data.user_id)))
  }

  async sendMasterMsg(msg, bot_array = Object.keys(cfg.master), sleep = 5000) {
    const ret = {}
    await Promise.allSettled(
      (Array.isArray(bot_array) ? bot_array : [bot_array]).map(async bot_id => {
        ret[bot_id] = {}
        for (const user_id of cfg.master[bot_id] || []) {
          ret[bot_id][user_id] = this.sendFriendMsg(bot_id, user_id, msg)
          if (sleep) await util.sleep(sleep, ret[bot_id][user_id])
        }
      }),
    )
    return ret
  }

  makeForwardMsg(msg) {
    return { type: "node", data: msg }
  }

  makeForwardArray(msg = [], node = {}) {
    const forward = []
    for (const message of Array.isArray(msg) ? msg : [msg]) forward.push({ ...node, message })
    return this.makeForwardMsg(forward)
  }

  async sendForwardMsg(send, msg) {
    const messages = []
    for (const { message } of Array.isArray(msg) ? msg : [msg]) messages.push(await send(message))
    return messages
  }

  async redisExit() {
    if (!(typeof redis === "object" && redis.process)) return false
    const p = redis.process
    delete redis.process
    await util.sleep(
      5000,
      redis.save().catch(() => {}),
    )
    return p.kill()
  }

  async exit(code = 0) {
    await this.redisExit()
    switch (global.start_type) {
      case "pm2":
        return util.exec("pnpm stop")
      case "external":
        return process.exit(255)
    }
    return process.exit(code)
  }

  async restart() {
    await this.redisExit()
    if (process.platform !== "win32" && typeof process.execve === "function")
      process.execve(process.argv[0], process.argv, process.env)

    switch (global.start_type) {
      case "pm2":
        await util.exec("pnpm run restart")
        break
      case "internal":
        util.cmdStart(process.argv[0], process.argv.slice(1))
        break
    }
    return process.exit()
  }
}

export { Rabbit, Rabbit as Yunzai }
export default Rabbit
