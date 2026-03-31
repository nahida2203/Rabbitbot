import cfg from "../../lib/config/config.js"
import fetch from "node-fetch"
import { WebSocket } from "ws"

Bot.adapter.push(new class MilkyAdapter {
  id = "QQ"
  name = "Milky"
  get config() {
    return cfg.getAllCfg("milky") || {}
  }

  get path() {
    return (process.env.MILKY_WS_PATH || this.config.ws_path || this.name).replace(/^\//, "")
  }

  get apiBase() {
    return String(process.env.MILKY_API_BASE || this.config.api_base || "").replace(/\/$/, "")
  }

  get token() {
    return process.env.MILKY_ACCESS_TOKEN || process.env.MILKY_TOKEN || this.config.access_token || ""
  }

  get timeout() {
    return Number(process.env.MILKY_API_TIMEOUT || this.config.api_timeout || 60000)
  }

  get requestCacheSize() {
    return Number(this.config.request_cache_size || 200)
  }

  get enable() {
    return Boolean(this.config.enable)
  }

  get connection() {
    return this.config.connection || "reverse_ws"
  }

  get host() {
    return this.config.host || ""
  }

  get port() {
    return Number(this.config.port || 0)
  }

  get prefix() {
    return this.config.prefix || ""
  }

  get httpTimeout() {
    return Number(this.config.http_timeout || Math.ceil(this.timeout / 1000)) * 1000
  }

  get wsHeartbeat() {
    return Number(this.config.ws?.heartbeat || 30) * 1000
  }

  get wsReconnectInterval() {
    return Number(this.config.ws?.reconnect_interval || 10) * 1000
  }

  get webhookPath() {
    return this.config.webhook?.path || "/milky"
  }

  makeLog(msg) {
    return Bot.String(msg).replace(/base64:\/\/.*?(,|]|"|$)/g, "base64://...$1")
  }

  getApiBaseFromConfig() {
    let { host, port, prefix = "" } = this.config
    if (!host)
      return this.apiBase

    let protocol = "http"
    let cleanHost = String(host)
    if (cleanHost.startsWith("https://")) {
      protocol = "https"
      cleanHost = cleanHost.replace("https://", "")
    } else if (cleanHost.startsWith("http://")) {
      cleanHost = cleanHost.replace("http://", "")
    } else if (port === 443 || this.config.ssl || this.config.use_ssl) {
      protocol = "https"
    }

    if (!prefix.startsWith("/") && prefix)
      prefix = `/${prefix}`

    if (cleanHost.includes(":"))
      return `${protocol}://${cleanHost}${prefix}`.replace(/\/$/, "")
    return `${protocol}://${cleanHost}${port ? `:${port}` : ""}${prefix}`.replace(/\/$/, "")
  }

  getWsEventUrl() {
    let { host, port, prefix = "" } = this.config
    if (!host)
      return ""

    let protocol = "ws"
    let cleanHost = String(host)
    if (cleanHost.startsWith("https://")) {
      protocol = "wss"
      cleanHost = cleanHost.replace("https://", "")
    } else if (cleanHost.startsWith("http://")) {
      cleanHost = cleanHost.replace("http://", "")
    } else if (port === 443 || this.config.ssl || this.config.use_ssl) {
      protocol = "wss"
    }

    if (!prefix.startsWith("/") && prefix)
      prefix = `/${prefix}`

    const token = this.token ? `?access_token=${encodeURIComponent(this.token)}` : ""
    if (cleanHost.includes(":"))
      return `${protocol}://${cleanHost}${prefix}/event${token}`
    return `${protocol}://${cleanHost}${port ? `:${port}` : ""}${prefix}/event${token}`
  }

  normalizeMessageSeq(message_id) {
    return Number(message_id?.message_seq ?? message_id?.message_id ?? message_id)
  }

  async getResourceTempUrl(data, resource_id) {
    const ret = await data.bot.sendApi("get_resource_temp_url", { resource_id: String(resource_id) })
    return ret.temp_url || ret.url || ret.download_url || ret
  }

  getApiBase(req) {
    if (this.apiBase)
      return this.apiBase

    if (this.host)
      return this.getApiBaseFromConfig()

    if (this.apiBase)
      return this.apiBase

    try {
      const url = new URL(req.sid)
      return `${url.protocol.replace(/^ws/, "http")}//${url.host}`
    } catch {
      return ""
    }
  }

  async callApi(data, action, params = {}) {
    const base = data.bot?.apiBase || this.apiBase
    if (!base)
      throw Bot.makeError("Milky API 地址未配置，请设置 MILKY_API_BASE 或通过 WebSocket 正确连接", { action, params })

    return this.callApiByBase(base, action, params)
  }

  async callApiByBase(base, action, params = {}) {
    if (!base)
      throw Bot.makeError("Milky API 地址未配置", { action, params })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.httpTimeout)

    try {
      const res = await fetch(`${base}/api/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      })

      let raw = ""
      try {
        raw = await res.text()
      } catch {}

      let result
      try {
        result = raw ? JSON.parse(raw) : {}
      } catch (error) {
        throw Bot.makeError("Milky API 返回了无法解析的响应", { action, params, raw, error })
      }

      if (!res.ok || result?.retcode !== 0 || result?.status !== "ok")
        throw Bot.makeError(result?.message || `Milky API 请求失败: ${res.status}`, { action, params, result, status: res.status })

      return result.data ?? result
    } finally {
      clearTimeout(timer)
    }
  }

  async makeFileUri(file, opts = {}) {
    const data = await Bot.Buffer(file, {
      http: true,
      size: 10485760,
      ...opts,
    })

    if (Buffer.isBuffer(data))
      return `base64://${data.toString("base64")}`

    if (typeof data === "string") {
      if (/^(?:https?:\/\/|base64:\/\/|file:\/\/)/.test(data))
        return data
      return `file://${String(data).replace(/\\/g, "/")}`
    }

    return `base64://${Buffer.from(String(data)).toString("base64")}`
  }

  async makeSegments(msg) {
    if (!Array.isArray(msg))
      msg = [msg]

    const stack = [...msg]
    const flat = []
    while (stack.length) {
      const current = stack.shift()
      if (Array.isArray(current)) {
        stack.unshift(...current)
        continue
      }
      flat.push(current)
    }

    const segments = []
    for (let item of flat) {
      if (typeof item !== "object") {
        item = { type: "text", data: { text: String(item) } }
      } else if (!item.data) {
        item = { type: item.type, data: { ...item, type: undefined } }
      }

      switch (item.type) {
        case "text":
          segments.push({ type: "text", data: { text: String(item.data.text ?? "") } })
          break
        case "at":
          if (item.data.qq === "all")
            segments.push({ type: "mention_all", data: {} })
          else
            segments.push({ type: "mention", data: { user_id: Number(item.data.qq) || item.data.qq } })
          break
        case "face":
          segments.push({ type: "face", data: {
            face_id: String(item.data.id ?? item.data.face_id ?? ""),
            is_large: Boolean(item.data.is_large),
          }})
          break
        case "reply":
          segments.push({ type: "reply", data: { message_seq: Number(item.data.id ?? item.data.message_seq ?? item.id ?? 0) } })
          break
        case "image":
          segments.push({ type: "image", data: {
            uri: await this.makeFileUri(item.data.file ?? item.data.url ?? item.file ?? item.url),
            ...(item.data.sub_type ? { sub_type: item.data.sub_type } : {}),
            ...(item.data.summary ? { summary: item.data.summary } : {}),
          }})
          break
        case "record":
          segments.push({ type: "record", data: {
            uri: await this.makeFileUri(item.data.file ?? item.data.url ?? item.file ?? item.url),
          }})
          break
        case "video":
          segments.push({ type: "video", data: {
            uri: await this.makeFileUri(item.data.file ?? item.data.url ?? item.file ?? item.url),
            ...(item.data.thumb || item.data.thumb_uri ? { thumb_uri: await this.makeFileUri(item.data.thumb ?? item.data.thumb_uri) } : {}),
          }})
          break
        case "node":
          segments.push({ type: "forward", data: { messages: await this.makeForwardMessages(item.data) } })
          break
        case "button":
          break
        case "raw":
          segments.push(item.data)
          break
        default:
          segments.push({ type: "text", data: { text: Bot.String(item.data ?? item) } })
      }
    }

    return segments
  }

  async makeForwardMessages(msg) {
    const messages = []
    for (const item of Array.isArray(msg) ? msg : [msg]) {
      const segments = await this.makeSegments(item.message ?? item.segments ?? item)
      messages.push({
        user_id: Number(item.user_id) || 80000000,
        sender_name: item.nickname || item.sender_name || "匿名消息",
        segments,
      })
    }
    return messages
  }

  async getMsg(data, message_id) {
    const ret = await data.bot.sendApi("get_message", {
      message_seq: this.normalizeMessageSeq(message_id),
      ...(data.group_id ? { group_id: Number(data.group_id) } : { user_id: Number(data.user_id) }),
    })
    if (ret.message?.segments) {
      const parsed = this.parseSegments(ret.message.segments)
      ret.message.message = parsed.message
      ret.message.raw_message = parsed.raw_message
    }
    return ret.message || ret
  }

  async deleteMsg(data, message_id) {
    return this.recallMsg(data, message_id)
  }

  async getHistoryMessages(data, message_seq, count = 20) {
    const ret = await data.bot.sendApi("get_history_messages", {
      peer_id: Number(data.group_id || data.user_id),
      message_scene: data.group_id ? "group" : "friend",
      ...(message_seq ? { message_seq: Number(message_seq) } : {}),
      count: Number(count),
    })
    const messages = ret.messages || []
    for (const item of messages) {
      if (item?.segments) {
        const parsed = this.parseSegments(item.segments)
        item.message = parsed.message
        item.raw_message = parsed.raw_message
      }
    }
    return messages
  }

  markMessageAsRead(data, message_scene, peer_id, message_seq) {
    return data.bot.sendApi("mark_message_as_read", {
      message_scene,
      peer_id: Number(peer_id),
      message_seq: Number(message_seq),
    })
  }

  async getForwardMsg(data, forward_id) {
    const ret = await data.bot.sendApi("get_forwarded_messages", {
      forward_id: String(forward_id?.forward_id ?? forward_id?.id ?? forward_id),
    })
    const messages = ret.messages || []
    for (const item of messages) {
      if (item?.segments) {
        const parsed = this.parseSegments(item.segments)
        item.message = parsed.message
        item.raw_message = parsed.raw_message
      }
    }
    return messages
  }

  parseSegments(segments = []) {
    const message = []
    let raw_message = ""

    for (const segment of segments) {
      switch (segment?.type) {
        case "text":
          message.push({ type: "text", text: segment.data.text })
          raw_message += segment.data.text || ""
          break
        case "mention":
          message.push({ type: "at", qq: segment.data.user_id })
          raw_message += `[提及:${segment.data.user_id}]`
          break
        case "mention_all":
          message.push({ type: "at", qq: "all" })
          raw_message += "[@全体成员]"
          break
        case "face":
          message.push({ type: "face", id: segment.data.face_id, is_large: segment.data.is_large })
          raw_message += `[表情:${segment.data.face_id}]`
          break
        case "reply":
          message.push({ type: "reply", id: segment.data.message_seq, message_seq: segment.data.message_seq })
          raw_message += `[回复:${segment.data.message_seq}]`
          break
        case "image":
          message.push({ type: "image", file: segment.data.temp_url, url: segment.data.temp_url, ...segment.data })
          raw_message += `[图片:${segment.data.summary || segment.data.temp_url}]`
          break
        case "record":
          message.push({ type: "record", file: segment.data.temp_url, url: segment.data.temp_url, ...segment.data })
          raw_message += `[语音:${segment.data.temp_url}]`
          break
        case "video":
          message.push({ type: "video", file: segment.data.temp_url, url: segment.data.temp_url, ...segment.data })
          raw_message += `[视频:${segment.data.temp_url}]`
          break
        case "file":
          message.push({ type: "file", ...segment.data })
          raw_message += `[文件:${segment.data.file_name}]`
          break
        case "forward":
          message.push({ type: "forward", id: segment.data.forward_id, ...segment.data })
          raw_message += `[合并转发:${segment.data.title}]`
          break
        case "xml":
          message.push({ type: "xml", data: segment.data.xml_payload, service_id: segment.data.service_id })
          raw_message += `[XML消息]`
          break
        case "light_app":
          message.push({ type: "json", data: segment.data.json_payload, app_name: segment.data.app_name })
          raw_message += `[小程序:${segment.data.app_name}]`
          break
        case "market_face":
          message.push({ type: "face", id: segment.data.emoji_id, ...segment.data })
          raw_message += `[市场表情:${segment.data.summary}]`
          break
        default:
          message.push({ type: "text", text: Bot.String(segment) })
          raw_message += Bot.String(segment)
      }
    }

    return { message, raw_message }
  }

  async sendFriendMsg(data, msg) {
    const message = await this.makeSegments(msg)
    Bot.makeLog("info", `发送好友消息：${this.makeLog(message)}`, `${data.self_id} => ${data.user_id}`, true)
    const ret = await data.bot.sendApi("send_private_message", {
      user_id: Number(data.user_id),
      message,
    })
    return {
      message_id: ret.message_seq,
      message_seq: ret.message_seq,
      time: ret.time,
      data: ret,
    }
  }

  async sendGroupMsg(data, msg) {
    const message = await this.makeSegments(msg)
    Bot.makeLog("info", `发送群消息：${this.makeLog(message)}`, `${data.self_id} => ${data.group_id}`, true)
    const ret = await data.bot.sendApi("send_group_message", {
      group_id: Number(data.group_id),
      message,
    })
    return {
      message_id: ret.message_seq,
      message_seq: ret.message_seq,
      time: ret.time,
      data: ret,
    }
  }

  async recallMsg(data, message_id) {
    const action = data.group_id ? "recall_group_message" : "recall_private_message"
    const params = {
      message_seq: this.normalizeMessageSeq(message_id),
    }
    if (data.group_id)
      params.group_id = Number(data.group_id)
    else
      params.user_id = Number(data.user_id)

    Bot.makeLog("info", `撤回消息：${params.message_seq}`, data.group_id ? `${data.self_id} => ${data.group_id}` : `${data.self_id} => ${data.user_id}`, true)
    return data.bot.sendApi(action, params)
  }

  async getFriendArray(data) {
    return (await data.bot.sendApi("get_friend_list", {})).friends || []
  }

  async getFriendList(data) {
    const array = []
    for (const { user_id } of await this.getFriendArray(data))
      array.push(user_id)
    return array
  }

  async getFriendMap(data) {
    const map = new Map
    for (const item of await this.getFriendArray(data))
      map.set(item.user_id, item)
    data.bot.fl = map
    return map
  }

  async getFriendInfo(data) {
    const info = (await data.bot.sendApi("get_friend_info", { user_id: Number(data.user_id) })).friend
    data.bot.fl.set(data.user_id, info)
    return info
  }

  async getGroupArray(data) {
    return (await data.bot.sendApi("get_group_list", {})).groups || []
  }

  async getGroupList(data) {
    const array = []
    for (const { group_id } of await this.getGroupArray(data))
      array.push(group_id)
    return array
  }

  async getGroupMap(data) {
    const map = new Map
    for (const item of await this.getGroupArray(data))
      map.set(item.group_id, item)
    data.bot.gl = map
    return map
  }

  async getGroupInfo(data) {
    const info = (await data.bot.sendApi("get_group_info", { group_id: Number(data.group_id) })).group
    data.bot.gl.set(data.group_id, info)
    return info
  }

  async getMemberArray(data) {
    return (await data.bot.sendApi("get_group_member_list", { group_id: Number(data.group_id) })).members || []
  }

  async getMemberList(data) {
    const array = []
    for (const { user_id } of await this.getMemberArray(data))
      array.push(user_id)
    return array
  }

  async getMemberMap(data) {
    const map = new Map
    for (const item of await this.getMemberArray(data))
      map.set(item.user_id, item)
    data.bot.gml.set(data.group_id, map)
    return map
  }

  async getGroupMemberMap(data) {
    if (!cfg.bot.cache_group_member)
      return this.getGroupMap(data)
    for (const [group_id] of await this.getGroupMap(data))
      await this.getMemberMap({ ...data, group_id }).catch(() => {})
  }

  async getMemberInfo(data) {
    const info = (await data.bot.sendApi("get_group_member_info", {
      group_id: Number(data.group_id),
      user_id: Number(data.user_id),
    })).member
    let gml = data.bot.gml.get(data.group_id)
    if (!gml) {
      gml = new Map
      data.bot.gml.set(data.group_id, gml)
    }
    gml.set(data.user_id, info)
    return info
  }

  async getUserProfile(data, user_id = data.user_id) {
    const ret = await data.bot.sendApi("get_user_profile", { user_id: Number(user_id) })
    return ret.user || ret.profile || ret
  }

  async getCookies(data, domain) {
    const ret = await data.bot.sendApi("get_cookies", { domain })
    return ret.cookies || ret.cookie || ret
  }

  async getCsrfToken(data) {
    const ret = await data.bot.sendApi("get_csrf_token", {})
    return ret.token || ret.csrf_token || ret.bkn || ret
  }

  setProfile(data, profile = {}) {
    const tasks = []
    if (profile.nickname)
      tasks.push(data.bot.sendApi("set_nickname", { nickname: profile.nickname }))
    if (profile.signature || profile.bio)
      tasks.push(data.bot.sendApi("set_bio", { bio: profile.signature || profile.bio }))
    return Promise.all(tasks)
  }

  async setAvatar(data, file) {
    Bot.makeLog("info", `设置头像：${file}`, data.self_id)
    return data.bot.sendApi("set_avatar", { image_uri: await this.makeFileUri(file) })
  }

  sendLike(data, times = 1) {
    Bot.makeLog("info", `点赞：${times}次`, `${data.self_id} => ${data.user_id}`, true)
    return data.bot.sendApi("send_like", {
      user_id: Number(data.user_id),
      times: Number(times),
    })
  }

  friendPoke(data) {
    Bot.makeLog("info", "好友戳一戳", `${data.self_id} => ${data.user_id}`, true)
    return data.bot.sendApi("send_friend_nudge", { user_id: Number(data.user_id) })
  }

  deleteFriend(data) {
    Bot.makeLog("info", "删除好友", `${data.self_id} => ${data.user_id}`, true)
    return data.bot.sendApi("delete_friend", { user_id: Number(data.user_id) })
      .finally(this.getFriendMap.bind(this, data))
  }

  setGroupName(data, group_name) {
    Bot.makeLog("info", `设置群名：${group_name}`, `${data.self_id} => ${data.group_id}`, true)
    return data.bot.sendApi("set_group_name", {
      group_id: Number(data.group_id),
      new_group_name: group_name,
    })
  }

  async setGroupAvatar(data, file) {
    Bot.makeLog("info", `设置群头像：${file}`, `${data.self_id} => ${data.group_id}`, true)
    return data.bot.sendApi("set_group_avatar", {
      group_id: Number(data.group_id),
      image_uri: await this.makeFileUri(file),
    })
  }

  setGroupAdmin(data, user_id, enable = true) {
    Bot.makeLog("info", `${enable ? "设置" : "取消"}群管理员：${user_id}`, `${data.self_id} => ${data.group_id}`, true)
    return data.bot.sendApi("set_group_member_admin", {
      group_id: Number(data.group_id),
      user_id: Number(user_id),
      is_set: Boolean(enable),
    })
  }

  setGroupCard(data, user_id, card) {
    Bot.makeLog("info", `设置群名片：${card}`, `${data.self_id} => ${data.group_id}, ${user_id}`, true)
    return data.bot.sendApi("set_group_member_card", {
      group_id: Number(data.group_id),
      user_id: Number(user_id),
      card,
    })
  }

  setGroupTitle(data, user_id, special_title) {
    Bot.makeLog("info", `设置群头衔：${special_title}`, `${data.self_id} => ${data.group_id}, ${user_id}`, true)
    return data.bot.sendApi("set_group_member_special_title", {
      group_id: Number(data.group_id),
      user_id: Number(user_id),
      special_title,
    })
  }

  setGroupBan(data, user_id, duration = 0) {
    Bot.makeLog("info", `禁言群成员：${duration}秒`, `${data.self_id} => ${data.group_id}, ${user_id}`, true)
    return data.bot.sendApi("set_group_member_mute", {
      group_id: Number(data.group_id),
      user_id: Number(user_id),
      duration: Number(duration),
    })
  }

  setGroupWholeBan(data, enable = true) {
    Bot.makeLog("info", `${enable ? "开启" : "关闭"}全员禁言`, `${data.self_id} => ${data.group_id}`, true)
    return data.bot.sendApi("set_group_whole_mute", {
      group_id: Number(data.group_id),
      is_mute: Boolean(enable),
    })
  }

  setGroupKick(data, user_id, reject_add_request = false) {
    Bot.makeLog("info", `踢出群成员${reject_add_request ? "并拒绝再次加群" : ""}`, `${data.self_id} => ${data.group_id}, ${user_id}`, true)
    return data.bot.sendApi("kick_group_member", {
      group_id: Number(data.group_id),
      user_id: Number(user_id),
      reject_add_request: Boolean(reject_add_request),
    })
  }

  quitGroup(data) {
    Bot.makeLog("info", "退群", `${data.self_id} => ${data.group_id}`, true)
    return data.bot.sendApi("leave_group", { group_id: Number(data.group_id) })
  }

  setEssenceMsg(data, message_id) {
    return data.bot.sendApi("set_group_essence_message", {
      group_id: Number(data.group_id),
      message_seq: this.normalizeMessageSeq(message_id),
    })
  }

  deleteEssenceMsg(data, message_id) {
    return data.bot.sendApi("delete_group_essence_message", {
      group_id: Number(data.group_id),
      message_seq: this.normalizeMessageSeq(message_id),
    })
  }

  getEssenceMsg(data) {
    return data.bot.sendApi("get_group_essence_messages", {
      group_id: Number(data.group_id),
    }).then(ret => ret.messages || ret.essence_messages || [])
  }

  getGroupAnnouncements(data) {
    return data.bot.sendApi("get_group_announcements", {
      group_id: Number(data.group_id),
    }).then(ret => ret.announcements || [])
  }

  sendGroupAnnouncement(data, content, image) {
    return (async () => data.bot.sendApi("send_group_announcement", {
      group_id: Number(data.group_id),
      content,
      ...(image ? { image_uri: await this.makeFileUri(image) } : {}),
    }))()
  }

  deleteGroupAnnouncement(data, announcement_id) {
    return data.bot.sendApi("delete_group_announcement", {
      group_id: Number(data.group_id),
      announcement_id: String(announcement_id),
    })
  }

  groupPoke(data, user_id) {
    return data.bot.sendApi("send_group_nudge", {
      group_id: Number(data.group_id),
      user_id: Number(user_id),
    })
  }

  sendGroupReaction(data, message_id, face_id, is_add = true) {
    return data.bot.sendApi("send_group_message_reaction", {
      group_id: Number(data.group_id),
      message_seq: this.normalizeMessageSeq(message_id),
      face_id: String(face_id),
      is_add: Boolean(is_add),
    })
  }

  async sendFriendFile(data, file, name) {
    return data.bot.sendApi("upload_private_file", {
      user_id: Number(data.user_id),
      file_uri: await this.makeFileUri(file, { file: true }),
      ...(name ? { file_name: name } : {}),
    })
  }

  async sendGroupFile(data, file, folder_id, name) {
    return data.bot.sendApi("upload_group_file", {
      group_id: Number(data.group_id),
      file_uri: await this.makeFileUri(file, { file: true }),
      ...(folder_id ? { parent_folder_id: String(folder_id) } : {}),
      ...(name ? { file_name: name } : {}),
    })
  }

  getGroupFiles(data, folder_id) {
    return data.bot.sendApi("get_group_files", {
      group_id: Number(data.group_id),
      ...(folder_id ? { folder_id: String(folder_id) } : {}),
    })
  }

  deleteGroupFile(data, file_id) {
    return data.bot.sendApi("delete_group_file", {
      group_id: Number(data.group_id),
      file_id: String(file_id),
    })
  }

  createGroupFileFolder(data, name, parent_folder_id) {
    return data.bot.sendApi("create_group_folder", {
      group_id: Number(data.group_id),
      folder_name: name,
      ...(parent_folder_id ? { parent_folder_id: String(parent_folder_id) } : {}),
    })
  }

  renameGroupFileFolder(data, folder_id, name) {
    return data.bot.sendApi("rename_group_folder", {
      group_id: Number(data.group_id),
      folder_id: String(folder_id),
      new_folder_name: name,
    })
  }

  deleteGroupFileFolder(data, folder_id) {
    return data.bot.sendApi("delete_group_folder", {
      group_id: Number(data.group_id),
      folder_id: String(folder_id),
    })
  }

  getGroupFileUrl(data, file_id) {
    return data.bot.sendApi("get_group_file_download_url", {
      group_id: Number(data.group_id),
      file_id: String(file_id),
    })
  }

  getFriendFileUrl(data, file_id, file_hash) {
    return data.bot.sendApi("get_private_file_download_url", {
      user_id: Number(data.user_id),
      file_id: String(file_id),
      ...(file_hash ? { file_hash: String(file_hash) } : {}),
    })
  }

  getGroupFs(data) {
    return {
      upload: (file, name) => this.sendGroupFile(data, file, undefined, name),
      rm: this.deleteGroupFile.bind(this, data),
      mkdir: this.createGroupFileFolder.bind(this, data),
      renameFolder: this.renameGroupFileFolder.bind(this, data),
      rmFolder: this.deleteGroupFileFolder.bind(this, data),
      ls: this.getGroupFiles.bind(this, data),
      download: this.getGroupFileUrl.bind(this, data),
    }
  }

  setFriendAddRequest(data, flag, approve, remark) {
    const request = typeof flag === "object" ? flag : data.bot.request_list.find(item => item.flag == flag)
    if (!request?.initiator_uid)
      throw Bot.makeError("Milky 好友请求缺少 initiator_uid，无法处理", { flag, request })

    const action = approve ? "accept_friend_request" : "reject_friend_request"
    const params = {
      initiator_uid: request.initiator_uid,
      ...(request.is_filtered !== undefined ? { is_filtered: request.is_filtered } : {}),
      ...(!approve && remark ? { reason: remark } : {}),
    }
    return data.bot.sendApi(action, params)
  }

  acceptFriendRequest(data, initiator_uid, is_filtered = false) {
    return data.bot.sendApi("accept_friend_request", {
      initiator_uid: String(initiator_uid),
      is_filtered: Boolean(is_filtered),
    })
  }

  rejectFriendRequest(data, initiator_uid, is_filtered = false, reason) {
    return data.bot.sendApi("reject_friend_request", {
      initiator_uid: String(initiator_uid),
      is_filtered: Boolean(is_filtered),
      ...(reason ? { reason } : {}),
    })
  }

  setGroupAddRequest(data, flag, approve, reason, sub_type = "add") {
    const request = typeof flag === "object" ? flag : data.bot.request_list.find(item => item.flag == flag)
    if (!request?.group_id)
      throw Bot.makeError("Milky 群请求缺少 group_id，无法处理", { flag, request, sub_type })

    const isInvite = sub_type === "invite"
    const notification_type = isInvite ? "invited_join_request" : "join_request"

    if (approve) {
      return data.bot.sendApi("accept_group_request", {
        notification_seq: Number(request.flag),
        notification_type,
        group_id: Number(request.group_id),
        ...(request.is_filtered !== undefined ? { is_filtered: request.is_filtered } : {}),
      })
    }

    return data.bot.sendApi("reject_group_request", {
      notification_seq: Number(request.flag),
      notification_type,
      group_id: Number(request.group_id),
      ...(request.is_filtered !== undefined ? { is_filtered: request.is_filtered } : {}),
      ...(reason ? { reason } : {}),
    })
  }

  acceptGroupRequest(data, notification_seq, notification_type, group_id, is_filtered = false) {
    return data.bot.sendApi("accept_group_request", {
      notification_seq: Number(notification_seq),
      notification_type,
      group_id: Number(group_id),
      is_filtered: Boolean(is_filtered),
    })
  }

  rejectGroupRequest(data, notification_seq, notification_type, group_id, is_filtered = false, reason) {
    return data.bot.sendApi("reject_group_request", {
      notification_seq: Number(notification_seq),
      notification_type,
      group_id: Number(group_id),
      is_filtered: Boolean(is_filtered),
      ...(reason ? { reason } : {}),
    })
  }

  acceptGroupInvitation(data, group_id, invitation_seq) {
    return data.bot.sendApi("accept_group_invitation", {
      group_id: Number(group_id),
      invitation_seq: Number(invitation_seq),
    })
  }

  rejectGroupInvitation(data, group_id, invitation_seq) {
    return data.bot.sendApi("reject_group_invitation", {
      group_id: Number(group_id),
      invitation_seq: Number(invitation_seq),
    })
  }

  pickFriend(data, user_id) {
    const item = {
      ...data.bot.fl.get(user_id),
      ...data,
      user_id,
    }
    return {
      ...item,
      sendMsg: this.sendFriendMsg.bind(this, item),
      getMsg: this.getMsg.bind(this, item),
      getInfo: this.getFriendInfo.bind(this, item),
      recallMsg: this.recallMsg.bind(this, item),
      sendFile: (file, name) => this.sendFriendFile(item, file, name),
      getChatHistory: this.getHistoryMessages.bind(this, item),
      getProfile: this.getUserProfile.bind(this, item),
      thumbUp: this.sendLike.bind(this, item),
      poke: this.friendPoke.bind(this, item),
      delete: this.deleteFriend.bind(this, item),
      getAvatarUrl() { return `https://q.qlogo.cn/g?b=qq&s=0&nk=${user_id}` },
    }
  }

  pickMember(data, group_id, user_id) {
    const item = {
      ...data.bot.gml.get(group_id)?.get(user_id),
      ...data,
      group_id,
      user_id,
    }
    return {
      ...this.pickFriend(item, user_id),
      ...item,
      getInfo: this.getMemberInfo.bind(this, item),
      mute: this.setGroupBan.bind(this, item, user_id),
      kick: this.setGroupKick.bind(this, item, user_id),
      poke: this.groupPoke.bind(this, item, user_id),
      get is_friend() { return data.bot.fl.has(user_id) },
      get is_owner() { return this.role === "owner" },
      get is_admin() { return this.role === "admin" || this.is_owner },
    }
  }

  pickGroup(data, group_id) {
    const item = {
      ...data.bot.gl.get(group_id),
      ...data,
      group_id,
    }
    return {
      ...item,
      sendMsg: this.sendGroupMsg.bind(this, item),
      getMsg: this.getMsg.bind(this, item),
      getInfo: this.getGroupInfo.bind(this, item),
      recallMsg: this.recallMsg.bind(this, item),
      getForwardMsg: this.getForwardMsg.bind(this, item),
      sendFile: (file, name) => this.sendGroupFile(item, file, undefined, name),
      getChatHistory: this.getHistoryMessages.bind(this, item),
      getAvatarUrl() { return `https://p.qlogo.cn/gh/${group_id}/${group_id}/0` },
      getMemberArray: this.getMemberArray.bind(this, item),
      getMemberList: this.getMemberList.bind(this, item),
      getMemberMap: this.getMemberMap.bind(this, item),
      pickMember: this.pickMember.bind(this, item, group_id),
      getEssence: this.getEssenceMsg.bind(this, item),
      setEssenceMessage: this.setEssenceMsg.bind(this, item),
      removeEssenceMessage: this.deleteEssenceMsg.bind(this, item),
      getAnnounce: this.getGroupAnnouncements.bind(this, item),
      sendAnnounce: this.sendGroupAnnouncement.bind(this, item),
      delAnnounce: this.deleteGroupAnnouncement.bind(this, item),
      setName: this.setGroupName.bind(this, item),
      setAvatar: this.setGroupAvatar.bind(this, item),
      setAdmin: this.setGroupAdmin.bind(this, item),
      setCard: this.setGroupCard.bind(this, item),
      setTitle: this.setGroupTitle.bind(this, item),
      muteMember: this.setGroupBan.bind(this, item),
      muteAll: this.setGroupWholeBan.bind(this, item),
      kickMember: this.setGroupKick.bind(this, item),
      pokeMember: this.groupPoke.bind(this, item),
      addReaction: (message_id, face_id) => this.sendGroupReaction(item, message_id, face_id, true),
      removeReaction: (message_id, face_id) => this.sendGroupReaction(item, message_id, face_id, false),
      quit: this.quitGroup.bind(this, item),
      fs: this.getGroupFs(item),
      get is_owner() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "owner" },
      get is_admin() { return data.bot.gml.get(group_id)?.get(data.self_id)?.role === "admin" || this.is_owner },
    }
  }

  attachAliasMethods(bot, data) {
    bot.send_private_msg = (user_id, msg) => this.sendFriendMsg({ ...data, user_id, bot }, msg)
    bot.send_group_msg = (group_id, msg) => this.sendGroupMsg({ ...data, group_id, bot }, msg)
    bot.send_private_forward_msg = (user_id, msg) => this.sendFriendMsg({ ...data, user_id, bot }, Array.isArray(msg) ? [{ type: "node", data: msg }] : msg)
    bot.send_group_forward_msg = (group_id, msg) => this.sendGroupMsg({ ...data, group_id, bot }, Array.isArray(msg) ? [{ type: "node", data: msg }] : msg)
    bot.sendFriendForwardMsg = bot.send_private_forward_msg
    bot.sendGroupForwardMsg = bot.send_group_forward_msg
    bot.get_friend_list = () => this.getFriendList({ ...data, bot })
    bot.get_friend_info = user_id => this.getFriendInfo({ ...data, user_id, bot })
    bot.get_group_list = () => this.getGroupList({ ...data, bot })
    bot.get_group_info = group_id => this.getGroupInfo({ ...data, group_id, bot })
    bot.get_group_member_list = group_id => this.getMemberList({ ...data, group_id, bot })
    bot.get_group_member_info = (group_id, user_id) => this.getMemberInfo({ ...data, group_id, user_id, bot })
    bot.get_user_profile = user_id => this.getUserProfile({ ...data, user_id, bot })
    bot.accept_friend_request = (initiator_uid, is_filtered) => this.acceptFriendRequest({ ...data, bot }, initiator_uid, is_filtered)
    bot.reject_friend_request = (initiator_uid, is_filtered, reason) => this.rejectFriendRequest({ ...data, bot }, initiator_uid, is_filtered, reason)
    bot.accept_group_request = (notification_seq, notification_type, group_id, is_filtered) => this.acceptGroupRequest({ ...data, bot }, notification_seq, notification_type, group_id, is_filtered)
    bot.reject_group_request = (notification_seq, notification_type, group_id, is_filtered, reason) => this.rejectGroupRequest({ ...data, bot }, notification_seq, notification_type, group_id, is_filtered, reason)
    bot.accept_group_invitation = (group_id, invitation_seq) => this.acceptGroupInvitation({ ...data, bot }, group_id, invitation_seq)
    bot.reject_group_invitation = (group_id, invitation_seq) => this.rejectGroupInvitation({ ...data, bot }, group_id, invitation_seq)
    bot.recall_group_message = (group_id, message_seq) => this.recallMsg({ ...data, group_id, bot }, message_seq)
    bot.recall_private_message = (user_id, message_seq) => this.recallMsg({ ...data, user_id, bot }, message_seq)
    bot.delete_msg = message_id => this.deleteMsg({ ...data, bot }, message_id)
    bot.get_msg = (message_scene, peer_id, message_seq) => this.getMsg({ ...data, ...(message_scene === "group" ? { group_id: peer_id } : { user_id: peer_id }), bot }, message_seq)
    bot.get_history_messages = (message_scene, peer_id, start_message_seq, limit) => this.getHistoryMessages({ ...data, ...(message_scene === "group" ? { group_id: peer_id } : { user_id: peer_id }), bot }, start_message_seq, limit)
    bot.mark_message_as_read = (message_scene, peer_id, message_seq) => this.markMessageAsRead({ ...data, bot }, message_scene, peer_id, message_seq)
    bot.set_group_name = (group_id, group_name) => this.setGroupName({ ...data, group_id, bot }, group_name)
    bot.set_group_card = (group_id, user_id, card) => this.setGroupCard({ ...data, group_id, bot }, user_id, card)
    bot.set_group_admin = (group_id, user_id, enable) => this.setGroupAdmin({ ...data, group_id, bot }, user_id, enable)
    bot.set_group_special_title = (group_id, user_id, special_title) => this.setGroupTitle({ ...data, group_id, bot }, user_id, special_title)
    bot.set_group_ban = (group_id, user_id, duration) => this.setGroupBan({ ...data, group_id, bot }, user_id, duration)
    bot.set_group_whole_ban = (group_id, enable) => this.setGroupWholeBan({ ...data, group_id, bot }, enable)
    bot.set_group_kick = (group_id, user_id, reject_add_request) => this.setGroupKick({ ...data, group_id, bot }, user_id, reject_add_request)
    bot.set_group_leave = group_id => this.quitGroup({ ...data, group_id, bot })
    bot.send_like = (user_id, times) => this.sendLike({ ...data, user_id, bot }, times)
    bot.delete_friend = user_id => this.deleteFriend({ ...data, user_id, bot })
    bot.upload_group_file = (group_id, file, folder, name) => this.sendGroupFile({ ...data, group_id, bot }, file, folder, name)
    bot.delete_group_file = (group_id, file_id) => this.deleteGroupFile({ ...data, group_id, bot }, file_id)
    bot.get_group_files = (group_id, folder_id) => this.getGroupFiles({ ...data, group_id, bot }, folder_id)
    bot.create_group_folder = (group_id, name, parent_folder_id) => this.createGroupFileFolder({ ...data, group_id, bot }, name, parent_folder_id)
    bot.delete_group_folder = (group_id, folder_id) => this.deleteGroupFileFolder({ ...data, group_id, bot }, folder_id)
    bot.accept_group_invitation ??= (group_id, invitation_seq) => this.acceptGroupInvitation({ ...data, group_id, bot }, group_id, invitation_seq)
  }

  onConnect(bot, self_id) {
    this.attachAliasMethods(bot, { self_id })
    Bot.makeLog("mark", `${this.name}(${this.id}) ${bot.version.version} 已连接`, self_id)
    Bot.em(`connect.${self_id}`, { self_id, bot })
  }

  async bootstrapByApiBase(apiBase, ws = null) {
    if (!apiBase)
      return false

    try {
      const info = await this.callApiByBase(apiBase, "get_login_info", {})
      const self_id = String(info?.uin || info?.user_id)
      if (!self_id)
        return false

      await this.connect({
        self_id,
        time: Math.floor(Date.now() / 1000),
        event_type: "meta_connect",
        data: {},
      }, ws, { sid: apiBase, milkyApiBase: apiBase })
      return true
    } catch (error) {
      Bot.makeLog("error", ["Milky 初始化 Bot 失败", error], "Milky")
      return false
    }
  }

  connectWs() {
    const apiBase = this.getApiBaseFromConfig()
    const wsUrl = this.getWsEventUrl()
    if (!apiBase || !wsUrl)
      return

    const connect = () => {
      const ws = new WebSocket(wsUrl)
      let heartbeat

      ws.on("open", () => {
        Bot.makeLog("debug", `Milky WebSocket 已连接：${wsUrl}`, "Milky")
        this.bootstrapByApiBase(apiBase, ws).catch(() => {})
        heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN)
            ws.ping()
        }, this.wsHeartbeat)
      })

      ws.on("message", data => this.message(data, ws, { sid: wsUrl, milkyApiBase: apiBase }))
      ws.on("close", () => {
        clearInterval(heartbeat)
        Bot.makeLog("warn", `Milky WebSocket 已断开，${this.wsReconnectInterval / 1000}秒后重连`, "Milky")
        setTimeout(connect, this.wsReconnectInterval)
      })
      ws.on("error", err => Bot.makeLog("error", ["Milky WebSocket 错误", err], "Milky"))
    }

    connect()
  }

  setupWebhook() {
    const path = this.webhookPath
    Bot.express.post(path, (req, res) => {
      this.message(JSON.stringify(req.body), null, { sid: `${this.getApiBaseFromConfig()}${path}`, milkyApiBase: this.getApiBaseFromConfig() })
        .then(() => res.sendStatus(200))
        .catch(err => {
          Bot.makeLog("error", ["Milky WebHook 处理失败", err], "Milky")
          res.sendStatus(500)
        })
    })
    this.bootstrapByApiBase(this.getApiBaseFromConfig(), null).catch(() => {})
    Bot.makeLog("mark", `Milky WebHook 已启用：${path}`, "Milky")
  }

  async connect(event, ws, req) {
    const data = {
      ...event,
      time: event.time || Math.floor(Date.now() / 1000),
      self_id: event.self_id,
    }

    if (Bot[data.self_id]) {
      Bot[data.self_id].ws = ws
      Bot[data.self_id].apiBase = req?.milkyApiBase || this.getApiBase(req)
      Bot[data.self_id].sendApi = this.callApi.bind(this, { ...data, bot: Bot[data.self_id] })
      this.attachAliasMethods(Bot[data.self_id], { ...data, bot: Bot[data.self_id] })
      if (event.event_type === "meta_connect")
        this.onConnect(Bot[data.self_id], data.self_id)
      return Bot[data.self_id]
    }

    Bot[data.self_id] = {
      adapter: this,
      ws,
      apiBase: req?.milkyApiBase || this.getApiBase(req),
      sendApi: this.callApi.bind(this, data),
      stat: { start_time: data.time },

      info: {},
      get uin() { return this.info.uin },
      get nickname() { return this.info.nickname },
      get avatar() { return `https://q.qlogo.cn/g?b=qq&s=0&nk=${this.uin}` },

      setProfile: this.setProfile.bind(this, data),
      setNickname: nickname => this.setProfile(data, { nickname }),
      setAvatar: this.setAvatar.bind(this, data),
      getCookies: this.getCookies.bind(this, data),
      getCsrfToken: this.getCsrfToken.bind(this, data),

      pickFriend: this.pickFriend.bind(this, data),
      get pickUser() { return this.pickFriend },
      getFriendArray: this.getFriendArray.bind(this, data),
      getFriendList: this.getFriendList.bind(this, data),
      getFriendMap: this.getFriendMap.bind(this, data),
      fl: new Map,

      pickMember: this.pickMember.bind(this, data),
      pickGroup: this.pickGroup.bind(this, data),
      getGroupArray: this.getGroupArray.bind(this, data),
      getGroupList: this.getGroupList.bind(this, data),
      getGroupMap: this.getGroupMap.bind(this, data),
      getGroupMemberMap: this.getGroupMemberMap.bind(this, data),
      gl: new Map,
      gml: new Map,

      request_list: [],
      getSystemMsg() { return this.request_list },
      setFriendAddRequest: this.setFriendAddRequest.bind(this, data),
      setGroupAddRequest: this.setGroupAddRequest.bind(this, data),

      setEssenceMessage: this.setEssenceMsg.bind(this, data),
      removeEssenceMessage: this.deleteEssenceMsg.bind(this, data),

      cookies: {},
    }
    data.bot = Bot[data.self_id]
    this.attachAliasMethods(data.bot, data)

    if (!Bot.uin.includes(data.self_id))
      Bot.uin.push(data.self_id)

    const [info, impl] = await Promise.all([
      data.bot.sendApi("get_login_info", {}).catch(error => ({ error })),
      data.bot.sendApi("get_impl_info", {}).catch(error => ({ error })),
    ])

    data.bot.info = info?.error ? { uin: data.self_id, nickname: String(data.self_id) } : info
    data.bot.bkn = await data.bot.getCsrfToken().catch(() => undefined)
    data.bot.version = {
      id: this.id,
      name: this.name,
      impl_name: impl?.impl_name || this.name,
      impl_version: impl?.impl_version || "unknown",
      milky_version: impl?.milky_version || "unknown",
      qq_protocol_type: impl?.qq_protocol_type,
      qq_protocol_version: impl?.qq_protocol_version,
      get version() {
        return `${this.impl_name} v${this.impl_version} (Milky ${this.milky_version})`
      },
    }

    for (const domain of this.config.cookie_domains || [])
      data.bot.cookies[domain] = await data.bot.getCookies(domain).catch(() => undefined)

    data.bot.getFriendMap().catch(() => {})
    data.bot.getGroupMemberMap().catch(() => {})

    this.onConnect(data.bot, data.self_id)
    return data.bot
  }

  makeMessage(event) {
    const payload = event.data
    const bot = Bot[event.self_id]
    const parsed = this.parseSegments(payload.segments)
    const data = {
      event,
      bot,
      self_id: event.self_id,
      post_type: "message",
      message_id: payload.message_seq,
      message_seq: payload.message_seq,
      time: payload.time,
      user_id: payload.sender_id,
      message: parsed.message,
      raw_message: parsed.raw_message,
      sender: {
        user_id: payload.sender_id,
        nickname: payload.friend?.nickname || payload.group_member?.nickname,
        card: payload.group_member?.card,
      },
    }

    switch (payload.message_scene) {
      case "friend":
        data.message_type = "private"
        Object.assign(data.sender, payload.friend)
        if (!bot.fl.has(payload.sender_id))
          bot.fl.set(payload.sender_id, payload.friend)
        Bot.makeLog("info", `好友消息：${data.sender.nickname ? `[${data.sender.nickname}] ` : ""}${data.raw_message}`, `${data.self_id} <= ${data.user_id}`, true)
        break
      case "group": {
        data.message_type = "group"
        data.group_id = payload.group.group_id
        data.group_name = payload.group.group_name
        Object.assign(data.sender, payload.group_member)
        bot.gl.set(payload.group.group_id, payload.group)
        let gml = bot.gml.get(payload.group.group_id)
        if (!gml) {
          gml = new Map
          bot.gml.set(payload.group.group_id, gml)
        }
        gml.set(payload.group_member.user_id, payload.group_member)
        Bot.makeLog("info", `群消息：${data.sender.card || data.sender.nickname ? `[${data.group_name}, ${data.sender.card || data.sender.nickname}] ` : ""}${data.raw_message}`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      }
      case "temp":
        data.message_type = "private"
        if (payload.group)
          data.group_id = payload.group.group_id
        Bot.makeLog("info", `临时消息：${data.raw_message}`, `${data.self_id} <= ${data.user_id}`, true)
        break
      default:
        Bot.makeLog("warn", `未知消息场景：${payload.message_scene}`, data.self_id)
        return
    }

    Bot.em(`${data.post_type}.${data.message_type}`, data)
    if (data.message_type === "group")
      Bot.em(`${data.post_type}.${data.message_type}.normal`, data)
  }

  makeRecall(event) {
    const payload = event.data
    const data = {
      event,
      bot: Bot[event.self_id],
      self_id: event.self_id,
      post_type: "notice",
      notice_type: payload.message_scene === "group" ? "group" : "friend",
      sub_type: "recall",
      message_id: payload.message_seq,
      message_seq: payload.message_seq,
      user_id: payload.sender_id,
      operator_id: payload.operator_id,
      time: event.time,
    }

    if (payload.message_scene === "group") {
      data.group_id = payload.peer_id
      Bot.makeLog("info", `群消息撤回：${payload.operator_id} => ${payload.sender_id} ${payload.message_seq}`, `${data.self_id} <= ${data.group_id}`, true)
    } else {
      data.user_id = payload.peer_id
      Bot.makeLog("info", `好友消息撤回：${payload.message_seq}`, `${data.self_id} <= ${data.user_id}`, true)
    }

    Bot.em(`${data.post_type}.${data.notice_type}.${data.sub_type}`, data)
  }

  makeRequest(event) {
    const data = {
      event,
      bot: Bot[event.self_id],
      self_id: event.self_id,
      post_type: "request",
      time: event.time,
    }

    switch (event.event_type) {
      case "friend_request":
        data.request_type = "friend"
        data.sub_type = "add"
        data.user_id = event.data.initiator_id
        data.flag = `${event.event_type}:${event.data.initiator_uid}:${event.time}`
        data.initiator_uid = event.data.initiator_uid
        data.is_filtered = false
        data.comment = event.data.comment
        data.source = event.data.via
        Bot.makeLog("info", `加好友请求：${data.comment}`, `${data.self_id} <= ${data.user_id}`, true)
        break
      case "group_join_request":
        data.request_type = "group"
        data.sub_type = "add"
        data.group_id = event.data.group_id
        data.user_id = event.data.initiator_id
        data.flag = event.data.notification_seq
        data.is_filtered = event.data.is_filtered
        data.comment = event.data.comment
        Bot.makeLog("info", `入群请求：${data.comment}`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      case "group_invited_join_request":
        data.request_type = "group"
        data.sub_type = "invite"
        data.group_id = event.data.group_id
        data.user_id = event.data.target_user_id
        data.operator_id = event.data.initiator_id
        data.flag = event.data.notification_seq
        data.is_filtered = false
        Bot.makeLog("info", `群邀请他人入群请求`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      case "group_invitation":
        data.request_type = "group"
        data.sub_type = "invite"
        data.group_id = event.data.group_id
        data.user_id = event.data.initiator_id
        data.flag = event.data.invitation_seq
        data.is_filtered = false
        Bot.makeLog("info", `他人邀请自身入群`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      default:
        return false
    }

    data.bot.request_list.unshift(data)
    if (data.bot.request_list.length > this.requestCacheSize)
      data.bot.request_list.length = this.requestCacheSize

    Bot.em(`${data.post_type}.${data.request_type}.${data.sub_type}`, data)

    if (event.event_type === "group_invitation") {
      data.approve = approve => approve
        ? this.acceptGroupInvitation(data, data.group_id, data.flag)
        : this.rejectGroupInvitation(data, data.group_id, data.flag)
    } else if (event.event_type === "friend_request") {
      data.approve = approve => approve
        ? this.acceptFriendRequest(data, data.initiator_uid, data.is_filtered)
        : this.rejectFriendRequest(data, data.initiator_uid, data.is_filtered)
    } else {
      data.approve = approve => approve
        ? this.acceptGroupRequest(data, data.flag, data.sub_type === "add" ? "join_request" : "invited_join_request", data.group_id, data.is_filtered)
        : this.rejectGroupRequest(data, data.flag, data.sub_type === "add" ? "join_request" : "invited_join_request", data.group_id, data.is_filtered)
    }

    return true
  }

  makeNotice(event) {
    const payload = event.data
    const data = {
      event,
      bot: Bot[event.self_id],
      self_id: event.self_id,
      post_type: "notice",
      time: event.time,
    }

    switch (event.event_type) {
      case "friend_nudge":
        data.notice_type = "friend"
        data.sub_type = "poke"
        data.user_id = payload.user_id
        data.operator_id = payload.user_id
        data.target_id = payload.is_self_receive ? event.self_id : payload.user_id
        Bot.makeLog("info", `好友戳一戳：${payload.user_id}`, `${data.self_id} <= ${data.user_id}`, true)
        break
      case "friend_file_upload":
        data.notice_type = "friend"
        data.sub_type = "file"
        Object.assign(data, payload)
        Bot.makeLog("info", `好友文件：${payload.file_name}`, `${data.self_id} <= ${data.user_id}`, true)
        break
      case "group_admin_change":
        data.notice_type = "group"
        data.sub_type = payload.is_set ? "set" : "unset"
        Object.assign(data, payload)
        data.set = payload.is_set
        Bot.makeLog("info", `群管理员变动：${data.sub_type}`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      case "group_member_increase":
        data.notice_type = "group"
        data.sub_type = payload.invitor_id ? "invite" : "approve"
        Object.assign(data, payload)
        Bot.makeLog("info", `群成员增加：${payload.user_id}`, `${data.self_id} <= ${data.group_id}`, true)
        break
      case "group_member_decrease":
        data.notice_type = "group"
        data.sub_type = payload.operator_id ? "kick" : "leave"
        Object.assign(data, payload)
        Bot.makeLog("info", `群成员减少：${payload.user_id}`, `${data.self_id} <= ${data.group_id}`, true)
        break
      case "group_name_change":
        data.notice_type = "group"
        data.sub_type = "group_name"
        Object.assign(data, payload)
        data.group_name = payload.new_group_name
        Bot.makeLog("info", `群名称变更：${payload.new_group_name}`, `${data.self_id} <= ${data.group_id}`, true)
        break
      case "group_message_reaction":
        data.notice_type = "group"
        data.sub_type = "reaction"
        Object.assign(data, payload)
        Bot.makeLog("info", `群消息回应：${payload.face_id}`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      case "group_mute":
        data.notice_type = "group"
        data.sub_type = payload.duration > 0 ? "ban" : "lift_ban"
        Object.assign(data, payload)
        Bot.makeLog("info", `群禁言：${payload.duration}秒`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      case "group_whole_mute":
        data.notice_type = "group"
        data.sub_type = payload.is_mute ? "ban" : "lift_ban"
        Object.assign(data, payload)
        Bot.makeLog("info", `${payload.is_mute ? "开启" : "关闭"}全员禁言`, `${data.self_id} <= ${data.group_id}`, true)
        break
      case "group_nudge":
        data.notice_type = "group"
        data.sub_type = "poke"
        data.group_id = payload.group_id
        data.user_id = payload.sender_id
        data.operator_id = payload.sender_id
        data.target_id = payload.receiver_id
        Bot.makeLog("info", `群戳一戳：${payload.sender_id} => ${payload.receiver_id}`, `${data.self_id} <= ${data.group_id}`, true)
        break
      case "group_file_upload":
        data.notice_type = "group"
        data.sub_type = "file"
        Object.assign(data, payload)
        Bot.makeLog("info", `群文件：${payload.file_name}`, `${data.self_id} <= ${data.group_id}, ${data.user_id}`, true)
        break
      case "group_essence_message_change":
        data.notice_type = "group"
        data.sub_type = payload.is_set ? "essence" : "unessence"
        Object.assign(data, payload)
        Bot.makeLog("info", `群精华消息变动：${payload.message_seq}`, `${data.self_id} <= ${data.group_id}`, true)
        break
      default:
        return false
    }

    Bot.em(`${data.post_type}.${data.notice_type}.${data.sub_type}`, data)

    switch (event.event_type) {
      case "message_recall":
        Bot.em(`${data.post_type}.${payload.message_scene === "group" ? "group_recall" : "friend_recall"}`, data)
        break
      case "friend_nudge":
      case "group_nudge":
        Bot.em(`${data.post_type}.notify.poke`, data)
        break
      case "group_admin_change":
        Bot.em(`${data.post_type}.group_admin.${data.sub_type}`, data)
        break
      case "group_member_increase":
        Bot.em(`${data.post_type}.group_increase.${data.sub_type}`, data)
        break
      case "group_member_decrease":
        Bot.em(`${data.post_type}.group_decrease.${data.sub_type}`, data)
        break
      case "group_mute":
      case "group_whole_mute":
        Bot.em(`${data.post_type}.group_ban.${data.sub_type}`, data)
        break
      case "group_message_reaction":
        Bot.em(`${data.post_type}.group_msg_emoji_like`, {
          ...data,
          likes: [{ emoji_id: String(payload.face_id), count: payload.is_add ? 1 : 0 }],
        })
        break
      case "group_essence_message_change":
        Bot.em(`${data.post_type}.group_essence.${payload.is_set ? "add" : "delete"}`, data)
        break
      case "friend_file_upload":
        Bot.em(`${data.post_type}.offline_file`, {
          ...data,
          file: { name: payload.file_name, size: payload.file_size, url: payload.file_id },
        })
        break
    }

    return true
  }

  async message(raw, ws, req) {
    let event
    try {
      event = {
        ...JSON.parse(raw),
        raw: Bot.String(raw),
      }
    } catch (err) {
      return Bot.makeLog("error", ["解码数据失败", raw, err])
    }

    if (!event?.self_id) {
      Bot.makeLog("warn", `Milky 收到缺少 self_id 的消息：${logger.magenta(event.raw)}`)
      return false
    }

    await this.connect(event, ws, req)

    switch (event.event_type) {
      case "message_receive":
        return this.makeMessage(event)
      case "message_recall":
        return this.makeRecall(event)
      case "friend_request":
      case "group_join_request":
      case "group_invited_join_request":
      case "group_invitation":
        return this.makeRequest(event)
      case "bot_offline":
        Bot.makeLog("warn", `机器人离线：${event.data.reason}`, event.self_id)
        return Bot.em("notice", {
          self_id: event.self_id,
          bot: Bot[event.self_id],
          post_type: "notice",
          notice_type: "bot",
          sub_type: "offline",
          reason: event.data.reason,
          time: event.time,
        })
      default:
        if (this.makeNotice(event) !== false)
          return true
    }

    Bot.makeLog("warn", `未知 Milky 事件：${logger.magenta(event.raw)}`, event.self_id)
    return false
  }

  load() {
    if (!Array.isArray(Bot.wsf[this.path]))
      Bot.wsf[this.path] = []
    Bot.wsf[this.path].push((ws, req) =>
      ws.on("message", data => this.message(data, ws, req))
    )

    if (!this.enable)
      return

    if (this.connection === "ws")
      setTimeout(() => this.connectWs(), 12000)
    else if (this.connection === "webhook")
      setTimeout(() => this.setupWebhook(), 12000)
  }
})
