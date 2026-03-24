import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { api } from '@/utils/api'

export interface VisitedView {
  path: string
  name?: string
  title?: string
  meta?: any
  query?: any
  params?: any
}

export interface BreadcrumbItem {
  title: string
  path?: string
  icon?: string
}

export interface SystemInfo {
  name: string
  version: string
  nodeVersion: string
  platform: string
  arch: string
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  pid: number
}

export const useAppStore = defineStore('app', () => {
  
  const appTitle = ref('Yunzai 4.1 管理面板')
  const loading = ref(false)
  const loadingText = ref('加载中...')
  const sidebarCollapsed = ref(false)
  const sidebarOpened = ref(true)
  const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
  const isOnline = ref(navigator.onLine)
  const isFullscreen = ref(false)
  const searchVisible = ref(false)
  const mobileMenuVisible = ref(false)
  
  
  const cachedViews = ref<string[]>([])
  const visitedViews = ref<VisitedView[]>([])
  const breadcrumb = ref<BreadcrumbItem[]>([])
  
  
  const systemInfo = ref<SystemInfo | null>(null)
  
  
  const pollingEnabled = ref(true)
  const pollingInterval = ref<number | null>(null)
  
  
  const isMobile = computed(() => device.value === 'mobile')
  const isTablet = computed(() => device.value === 'tablet')
  const isDesktop = computed(() => device.value === 'desktop')
  
  
  function setLoading(value: boolean, text = '加载中...') {
    loading.value = value
    loadingText.value = text
  }
  
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    sidebarOpened.value = !sidebarCollapsed.value
    
    
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value))
  }
  
  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
    sidebarOpened.value = !collapsed
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }
  
  function detectDevice() {
    const width = window.innerWidth
    if (width < 768) {
      device.value = 'mobile'
    } else if (width < 1024) {
      device.value = 'tablet'
    } else {
      device.value = 'desktop'
    }
  }
  
  function setOnlineStatus(online: boolean) {
    isOnline.value = online
  }
  
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      isFullscreen.value = true
    } else {
      document.exitFullscreen()
      isFullscreen.value = false
    }
  }
  
  function toggleSearch() {
    searchVisible.value = !searchVisible.value
  }
  
  function closeSearch() {
    searchVisible.value = false
  }
  
  function toggleMobileMenu() {
    mobileMenuVisible.value = !mobileMenuVisible.value
  }
  
  function closeMobileMenu() {
    mobileMenuVisible.value = false
  }
  
  function addCachedView(name: string) {
    if (!cachedViews.value.includes(name)) {
      cachedViews.value.push(name)
    }
  }
  
  function removeCachedView(name: string) {
    const index = cachedViews.value.indexOf(name)
    if (index > -1) {
      cachedViews.value.splice(index, 1)
    }
  }
  
  function clearCachedViews() {
    cachedViews.value = []
  }
  
  function addVisitedView(route: RouteLocationNormalized) {
    const view: VisitedView = {
      path: route.path,
      name: route.name as string,
      title: route.meta?.title as string,
      meta: route.meta,
      query: route.query,
      params: route.params
    }
    
    
    const existingIndex = visitedViews.value.findIndex(v => v.path === view.path)
    if (existingIndex > -1) {
      
      visitedViews.value[existingIndex] = view
    } else {
      
      visitedViews.value.push(view)
    }
    
    
    if (visitedViews.value.length > 20) {
      visitedViews.value.shift()
    }
    
    
    if (route.meta?.keepAlive && route.name) {
      addCachedView(route.name as string)
    }
  }
  
  function removeVisitedView(path: string) {
    const index = visitedViews.value.findIndex(v => v.path === path)
    if (index > -1) {
      const view = visitedViews.value[index]
      visitedViews.value.splice(index, 1)
      
      
      if (view.name) {
        removeCachedView(view.name)
      }
    }
  }
  
  function clearVisitedViews() {
    visitedViews.value = []
    clearCachedViews()
  }
  
  function updateBreadcrumb(route: RouteLocationNormalized) {
    const matched = route.matched.filter(item => item.meta?.title)
    const breadcrumbItems: BreadcrumbItem[] = []
    
    
    if (route.path !== '/dashboard') {
      breadcrumbItems.push({
        title: '首页',
        path: '/dashboard',
        icon: 'HomeFilled'
      })
    }
    
    
    matched.forEach(item => {
      breadcrumbItems.push({
        title: item.meta?.title as string,
        path: item.path,
        icon: item.meta?.icon as string
      })
    })
    
    breadcrumb.value = breadcrumbItems
  }
  
  async function fetchSystemInfo() {
    try {
      const response = await api.get('/system/info', { showError: false })
      if (response.data.success) {
        systemInfo.value = response.data.data
      }
    } catch (error) {
      
      console.warn('系统信息获取失败，可能后端服务未启动:', error.message)
      
      systemInfo.value = {
        platform: 'unknown',
        arch: 'unknown',
        nodeVersion: 'unknown',
        memory: { used: 0, total: 0 },
        uptime: 0,
        yunzaiVersion: '4.0.0'
      }
    }
  }
  
  function startPolling(interval = 30000) {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
    }
    
    pollingInterval.value = setInterval(() => {
      if (pollingEnabled.value && !document.hidden) {
        fetchSystemInfo()
      }
    }, interval)
  }
  
  function stopPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
  }
  
  function pausePolling() {
    pollingEnabled.value = false
  }
  
  function resumePolling() {
    pollingEnabled.value = true
  }
  
  async function initApp() {
    
    const savedSidebarState = localStorage.getItem('sidebarCollapsed')
    if (savedSidebarState !== null) {
      setSidebarCollapsed(savedSidebarState === 'true')
    }
    
    
    detectDevice()
    
    
    await fetchSystemInfo()
    
    
    startPolling()
    
    
    document.addEventListener('fullscreenchange', () => {
      isFullscreen.value = !!document.fullscreenElement
    })
  }
  
  function destroy() {
    stopPolling()
    document.removeEventListener('fullscreenchange', () => {})
  }
  
  return {
    
    appTitle,
    loading,
    loadingText,
    sidebarCollapsed,
    sidebarOpened,
    device,
    isOnline,
    isFullscreen,
    searchVisible,
    mobileMenuVisible,
    cachedViews,
    visitedViews,
    breadcrumb,
    systemInfo,
    pollingEnabled,
    
    
    isMobile,
    isTablet,
    isDesktop,
    
    
    setLoading,
    toggleSidebar,
    setSidebarCollapsed,
    detectDevice,
    setOnlineStatus,
    toggleFullscreen,
    toggleSearch,
    closeSearch,
    toggleMobileMenu,
    closeMobileMenu,
    addCachedView,
    removeCachedView,
    clearCachedViews,
    addVisitedView,
    removeVisitedView,
    clearVisitedViews,
    updateBreadcrumb,
    fetchSystemInfo,
    startPolling,
    stopPolling,
    pausePolling,
    resumePolling,
    initApp,
    destroy
  }
})