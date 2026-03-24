
export const APP_NAME = 'Yunzai 4.1 WebUI'
export const APP_VERSION = '4.1.0'
export const APP_DESCRIPTION = 'Yunzai 4.1 高阶 WebUI 管理面板'


export const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || '/api'
 export const WS_URL: string = (() => {
   const env = (import.meta.env.VITE_APP_WS_URL as string) || ''
   if (env) return env
   if (typeof window !== 'undefined') {
     const loc = window.location
    const scheme = loc.protocol === 'https:' ? 'wss' : 'ws'
     return `${scheme}://${loc.host}/ws`
   }
   return 'ws://localhost:3000/ws'
 })()
export const UPLOAD_URL = `${API_BASE_URL}/upload`


export const STORAGE_KEYS = {
  TOKEN: 'yunzai_token',
  REFRESH_TOKEN: 'yunzai_refresh_token',
  USER_INFO: 'yunzai_user_info',
  THEME: 'yunzai_theme',
  LANGUAGE: 'yunzai_language',
  SIDEBAR_COLLAPSED: 'yunzai_sidebar_collapsed',
  VISITED_VIEWS: 'yunzai_visited_views',
  CACHED_VIEWS: 'yunzai_cached_views',
  SETTINGS: 'yunzai_settings'
} as const


export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
} as const


export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
  JA_JP: 'ja-JP'
} as const


export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
} as const


export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
  PENDING: 'pending'
} as const


export const PERMISSIONS = {
  
  SYSTEM_VIEW: 'system:view',
  SYSTEM_MANAGE: 'system:manage',
  SYSTEM_CONFIG: 'system:config',
  
  
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',
  
  
  PLUGIN_VIEW: 'plugin:view',
  PLUGIN_INSTALL: 'plugin:install',
  PLUGIN_UPDATE: 'plugin:update',
  PLUGIN_DELETE: 'plugin:delete',
  PLUGIN_CONFIG: 'plugin:config',
  PLUGIN_MANAGE: 'plugin:manage',
  
  
  CONFIG_VIEW: 'config:view',
  CONFIG_UPDATE: 'config:update',
  CONFIG_MANAGE: 'config:manage',
  
  
  LOG_VIEW: 'log:view',
  LOG_DELETE: 'log:delete',
  LOG_EXPORT: 'log:export',
  LOG_MANAGE: 'log:manage',
  
  
  MONITOR_VIEW: 'monitor:view',
  MONITOR_MANAGE: 'monitor:manage',
  
  
  AI_CHAT: 'ai:chat',
  AI_MANAGE: 'ai:manage'
} as const


export const PLUGIN_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  LOADING: 'loading',
  UPDATING: 'updating'
} as const


export const LOG_LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const


export const SYSTEM_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  ERROR: 'error',
  MAINTENANCE: 'maintenance'
} as const


export const WS_EVENTS = {
  
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  
  
  SYSTEM_STATUS: 'system:status',
  SYSTEM_INFO: 'system:info',
  SYSTEM_ALERT: 'system:alert',
  
  
  PLUGIN_STATUS: 'plugin:status',
  PLUGIN_INSTALL: 'plugin:install',
  PLUGIN_UPDATE: 'plugin:update',
  PLUGIN_DELETE: 'plugin:delete',
  
  
  CONFIG_UPDATE: 'config:update',
  
  
  LOG_NEW: 'log:new',
  LOG_UPDATE: 'log:update',
  
  
  MONITOR_DATA: 'monitor:data',
  MONITOR_ALERT: 'monitor:alert',
  
  
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  
  
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATE: 'message:update'
} as const


export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  VIDEO: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
  AUDIO: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz'],
  CODE: ['js', 'ts', 'vue', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml']
} as const


export const FILE_SIZE_LIMITS = {
  AVATAR: 2 * 1024 * 1024, 
  IMAGE: 10 * 1024 * 1024, 
  VIDEO: 100 * 1024 * 1024, 
  DOCUMENT: 50 * 1024 * 1024, 
  ARCHIVE: 200 * 1024 * 1024, 
  DEFAULT: 10 * 1024 * 1024 
} as const


export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: 20,
  SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_SIZE: 1000
} as const


export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'MM-DD HH:mm',
  MONTH: 'YYYY-MM',
  YEAR: 'YYYY'
} as const


