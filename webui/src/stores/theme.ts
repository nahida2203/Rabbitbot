import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type LanguageCode = 'zh-cn' | 'en-us' | 'ja-jp'
export type ThemePreset = 'default' | 'kawaii'

export interface ThemeConfig {
  mode: ThemeMode
  primaryColor: string
  language: LanguageCode
  fontSize: number
  borderRadius: number
  compactMode: boolean
  animations: boolean
  colorWeakness: boolean
  grayMode: boolean
  preset?: ThemePreset
}

const DEFAULT_THEME: ThemeConfig = {
  mode: 'auto',
  primaryColor: '#409EFF',
  language: 'zh-cn',
  fontSize: 14,
  borderRadius: 4,
  compactMode: false,
  animations: true,
  colorWeakness: false,
  grayMode: false,
  preset: 'default'
}

const THEME_COLORS = {
  blue: '#409EFF',
  green: '#67C23A',
  orange: '#E6A23C',
  red: '#F56C6C',
  purple: '#9C27B0',
  pink: '#E91E63',
  cyan: '#00BCD4',
  teal: '#009688',
  indigo: '#3F51B5',
  brown: '#795548'
}

export const useThemeStore = defineStore('theme', () => {
  
  const config = ref<ThemeConfig>({ ...DEFAULT_THEME })
  const systemDarkMode = ref(false)
  
  
  const isDark = computed(() => {
    if (config.value.mode === 'auto') {
      return systemDarkMode.value
    }
    return config.value.mode === 'dark'
  })
  
  const theme = computed(() => isDark.value ? 'dark' : 'light')
  
  const primaryColor = computed(() => config.value.primaryColor)
  
  const cssVars = computed(() => {
    const vars: Record<string, string> = {
      '--el-color-primary': config.value.primaryColor,
      '--el-font-size-base': `${config.value.fontSize}px`,
      '--el-border-radius-base': `${config.value.borderRadius}px`
    }

    
    if (config.value.preset === 'kawaii') {
      vars['--el-border-radius-base'] = '10px'
      vars['--el-border-radius-small'] = '8px'
    }
    
    
    const color = config.value.primaryColor
    for (let i = 1; i <= 9; i++) {
      vars[`--el-color-primary-light-${i}`] = lightenColor(color, i * 0.1)
    }
    vars['--el-color-primary-dark-2'] = darkenColor(color, 0.2)
    
    return vars
  })
  
  
  function setThemeMode(mode: ThemeMode) {
    config.value.mode = mode
    saveTheme()
    applyTheme()
  }
  
  function toggleTheme() {
    if (config.value.mode === 'auto') {
      setThemeMode(systemDarkMode.value ? 'light' : 'dark')
    } else {
      setThemeMode(config.value.mode === 'dark' ? 'light' : 'dark')
    }
  }
  
  function setPrimaryColor(color: string) {
    config.value.primaryColor = color
    saveTheme()
    applyTheme()
  }
  
  function setPreset(preset: ThemePreset) {
    
    config.value.preset = preset
    saveTheme()
    applyTheme()
  }
  
  function setLanguage(language: LanguageCode) {
    config.value.language = language
    saveTheme()
    
    
    document.documentElement.lang = language
  }
  
  function setFontSize(size: number) {
    config.value.fontSize = Math.max(12, Math.min(20, size))
    saveTheme()
    applyTheme()
  }
  
  function setBorderRadius(radius: number) {
    config.value.borderRadius = Math.max(0, Math.min(12, radius))
    saveTheme()
    applyTheme()
  }
  
  function setCompactMode(compact: boolean) {
    config.value.compactMode = compact
    saveTheme()
    applyTheme()
  }
  
  function setAnimations(enabled: boolean) {
    config.value.animations = enabled
    saveTheme()
    applyTheme()
  }
  
  function setColorWeakness(enabled: boolean) {
    config.value.colorWeakness = enabled
    saveTheme()
    applyTheme()
  }
  
  function setGrayMode(enabled: boolean) {
    config.value.grayMode = enabled
    saveTheme()
    applyTheme()
  }
  
  function resetTheme() {
    config.value = { ...DEFAULT_THEME }
    saveTheme()
    applyTheme()
  }
  
  function applyTheme() {
    const root = document.documentElement
    
    
    Object.entries(cssVars.value).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    
    
    root.className = root.className.replace(/theme-\w+/g, '')
    root.classList.add(`theme-${theme.value}`)

    
    if (config.value.preset === 'kawaii') {
      root.classList.add('preset-kawaii')
    } else {
      root.classList.remove('preset-kawaii')
    }
    
    
    if (isDark.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    
    if (config.value.compactMode) {
      root.classList.add('compact')
    } else {
      root.classList.remove('compact')
    }
    
    
    if (!config.value.animations) {
      root.classList.add('no-animations')
    } else {
      root.classList.remove('no-animations')
    }
    
    
    if (config.value.colorWeakness) {
      root.classList.add('color-weakness')
    } else {
      root.classList.remove('color-weakness')
    }
    
    
    if (config.value.grayMode) {
      root.classList.add('gray-mode')
    } else {
      root.classList.remove('gray-mode')
    }
  }
  
  function saveTheme() {
    localStorage.setItem('theme-config', JSON.stringify(config.value))
  }
  
  function loadTheme() {
    try {
      const saved = localStorage.getItem('theme-config')
      if (saved) {
        const savedConfig = JSON.parse(saved)
        config.value = { ...DEFAULT_THEME, ...savedConfig }
      }
    } catch (error) {
      console.error('加载主题配置失败:', error)
      config.value = { ...DEFAULT_THEME }
    }
  }
  
  function detectSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemDarkMode.value = mediaQuery.matches
    
    
    mediaQuery.addEventListener('change', (e) => {
      systemDarkMode.value = e.matches
    })
  }
  
  async function initTheme() {
    
    detectSystemTheme()
    
    
    loadTheme()
    
    
    applyTheme()
    
    
    watch(
      () => [isDark.value, config.value],
      () => {
        applyTheme()
      },
      { deep: true }
    )
  }
  
  function getThemeColors() {
    return THEME_COLORS
  }
  
  function exportTheme() {
    return JSON.stringify(config.value, null, 2)
  }
  
  function importTheme(themeJson: string) {
    try {
      const importedConfig = JSON.parse(themeJson)
      config.value = { ...DEFAULT_THEME, ...importedConfig }
      saveTheme()
      applyTheme()
      return true
    } catch (error) {
      console.error('导入主题失败:', error)
      return false
    }
  }
  
  return {
    
    config,
    systemDarkMode,
    
    
    isDark,
    theme,
    primaryColor,
    cssVars,
    
    
    setThemeMode,
    toggleTheme,
    setPrimaryColor,
    setPreset,
    setLanguage,
    setFontSize,
    setBorderRadius,
    setCompactMode,
    setAnimations,
    setColorWeakness,
    setGrayMode,
    resetTheme,
    applyTheme,
    saveTheme,
    loadTheme,
    detectSystemTheme,
    initTheme,
    getThemeColors,
    exportTheme,
    importTheme
  }
})


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

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function lightenColor(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const { r, g, b } = rgb
  const newR = Math.min(255, Math.round(r + (255 - r) * amount))
  const newG = Math.min(255, Math.round(g + (255 - g) * amount))
  const newB = Math.min(255, Math.round(b + (255 - b) * amount))
  
  return rgbToHex(newR, newG, newB)
}

function darkenColor(color: string, amount: number): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const { r, g, b } = rgb
  const newR = Math.max(0, Math.round(r * (1 - amount)))
  const newG = Math.max(0, Math.round(g * (1 - amount)))
  const newB = Math.max(0, Math.round(b * (1 - amount)))
  
  return rgbToHex(newR, newG, newB)
}