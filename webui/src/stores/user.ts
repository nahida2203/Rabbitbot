import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/utils/api'
import { authApi } from '@/api'
import type { LoginRequest } from '@/types'

import { removeToken, setToken, getToken, setUserInfo, setRefreshToken, getRefreshToken, is48HourLoginValid, getUserInfo as getStoredUserInfo, isTokenValid } from '@/utils/auth'
import router from '@/router'

export interface UserInfo {
  id: string
  username: string
  email: string
  avatar?: string
  nickname?: string
  roles: string[]
  permissions: string[]
  lastLoginTime?: string
  lastLoginIp?: string
  status: 'active' | 'inactive' | 'banned'
  createdAt: string
  updatedAt: string
}

export interface LoginForm {
  username: string
  password: string
  remember?: boolean
  captcha?: string
}

export interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
  captcha?: string
  inviteCode?: string
}

export const useUserStore = defineStore('user', () => {
  
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfo | null>((getStoredUserInfo() as UserInfo | null)) 
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  const loginLoading = ref(false)
  const userLoading = ref(false)

  const normalizeUserInfo = (rawUser: any): UserInfo => {
    const user = rawUser && typeof rawUser === 'object' ? rawUser : {}
    const roleSet = new Set<string>(Array.isArray(user.roles) ? user.roles.filter(Boolean) : [])
    const permissionSet = new Set<string>(Array.isArray(user.permissions) ? user.permissions.filter(Boolean) : [])

    if (permissionSet.has('*')) {
      roleSet.add('admin')
      roleSet.add('super_admin')
      roleSet.add('plugin_manager')
      roleSet.add('config_manager')
      roleSet.add('log_viewer')
      roleSet.add('monitor_viewer')
      roleSet.add('user_manager')
      roleSet.add('ai_user')
      roleSet.add('developer')
    }

    const now = new Date().toISOString()

    return {
      id: String(user.id || user.sub || 'webui-admin'),
      username: String(user.username || user.nickname || 'admin'),
      email: String(user.email || 'admin@localhost'),
      avatar: user.avatar || '',
      nickname: user.nickname || user.username || 'admin',
      roles: Array.from(roleSet),
      permissions: Array.from(permissionSet),
      lastLoginTime: user.lastLoginTime || now,
      lastLoginIp: user.lastLoginIp || '',
      status: user.status || 'active',
      createdAt: user.createdAt || now,
      updatedAt: user.updatedAt || now
    }
  }

  const applyUserInfo = (rawUser: any, remember = false) => {
    const normalizedUser = normalizeUserInfo(rawUser)
    userInfo.value = normalizedUser
    roles.value = normalizedUser.roles || []
    permissions.value = normalizedUser.permissions || []
    setUserInfo(normalizedUser, remember)
    return normalizedUser
  }

  
  const initUserInfo = () => {
    const storedUserInfo = getStoredUserInfo()
    if (storedUserInfo && token.value) {
      const normalizedUser = applyUserInfo(storedUserInfo)
      console.log(' 从本地存储恢复用户信息:', normalizedUser)
    }
  }

  
  const isLoggedIn = computed(() => {
    const hasToken = !!token.value
    const hasUserInfo = !!userInfo.value
    const tokenValid = token.value ? isTokenValid(token.value) : false

    console.log(' 登录状态检查:', { 
      hasToken, 
      hasUserInfo, 
      tokenValid,
      tokenValue: token.value?.substring(0, 20) + '...',
      userInfoId: userInfo.value?.id
    })

    return hasToken && hasUserInfo && tokenValid
  })
  const isAdmin = computed(() => roles.value.includes('admin'))
  const avatar = computed(() => {
    return userInfo.value?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.value?.username || 'default'}`
  })

  
  async function loginWithCredentials(credentials: { username: string; password: string; remember?: boolean }) {
    try {
      loginLoading.value = true
      console.log(' 开始登录流程:', { username: credentials.username })

      
      const response = await authApi.login({
        username: credentials.username,
        password: credentials.password,
        remember: credentials.remember
      })

      console.log(' 登录API响应:', response)

      if (response.success && response.data) {
        console.log(' API响应数据结构:', response.data)

        
        if (!response.data.token || !response.data.user) {
          console.error(' API响应数据不完整:', response.data)
          ElMessage.error('登录响应数据不完整')
          return false
        }

        
        const success = await login(response.data, credentials.remember)
        if (success) {
          ElMessage.success('登录成功')
          console.log(' 登录成功，准备跳转')
          return true
        } else {
          console.error(' 保存登录信息失败')
          return false
        }
      } else {
        console.error(' 登录失败，API响应:', response)
        ElMessage.error(response.message || '登录失败')
        return false
      }
    } catch (error: any) {
      console.error(' 登录失败:', error)
      const errorMessage = error.message || '网络连接失败，请检查网络设置'
      ElMessage.error(`登录失败: ${errorMessage}`)
      return false
    } finally {
      loginLoading.value = false
    }
  }

  async function login(loginData: { token: string; refreshToken: string; user: any; expiresIn: number }, remember = false) {
    try {
      loginLoading.value = true

      const { token: authToken, user, refreshToken, expiresIn } = loginData

      
      token.value = authToken
      setToken(authToken, remember)

      
      if (!user) {
        throw new Error('用户信息为空')
      }

      applyUserInfo(user, remember)
      if (refreshToken) {
        setRefreshToken(refreshToken, remember)
      }

      console.log(' 登录信息保存成功')
      console.log(' 当前token:', token.value)
      console.log(' 当前用户信息:', userInfo.value)
      console.log(' 当前登录状态:', isLoggedIn.value)

      
      await new Promise(resolve => setTimeout(resolve, 100))

      console.log(' 延迟后登录状态:', isLoggedIn.value)

      return true
    } catch (error: any) {
      console.error('保存登录信息失败:', error)
      ElMessage.error('保存登录信息失败')
      return false
    } finally {
      loginLoading.value = false
    }
  }

  async function register(registerForm: RegisterForm) {
    try {
      loginLoading.value = true

      
      const response = await authApi.register(registerForm)

      if (response.data) {
        ElMessage.success('注册成功，请登录')
        return true
      } else {
        ElMessage.error('注册失败')
        return false
      }

    } catch (error: any) {
      console.error('注册失败:', error)
      return false
    } finally {
      loginLoading.value = false
    }
  }

  async function logout(showMessage = true) {
    try {
      
      if (token.value && token.value !== 'null' && token.value !== 'undefined' && token.value.trim() !== '') {
        await api.post('/auth/logout')
      }
    } catch (error) {
      console.error('登出接口调用失败:', error)
    } finally {
      
      token.value = null
      userInfo.value = null
      roles.value = []
      permissions.value = []
      removeToken()

      

      if (showMessage) {
        ElMessage.success('已退出登录')
      }

      
      router.push('/login')
    }
  }

  async function getUserInfo() {
    try {
      userLoading.value = true

      const response = await api.get('/auth/user', { showError: false })

      if (response.data.success) {
        const user = applyUserInfo(response.data.data)
        return user
      } else {
        throw new Error(response.data.message || '获取用户信息失败')
      }
    } catch (error: any) {
      console.warn('获取用户信息失败，尝试回退到本地用户信息:', error.message)

      
      if (error?.response?.status === 401) {
        await logout(false)
        throw error
      }

      
      const stored = getStoredUserInfo()
      if (stored) {
        return applyUserInfo(stored)
      }

      throw error
    } finally {
      userLoading.value = false
    }
  }
  
  async function updateUserInfo(data: Partial<UserInfo>) {
    try {
      userLoading.value = true
      
      const response = await api.put('/auth/user', data)
      
      if (response.data.success) {
        const updatedUser = response.data.data
        userInfo.value = { ...userInfo.value, ...updatedUser }
        ElMessage.success('用户信息更新成功')
        return true
      } else {
        ElMessage.error(response.data.message || '更新失败')
        return false
      }
    } catch (error: any) {
      console.error('更新用户信息失败:', error)
      ElMessage.error(error.response?.data?.message || '更新失败')
      return false
    } finally {
      userLoading.value = false
    }
  }
  
  async function changePassword(data: {
    oldPassword: string
    newPassword: string
    confirmPassword: string
  }) {
    try {
      userLoading.value = true
      
      const response = await api.post('/auth/change-password', data)
      
      if (response.data.success) {
        ElMessage.success('密码修改成功，请重新登录')
        await logout(false)
        return true
      } else {
        ElMessage.error(response.data.message || '密码修改失败')
        return false
      }
    } catch (error: any) {
      console.error('密码修改失败:', error)
      ElMessage.error(error.response?.data?.message || '密码修改失败')
      return false
    } finally {
      userLoading.value = false
    }
  }
  
  async function uploadAvatar(file: File) {
    try {
      userLoading.value = true
      
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await api.post('/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (response.data.success) {
        const avatarUrl = response.data.data.avatar
        if (userInfo.value) {
          userInfo.value.avatar = avatarUrl
        }
        ElMessage.success('头像上传成功')
        return avatarUrl
      } else {
        ElMessage.error(response.data.message || '头像上传失败')
        return null
      }
    } catch (error: any) {
      console.error('头像上传失败:', error)
      ElMessage.error(error.response?.data?.message || '头像上传失败')
      return null
    } finally {
      userLoading.value = false
    }
  }
  
  async function autoLogin() {
    if (!token.value || token.value === 'null' || token.value === 'undefined' || token.value.trim() === '') {
      console.log(' 没有保存的token，跳过自动登录')
      return false
    }
    
    
    if (!is48HourLoginValid()) {
      console.warn('登录已超过48小时，需要重新登录')
      await logout(false)
      return false
    }
    
    try {
      console.log('🔄 开始自动登录...')
      
      await getUserInfo()
      console.log('✅ 自动登录成功')
      return true
    } catch (error: any) {
      console.warn('自动登录失败，尝试回退到本地用户信息:', error.message)

      
      if (error?.response?.status === 401) {
        await logout(false)
        return false
      }

      
      const stored = getStoredUserInfo()
      if (stored) {
        applyUserInfo(stored)
        return true
      }

      return false
    }
  }
  
  async function checkLoginStatus() {
    if (!token.value) {
      return false
    }
    
    try {
      const response = await api.get('/auth/check', { showError: false })
      return response.data.success
    } catch (error) {
      console.warn('检查登录状态失败，可能后端服务未启动:', error.message)
      
      return true
    }
  }
  
  function hasRole(role: string): boolean {
    return roles.value.includes(role)
  }
  
  function hasPermission(permission: string): boolean {
    return permissions.value.includes(permission)
  }
  
  function hasAnyRole(roleList: string[]): boolean {
    return roleList.some(role => hasRole(role))
  }
  
  function hasAnyPermission(permissionList: string[]): boolean {
    return permissionList.some(permission => hasPermission(permission))
  }
  
  function hasAllRoles(roleList: string[]): boolean {
    return roleList.every(role => hasRole(role))
  }
  
  function hasAllPermissions(permissionList: string[]): boolean {
    return permissionList.every(permission => hasPermission(permission))
  }
  
  async function refreshToken() {
    try {
      const currentRefreshToken = getRefreshToken()
      if (!currentRefreshToken) {
        return false
      }

      const response = await api.post('/auth/refresh', { refreshToken: currentRefreshToken }, { showError: false })
      
      if (response.data.success) {
        const newToken = response.data.data.token
        const newRefreshToken = response.data.data.refreshToken
        token.value = newToken
        setToken(newToken)
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken)
        }
        return true
      } else {
        
        return false
      }
    } catch (error) {
      console.warn('刷新token失败，可能后端服务未启动:', error.message)
      return false
    }
  }
  
  function reset() {
    token.value = null
    userInfo.value = null
    roles.value = []
    permissions.value = []
    loginLoading.value = false
    userLoading.value = false
    removeToken()
  }
  
  
  function clearInvalidTokens() {
    const currentToken = getToken()
    if (currentToken === 'null' || currentToken === 'undefined' || (currentToken && currentToken.trim() === '')) {
      console.warn('检测到无效token，正在清除...')
      removeToken()
      token.value = null
      userInfo.value = null
      roles.value = []
      permissions.value = []
    }
  }

  
  if (typeof window !== 'undefined') {
    clearInvalidTokens()
    autoLogin()
  }
  
  
  initUserInfo()
  
  return {
    
    token,
    userInfo,
    roles,
    permissions,
    loginLoading,
    userLoading,
    
    
    isLoggedIn,
    isAdmin,
    avatar,
    
    
    initUserInfo,
    login,
    loginWithCredentials,
    register,
    logout,
    getUserInfo,
    updateUserInfo,
    changePassword,
    uploadAvatar,
    autoLogin,
    checkLoginStatus,
    clearInvalidTokens,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
    hasAllRoles,
    hasAllPermissions,
    refreshToken,
    reset
  }
})