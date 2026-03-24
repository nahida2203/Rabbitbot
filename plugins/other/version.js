import fs from "node:fs/promises"
import cfg from "../../lib/config/config.js"

async function readChangeLog() {
  try {
    const content = await fs.readFile("CHANGELOG.md", "utf8")
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 8)
  } catch {
    return []
  }
}

export class version extends plugin {
  constructor() {
    super({
      name: "版本",
      dsc: "#版本",
      event: "message",
      rule: [
        {
          reg: "^#版本$",
          fnc: "showVersion",
        }
      ]
    })
  }

  async showVersion() {
    const changelog = await readChangeLog()
    const lines = [
      `Rabbit v${cfg.package.version}`,
      ...changelog,
    ]
    return this.reply(lines.join("\n"))
  }
}