export const COLORS = {
  PRIMARY: '#409EFF',
  SUCCESS: '#67C23A',
  WARNING: '#E6A23C',
  DANGER: '#F56C6C',
  INFO: '#909399',
  
  
  ACTIVE: '#67C23A',
  INACTIVE: '#909399',
  ERROR: '#F56C6C',
  WARNING: '#E6A23C',
  
  
  TRACE: '#909399',
  DEBUG: '#409EFF',
  INFO: '#67C23A',
  WARN: '#E6A23C',
  ERROR: '#F56C6C',
  FATAL: '#FF0000'
} as const


export const ICONS = {
  
  DASHBOARD: 'Dashboard',
  SYSTEM: 'Setting',
  MONITOR: 'Monitor',
  
  
  USER: 'User',
  USERS: 'UserFilled',
  PROFILE: 'Avatar',
  
  
  PLUGIN: 'Grid',
  PLUGINS: 'Menu',
  
  
  CONFIG: 'Tools',
  SETTINGS: 'Setting',
  
  
  LOG: 'Document',
  LOGS: 'Folder',
  
  
  FILE: 'Document',
  FOLDER: 'Folder',
  UPLOAD: 'Upload',
  DOWNLOAD: 'Download',
  
  
  ADD: 'Plus',
  EDIT: 'Edit',
  DELETE: 'Delete',
  SAVE: 'Check',
  CANCEL: 'Close',
  REFRESH: 'Refresh',
  SEARCH: 'Search',
  FILTER: 'Filter',
  SORT: 'Sort',
  
  
  SUCCESS: 'SuccessFilled',
  WARNING: 'WarningFilled',
  ERROR: 'CircleCloseFilled',
  INFO: 'InfoFilled',
  
  
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  
  
  HOME: 'House',
  BACK: 'Back',
  FORWARD: 'Right',
  FULLSCREEN: 'FullScreen',
  EXIT_FULLSCREEN: 'Aim',
  THEME: 'Sunny',
  LANGUAGE: 'Globe',
  LOGOUT: 'SwitchButton'
} as const


export const ROUTES = {
  
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  NOT_FOUND: '/404',
  FORBIDDEN: '/403',
  SERVER_ERROR: '/500',
  
  
  DASHBOARD: '/dashboard',
  PLUGINS: '/plugins',
  CONFIG: '/config',
  LOGS: '/logs',
  MONITOR: '/monitor',
  USERS: '/users',
  AI: '/ai',
  DEV_TOOLS: '/dev-tools',
  SYSTEM: '/system'
} as const


export const MENU_TYPES = {
  MENU: 'menu',
  BUTTON: 'button',
  LINK: 'link'
} as const


export const CACHE_TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
} as const


export const TIMEOUT = {
  SHORT: 5000,
  NORMAL: 10000,
  LONG: 30000,
  UPLOAD: 60000
} as const


export const RETRY_TIMES = {
  DEFAULT: 3,
  NETWORK: 5,
  UPLOAD: 2
} as const


export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  IP: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  PORT: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
} as const


export const ENV = {
  DEV: 'development',
  PROD: 'production',
  TEST: 'test'
} as const


export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
} as const


export const BROWSERS = {
  CHROME: 'Chrome',
  FIREFOX: 'Firefox',
  SAFARI: 'Safari',
  EDGE: 'Edge',
  OPERA: 'Opera',
  IE: 'Internet Explorer'
} as const


export const OS_TYPES = {
  WINDOWS: 'Windows',
  MACOS: 'macOS',
  LINUX: 'Linux',
  ANDROID: 'Android',
  IOS: 'iOS'
} as const


export const NETWORK_TYPES = {
  WIFI: 'wifi',
  CELLULAR: 'cellular',
  ETHERNET: 'ethernet',
  UNKNOWN: 'unknown'
} as const


export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info'
} as const


export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  LOCATION: 'location',
  CONTACT: 'contact',
  SYSTEM: 'system'
} as const


export type Theme = typeof THEMES[keyof typeof THEMES]
export type Language = typeof LANGUAGES[keyof typeof LANGUAGES]
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
export type PluginStatus = typeof PLUGIN_STATUS[keyof typeof PLUGIN_STATUS]
export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS]
export type SystemStatus = typeof SYSTEM_STATUS[keyof typeof SYSTEM_STATUS]
export type WSEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS]
export type MenuType = typeof MENU_TYPES[keyof typeof MENU_TYPES]
export type DeviceType = typeof DEVICE_TYPES[keyof typeof DEVICE_TYPES]
export type Browser = typeof BROWSERS[keyof typeof BROWSERS]
export type OSType = typeof OS_TYPES[keyof typeof OS_TYPES]
export type NetworkType = typeof NETWORK_TYPES[keyof typeof NETWORK_TYPES]
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES]
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES]