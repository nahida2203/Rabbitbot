import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getToken, removeToken } from './auth'
import router from '@/router'
import NProgress from 'nprogress'
import { hybridEncrypt, shouldEncrypt, createEncryptionHeaders } from './crypto'


export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  code: number
  timestamp: number
}


export interface RequestConfig extends AxiosRequestConfig {
  showLoading?: boolean
  showError?: boolean
  showSuccess?: boolean
  successMessage?: string
  errorMessage?: string
}


const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  
  retry: 2,
  retryDelay: 500
})


const loginApi: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})


let requestCount = 0


function showLoading() {
  if (requestCount === 0) {
    NProgress.start()
  }
  requestCount++
}


function hideLoading() {
  requestCount--
  if (requestCount <= 0) {
    requestCount = 0
    NProgress.done()
  }
}


api.interceptors.request.use(
  async (config: any) => {
    
    if (config.showLoading !== false) {
      showLoading()
    }
    
    
    const token = getToken()
    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    const method = (config.method || 'get').toUpperCase()
    const url = config.url || ''
    if (["POST", "PUT", "PATCH"].includes(method) && shouldEncrypt(url, method)) {
      try {
        const raw = typeof config.data === 'string' ? config.data : JSON.stringify(config.data ?? {})
        const encrypted = await hybridEncrypt(raw)
        config.headers = {
          ...config.headers,
          ...createEncryptionHeaders(encrypted),
          'Content-Type': 'application/json'
        }
        
        config.data = { _encrypted: true, ciphertext: encrypted.ciphertext }
        if (import.meta.env.DEV) {
          console.log(' 已加密请求体，路径:', url)
        }
      } catch (e) {
        console.error('加密请求失败:', e)
        
        return Promise.reject(e)
      }
    }
    
    
    if (import.meta.env.DEV) {
      console.log('🚀 API请求:', {
        url: config.url,
        method: config.method,
        params: config.params,
        data: config.data
      })
    }
    
    return config
  },
  (error: AxiosError) => {
    hideLoading()
    console.error('请求配置错误:', error)
    return Promise.reject(error)
  }
)


api.interceptors.response.use(
  async (response: AxiosResponse) => {
    hideLoading()
    
    const config = response.config as RequestConfig
    const data = response.data as ApiResponse
    
    
    if (import.meta.env.DEV) {
      console.log(' API响应:', {
        url: response.config.url,
        status: response.status,
        data: data
      })
    }
    
    
    if (data.success === false) {
      const errorMessage = config.errorMessage || data.message || '请求失败'
      
      
      switch (data.code) {
        case 401:
          
          try {
            const anyConfig: any = config
            if (!anyConfig.__retryOn401) {
              anyConfig.__retryOn401 = true
              const { useUserStore } = await import('@/stores/user')
              const userStore = useUserStore()
              const refreshed = await userStore.refreshToken()
              if (refreshed) {
                return api.request(anyConfig)
              }
            }
          } catch (e) {
            
          }
          removeToken()
          router.push('/login')
          ElMessage.error('登录已过期，请重新登录')
          break
        case 403:
          
          ElMessage.error('无权限访问')
          break
        case 404:
          
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          
          ElMessage.error('服务器内部错误')
          break
        default:
          if (config.showError !== false) {
            ElMessage.error(errorMessage)
          }
      }
      
      return Promise.reject(new Error(errorMessage))
    }
    
    
    if (config.showSuccess && config.successMessage) {
      ElMessage.success(config.successMessage)
    }
    
    return response
  },
  async (error: AxiosError) => {
    hideLoading()
    
    const config = error.config as RequestConfig
    let errorMessage = config?.errorMessage || '网络错误'
    
    
    console.error(' API错误:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })
    
    
    if (error.response) {
      
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          errorMessage = (data as any)?.message || '请求参数错误'
          break
        case 401:
          errorMessage = '登录已过期，请重新登录'
          try {
            const anyConfig: any = error.config || {}
            if (!anyConfig.__retryOn401) {
              anyConfig.__retryOn401 = true
              const { useUserStore } = await import('@/stores/user')
              const userStore = useUserStore()
              const refreshed = await userStore.refreshToken()
              if (refreshed) {
                return api.request(anyConfig)
              }
            }
          } catch (e) {
            
          }
          removeToken()
          router.push('/login')
          break
        case 403:
          errorMessage = '无权限访问'
          break
        case 404:
          errorMessage = '请求的资源不存在'
          break
        case 422:
          errorMessage = (data as any)?.message || '数据验证失败'
          break
        case 429:
          errorMessage = '请求过于频繁，请稍后再试'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        case 502:
          errorMessage = '网关错误'
          break
        case 503:
          errorMessage = '服务暂时不可用'
          break
        case 504:
          errorMessage = '网关超时'
          break
        default:
          errorMessage = `服务器错误 (${status})`
      }
    } else if (error.request) {
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接或稍后重试'
      } else if (error.message.includes('Network Error')) {
        errorMessage = '网络连接失败，请检查网络设置'
      } else if (error.message.includes('github.com') || error.config?.url?.includes('github')) {
        errorMessage = 'GitHub连接超时，建议配置代理或使用镜像源'
      } else {
        errorMessage = '网络错误，请稍后重试'
      }
    } else {
      
      errorMessage = '请求配置错误'
    }
    
    
    if (config?.showError !== false) {
      ElMessage.error(errorMessage)
    }
    
    return Promise.reject(error)
  }
)


