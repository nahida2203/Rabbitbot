<template>
  <div id="app" :class="appClasses">
    
    <div v-if="appStore.loading" class="global-loading">
      <el-icon class="loading-spinner"><Loading /></el-icon>
      <span class="loading-text">{{ appStore.loadingText }}</span>
    </div>

    
    <router-view v-slot="{ Component, route }">
      <transition
        :name="route.meta?.transition || 'fade'"
        mode="out-in"
        appear
      >
        <keep-alive :include="keepAliveComponents">
          <component :is="Component" :key="route.fullPath" />
        </keep-alive>
      </transition>
    </router-view>

    
    <teleport to="body">
      <div id="global-notifications"></div>
    </teleport>

    
    <teleport to="body">
      <div id="global-modals"></div>
    </teleport>

    
    <dev-tools v-if="isDev" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { useWebSocketStore } from '@/stores/websocket'
import DevTools from '@/components/DevTools.vue'


const appStore = useAppStore()
const themeStore = useThemeStore()
const userStore = useUserStore()
const wsStore = useWebSocketStore()
const route = useRoute()


const isDev = computed(() => import.meta.env.DEV)

const appClasses = computed(() => {
  return {
    'app-dark': themeStore.isDark,
    'app-light': !themeStore.isDark,
    'app-mobile': appStore.isMobile,
    'app-tablet': appStore.isTablet,
    'app-desktop': appStore.isDesktop,
    'app-sidebar-collapsed': appStore.sidebarCollapsed,
    'app-fullscreen': appStore.isFullscreen
  }
})

const keepAliveComponents = computed(() => {
  return appStore.cachedViews
})


onMounted(async () => {
  
  await initApp()
  
  
  window.addEventListener('resize', handleResize)
  
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  
  document.addEventListener('keydown', handleKeydown)
  
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  
  wsStore.disconnect()
})


watch(
  () => route.path,
  (newPath) => {
    
    appStore.updateBreadcrumb(route)
    
    
    updatePageTitle()
    
    
    appStore.addVisitedView(route)
  },
  { immediate: true }
)


watch(
  () => themeStore.theme,
  (newTheme) => {
    
    document.documentElement.className = `theme-${newTheme}`
    
    
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', themeStore.primaryColor)
    }
  },
  { immediate: true }
)


async function initApp() {
  try {
    appStore.setLoading(true, '正在初始化应用...')
    
    
    appStore.detectDevice()
    
    
    if (userStore.isLoggedIn) {
      await wsStore.connect()
    }
    
    
    await appStore.fetchSystemInfo()
    
  } catch (error) {
    console.error('应用初始化失败:', error)
    ElMessage.error('应用初始化失败，请刷新页面重试')
  } finally {
    appStore.setLoading(false)
  }
}

function handleResize() {
  appStore.detectDevice()
  
  
  if (appStore.isMobile && !appStore.sidebarCollapsed) {
    appStore.toggleSidebar()
  }
}

function handleOnline() {
  appStore.setOnlineStatus(true)
  ElMessage.success('网络连接已恢复')
  
  
  if (userStore.isLoggedIn) {
    wsStore.connect()
  }
}

function handleOffline() {
  appStore.setOnlineStatus(false)
  ElMessage.warning('网络连接已断开')
  
  
  wsStore.disconnect()
}

function handleKeydown(event: KeyboardEvent) {
  
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    appStore.toggleSearch()
  }
  
  
  if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
    event.preventDefault()
    appStore.toggleSidebar()
  }
  
  
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
    event.preventDefault()
    themeStore.toggleTheme()
  }
  
  
  if (event.key === 'F11') {
    event.preventDefault()
    appStore.toggleFullscreen()
  }
  
  
  if (event.key === 'Escape') {
    appStore.closeSearch()
    appStore.closeMobileMenu()
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    
    appStore.pausePolling()
  } else {
    
    appStore.resumePolling()
    
    
    if (userStore.isLoggedIn) {
      userStore.checkLoginStatus()
    }
  }
}

function updatePageTitle() {
  const title = route.meta?.title as string
  if (title) {
    document.title = `${title} - ${appStore.appTitle}`
  } else {
    document.title = appStore.appTitle
  }
}
</script>

<style lang="scss">
// 全局样式
#app {
  height: 100vh;
  overflow: hidden;
  transition: all 0.3s ease;
}

// 全局加载遮罩
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  
  .loading-text {
    margin-top: 16px;
    color: white;
    font-size: 14px;
  }
}

// 路由过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from {
  transform: translateX(-100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}

.zoom-enter-active,
.zoom-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.zoom-enter-from,
.zoom-leave-to {
  transform: scale(0.9);
  opacity: 0;
}

// 响应式样式
.app-mobile {
  .el-drawer__body {
    padding: 16px;
  }
  
  .el-table {
    font-size: 12px;
  }
  
  .el-button {
    padding: 8px 12px;
  }
}

.app-tablet {
  .el-aside {
    width: 200px !important;
  }
}

.app-desktop {
  .el-aside {
    width: 240px !important;
  }
}

// 主题样式
.app-dark {
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

.app-light {
  background-color: #f5f7fa;
  color: #303133;
}

// 全屏样式
.app-fullscreen {
  .el-header,
  .el-aside {
    display: none !important;
  }
  
  .el-main {
    padding: 0 !important;
  }
}

// 侧边栏收起样式
.app-sidebar-collapsed {
  .el-aside {
    width: 64px !important;
  }
}

// 滚动条样式
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--el-border-color-light);
  border-radius: 3px;
  
  &:hover {
    background: var(--el-border-color);
  }
}

// 选择文本样式
::selection {
  background: var(--el-color-primary);
  color: white;
}

// 焦点样式
:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>