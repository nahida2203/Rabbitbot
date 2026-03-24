import { request, loginApi } from '@/utils/api'
import { clearKeyCache } from '@/utils/crypto'
import type {
  User,
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  Plugin,
  PluginInstallRequest,
  PluginUpdateRequest,
  PluginConfigRequest,
  Config,
  ConfigCategory,
  ConfigUpdateRequest,
  Log,
  LogQuery,
  LogStats,
  SystemInfo,
  MonitorData,
  MonitorAlert,
  Statistics,
  Notification,
  AIChat,
  AIChatMessage,
  AIModel,
  PaginationParams,
  PaginationData,
  UploadResponse
} from '@/types'


export const authApi = {
  
  async login(data: LoginRequest): Promise<{ success: boolean; data?: any; message?: string }> {
    console.log('🔐 发送登录请求:', data)

    const doLoginRequest = async () => {
      const res = await request.post('/auth/login', data, { 
        timeout: 15000,
        withCredentials: true 
      })
      const result: any = res.data

      console.log('🔐 登录API响应状态:', res.status)
      console.log('🔐 登录API响应数据:', result)

      return {
        success: !!(res.status >= 200 && res.status < 300 && (result?.success ?? true)),
        data: result?.data ?? result,
        message: result?.message
      }
    }

    try {
      return await doLoginRequest()
    } catch (error: any) {
      const status = error?.response?.status
      const message = error?.response?.data?.message || error?.message || '登录请求失败'
      const needsKeyRefresh = String(message).includes('oaep decoding error') || String(message).includes('token signature invalid')

      if (needsKeyRefresh) {
        try {
          clearKeyCache()
          console.warn('🔐 检测到公钥/私钥不匹配，已清理公钥缓存并重试登录')
          return await doLoginRequest()
        } catch (retryError: any) {
          const retryStatus = retryError?.response?.status
          const retryMessage = retryError?.response?.data?.message || retryError?.message || message
          console.error('🔐 登录重试失败:', { status: retryStatus, message: retryMessage, data: retryError?.response?.data })
          throw new Error(retryMessage)
        }
      }

      console.error('🔐 登录请求失败:', { status, message, data: error?.response?.data })
      throw new Error(message)
    }
  },
  
  
  register(data: RegisterRequest) {
    return request.post<User>('/auth/register', data)
  },
  
  
  logout() {
    return request.post('/auth/logout')
  },
  
  
  refreshToken(refreshToken: string) {
    return request.post<{
      token: string
      refreshToken: string
      expiresIn: number
    }>('/auth/refresh', { refreshToken })
  },
  
  
  forgotPassword(email: string) {
    return request.post('/auth/forgot-password', { email })
  },
  
  
  resetPassword(data: ResetPasswordRequest) {
    return request.post('/auth/reset-password', data)
  },
  
  
  verifyToken() {
    return request.get<User>('/auth/verify')
  },
  
  
  getCaptcha() {
    return request.get<{
      id: string
      image: string
    }>('/auth/captcha')
  }
}


export const userApi = {
  
  getCurrentUser() {
    return request.get<User>('/auth/user')
  },
  
  
  updateProfile(data: Partial<User>) {
    return request.put<User>('/user/profile', data)
  },
  
  
  changePassword(data: ChangePasswordRequest) {
    return request.post('/user/change-password', data)
  },
  
  
  uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    return request.upload<UploadResponse>('/user/avatar', formData)
  },
  
  
  getUsers(params: PaginationParams & {
    keyword?: string
    role?: string
    status?: string
  }) {
    return request.get<PaginationData<User>>('/users', { params })
  },
  
  
  createUser(data: Partial<User>) {
    return request.post<User>('/users', data)
  },
  
  
  updateUser(id: string, data: Partial<User>) {
    return request.put<User>(`/users/${id}`, data)
  },
  
  
  deleteUser(id: string) {
    return request.delete(`/users/${id}`)
  },
  
  
  deleteUsers(ids: string[]) {
    return request.delete('/users/batch', { data: { ids } })
  },
  
  
  resetUserPassword(data: { userId: string }) {
    return request.post(`/users/${data.userId}/reset-password`)
  },
  
  
  updateUserStatus(data: { userId: string, status: string }) {
    return request.patch(`/users/${data.userId}/status`, { status: data.status })
  },
  
  
  batchUpdateUserStatus(data: { userIds: string[], status: string }) {
    return request.patch('/users/batch/status', data)
  },
  
  
  batchDeleteUsers(data: { userIds: string[] }) {
    return request.delete('/users/batch', { data })
  }
}