export const request = {
  get<T = any>(url: string, config?: RequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return api.get(url, config)
  },
  
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return api.post(url, data, config)
  },
  
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return api.put(url, data, config)
  },
  
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return api.patch(url, data, config)
  },
  
  delete<T = any>(url: string, config?: RequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return api.delete(url, config)
  },
  
  upload<T = any>(url: string, formData: FormData, config?: RequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return api.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers
      }
    })
  },
  
  download(url: string, filename?: string, config?: RequestConfig): Promise<void> {
    return api.get(url, {
      ...config,
      responseType: 'blob'
    }).then(response => {
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    })
  }
}


export function batchRequest<T = any>(requests: Promise<AxiosResponse<ApiResponse<T>>>[]): Promise<T[]> {
  return Promise.allSettled(requests).then(results => {
    const successResults: T[] = []
    const errors: Error[] = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successResults.push(result.value.data.data)
      } else {
        errors.push(new Error(`请求 ${index + 1} 失败: ${result.reason.message}`))
      }
    })
    
    if (errors.length > 0) {
      console.warn('批量请求中有失败的请求:', errors)
    }
    
    return successResults
  })
}


export function retryRequest<T = any>(
  requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>,
  maxRetries = 3,
  delay = 1000
): Promise<AxiosResponse<ApiResponse<T>>> {
  return new Promise((resolve, reject) => {
    let retries = 0
    
    const attempt = () => {
      requestFn()
        .then(resolve)
        .catch(error => {
          retries++
          if (retries < maxRetries) {
            console.log(`请求失败，${delay}ms后进行第${retries + 1}次重试...`)
            setTimeout(attempt, delay)
          } else {
            reject(error)
          }
        })
    }
    
    attempt()
  })
}


export class RequestController {
  private controllers: Map<string, AbortController> = new Map()
  
  
  createCancelableRequest<T = any>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<AxiosResponse<ApiResponse<T>>>
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    
    this.cancel(key)
    
    const controller = new AbortController()
    this.controllers.set(key, controller)
    
    return requestFn(controller.signal).finally(() => {
      this.controllers.delete(key)
    })
  }
  
  
  cancel(key: string): void {
    const controller = this.controllers.get(key)
    if (controller) {
      controller.abort()
      this.controllers.delete(key)
    }
  }
  
  
  cancelAll(): void {
    this.controllers.forEach(controller => controller.abort())
    this.controllers.clear()
  }
}


loginApi.interceptors.request.use(
  (config: any) => {
    
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    
    if (import.meta.env.DEV) {
      console.log('🔐 登录API请求:', {
        url: config.url,
        method: config.method,
        data: config.data
      })
    }
    
    return config
  },
  (error: AxiosError) => {
    console.error('登录请求配置错误:', error)
    return Promise.reject(error)
  }
)


loginApi.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data as ApiResponse
    
    
    if (import.meta.env.DEV) {
      console.log('🔐 登录API响应:', {
        url: response.config.url,
        status: response.status,
        data: data
      })
    }
    
    return response
  },
  (error: AxiosError) => {
    let errorMessage = '登录请求失败'
    
    
    console.error('🔐 登录API错误:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })
    
    
    if (error.response) {
      const { status } = error.response
      switch (status) {
        case 401:
          errorMessage = '用户名或密码错误'
          break
        case 423:
          errorMessage = '账号已被锁定，请联系管理员'
          break
        case 429:
          errorMessage = '登录尝试过于频繁，请稍后再试'
          break
        case 500:
          errorMessage = '服务器内部错误，请稍后重试'
          break
        default:
          errorMessage = `登录失败 (${status})`
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = '登录请求超时，请检查网络连接'
      } else if (error.message.includes('Network Error')) {
        errorMessage = '网络连接失败，请检查网络设置'
      } else {
        errorMessage = '网络错误，请稍后重试'
      }
    }
    
    
    const friendlyError = new Error(errorMessage)
    friendlyError.name = 'LoginError'
    ;(friendlyError as any).originalError = error
    
    return Promise.reject(friendlyError)
  }
)


export { api, loginApi }
export default api