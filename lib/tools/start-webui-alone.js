import webUIManager from '../webui/webui-manager.js'


async function main() {
  const host = process.env.WEBUI_HOST || '127.0.0.1'
  const port = Number(process.env.WEBUI_PORT || 18888)
  const apiPrefix = process.env.WEBUI_API_PREFIX || '/api'
  const https = false

  try {
    await webUIManager.initialize({
      config: { host, port, apiPrefix, https }
    })
    await webUIManager.start()
    console.log(`[WebUI] 独立服务已启动: http://${host}:${port}${apiPrefix}`)
  } catch (err) {
    console.error('[WebUI] 服务启动失败:', err)
    process.exitCode = 1
  }
}

main()