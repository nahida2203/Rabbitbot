import { jwtDecode } from 'jwt-decode'
import { ElMessage } from 'element-plus'


const TOKEN_KEY = 'yunzai_token'
const REFRESH_TOKEN_KEY = 'yunzai_refresh_token'
const USER_INFO_KEY = 'yunzai_user_info'
const LOGIN_TIME_KEY = 'yunzai_login_time'
const REMEMBER_ME_KEY = 'yunzai_remember_me'


export interface JwtPayload {
  sub: string 
  username: string 
  email?: string 
  roles: string[] 
  permissions: string[] 
  iat: number 
  exp: number 
  iss?: string 
  aud?: string 
}


export interface UserInfo {
  id: string
  username: string
  email?: string
  nickname?: string
  avatar?: string
  roles: string[]
  permissions: string[]
  lastLoginTime?: string
  loginCount?: number
  status: 'active' | 'inactive' | 'banned'
  createdAt: string
  updatedAt: string
}


export interface LoginResponse {
  token: string
  refreshToken: string
  user: UserInfo
  expiresIn: number
}




export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  } catch (error) {
    console.error('获取token失败:', error)
    return null
  }
}




export function setToken(token: string, remember = false): void {
  try {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(REMEMBER_ME_KEY, 'true')
    } else {
      sessionStorage.setItem(TOKEN_KEY, token)
      localStorage.removeItem(REMEMBER_ME_KEY)
    }
    
    
    const loginTime = Date.now().toString()
    if (remember) {
      localStorage.setItem(LOGIN_TIME_KEY, loginTime)
    } else {
      sessionStorage.setItem(LOGIN_TIME_KEY, loginTime)
    }
  } catch (error) {
    console.error('设置token失败:', error)
  }
}




export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
    sessionStorage.removeItem(USER_INFO_KEY)
    localStorage.removeItem(LOGIN_TIME_KEY)
    sessionStorage.removeItem(LOGIN_TIME_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)
  } catch (error) {
    console.error('移除token失败:', error)
  }
}




export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)
  } catch (error) {
    console.error('获取刷新token失败:', error)
    return null
  }
}




export function setRefreshToken(refreshToken: string, remember = false): void {
  try {
    if (remember) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
  } catch (error) {
    console.error('设置刷新token失败:', error)
  }
}




export function getUserInfo(): UserInfo | null {
  try {
    const userInfoStr = localStorage.getItem(USER_INFO_KEY) || sessionStorage.getItem(USER_INFO_KEY)
    return userInfoStr ? JSON.parse(userInfoStr) : null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}




export function setUserInfo(userInfo: UserInfo, remember = false): void {
  try {
    const userInfoStr = JSON.stringify(userInfo)
    if (remember) {
      localStorage.setItem(USER_INFO_KEY, userInfoStr)
    } else {
      sessionStorage.setItem(USER_INFO_KEY, userInfoStr)
    }
  } catch (error) {
    console.error('设置用户信息失败:', error)
  }
}




export function isRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
  } catch (error) {
    console.error('检查记住登录状态失败:', error)
    return false
  }
}




export function getLoginTime(): number | null {
  try {
    const loginTimeStr = localStorage.getItem(LOGIN_TIME_KEY) || sessionStorage.getItem(LOGIN_TIME_KEY)
    return loginTimeStr ? parseInt(loginTimeStr, 10) : null
  } catch (error) {
    console.error('获取登录时间失败:', error)
    return null
  }
}




export function parseToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token)
  } catch (error) {
    console.error('解析token失败:', error)
    return null
  }
}




export function isTokenValid(token?: string): boolean {
  try {
    const currentToken = token || getToken()
    if (!currentToken) {
      return false
    }
    
    const payload = parseToken(currentToken)
    if (!payload) {
      return false
    }
    
    
    const now = Math.floor(Date.now() / 1000)
    const buffer = 5 * 60 
    
    return payload.exp > (now + buffer)
  } catch (error) {
    console.error('检查token有效性失败:', error)
    return false
  }
}




export function isTokenExpiringSoon(token?: string, thresholdMinutes = 10): boolean {
  try {
    const currentToken = token || getToken()
    if (!currentToken) {
      return false
    }
    
    const payload = parseToken(currentToken)
    if (!payload) {
      return false
    }
    
    const now = Math.floor(Date.now() / 1000)
    const threshold = thresholdMinutes * 60
    
    return payload.exp <= (now + threshold)
  } catch (error) {
    console.error('检查token过期时间失败:', error)
    return false
  }
}




export function getTokenRemainingTime(token?: string): number {
  try {
    const currentToken = token || getToken()
    if (!currentToken) {
      return 0
    }
    
    const payload = parseToken(currentToken)
    if (!payload) {
      return 0
    }
    
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, payload.exp - now)
  } catch (error) {
    console.error('获取token剩余时间失败:', error)
    return 0
  }
}