export const pluginApi = {
  
  getPlugins(params?: {
    keyword?: string
    status?: string
    category?: string
  }) {
    return request.get<Plugin[]>('/plugins', { params })
  },
  
  
  getPlugin(id: string) {
    return request.get<Plugin>(`/plugins/${id}`)
  },
  
  
  installPlugin(data: PluginInstallRequest) {
    return request.post<Plugin>('/plugins/install', data)
  },
  
  
  updatePlugin(data: PluginUpdateRequest) {
    return request.post<Plugin>('/plugins/update', data)
  },
  
  
  uninstallPlugin(id: string) {
    return request.delete(`/plugins/${id}`)
  },
  
  
  togglePlugin(id: string, enabled: boolean) {
    return request.patch(`/plugins/${id}/toggle`, { enabled })
  },
  
  
  getPluginConfig(id: string) {
    return request.get<Record<string, any>>(`/plugins/${id}/config`)
  },
  
  
  updatePluginConfig(data: PluginConfigRequest) {
    return request.put(`/plugins/${data.id}/config`, { config: data.config })
  },
  
  
  restartPlugin(id: string) {
    return request.post(`/plugins/${id}/restart`)
  },
  
  
  getPluginLogs(id: string, params?: {
    level?: string
    limit?: number
  }) {
    return request.get<Log[]>(`/plugins/${id}/logs`, { params })
  },
  
  
  getMarketPlugins(params?: {
    keyword?: string
    category?: string
    sort?: string
    page?: number
    size?: number
  }) {
    return request.get<PaginationData<Plugin>>('/plugins/market', { params })
  },
  
  
  getPluginCategories() {
    return request.get<Array<{
      name: string
      count: number
    }>>('/plugins/categories')
  }
}


export const configApi = {
  
  getConfigCategories() {
    return request.get<ConfigCategory[]>('/config/categories')
  },
  
  
  getConfigs(category?: string) {
    return request.get<Config[]>('/config', {
      params: category ? { category } : undefined
    })
  },
  
  
  getConfig(key: string) {
    return request.get<Config>(`/config/${key}`)
  },
  
  
  updateConfigs(data: ConfigUpdateRequest) {
    return request.put('/config', data)
  },
  
  
  resetConfig(key: string) {
    return request.post(`/config/${key}/reset`)
  },
  
  
  exportConfig(category?: string) {
    return request.download('/config/export', 'config.json', {
      params: category ? { category } : undefined
    })
  },
  
  
  importConfig(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request.upload('/config/import', formData)
  },
  
  
  validateConfig(data: ConfigUpdateRequest) {
    return request.post<{
      valid: boolean
      errors: Array<{
        key: string
        message: string
      }>
    }>('/config/validate', data)
  }
}


export const logApi = {
  
  getLogs(params: LogQuery) {
    return request.get<PaginationData<Log>>('/logs', { params })
  },
  
  
  getLog(id: string) {
    return request.get<Log>(`/logs/${id}`)
  },
  
  
  deleteLog(id: string) {
    return request.delete(`/logs/${id}`)
  },
  
  
  deleteLogs(ids: string[]) {
    return request.delete('/logs/batch', { data: { ids } })
  },
  
  
  clearLogs(params?: {
    level?: string[]
    source?: string[]
    beforeDate?: string
  }) {
    return request.delete('/logs/clear', { data: params })
  },
  
  
  getLogStats(params?: {
    startTime?: string
    endTime?: string
  }) {
    return request.get<LogStats>('/logs/stats', { params })
  },
  
  
  exportLogs(params: LogQuery) {
    return request.download('/logs/export', 'logs.xlsx', { params })
  },
  
  
  getLogLevels() {
    return request.get<string[]>('/logs/levels')
  },
  
  
  getLogSources() {
    return request.get<string[]>('/logs/sources')
  },
  
  
  getLogCategories() {
    return request.get<string[]>('/logs/categories')
  }
}


