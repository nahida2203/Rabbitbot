import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppSettings, ThemeConfig } from '@/types'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    
    const defaultSettings: AppSettings = {
      general: {
        systemName: 'Yunzai WebUI',
        systemDescription: 'Yunzai Bot 管理面板',
        defaultLanguage: 'zh-CN',
        timezone: 'Asia/Shanghai',
        autoSave: true,
        enablePluginMarket: true,
        enableAI: true,
        enableAnalytics: true,
        debugMode: false
      },
      appearance: {
        theme: 'light',
        primaryColor: '#409EFF',
        fontSize: 14,
        borderRadius: 4,
        sidebarWidth: 240,
        fixedHeader: true,
        showBreadcrumb: true,
        showTabs: true
      },
      notification: {
        desktop: true,
        system: true,
        plugin: true,
        error: true,
        email: {
          enabled: false,
          smtp: {
            host: '',
            port: 587,
            user: '',
            password: ''
          }
        }
      },
      security: {
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        forceHttps: false,
        enableCaptcha: true,
        password: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          expiryDays: 0
        }
      },
      system: {
        maxConnections: 100,
        requestTimeout: 30,
        cacheSize: 100,
        logRetentionDays: 30,
        backup: {
          enabled: false,
          frequency: 'daily',
          retention: 7,
          path: '/backup'
        }
      },
      advanced: {
        apiDebug: false,
        performanceMonitor: false,
        errorReporting: true,
        experimentalFeatures: false
      }
    }
    
    
    const settings = ref<AppSettings>({ ...defaultSettings })
    
    
    const theme = computed(() => settings.value.appearance.theme)
    const primaryColor = computed(() => settings.value.appearance.primaryColor)
    const fontSize = computed(() => settings.value.appearance.fontSize)
    const borderRadius = computed(() => settings.value.appearance.borderRadius)
    const sidebarWidth = computed(() => settings.value.appearance.sidebarWidth)
    const fixedHeader = computed(() => settings.value.appearance.fixedHeader)
    const showBreadcrumb = computed(() => settings.value.appearance.showBreadcrumb)
    const showTabs = computed(() => settings.value.appearance.showTabs)
    const language = computed(() => settings.value.general.defaultLanguage)
    const timezone = computed(() => settings.value.general.timezone)
    const debugMode = computed(() => settings.value.general.debugMode)
    
    
    const getSetting = (path: string) => {
      const keys = path.split('.')
      let value: any = settings.value
      for (const key of keys) {
        value = value?.[key]
      }
      return value
    }
    
    
    const setSetting = (path: string, value: any) => {
      const keys = path.split('.')
      let target: any = settings.value
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {}
        }
        target = target[keys[i]]
      }
      target[keys[keys.length - 1]] = value
    }
    
    
    const updateSettings = (newSettings: Partial<AppSettings>) => {
      settings.value = { ...settings.value, ...newSettings }
    }
    
    
    const resetSettings = () => {
      settings.value = { ...defaultSettings }
    }
    
    
    const resetCategorySettings = (category: keyof AppSettings) => {
      settings.value[category] = { ...defaultSettings[category] }
    }
    
    
    const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
      settings.value.appearance.theme = newTheme
      applyTheme(newTheme)
    }
    
    const setPrimaryColor = (color: string) => {
      settings.value.appearance.primaryColor = color
      applyPrimaryColor(color)
    }
    
    const setFontSize = (size: number) => {
      settings.value.appearance.fontSize = size
      applyFontSize(size)
    }
    
    const setBorderRadius = (radius: number) => {
      settings.value.appearance.borderRadius = radius
      applyBorderRadius(radius)
    }
    
    const setSidebarWidth = (width: number) => {
      settings.value.appearance.sidebarWidth = width
    }
    
    
    const applyTheme = (theme: string) => {
      let actualTheme = theme
      if (theme === 'auto') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      document.documentElement.setAttribute('data-theme', actualTheme)
      document.documentElement.className = actualTheme
    }
    
    
    const applyPrimaryColor = (color: string) => {
      document.documentElement.style.setProperty('--el-color-primary', color)
      
      
      const rgb = hexToRgb(color)
      if (rgb) {
        for (let i = 1; i <= 9; i++) {
          const lightColor = lighten(color, i * 0.1)
          const darkColor = darken(color, i * 0.1)
          document.documentElement.style.setProperty(`--el-color-primary-light-${i}`, lightColor)
          document.documentElement.style.setProperty(`--el-color-primary-dark-${i}`, darkColor)
        }
      }
    }
    
    
    const applyFontSize = (size: number) => {
      document.documentElement.style.setProperty('--el-font-size-base', `${size}px`)
    }
    
    
    const applyBorderRadius = (radius: number) => {
      document.documentElement.style.setProperty('--el-border-radius-base', `${radius}px`)
    }
    
    
    const applyAppearanceSettings = () => {
      applyTheme(settings.value.appearance.theme)
      applyPrimaryColor(settings.value.appearance.primaryColor)
      applyFontSize(settings.value.appearance.fontSize)
      applyBorderRadius(settings.value.appearance.borderRadius)
    }
    
    
    const setLanguage = (lang: string) => {
      settings.value.general.defaultLanguage = lang
    }
    
    
    const setTimezone = (tz: string) => {
      settings.value.general.timezone = tz
    }
    
    
    const setDebugMode = (enabled: boolean) => {
      settings.value.general.debugMode = enabled
    }
    
    
    const setNotificationSetting = (type: string, enabled: boolean) => {
      if (type in settings.value.notification) {
        (settings.value.notification as any)[type] = enabled
      }
    }
    
    
    const setSecuritySetting = (key: string, value: any) => {
      if (key in settings.value.security) {
        (settings.value.security as any)[key] = value
      }
    }
    
    
    const setSystemSetting = (key: string, value: any) => {
      if (key in settings.value.system) {
        (settings.value.system as any)[key] = value
      }
    }
    
    
    const setAdvancedSetting = (key: string, value: any) => {
      if (key in settings.value.advanced) {
        (settings.value.advanced as any)[key] = value
      }
    }
    
    
    const exportSettings = () => {
      return JSON.stringify(settings.value, null, 2)
    }
    
    
    const importSettings = (settingsJson: string) => {
      try {
        const importedSettings = JSON.parse(settingsJson)
        settings.value = { ...defaultSettings, ...importedSettings }
        applyAppearanceSettings()
        return true
      } catch (error) {
        console.error('导入设置失败:', error)
        return false
      }
    }
    
    
    const initSettings = () => {
      
      if (settings.value.appearance.theme === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', () => {
          applyTheme('auto')
        })
      }
      
      
      applyAppearanceSettings()
    }
    
    return {
      
      settings,
      
      
      theme,
      primaryColor,
      fontSize,
      borderRadius,
      sidebarWidth,
      fixedHeader,
      showBreadcrumb,
      showTabs,
      language,
      timezone,
      debugMode,
      
      
      getSetting,
      setSetting,
      updateSettings,
      resetSettings,
      resetCategorySettings,
      
      
      setTheme,
      setPrimaryColor,
      setFontSize,
      setBorderRadius,
      setSidebarWidth,
      applyAppearanceSettings,
      
      
      setLanguage,
      setTimezone,
      setDebugMode,
      setNotificationSetting,
      setSecuritySetting,
      setSystemSetting,
      setAdvancedSetting,
      
      
      exportSettings,
      importSettings,
      
      
      initSettings
    }
  },
  {
    persist: {
      key: 'yunzai-settings',
      storage: localStorage
    }
  }
)


function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

function lighten(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount))
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount))
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
  
  return `rgb(${r}, ${g}, ${b})`
}

function darken(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)))
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)))
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)))
  
  return `rgb(${r}, ${g}, ${b})`
}