export function hasRole(role: string | string[]): boolean {
  try {
    const userInfo = getUserInfo()
    if (!userInfo || !userInfo.roles) {
      return false
    }
    
    const roles = Array.isArray(role) ? role : [role]
    return roles.some(r => userInfo.roles.includes(r))
  } catch (error) {
    console.error('检查用户角色失败:', error)
    return false
  }
}




export function hasPermission(permission: string | string[]): boolean {
  try {
    const userInfo = getUserInfo()
    if (!userInfo || !userInfo.permissions) {
      return false
    }
    
    const permissions = Array.isArray(permission) ? permission : [permission]
    return permissions.some(p => userInfo.permissions.includes(p))
  } catch (error) {
    console.error('检查用户权限失败:', error)
    return false
  }
}




export function isAdmin(): boolean {
  return hasRole(['admin', 'super_admin'])
}




export function isSuperAdmin(): boolean {
  return hasRole('super_admin')
}




export function saveLoginInfo(loginResponse: LoginResponse, remember = false): void {
  try {
    setToken(loginResponse.token, remember)
    setRefreshToken(loginResponse.refreshToken, remember)
    setUserInfo(loginResponse.user, remember)
    
    console.log('登录信息保存成功')
  } catch (error) {
    console.error('保存登录信息失败:', error)
    ElMessage.error('保存登录信息失败')
  }
}




export function clearLoginInfo(): void {
  try {
    removeToken()
    console.log('登录信息清除成功')
  } catch (error) {
    console.error('清除登录信息失败:', error)
  }
}




export function getAuthHeader(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}




export function checkLoginStatus(): {
  isLoggedIn: boolean
  needRefresh: boolean
  user: UserInfo | null
} {
  const token = getToken()
  const user = getUserInfo()
  
  if (!token || !user) {
    return {
      isLoggedIn: false,
      needRefresh: false,
      user: null
    }
  }
  
  const isValid = isTokenValid(token)
  const needRefresh = isTokenExpiringSoon(token, 15) 
  
  return {
    isLoggedIn: isValid,
    needRefresh: needRefresh && isValid,
    user: isValid ? user : null
  }
}




export function formatLoginTime(): string {
  const loginTime = getLoginTime()
  if (!loginTime) {
    return '未知'
  }
  
  return new Date(loginTime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}




export function getUserDisplayName(): string {
  const userInfo = getUserInfo()
  if (!userInfo) {
    return '未登录'
  }
  
  return userInfo.nickname || userInfo.username || userInfo.email || '未知用户'
}




export function getUserAvatar(): string {
  const userInfo = getUserInfo()
  if (!userInfo || !userInfo.avatar) {
    
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo?.username || 'default'}`
  }
  
  return userInfo.avatar
}




export function isSessionActive(): boolean {
  const loginTime = getLoginTime()
  if (!loginTime) {
    return false
  }
  
  
  if (!isRememberMe()) {
    const now = Date.now()
    const sessionTimeout = 24 * 60 * 60 * 1000 
    return (now - loginTime) < sessionTimeout
  }
  
  
  return isTokenValid()
}




export function is48HourLoginValid(): boolean {
  try {
    const loginTime = getLoginTime()
    if (!loginTime) {
      return false
    }
    
    const now = Date.now()
    const fortyEightHours = 48 * 60 * 60 * 1000 
    
    return (now - loginTime) < fortyEightHours
  } catch (error) {
    console.error('检查48小时登录有效期失败:', error)
    return false
  }
}




export function isLoginValid(): boolean {
  const token = getToken()
  if (!token) {
    return false
  }
  
  
  if (!is48HourLoginValid()) {
    return false
  }
  
  return true
}




export function handleLoginTimeout(error: any): string {
  if (error.code === 'ECONNABORTED') {
    return '登录请求超时，请检查网络连接'
  }
  
  if (error.message && error.message.includes('timeout')) {
    return '登录超时，请重试'
  }
  
  if (error.message && error.message.includes('Network Error')) {
    return '网络连接失败，请检查网络设置'
  }
  
  return error.message || '登录失败，请稍后重试'
}




export async function retryLogin(
  loginFn: () => Promise<any>,
  maxRetries = 2,
  baseDelay = 1000
): Promise<any> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 登录重试 ${attempt}/${maxRetries}`)
      const result = await loginFn()
      console.log(`✅ 登录成功 (尝试 ${attempt})`)
      return result
    } catch (error: any) {
      lastError = error
      console.error(` 登录尝试 ${attempt} 失败:`, error.message)
      
      
      const noRetryErrors = [
        401, 
        403, 
        423, 
        429  
      ]
      
      if (attempt === maxRetries || 
          (error.response && noRetryErrors.includes(error.response.status))) {
        throw error
      }
      
      
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`⏳ ${delay}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}




export function autoLogoutCheck(): void {
  if (!isLoginValid()) {
    clearLoginInfo()
    ElMessage.warning('登录已过期（48小时），请重新登录')
    
    window.location.href = '/login'
  }
}


if (typeof window !== 'undefined') {
  setInterval(autoLogoutCheck, 5 * 60 * 1000)
}