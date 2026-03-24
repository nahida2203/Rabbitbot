import fs from 'fs'
import path from 'path'
import plugin from '../../lib/plugins/plugin.js'

const fsp = fs.promises
const DATA_FILE = 'data/dev_tasks.json'

async function safeReadJson(file) {
  try {
    const txt = await fsp.readFile(file, 'utf8')
    return JSON.parse(txt)
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ERR_INVALID_ARG_VALUE')) {
      return { seq: 0, tasks: [] }
    }
    throw err
  }
}

async function safeWriteJson(file, data) {
  const txt = JSON.stringify(data, null, 2)
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, txt, 'utf8')
}

export class devTasks extends plugin {
  constructor() {
    super({
      name: "开发任务清单",
      dsc: "添加/完成/查看开发任务（主人专用）",
      event: "message",
      priority: -10,
      rule: [
        {
          reg: "^#加开发任务[\\s\\S]+$",
          fnc: "addTask",
          //permission: "master",
        },
        {
          reg: "^#完成开发任务(.+)$",
          fnc: "completeTask",
          //permission: "master",
        },
        {
          reg: "^#查看任务清单$",
          fnc: "listTasks",
          //permission: "master",
        }
      ]
    })
  }

  async addTask(e) {
    if (!e.isMaster) {return false}
     
    const content = this.e.msg.replace(/^#加开发任务/, "").trim()
    if (!content) {
      return this.reply("请在指令后提供任务内容，如：#加开发任务 测试", true)
    }

    const store = await safeReadJson(DATA_FILE)
    store.seq += 1
    const now = new Date()
      .toLocaleString('zh-CN', { hour12: false })
    const task = {
      id: store.seq,
      content,
      status: 'pending',
      createdAt: now,
      completedAt: '',
      creator: this.e.user_id,
    }
    store.tasks.push(task)
    await safeWriteJson(DATA_FILE, store)

    return this.reply(
      `已添加开发任务\n编号：${task.id}\n内容：${task.content}\n状态：待完成\n创建时间：${task.createdAt}\n创建人：${task.creator}`,
      true
    )
  }

  async completeTask(e) {
    if (!e.isMaster) {return false}
    const key = this.e.msg.replace(/^#完成开发任务/, '').trim()
    if (!key) {
      return this.reply('请提供要完成的任务编号或关键词，如：#完成开发任务 3', true)
    }

    const store = await safeReadJson(DATA_FILE)
    if (!Array.isArray(store.tasks) || store.tasks.length === 0) {
      return this.reply('当前任务清单为空，无可完成的任务', true)
    }

    let task = null
    if (/^\d+$/.test(key)) {
      const id = Number(key)
      task = store.tasks.find(t => t.id === id)
    }
    if (!task) {
      task = store.tasks.find(t => t.status !== 'completed' && t.content.includes(key))
    }

    if (!task) {
      return this.reply('未找到匹配的任务，请确认编号或关键字是否正确', true)
    }
    if (task.status === 'completed') {
      return this.reply(`任务已完成，无需重复操作\n编号：${task.id}\n内容：${task.content}`, true)
    }

    task.status = 'completed'
    task.completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    await safeWriteJson(DATA_FILE, store)

    return this.reply(
      `已完成开发任务\n编号：${task.id}\n内容：${task.content}\n完成时间：${task.completedAt}`,
      true
    )
  }

  async listTasks(e) {
    if (!e.isMaster) {return false}
    const store = await safeReadJson(DATA_FILE)
    const tasks = Array.isArray(store.tasks) ? store.tasks : []
    if (tasks.length === 0) {
      return this.reply('当前任务清单为空，可使用 #添加开发任务清单 xxx 添加新任务', true)
    }

    const pending = tasks.filter(t => t.status !== 'completed')
    const completed = tasks.filter(t => t.status === 'completed')

    const fmt = t => `#${t.id} 【${t.status === 'completed' ? '已完成' : '待完成'}】 ${t.content}` +
      (t.status === 'completed' ? `（完成：${t.completedAt}）` : '')

    const lines = []
    lines.push(`任务总数：${tasks.length}（待：${pending.length}，完：${completed.length}）`)
    if (pending.length) {
      lines.push('\n待完成：')
      lines.push(...pending.map(fmt))
    }
    if (completed.length) {
      lines.push('\n已完成：')
      lines.push(...completed.map(fmt))
    }

    return this.reply(lines.join('\n'), true)
  }
}

