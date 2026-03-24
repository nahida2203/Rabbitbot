import { SDK_CAPABILITIES } from './plugin-sdk.js'

export const SDK_PERMISSION_MAP = Object.freeze({
  logger: SDK_CAPABILITIES.LOGGER,
  events: SDK_CAPABILITIES.EVENTS,
  storage: SDK_CAPABILITIES.STORAGE,
  http: SDK_CAPABILITIES.HTTP,
  bot: SDK_CAPABILITIES.BOT,
  'send-message': SDK_CAPABILITIES.BOT,
  'bot-call': SDK_CAPABILITIES.BOT
})

export const DEFAULT_SDK_CAPABILITIES = Object.freeze([
  SDK_CAPABILITIES.LOGGER,
  SDK_CAPABILITIES.EVENTS
])

export function resolvePluginCapabilities(permissions = []) {
  const granted = new Set(DEFAULT_SDK_CAPABILITIES)
  for (const permission of Array.isArray(permissions) ? permissions : []) {
    const key = String(permission || '').trim()
    const capability = SDK_PERMISSION_MAP[key]
    if (capability) granted.add(capability)
  }
  return Array.from(granted)
}
