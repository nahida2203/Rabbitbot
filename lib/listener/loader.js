import fs from "node:fs/promises"




class ListenerLoader {
  


  async load() {
    Bot.makeLog("info", "-----------", "Listener")
    Bot.makeLog("info", "加载监听事件中...", "Listener")
    const eventPromise = (await fs.readdir("./lib/events"))
      .filter(file => file.endsWith(".js"))
      .map(this.loadEvent)
    await Promise.allSettled(eventPromise)
    Bot.makeLog("info", `加载监听事件[${eventPromise.length}个]`, "Listener")

    Bot.makeLog("info", "-----------", "Adapter")
    Bot.makeLog("info", "加载适配器中...", "Adapter")
    const adapterPromise = Bot.adapter.map(this.loadAdapter)
    await Promise.allSettled(adapterPromise)
    Bot.makeLog("info", `加载适配器[${adapterPromise.length}个]`, "Adapter")
  }

  async loadEvent(file) {
    Bot.makeLog("debug", [`加载监听事件 ${file}`], "Listener")
    try {
      let listener = await import(`../events/${file}`)
      if (!listener.default) return
      listener = new listener.default()
      const on = listener.once ? "once" : "on"

      for (const type of Array.isArray(listener.event) ? listener.event : [listener.event]) {
        const e = listener[type] ? type : "execute"
        Bot[on](listener.prefix + type, listener[e].bind(listener))
      }
    } catch (err) {
      Bot.makeLog("error", [`监听事件加载错误 ${file}`, err], "Listener")
    }
  }

  async loadAdapter(adapter) {
    const adapterName = adapter?.name || adapter?.constructor?.name || "unknown"
    const adapterId = adapter?.id || adapter?.path || "unknown"
    Bot.makeLog("debug", [`加载适配器 ${adapterName}(${adapterId})`], "Adapter")
    try {
      if (typeof adapter?.load === "function") {
        await adapter.load()
        return
      }
      Bot.makeLog("debug", [`适配器 ${adapterName}(${adapterId}) 未提供 load()，跳过初始化`], "Adapter")
    } catch (err) {
      Bot.makeLog("error", [`适配器加载错误 ${adapterName}(${adapterId})`, err], "Adapter")
    }
  }
}

export default new ListenerLoader()
