
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}


export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  code: number
  timestamp: number
}


export interface PaginationParams {
  page: number
  size: number
  sort?: string
  order?: 'asc' | 'desc'
}


export interface PaginationData<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}


export interface User extends BaseEntity {
  username: string
  email?: string
  nickname?: string
  avatar?: string
  roles: string[]
  permissions: string[]
  status: 'active' | 'inactive' | 'banned'
  lastLoginTime?: string
  loginCount?: number
  profile?: UserProfile
}

export interface UserProfile {
  firstName?: string
  lastName?: string
  phone?: string
  birthday?: string
  gender?: 'male' | 'female' | 'other'
  bio?: string
  location?: string
  website?: string
  socialLinks?: Record<string, string>
}

export interface LoginRequest {
  username: string
  password: string
  remember?: boolean
  captcha?: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  captcha?: string
  inviteCode?: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ResetPasswordRequest {
  email: string
  token: string
  newPassword: string
  confirmPassword: string
}


export interface Plugin extends BaseEntity {
  name: string
  displayName: string
  description: string
  version: string
  author: string
  homepage?: string
  repository?: string
  license?: string
  keywords: string[]
  status: 'active' | 'inactive' | 'error' | 'loading' | 'updating'
  enabled: boolean
  config?: Record<string, any>
  dependencies?: string[]
  peerDependencies?: string[]
  engines?: Record<string, string>
  files?: string[]
  main?: string
  icon?: string
  screenshots?: string[]
  changelog?: string
  installTime?: string
  updateTime?: string
  size?: number
  downloadCount?: number
  rating?: number
  reviews?: PluginReview[]
}

export interface PluginReview {
  id: string
  userId: string
  username: string
  rating: number
  comment: string
  createdAt: string
}

export interface PluginInstallRequest {
  name?: string
  url?: string
  file?: File
  version?: string
}

export interface PluginUpdateRequest {
  id: string
  version?: string
  force?: boolean
}

export interface PluginConfigRequest {
  id: string
  config: Record<string, any>
}


export interface Config extends BaseEntity {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  category: string
  description?: string
  required: boolean
  readonly: boolean
  sensitive: boolean
  validation?: ConfigValidation
  defaultValue?: any
}

export interface ConfigValidation {
  min?: number
  max?: number
  pattern?: string
  enum?: any[]
  custom?: string
}

export interface ConfigCategory {
  name: string
  displayName: string
  description?: string
  icon?: string
  order: number
  configs: Config[]
}

export interface ConfigUpdateRequest {
  configs: Array<{
    key: string
    value: any
  }>
}


export interface Log extends BaseEntity {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  source: string
  category?: string
  userId?: string
  ip?: string
  userAgent?: string
  extra?: Record<string, any>
  stack?: string
}

export interface LogQuery {
  level?: string[]
  source?: string[]
  category?: string[]
  userId?: string
  keyword?: string
  startTime?: string
  endTime?: string
  page?: number
  size?: number
}

export interface LogStats {
  total: number
  levels: Record<string, number>
  sources: Record<string, number>
  categories: Record<string, number>
  timeline: Array<{
    time: string
    count: number
  }>
}


export interface SystemInfo {
  os: {
    platform: string
    arch: string
    version: string
    hostname: string
    uptime: number
  }
  cpu: {
    model: string
    cores: number
    usage: number
    loadAverage: number[]
  }
  memory: {
    total: number
    used: number
    free: number
    usage: number
  }
  disk: {
    total: number
    used: number
    free: number
    usage: number
  }
  network: {
    interfaces: NetworkInterface[]
    connections: number
  }
  process: {
    pid: number
    ppid: number
    uptime: number
    memory: number
    cpu: number
  }
  node: {
    version: string
    arch: string
    platform: string
  }
  yunzai: {
    version: string
    plugins: number
    users: number
    messages: number
  }
}

export interface NetworkInterface {
  name: string
  address: string
  netmask: string
  family: string
  mac: string
  internal: boolean
  cidr: string
}

export interface MonitorData {
  timestamp: number
  cpu: number
  memory: number
  disk: number
  network: {
    rx: number
    tx: number
  }
  connections: number
  requests: number
  errors: number
}

export interface MonitorAlert {
  id: string
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'error'
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: number
  resolved: boolean
  resolvedAt?: number
}


export interface WSMessage {
  id: string
  type: string
  data: any
  timestamp: number
}

export interface WSConnection {
  id: string
  userId?: string
  ip: string
  userAgent: string
  connectedAt: number
  lastPing: number
  subscriptions: string[]
}


export interface FileInfo {
  name: string
  size: number
  type: string
  lastModified: number
  path?: string
  url?: string
  thumbnail?: string
}

export interface UploadResponse {
  url: string
  filename: string
  originalName: string
  size: number
  type: string
  path: string
}


export interface MenuItem {
  id: string
  name: string
  path: string
  component?: string
  redirect?: string
  meta: MenuMeta
  children?: MenuItem[]
}

export interface MenuMeta {
  title: string
  icon?: string
  hidden?: boolean
  alwaysShow?: boolean
  noCache?: boolean
  breadcrumb?: boolean
  affix?: boolean
  activeMenu?: string
  roles?: string[]
  permissions?: string[]
}


export interface RouteConfig {
  path: string
  name?: string
  component?: any
  redirect?: string
  alias?: string | string[]
  children?: RouteConfig[]
  meta?: RouteMeta
}

export interface RouteMeta {
  title?: string
  icon?: string
  hidden?: boolean
  alwaysShow?: boolean
  noCache?: boolean
  breadcrumb?: boolean
  affix?: boolean
  activeMenu?: string
  roles?: string[]
  permissions?: string[]
  requiresAuth?: boolean
}


export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  language: string
  fontSize: number
  borderRadius: number
  compact: boolean
  animation: boolean
  colorWeakness: boolean
  grayMode: boolean
}

