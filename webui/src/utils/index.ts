import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import type { MessageBoxData } from 'element-plus'




export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}




export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}




export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  
  return obj
}




export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `${prefix}${timestamp}${randomStr}`
}




export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}




export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}




export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}




export function formatTime(date: Date | string | number): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const minute = 60 * 1000
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  const year = day * 365
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前'
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前'
  } else if (diff < week) {
    return Math.floor(diff / day) + '天前'
  } else if (diff < month) {
    return Math.floor(diff / week) + '周前'
  } else if (diff < year) {
    return Math.floor(diff / month) + '个月前'
  } else {
    return Math.floor(diff / year) + '年前'
  }
}




export function formatDate(date: Date | string | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date)
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}




export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}




export function getFileName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '')
}




export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}




export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}




export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}




export function isValidIdCard(idCard: string): boolean {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  return idCardRegex.test(idCard)
}




export function getRandomColor(): string {
  const colors = [
    '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}




export function getContrastColor(hexColor: string): string {
  
  const color = hexColor.replace('#', '')
  
  
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  
  return brightness > 128 ? '#000000' : '#FFFFFF'
}




export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
    
    ElMessage.success('复制成功')
    return true
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
    return false
  }
}






export function downloadFile(data: string | Blob, filename?: string): void {
  const isBlob = data instanceof Blob
  const url = isBlob ? URL.createObjectURL(data) : data
  
  const link = document.createElement('a')
  link.href = url
  if (filename) {
    link.download = filename
  }
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  if (isBlob) {
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }
}




export function downloadTextFile(content: string, filename: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  downloadFile(url, filename)
  URL.revokeObjectURL(url)
}




export function downloadJsonFile(data: any, filename: string): void {
  const content = JSON.stringify(data, null, 2)
  downloadTextFile(content, filename, 'application/json')
}




export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}




export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}




export function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      
      ctx?.drawImage(img, 0, 0, width, height)
      
      
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('图片压缩失败'))
          }
        },
        'image/jpeg',
        quality
      )
    }
    
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}




export function getDeviceInfo() {
  const ua = navigator.userAgent
  const isWindows = /Windows/.test(ua)
  const isMac = /Macintosh/.test(ua)
  const isLinux = /Linux/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(ua)
  const isTablet = /iPad/.test(ua) || (isAndroid && !/Mobile/.test(ua))
  const isDesktop = !isMobile && !isTablet
  
  let browser = 'Unknown'
  if (/Chrome/.test(ua)) browser = 'Chrome'
  else if (/Firefox/.test(ua)) browser = 'Firefox'
  else if (/Safari/.test(ua)) browser = 'Safari'
  else if (/Edge/.test(ua)) browser = 'Edge'
  else if (/Opera/.test(ua)) browser = 'Opera'
  
  let os = 'Unknown'
  if (isWindows) os = 'Windows'
  else if (isMac) os = 'macOS'
  else if (isLinux) os = 'Linux'
  else if (isAndroid) os = 'Android'
  else if (isIOS) os = 'iOS'
  
  return {
    browser,
    os,
    isMobile,
    isTablet,
    isDesktop,
    isWindows,
    isMac,
    isLinux,
    isAndroid,
    isIOS,
    userAgent: ua,
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }
}




export function getNetworkInfo() {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  return {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false
  }
}




export function confirm(
  message: string,
  title = '确认',
  options: {
    confirmButtonText?: string
    cancelButtonText?: string
    type?: 'warning' | 'info' | 'success' | 'error'
  } = {}
): Promise<MessageBoxData> {
  return ElMessageBox.confirm(message, title, {
    confirmButtonText: options.confirmButtonText || '确定',
    cancelButtonText: options.cancelButtonText || '取消',
    type: options.type || 'warning'
  })
}




export function alert(
  message: string,
  title = '提示',
  options: {
    confirmButtonText?: string
    type?: 'warning' | 'info' | 'success' | 'error'
  } = {}
): Promise<MessageBoxData> {
  return ElMessageBox.alert(message, title, {
    confirmButtonText: options.confirmButtonText || '确定',
    type: options.type || 'info'
  })
}




export function prompt(
  message: string,
  title = '输入',
  options: {
    confirmButtonText?: string
    cancelButtonText?: string
    inputPattern?: RegExp
    inputErrorMessage?: string
    inputPlaceholder?: string
    inputValue?: string
  } = {}
): Promise<MessageBoxData> {
  return ElMessageBox.prompt(message, title, {
    confirmButtonText: options.confirmButtonText || '确定',
    cancelButtonText: options.cancelButtonText || '取消',
    inputPattern: options.inputPattern,
    inputErrorMessage: options.inputErrorMessage,
    inputPlaceholder: options.inputPlaceholder,
    inputValue: options.inputValue
  })
}




export function notifySuccess(title: string, message?: string, duration = 4500): void {
  ElNotification.success({
    title,
    message,
    duration
  })
}




export function notifyWarning(title: string, message?: string, duration = 4500): void {
  ElNotification.warning({
    title,
    message,
    duration
  })
}




export function notifyError(title: string, message?: string, duration = 4500): void {
  ElNotification.error({
    title,
    message,
    duration
  })
}




export function notifyInfo(title: string, message?: string, duration = 4500): void {
  ElNotification.info({
    title,
    message,
    duration
  })
}




export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}




export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxAttempts) {
        throw lastError
      }
      
      console.warn(`第${attempt}次尝试失败，${delay}ms后重试...`, error)
      await sleep(delay)
    }
  }
  
  throw lastError!
}




export async function concurrentLimit<T>(
  tasks: (() => Promise<T>)[],
  limit = 3
): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<void>[] = []
  
  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result)
    })
    
    executing.push(promise)
    
    if (executing.length >= limit) {
      await Promise.race(executing)
      executing.splice(executing.findIndex(p => p === promise), 1)
    }
  }
  
  await Promise.all(executing)
  return results
}




export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}




export function unique<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)]
  }
  
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}




export function objectToQuery(obj: Record<string, any>): string {
  const params = new URLSearchParams()
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v))
      } else {
        params.append(key, value)
      }
    }
  })
  
  return params.toString()
}




export function queryToObject(query: string): Record<string, any> {
  const params = new URLSearchParams(query)
  const obj: Record<string, any> = {}
  
  params.forEach((value, key) => {
    if (obj[key]) {
      if (Array.isArray(obj[key])) {
        obj[key].push(value)
      } else {
        obj[key] = [obj[key], value]
      }
    } else {
      obj[key] = value
    }
  })
  
  return obj
}