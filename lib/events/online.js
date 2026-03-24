import EventListener from "../listener/listener.js"
import { loggerManager } from "../common/logger.js"




export default class onlineEvent extends EventListener {
  constructor() {
    super({
      event: "online",
      once: true,
    })
  }

  async execute() {
    loggerManager.mark("----^_^----")
  }
}