export interface ThemeColors {
  primary: string
  success: string
  warning: string
  danger: string
  info: string
  text: string
  background: string
  border: string
}


export interface AppSettings {
  general: {
    systemName: string
    systemDescription: string
    defaultLanguage: string
    timezone: string
    autoSave: boolean
    enablePluginMarket: boolean
    enableAI: boolean
    enableAnalytics: boolean
    debugMode: boolean
  }
  appearance: {
    theme: string
    primaryColor: string
    fontSize: number
    borderRadius: number
    sidebarWidth: number
    fixedHeader: boolean
    showBreadcrumb: boolean
    showTabs: boolean
  }
  notification: {
    desktop: boolean
    system: boolean
    plugin: boolean
    error: boolean
    email: {
      enabled: boolean
      smtp: {
        host: string
        port: number
        user: string
        password: string
      }
    }
  }
  security: {
    sessionTimeout: number
    maxLoginAttempts: number
    lockoutDuration: number
    forceHttps: boolean
    enableCaptcha: boolean
    password: {
      minLength: number
      requireUppercase: boolean
      requireLowercase: boolean
      requireNumbers: boolean
      requireSpecialChars: boolean
      expiryDays: number
    }
  }
  system: {
    maxConnections: number
    requestTimeout: number
    cacheSize: number
    logRetentionDays: number
    backup: {
      enabled: boolean
      frequency: string
      retention: number
      path: string
    }
  }
  advanced: {
    apiDebug: boolean
    performanceMonitor: boolean
    errorReporting: boolean
    experimentalFeatures: boolean
  }
}


export interface Statistics {
  users: {
    total: number
    active: number
    new: number
    online: number
  }
  plugins: {
    total: number
    active: number
    inactive: number
    error: number
  }
  messages: {
    total: number
    today: number
    success: number
    failed: number
  }
  system: {
    uptime: number
    cpu: number
    memory: number
    disk: number
  }
}


export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  userId?: string
  createdAt: string
  data?: any
}


export interface AIChat {
  id: string
  title: string
  messages: AIChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  tokens?: number
  model?: string
}

