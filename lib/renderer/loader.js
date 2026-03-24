import fs from "node:fs"
import yaml from "yaml"
import lodash from "lodash"
import chokidar from "chokidar"
import cfg from "../config/config.js"
import Renderer from "./Renderer.js"
import { loggerManager } from "../common/logger.js"


global.Renderer = Renderer




class RendererLoader {
  constructor() {
    this.renderers = new Map()
    this.dir = "renderers"
    this.watcher = null
    this.fallbackOrder = ['puppeteer', 'image']
  }

  static async init() {
    const render = new RendererLoader()
    await render.load()
    render.initWatcher()
    return render
  }

  async load() {
    const subFolders = fs
      .readdirSync(this.dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
    for (const subFolder of subFolders) {
      const name = subFolder.name
      try {
        const rendererFn = (await import(`../../${this.dir}/${name}/index.js`)).default
        const configFile = `${this.dir}/${name}/config.yaml`
        const rendererCfg = fs.existsSync(configFile)
          ? yaml.parse(fs.readFileSync(configFile, "utf8"))
          : {}
        const renderer = rendererFn(rendererCfg)
        if (
          !renderer.id ||
          !renderer.type ||
          !renderer.render ||
          !lodash.isFunction(renderer.render)
        ) {
          loggerManager.warn("渲染后端 " + (renderer.id || subFolder.name) + " 不可用")
        }
        this.renderers.set(renderer.id, renderer)
        loggerManager.info(`加载渲染后端 ${renderer.id}`)
      } catch (err) {
        loggerManager.error(`渲染后端 ${name} 加载失败`)
        loggerManager.error(err)
      }
    }
  }

  getRenderer(name = cfg.renderer?.name || "puppeteer") {
    
    if (this.renderers.has(name)) {
      return this.renderers.get(name)
    }
    
    
    for (const fallback of this.fallbackOrder) {
      if (this.renderers.has(fallback)) {
        loggerManager.warn(`渲染器 ${name} 不可用，降级使用 ${fallback}`)
        return this.renderers.get(fallback)
      }
    }
    
    
    const firstRenderer = this.renderers.values().next().value
    if (firstRenderer) {
      loggerManager.warn(`使用备用渲染器 ${firstRenderer.id}`)
      return firstRenderer
    }
    
    loggerManager.error("没有可用的渲染器")
    return {}
  }

  


  initWatcher() {
    if (this.watcher) return
    
    this.watcher = chokidar.watch(this.dir, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    })
    
    this.watcher.on('change', async (path) => {
      if (path.includes('index.js') || path.includes('config.yaml')) {
        const rendererName = path.split('/')[1] || path.split('\\')[1]
        loggerManager.info(`检测到渲染器 ${rendererName} 文件变更，重新加载`)
        await this.reloadRenderer(rendererName)
      }
    })
    
    loggerManager.info('渲染器热重载监听已启动')
  }

  


  async reloadRenderer(name) {
    try {
      
      const modulePath = `../../${this.dir}/${name}/index.js`
      delete require.cache[require.resolve(modulePath)]
      
      const rendererFn = (await import(`${modulePath}?t=${Date.now()}`)).default
      const configFile = `${this.dir}/${name}/config.yaml`
      const rendererCfg = fs.existsSync(configFile)
        ? yaml.parse(fs.readFileSync(configFile, "utf8"))
        : {}
      
      const renderer = rendererFn(rendererCfg)
      if (
        !renderer.id ||
        !renderer.type ||
        !renderer.render ||
        !lodash.isFunction(renderer.render)
      ) {
        loggerManager.warn("渲染器 " + (renderer.id || name) + " 重载后不可用")
        return
      }
      
      this.renderers.set(renderer.id, renderer)
      loggerManager.info(`渲染器 ${renderer.id} 重载成功`)
    } catch (err) {
      loggerManager.error(`渲染器 ${name} 重载失败`)
      loggerManager.error(err)
    }
  }
}

export default await RendererLoader.init()
