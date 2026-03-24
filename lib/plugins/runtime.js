





import lodash from "lodash"
import fs from "node:fs/promises"
import path from "node:path"
import common from "../common/common.js"
import cfg from "../config/config.js"
import puppeteer from "../puppeteer/puppeteer.js"
import Handler from "./handler.js"

let gsCfg, MysApi, MysInfo, NoteUser, MysUser
try {
  gsCfg = (await import("../../plugins/genshin/model/gsCfg.js")).default
  MysApi = (await import("../../plugins/genshin/model/mys/mysApi.js")).default
  MysInfo = (await import("../../plugins/genshin/model/mys/mysInfo.js")).default
  NoteUser = (await import("../../plugins/genshin/model/mys/NoteUser.js")).default
  MysUser = (await import("../../plugins/genshin/model/mys/MysUser.js")).default
} catch {}

async function pathExists(target) {
  try {
    await fs.stat(target)
    return true
  } catch {
    return false
  }
}

async function resolveCommonResourcePaths(plugin) {
  const root = process.cwd()
  const pluginResourcesRoot = path.join(root, "plugins", plugin, "resources")
  const pluginCommonRoot = path.join(pluginResourcesRoot, "common")
  const miaoResourcesRoot = path.join(root, "plugins", "miao-plugin", "resources")
  const miaoCommonRoot = path.join(miaoResourcesRoot, "common")

  const commonRoot = await pathExists(pluginCommonRoot) ? pluginCommonRoot : miaoCommonRoot
  const hasCommonRoot = await pathExists(commonRoot)

  return {
    pluginResourcesRoot,
    miaoResourcesRoot,
    tplRoot: hasCommonRoot ? path.join(commonRoot, "tpl") : pluginResourcesRoot,
    defaultLayout: hasCommonRoot ? path.join(commonRoot, "layout", "default.html") : "",
    elemLayout: hasCommonRoot ? path.join(commonRoot, "layout", "elem.html") : "",
  }
}





export default class Runtime {
  constructor(e) {
    this.e = e
    this._mysInfo = {}

    this.handler = {
      has: Handler.has,
      call: Handler.call,
      callAll: Handler.callAll,
    }
  }

  get uid() {
    return this.user?.uid
  }

  get hasCk() {
    return this.user?.hasCk
  }

  get user() {
    return this.e.user
  }

  get cfg() {
    return cfg
  }

  get gsCfg() {
    return gsCfg
  }

  get common() {
    return common
  }

  get puppeteer() {
    return puppeteer
  }

  get MysInfo() {
    return MysInfo
  }

  get NoteUser() {
    return NoteUser
  }

  get MysUser() {
    return MysUser
  }

  async initUser() {
    let e = this.e
    let user = await NoteUser.create(e)
    if (user) {
      e.user = new Proxy(user, {
        get(self, key, receiver) {
          let game = e.game
          let fnMap = {
            uid: "getUid",
            uidList: "getUidList",
            mysUser: "getMysUser",
            ckUidList: "getCkUidList",
          }
          if (fnMap[key]) {
            return self[fnMap[key]](game)
          }
          if (key === "uidData") {
            return self.getUidData("", game)
          }
          if (
            [
              "getUid",
              "getUidList",
              "getMysUser",
              "getCkUidList",
              "getUidMapList",
              "getGameDs",
            ].includes(key)
          ) {
            return (_game, arg2) => {
              return self[key](_game || game, arg2)
            }
          }
          if (["getUidData", "hasUid", "addRegUid", "delRegUid", "setMainUid"].includes(key)) {
            return (uid, _game = "") => {
              return self[key](uid, _game || game)
            }
          }
          return self[key]
        },
      })
    }
  }

  





  async getMysInfo(targetType = "all") {
    if (!this._mysInfo[targetType]) {
      this._mysInfo[targetType] = await MysInfo.init(
        this.e,
        targetType === "cookie" ? "detail" : "roleIndex",
      )
    }
    return this._mysInfo[targetType]
  }

  async getUid() {
    return await MysInfo.getUid(this.e)
  }

  







  async getMysApi(targetType = "all", option = {}, isSr = false) {
    let mys = await this.getMysInfo(targetType)
    if (mys.uid && mys?.ckInfo?.ck) {
      if (isSr) option.game = "sr"
      return new MysApi(mys.uid, mys.ckInfo.ck, option)
    }
    return false
  }

  







  createMysApi(uid, ck, option, isSr = false) {
    if (isSr) option.game = "sr"
    return new MysApi(uid, ck, option)
  }

  












  async render(plugin, path, data = {}, cfg = {}) {
    
    path = path.replace(/.html$/, "")
    let paths = lodash.filter(path.split("/"), p => !!p)
    path = paths.join("/")
    
    await Bot.mkdir(`temp/html/${plugin}/${path}`)
    
    let pluResPath = `../../../${lodash.repeat("../", paths.length)}plugins/${plugin}/resources/`
    let miaoResPath = `../../../${lodash.repeat("../", paths.length)}plugins/miao-plugin/resources/`
    const resourcePaths = await resolveCommonResourcePaths(plugin)
    
    data = {
      sys: {
        scale: 1,
      },
      
      copyright: `Created By Rabbit<span class="version">${cfg.package.version}</span> `,
      _res_path: pluResPath,
      _miao_path: miaoResPath,
      _tpl_path: resourcePaths.tplRoot,
      defaultLayout: resourcePaths.defaultLayout,
      elemLayout: resourcePaths.elemLayout,

      ...data,

      
      _plugin: plugin,
      _htmlPath: path,
      pluResPath,
      tplFile: `./plugins/${plugin}/resources/${path}.html`,
      saveId: data.saveId || data.save_id || paths[paths.length - 1],
    }
    
    if (cfg.beforeRender) {
      data = cfg.beforeRender({ data }) || data
    }
    
    if (process.argv.includes("dev")) {
      
      
      let saveDir = await Bot.mkdir(`temp/ViewData/${plugin}`)
      let file = `${saveDir}/${data._htmlPath.split("/").join("_")}.json`
      await fs.writeFile(file, JSON.stringify(data))
    }
    
    let base64 = await puppeteer.screenshot(`${plugin}/${path}`, data)
    if (cfg.retType === "base64") {
      return base64
    }
    let ret = true
    if (base64) {
      if (cfg.recallMsg) {
        ret = await this.e.reply(base64, false, {})
      } else {
        ret = await this.e.reply(base64)
      }
    }
    return cfg.retType === "msgId" ? ret : true
  }

  static async init(e) {
    await MysInfo.initCache()
    e.runtime = new Runtime(e)
    await e.runtime.initUser()
    return e.runtime
  }
}

if (!MysInfo || !NoteUser) Runtime.init = async e => (e.runtime = new Runtime(e))
