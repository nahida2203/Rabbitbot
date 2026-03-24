import template from "art-template"
import chokidar from "chokidar"
import path from "node:path"
import fs from "node:fs"
import { loggerManager } from "../common/logger.js"

export default class Renderer {
  





  constructor(data) {
    
    this.id = data.id || "renderer"
    
    this.type = data.type || "image"
    
    this.render = this[data.render || "render"]
    this.dir = "./temp/html"
    this.html = {}
    this.watcher = {}
    this.createDir(this.dir)
  }

  
  createDir(dirname) {
    if (fs.existsSync(dirname)) {
      return true
    } else {
      if (this.createDir(path.dirname(dirname))) {
        fs.mkdirSync(dirname)
        return true
      }
    }
  }

  
  dealTpl(name, data) {
    let { tplFile, saveId = name } = data
    let savePath = `./temp/html/${name}/${saveId}.html`

    
    if (!this.html[tplFile]) {
      this.createDir(`./temp/html/${name}`)

      try {
        this.html[tplFile] = fs.readFileSync(tplFile, "utf8")
      } catch (error) {
        loggerManager.error(`加载html错误：${tplFile}`)
        return false
      }

      this.watch(tplFile)
    }

    data.resPath = `./resources/`

    
    let tmpHtml = template.render(this.html[tplFile], data)

    
    fs.writeFileSync(savePath, tmpHtml)

    loggerManager.debug(`[图片生成][使用模板] ${savePath}`)

    return savePath
  }

  
  watch(tplFile) {
    if (this.watcher[tplFile]) return

    const watcher = chokidar.watch(tplFile)
    watcher.on("change", () => {
      delete this.html[tplFile]
      loggerManager.mark(`[修改html模板] ${tplFile}`)
    })

    this.watcher[tplFile] = watcher
  }
}