export const monitorApi = {
  
  getSystemInfo() {
    return request.get<SystemInfo>('/system/info')
  },
  
  
  getMonitorData(params?: {
    type?: string
    timeRange?: string
  }) {
    return request.get<MonitorData[]>('/system/monitoring', { params })
  },
  
  
  getRealTimeData() {
    return request.get<MonitorData>('/system/monitoring/realtime')
  },
  
  
  getAlerts(params?: {
    type?: string
    level?: string
    resolved?: boolean
    page?: number
    size?: number
  }) {
    return request.get<PaginationData<MonitorAlert>>('/monitor/alerts', { params })
  },
  
  
  resolveAlert(id: string) {
    return request.patch(`/monitor/alerts/${id}/resolve`)
  },
  
  
  resolveAlerts(ids: string[]) {
    return request.patch('/monitor/alerts/batch-resolve', { ids })
  },
  
  
  getPerformanceMetrics(params?: {
    metric?: string
    startTime?: string
    endTime?: string
  }) {
    return request.get<Array<{
      time: string
      value: number
    }>>('/monitor/metrics', { params })
  },
  
  
  getHealthCheck() {
    return request.get<{
      status: string
      checks: Array<{
        name: string
        status: string
        message?: string
        duration: number
      }>
    }>('/monitor/health')
  }
}


export const statsApi = {
  
  getDashboardStats() {
    return request.get<Statistics>('/stats/dashboard')
  },
  
  
  getUserStats(params?: {
    startTime?: string
    endTime?: string
    groupBy?: string
  }) {
    return request.get<Array<{
      time: string
      count: number
    }>>('/stats/users', { params })
  },
  
  
  getPluginStats() {
    return request.get<Array<{
      name: string
      count: number
      status: string
    }>>('/stats/plugins')
  },
  
  
  getMessageStats(params?: {
    startTime?: string
    endTime?: string
    groupBy?: string
  }) {
    return request.get<Array<{
      time: string
      count: number
      success: number
      failed: number
    }>>('/stats/messages', { params })
  },
  
  
  getSystemStats(params?: {
    startTime?: string
    endTime?: string
  }) {
    return request.get<{
      uptime: number
      requests: number
      errors: number
      avgResponseTime: number
    }>('/stats/system', { params })
  }
}


export const notificationApi = {
  
  getNotifications(params?: {
    read?: boolean
    type?: string
    page?: number
    size?: number
  }) {
    return request.get<PaginationData<Notification>>('/notifications', { params })
  },
  
  
  markAsRead(id: string) {
    return request.patch(`/notifications/${id}/read`)
  },
  
  
  markAllAsRead() {
    return request.patch('/notifications/read-all')
  },
  
  
  deleteNotification(id: string) {
    return request.delete(`/notifications/${id}`)
  },
  
  
  clearNotifications() {
    return request.delete('/notifications/clear')
  },
  
  
  getUnreadCount() {
    return request.get<{ count: number }>('/notifications/unread-count')
  }
}