export interface AIModel {
  id: string
  name: string
  provider: string
  description: string
  maxTokens: number
  pricing: {
    input: number
    output: number
  }
  capabilities: string[]
  enabled: boolean
}


export interface ErrorInfo {
  code: string | number
  message: string
  details?: any
  stack?: string
  timestamp: number
}


export interface FormRule {
  required?: boolean
  message?: string
  trigger?: string | string[]
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (rule: any, value: any, callback: any) => void
}

export interface FormRules {
  [key: string]: FormRule | FormRule[]
}


export interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean | 'custom'
  resizable?: boolean
  showOverflowTooltip?: boolean
  align?: 'left' | 'center' | 'right'
  headerAlign?: 'left' | 'center' | 'right'
  formatter?: (row: any, column: any, cellValue: any, index: number) => any
  render?: (h: any, params: any) => any
}

export interface TableConfig {
  columns: TableColumn[]
  data: any[]
  loading?: boolean
  pagination?: {
    page: number
    size: number
    total: number
  }
  selection?: boolean
  stripe?: boolean
  border?: boolean
  height?: string | number
  maxHeight?: string | number
}


export interface SearchConfig {
  placeholder?: string
  fields: SearchField[]
  defaultValues?: Record<string, any>
}

export interface SearchField {
  key: string
  label: string
  type: 'input' | 'select' | 'date' | 'daterange' | 'number' | 'switch'
  options?: Array<{ label: string; value: any }>
  placeholder?: string
  clearable?: boolean
  multiple?: boolean
}


export interface ExportConfig {
  filename?: string
  format: 'xlsx' | 'csv' | 'json'
  fields?: string[]
  headers?: Record<string, string>
}

export interface ImportConfig {
  accept: string
  maxSize: number
  template?: string
  fields: ImportField[]
}

export interface ImportField {
  key: string
  label: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'date'
  validator?: (value: any) => boolean | string
}


export interface Permission {
  id: string
  name: string
  code: string
  type: 'menu' | 'button' | 'api'
  resource: string
  action: string
  description?: string
  parentId?: string
  children?: Permission[]
}

export interface Role {
  id: string
  name: string
  code: string
  description?: string
  permissions: string[]
  users?: string[]
  createdAt: string
  updatedAt: string
}


export interface OperationLog {
  id: string
  userId: string
  username: string
  action: string
  resource: string
  resourceId?: string
  method: string
  url: string
  ip: string
  userAgent: string
  params?: any
  result?: any
  status: 'success' | 'failed'
  duration: number
  createdAt: string
}


export interface Task {
  id: string
  name: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  result?: any
  error?: string
  startTime?: string
  endTime?: string
  duration?: number
  createdBy: string
  createdAt: string
}


export interface Backup {
  id: string
  name: string
  type: 'full' | 'incremental'
  size: number
  path: string
  status: 'creating' | 'completed' | 'failed'
  createdAt: string
  description?: string
}


export interface Update {
  version: string
  description: string
  changelog: string
  downloadUrl: string
  size: number
  publishedAt: string
  required: boolean
}


export interface PluginMarket {
  plugins: Plugin[]
  categories: PluginCategory[]
  featured: Plugin[]
  popular: Plugin[]
  recent: Plugin[]
}

export interface PluginCategory {
  id: string
  name: string
  description: string
  icon: string
  count: number
}


export interface Event {
  id: string
  type: string
  source: string
  data: any
  timestamp: number
  processed: boolean
}


export interface CacheInfo {
  key: string
  value: any
  ttl: number
  size: number
  createdAt: number
  accessedAt: number
  hitCount: number
}


export interface QueueJob {
  id: string
  name: string
  data: any
  priority: number
  attempts: number
  maxAttempts: number
  delay: number
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  createdAt: string
  processedAt?: string
  failedAt?: string
  error?: string
}


export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  checks: HealthCheckItem[]
  timestamp: number
}

export interface HealthCheckItem {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message?: string
  duration: number
  data?: any
}