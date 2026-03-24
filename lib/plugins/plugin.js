const stateArr = {}
const SymbolTimeout = Symbol("Timeout")
const SymbolResolve = Symbol("Resolve")

export default class plugin {
  




















  constructor({
    name = "your-plugin",
    dsc = "无",
    handler,
    namespace,
    event = "message",
    priority = 5000,
    task = { name: "", fnc: "", cron: "" },
    rule = [],
  }) {
    
    this.name = name
    
    this.dsc = dsc
    
    this.event = event
    
    this.priority = priority
    
    this.task = task
    
    this.rule = rule

    if (handler) {
      this.handler = handler
      this.namespace = namespace || ""
    }
  }

  





  reply(msg = "", quote = false, data = {}) {
    if (!this.e?.reply || !msg) return false
    return this.e.reply(msg, quote, data)
  }

  conKey(isGroup = false) {
    return `${this.name}.${this.self_id || this.e.self_id}.${isGroup ? this.group_id || this.e.group_id : this.user_id || this.e.user_id}`
  }

  





  setContext(type, isGroup, time = 120, timeout = "操作超时已取消") {
    const key = this.conKey(isGroup)
    if (!stateArr[key]) stateArr[key] = {}
    stateArr[key][type] = this.e
    if (time)
      stateArr[key][type][SymbolTimeout] = setTimeout(() => {
        const resolve = stateArr[key][type][SymbolResolve]
        delete stateArr[key][type]
        resolve ? resolve(false) : this.reply(timeout, true)
      }, time * 1000)
    return stateArr[key][type]
  }

  getContext(type, isGroup) {
    if (type) return stateArr[this.conKey(isGroup)]?.[type]
    return stateArr[this.conKey(isGroup)]
  }

  finish(type, isGroup) {
    const key = this.conKey(isGroup)
    if (stateArr[key]?.[type]) {
      clearTimeout(stateArr[key][type][SymbolTimeout])
      delete stateArr[key][type]
    }
  }

  awaitContext(...args) {
    return new Promise(
      resolve => (this.setContext("resolveContext", ...args)[SymbolResolve] = resolve),
    )
  }

  resolveContext(context) {
    this.finish("resolveContext")
    context[SymbolResolve](this.e)
  }

  async renderImg(plugin, tpl, data, cfg) {
    if (this.e?.runtime?.render) {
      return this.e.runtime.render(plugin, tpl, data, cfg)
    }
    return false
  }
}