export const aiApi = {
  
  getChats() {
    return request.get<AIChat[]>('/ai/chats')
  },
  
  
  createChat(title?: string) {
    return request.post<AIChat>('/ai/chats', { title })
  },
  
  
  getChat(id: string) {
    return request.get<AIChat>(`/ai/chats/${id}`)
  },
  
  
  updateChatTitle(id: string, title: string) {
    return request.patch(`/ai/chats/${id}`, { title })
  },
  
  
  deleteChat(id: string) {
    return request.delete(`/ai/chats/${id}`)
  },
  
  
  sendMessage(chatId: string, content: string, model?: string) {
    return request.post<AIChatMessage>(`/ai/chats/${chatId}/messages`, {
      content,
      model
    })
  },
  
  
  getModels() {
    return request.get<AIModel[]>('/ai/models')
  },
  
  
  getUsageStats() {
    return request.get<{
      totalTokens: number
      totalCost: number
      monthlyTokens: number
      monthlyCost: number
      modelUsage: Array<{
        model: string
        tokens: number
        cost: number
      }>
    }>('/ai/usage')
  }
}


export const fileApi = {
  
  upload(file: File, path?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (path) {
      formData.append('path', path)
    }
    return request.upload<UploadResponse>('/files/upload', formData)
  },
  
  
  uploadMultiple(files: File[], path?: string) {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    if (path) {
      formData.append('path', path)
    }
    return request.upload<UploadResponse[]>('/files/upload-multiple', formData)
  },
  
  
  deleteFile(path: string) {
    return request.delete('/files', { data: { path } })
  },
  
  
  getFiles(path?: string) {
    return request.get<Array<{
      name: string
      path: string
      size: number
      type: string
      isDirectory: boolean
      modifiedAt: string
    }>>('/files', { params: { path } })
  },
  
  
  createDirectory(path: string) {
    return request.post('/files/directory', { path })
  },
  
  
  rename(oldPath: string, newPath: string) {
    return request.patch('/files/rename', { oldPath, newPath })
  },
  
  
  move(sourcePath: string, targetPath: string) {
    return request.patch('/files/move', { sourcePath, targetPath })
  },
  
  
  copy(sourcePath: string, targetPath: string) {
    return request.post('/files/copy', { sourcePath, targetPath })
  }
}


export const systemApi = {
  
  restart() {
    return request.post('/system/restart')
  },
  
  
  shutdown() {
    return request.post('/system/shutdown')
  },
  
  
  getVersion() {
    return request.get<{
      version: string
      buildTime: string
      gitCommit: string
      nodeVersion: string
    }>('/system/version')
  },
  
  
  checkUpdate() {
    return request.get<{
      hasUpdate: boolean
      latestVersion: string
      currentVersion: string
      changelog: string
      downloadUrl: string
    }>('/system/check-update')
  },
  
  
  update() {
    return request.post('/system/update')
  },
  
  
  createBackup(name?: string) {
    return request.post('/system/backup', { name })
  },
  
  
  getBackups() {
    return request.get<Array<{
      id: string
      name: string
      size: number
      createdAt: string
      status: string
    }>>('/system/backups')
  },
  
  
  restoreBackup(id: string) {
    return request.post(`/system/backups/${id}/restore`)
  },
  
  
  deleteBackup(id: string) {
    return request.delete(`/system/backups/${id}`)
  },

  
  getStats() {
    return request.get<any>('/system/stats')
  },

  
  getHealth() {
    return request.get<any>('/system/health')
  },
  
  
  downloadBackup(id: string) {
    return request.download(`/system/backups/${id}/download`, `backup-${id}.zip`)
  },
  
  
  clearCache() {
    return request.post('/system/clear-cache')
  },
  
  
  getSettings() {
    return request.get<Record<string, any>>('/system/settings')
  },
  
  
  updateSettings(settings: Record<string, any>) {
    return request.put('/system/settings', settings)
  },
  
  
  getDefaultSettings() {
    return request.get<Record<string, any>>('/system/settings/default')
  },
  
  
  testEmailSettings(smtp: any) {
    return request.post('/system/settings/test-email', smtp)
  }
}


export default {
  auth: authApi,
  user: userApi,
  plugin: pluginApi,
  config: configApi,
  log: logApi,
  monitor: monitorApi,
  stats: statsApi,
  notification: notificationApi,
  ai: aiApi,
  file: fileApi,
  system: systemApi
}