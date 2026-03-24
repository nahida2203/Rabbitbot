import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'

export interface TabItem {
  name: string
  path: string
  title: string
  icon?: string
  closable: boolean
  params?: Record<string, any>
  query?: Record<string, any>
}

export const useTabsStore = defineStore(
  'tabs',
  () => {
    
    const tabs = ref<TabItem[]>([
      {
        name: 'Dashboard',
        path: '/dashboard',
        title: '仪表盘',
        icon: 'Dashboard',
        closable: false
      }
    ])
    
    const activeTab = ref('/dashboard')
    
    
    const currentTab = computed(() => {
      return tabs.value.find(tab => tab.path === activeTab.value)
    })
    
    const tabsCount = computed(() => tabs.value.length)
    
    const closableTabs = computed(() => {
      return tabs.value.filter(tab => tab.closable)
    })
    
    
    const addTab = (route: RouteLocationNormalized | TabItem) => {
      const tab: TabItem = {
        name: route.name as string,
        path: route.path,
        title: getTabTitle(route),
        icon: getTabIcon(route),
        closable: route.path !== '/dashboard',
        params: 'params' in route ? route.params : undefined,
        query: 'query' in route ? route.query : undefined
      }
      
      
      const existingIndex = tabs.value.findIndex(t => t.path === tab.path)
      if (existingIndex === -1) {
        tabs.value.push(tab)
      } else {
        
        tabs.value[existingIndex] = { ...tabs.value[existingIndex], ...tab }
      }
      
      activeTab.value = tab.path
    }
    
    
    const removeTab = (path: string) => {
      const index = tabs.value.findIndex(tab => tab.path === path)
      if (index === -1) return
      
      const tab = tabs.value[index]
      if (!tab.closable) return
      
      tabs.value.splice(index, 1)
      
      
      if (activeTab.value === path) {
        if (tabs.value.length > 0) {
          
          const nextTab = tabs.value[index] || tabs.value[index - 1] || tabs.value[0]
          activeTab.value = nextTab.path
        }
      }
    }
    
    
    const removeOtherTabs = (path?: string) => {
      const targetPath = path || activeTab.value
      const targetTab = tabs.value.find(tab => tab.path === targetPath)
      
      if (!targetTab) return
      
      
      tabs.value = tabs.value.filter(tab => !tab.closable || tab.path === targetPath)
      activeTab.value = targetPath
    }
    
    
    const removeAllTabs = () => {
      tabs.value = tabs.value.filter(tab => !tab.closable)
      
      
      if (tabs.value.length > 0) {
        activeTab.value = tabs.value[0].path
      }
    }
    
    
    const removeLeftTabs = (path: string) => {
      const index = tabs.value.findIndex(tab => tab.path === path)
      if (index === -1) return
      
      
      for (let i = index - 1; i >= 0; i--) {
        if (tabs.value[i].closable) {
          tabs.value.splice(i, 1)
        }
      }
    }
    
    
    const removeRightTabs = (path: string) => {
      const index = tabs.value.findIndex(tab => tab.path === path)
      if (index === -1) return
      
      
      for (let i = tabs.value.length - 1; i > index; i--) {
        if (tabs.value[i].closable) {
          tabs.value.splice(i, 1)
        }
      }
    }
    
    
    const setActiveTab = (path: string) => {
      const tab = tabs.value.find(t => t.path === path)
      if (tab) {
        activeTab.value = path
      }
    }
    
    
    const updateTabTitle = (path: string, title: string) => {
      const tab = tabs.value.find(t => t.path === path)
      if (tab) {
        tab.title = title
      }
    }
    
    
    const updateTabIcon = (path: string, icon: string) => {
      const tab = tabs.value.find(t => t.path === path)
      if (tab) {
        tab.icon = icon
      }
    }
    
    
    const refreshTab = (path?: string) => {
      const targetPath = path || activeTab.value
      const tab = tabs.value.find(t => t.path === targetPath)
      if (tab) {
        
        return { name: tab.name, params: tab.params, query: { ...tab.query, _t: Date.now() } }
      }
      return null
    }
    
    
    const getTabIndex = (path: string) => {
      return tabs.value.findIndex(tab => tab.path === path)
    }
    
    
    const moveTab = (fromIndex: number, toIndex: number) => {
      if (fromIndex < 0 || fromIndex >= tabs.value.length || toIndex < 0 || toIndex >= tabs.value.length) {
        return
      }
      
      const tab = tabs.value.splice(fromIndex, 1)[0]
      tabs.value.splice(toIndex, 0, tab)
    }
    
    
    const hasTab = (path: string) => {
      return tabs.value.some(tab => tab.path === path)
    }
    
    
    const getNextTab = (path: string) => {
      const index = getTabIndex(path)
      if (index === -1 || index === tabs.value.length - 1) return null
      return tabs.value[index + 1]
    }
    
    
    const getPrevTab = (path: string) => {
      const index = getTabIndex(path)
      if (index <= 0) return null
      return tabs.value[index - 1]
    }
    
    
    const resetTabs = () => {
      tabs.value = [
        {
          name: 'Dashboard',
          path: '/dashboard',
          title: '仪表盘',
          icon: 'Dashboard',
          closable: false
        }
      ]
      activeTab.value = '/dashboard'
    }
    
    return {
      
      tabs,
      activeTab,
      
      
      currentTab,
      tabsCount,
      closableTabs,
      
      
      addTab,
      removeTab,
      removeOtherTabs,
      removeAllTabs,
      removeLeftTabs,
      removeRightTabs,
      setActiveTab,
      updateTabTitle,
      updateTabIcon,
      refreshTab,
      getTabIndex,
      moveTab,
      hasTab,
      getNextTab,
      getPrevTab,
      resetTabs
    }
  },
  {
    persist: {
      key: 'yunzai-tabs',
      storage: sessionStorage,
      paths: ['tabs', 'activeTab']
    }
  }
)


function getTabTitle(route: RouteLocationNormalized | TabItem): string {
  if ('title' in route && route.title) {
    return route.title
  }
  
  const titleMap: Record<string, string> = {
    'Dashboard': '仪表盘',
    'Plugins': '插件管理',
    'Config': '系统配置',
    'Logs': '日志管理',
    'Monitor': '系统监控',
    'Users': '用户管理',
    'Settings': '系统设置',
    'Login': '登录',
    'Profile': '个人资料',
    'About': '关于'
  }
  
  const name = route.name as string
  return titleMap[name] || name || '未知页面'
}


function getTabIcon(route: RouteLocationNormalized | TabItem): string {
  if ('icon' in route && route.icon) {
    return route.icon
  }
  
  const iconMap: Record<string, string> = {
    'Dashboard': 'Dashboard',
    'Plugins': 'Grid',
    'Config': 'Setting',
    'Logs': 'Document',
    'Monitor': 'Monitor',
    'Users': 'User',
    'Settings': 'Tools',
    'Login': 'Key',
    'Profile': 'UserFilled',
    'About': 'InfoFilled'
  }
  
  const name = route.name as string
  return iconMap[name] || 'Document'
}