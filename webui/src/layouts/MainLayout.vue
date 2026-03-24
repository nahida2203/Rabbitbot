<template>
  <div class="main-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    
    <aside class="sidebar" :style="{ width: sidebarWidth }">
      <div class="sidebar-header">
        <div class="logo">
          <img src="/logo.svg" alt="Yunzai" class="logo-image" />
          <span v-show="!sidebarCollapsed" class="logo-text">Yunzai WebUI</span>
        </div>
        <el-button
          class="collapse-btn"
          :icon="sidebarCollapsed ? Expand : Fold"
          @click="toggleSidebar"
          text
        />
      </div>
      
      <div class="sidebar-content">
        <el-menu
          :default-active="activeMenu"
          :collapse="sidebarCollapsed"
          :unique-opened="true"
          router
          @select="handleMenuSelect"
          class="sidebar-menu"
        >
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon>
            <template #title>仪表盘</template>
          </el-menu-item>
          
          <el-sub-menu index="plugins">
            <template #title>
              <el-icon><Grid /></el-icon>
              <span>插件管理</span>
            </template>
            <el-menu-item index="/plugins/list">插件列表</el-menu-item>
            <el-menu-item index="/plugins/store">插件市场</el-menu-item>
            <el-menu-item index="/plugins/develop">插件开发</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="config">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统配置</span>
            </template>
            <el-menu-item index="/config/system">系统设置</el-menu-item>
            <el-menu-item index="/config/bot">机器人配置</el-menu-item>
            <el-menu-item index="/config/adapter">适配器配置</el-menu-item>
            <el-menu-item index="/config/security">安全设置</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="system">
            <template #title>
              <el-icon><Monitor /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/system/info">系统信息</el-menu-item>
            <el-menu-item index="/system/backup">备份管理</el-menu-item>
            <el-menu-item index="/system/update">系统更新</el-menu-item>
            <el-menu-item index="/logs/system">日志管理</el-menu-item>
            <el-menu-item index="/monitor/system">系统监控</el-menu-item>
            <el-menu-item index="/users/list">用户管理</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="ai">
            <template #title>
              <el-icon><ChatDotRound /></el-icon>
              <span>AI 助手</span>
            </template>
            <el-menu-item index="/ai/chat">AI 对话</el-menu-item>
            <el-menu-item index="/ai/models">模型管理</el-menu-item>
            <el-menu-item index="/ai/training">模型训练</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="tools">
            <template #title>
              <el-icon><Tools /></el-icon>
              <span>开发工具</span>
            </template>
            <el-menu-item index="/tools/terminal">Web 终端</el-menu-item>
            <el-menu-item index="/tools/editor">代码编辑</el-menu-item>
            <el-menu-item index="/tools/api-test">接口测试</el-menu-item>
            <el-menu-item index="/tools/database">数据库</el-menu-item>
          </el-sub-menu>
          
          <el-menu-item index="/settings">
            <el-icon><Operation /></el-icon>
            <template #title>个性化设置</template>
          </el-menu-item>
        </el-menu>
      </div>
      
      <div class="sidebar-footer">
        <div class="system-status">
          <div class="status-item">
            <div class="status-dot" :class="{ online: systemStatus.online }"></div>
            <span v-show="!sidebarCollapsed" class="status-text">
              {{ systemStatus.online ? '系统正常' : '系统异常' }}
            </span>
          </div>
          <div v-show="!sidebarCollapsed" class="version-info">
            v{{ systemStatus.version }}
          </div>
        </div>
      </div>
    </aside>
    
    
    <div class="main-content">
      
      <header class="header" :class="{ fixed: fixedHeader }">
        <div class="header-left">
          
          <el-breadcrumb v-if="showBreadcrumb" separator="/" class="breadcrumb">
            <el-breadcrumb-item
              v-for="item in breadcrumbItems"
              :key="item.path"
              :to="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索功能..."
              prefix-icon="Search"
              clearable
              @input="handleSearch"
              class="search-input"
            />
          </div>
          
          
          <el-dropdown trigger="click" @command="handleNotificationAction">
            <div class="notification-btn">
              <el-badge :value="unreadCount" :hidden="unreadCount === 0">
                <el-icon size="18"><Bell /></el-icon>
              </el-badge>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="notification-dropdown">
                <div class="notification-header">
                  <span>通知消息</span>
                  <el-button
                    size="small"
                    text
                    @click="markAllAsRead"
                    :disabled="unreadCount === 0"
                  >
                    全部已读
                  </el-button>
                </div>
                <div class="notification-list">
                  <div
                    v-for="notification in notifications.slice(0, 5)"
                    :key="notification.id"
                    class="notification-item"
                    :class="{ unread: !notification.read }"
                    @click="markAsRead(notification)"
                  >
                    <div class="notification-icon">
                      <el-icon :color="getNotificationColor(notification.type)">
                        <component :is="getNotificationIcon(notification.type)" />
                      </el-icon>
                    </div>
                    <div class="notification-content">
                      <div class="notification-title">{{ notification.title }}</div>
                      <div class="notification-message">{{ notification.message }}</div>
                      <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
                    </div>
                  </div>
                  <div v-if="notifications.length === 0" class="no-notifications">
                    暂无通知
                  </div>
                </div>
                <div class="notification-footer">
                  <el-button size="small" text @click="viewAllNotifications">
                    查看全部
                  </el-button>
                </div>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          
          
          <el-tooltip content="全屏" placement="bottom">
            <div class="action-btn" @click="toggleFullscreen">
              <el-icon size="18">
                <component :is="isFullscreen ? 'Aim' : 'FullScreen'" />
              </el-icon>
            </div>
          </el-tooltip>
          
          
          <el-tooltip content="切换主题" placement="bottom">
            <div class="action-btn" @click="toggleTheme">
              <el-icon size="18">
                <component :is="isDark ? 'Sunny' : 'Moon'" />
              </el-icon>
            </div>
          </el-tooltip>
          
          
          <el-dropdown trigger="click" @command="handleUserAction">
            <div class="user-info">
              <el-avatar :src="userStore.user?.avatar" :size="32">
                {{ userStore.user?.nickname?.charAt(0) || userStore.user?.username?.charAt(0) }}
              </el-avatar>
              <span class="username">{{ userStore.user?.nickname || userStore.user?.username }}</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人资料
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>
                  个人设置
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      
      
      <div v-if="showTabs" class="tabs-container">
        <el-tabs
          v-model="activeTab"
          type="card"
          closable
          @tab-remove="removeTab"
          @tab-click="handleTabClick"
          class="page-tabs"
        >
          <el-tab-pane
            v-for="tab in tabs"
            :key="tab.path"
            :label="tab.title"
            :name="tab.path"
            :closable="tab.closable"
          />
        </el-tabs>
        <div class="tabs-actions">
          <el-dropdown trigger="click" @command="handleTabAction">
            <el-button size="small" text>
              <el-icon><More /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="closeOthers">关闭其他</el-dropdown-item>
                <el-dropdown-item command="closeAll">关闭全部</el-dropdown-item>
                <el-dropdown-item command="refresh">刷新当前</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      
      <main class="page-content" :class="{ 'with-tabs': showTabs }">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
    
    
    <el-dialog
      v-model="showSearchDialog"
      title="搜索结果"
      width="600px"
      :show-close="false"
    >
      <div class="search-results">
        <div
          v-for="result in searchResults"
          :key="result.path"
          class="search-result-item"
          @click="navigateToResult(result)"
        >
          <div class="result-icon">
            <el-icon><component :is="result.icon" /></el-icon>
          </div>
          <div class="result-content">
            <div class="result-title">{{ result.title }}</div>
            <div class="result-description">{{ result.description }}</div>
          </div>
        </div>
        <div v-if="searchResults.length === 0" class="no-results">
          未找到相关功能
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Fold,
  Expand,
  Odometer,
  Grid,
  Setting,
  Monitor,
  Tools,
  Operation,
  Search,
  Bell,
  FullScreen,
  Aim,
  Sunny,
  Moon,
  User,
  SwitchButton,
  ArrowDown,
  More,
  InfoFilled,
  WarningFilled,
  CircleCheckFilled,
  CircleCloseFilled,
  ChatDotRound,
  ChatLineRound,
  Cpu,
  DataAnalysis,
  EditPen,
  Coin,
  Refresh,
  FolderAdd,
  UserFilled,
  Shop
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useTabsStore } from '@/stores/tabs'
import api from '@/api'
import { formatTime, debounce } from '@/utils'
import type { Notification } from '@/types'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const tabsStore = useTabsStore()

// 响应式数据
const sidebarCollapsed = ref(false)
const isFullscreen = ref(false)
const isDark = ref(false)
const searchKeyword = ref('')
const showSearchDialog = ref(false)
const searchResults = ref<any[]>([])
const notifications = ref<Notification[]>([])
const unreadCount = ref(0)

// 系统状态
const systemStatus = reactive({
  online: true,
  version: '4.1.0'
})

// 计算属性
const sidebarWidth = computed(() => {
  return sidebarCollapsed.value ? '64px' : `${settingsStore.sidebarWidth}px`
})

const fixedHeader = computed(() => settingsStore.fixedHeader)
const showBreadcrumb = computed(() => settingsStore.showBreadcrumb)
const showTabs = computed(() => settingsStore.showTabs)

const activeMenu = computed(() => route.path)
const activeTab = computed({
  get: () => tabsStore.activeTab,
  set: (value) => tabsStore.setActiveTab(value)
})

function handleMenuSelect(index: string) {
  if (typeof index === 'string' && index.startsWith('/')) {
    router.push(index)
  }
}

const tabs = computed(() => tabsStore.tabs)

// 面包屑导航
const breadcrumbItems = computed(() => {
  const items = []
  const pathSegments = route.path.split('/').filter(Boolean)
  
  items.push({ title: '首页', path: '/dashboard' })
  
  let currentPath = ''
  for (const segment of pathSegments) {
    currentPath += '/' + segment
    const title = getBreadcrumbTitle(currentPath)
    if (title && currentPath !== '/dashboard') {
      items.push({ title, path: currentPath })
    }
  }
  
  return items
})

// 获取面包屑标题
function getBreadcrumbTitle(path: string): string {
  const titleMap: Record<string, string> = {
    '/dashboard': '仪表盘',
    '/plugins/list': '插件列表',
    '/plugins/store': '插件市场',
    '/plugins/develop': '插件开发',
    '/config/system': '系统设置',
    '/config/bot': '机器人配置',
    '/config/adapter': '适配器配置',
    '/config/security': '安全设置',
    '/system/info': '系统信息',
    '/system/backup': '备份管理',
    '/system/update': '系统更新',
    '/logs/system': '日志管理',
    '/monitor/system': '系统监控',
    '/users/list': '用户管理',
    '/ai/chat': 'AI 对话',
    '/ai/models': '模型管理',
    '/ai/training': '模型训练',
    '/tools/terminal': '终端',
    '/tools/editor': '代码编辑',
    '/tools/api-test': '接口测试',
    '/tools/database': '数据库',
    '/settings': '设置'
  }
  return titleMap[path] || ''
}

// 切换侧边栏
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 搜索处理
const handleSearch = debounce(() => {
  if (!searchKeyword.value.trim()) {
    showSearchDialog.value = false
    return
  }
  
  // 模拟搜索结果
  const allFeatures = [
    { title: '仪表盘', description: '查看系统概览和统计信息', path: '/dashboard', icon: 'Odometer' },
    { title: '插件列表', description: '查看已安装的插件', path: '/plugins/list', icon: 'Grid' },
    { title: '插件商店', description: '安装新插件', path: '/plugins/store', icon: 'Shop' },
    { title: '插件开发', description: '在线编写新插件', path: '/plugins/develop', icon: 'EditPen' },
    { title: '系统配置', description: '配置系统全局参数', path: '/config/system', icon: 'Setting' },
    { title: '机器人配置', description: '配置机器人账号和功能', path: '/config/bot', icon: 'Setting' },
    { title: '适配器配置', description: '管理平台适配器', path: '/config/adapter', icon: 'Setting' },
    { title: '安全设置', description: '配置系统安全和权限', path: '/config/security', icon: 'Lock' },
    { title: '系统信息', description: '查看系统运行状态和版本', path: '/system/info', icon: 'InfoFilled' },
    { title: '备份管理', description: '管理和恢复系统备份', path: '/system/backup', icon: 'FolderAdd' },
    { title: '系统更新', description: '检查和安装系统更新', path: '/system/update', icon: 'Refresh' },
    { title: '日志管理', description: '查看运行日志', path: '/logs/system', icon: 'Monitor' },
    { title: '系统监控', description: '监控 CPU 和内存使用', path: '/monitor/system', icon: 'Monitor' },
    { title: '用户管理', description: '管理 WebUI 用户', path: '/users/list', icon: 'UserFilled' },
    { title: 'Web 终端', description: '在线终端控制台', path: '/tools/terminal', icon: 'Monitor' },
    { title: '代码编辑', description: '在线编辑插件代码', path: '/tools/editor', icon: 'EditPen' },
    { title: '接口测试', description: 'API 接口调试工具', path: '/tools/api-test', icon: 'Connection' },
    { title: '数据库', description: '管理系统数据库', path: '/tools/database', icon: 'Coin' },
    { title: '个性化设置', description: '界面主题和显示设置', path: '/settings', icon: 'Operation' }
  ]
  
  const keyword = searchKeyword.value.toLowerCase()
  searchResults.value = allFeatures.filter(feature => 
    feature.title.toLowerCase().includes(keyword) ||
    feature.description.toLowerCase().includes(keyword)
  )
  
  showSearchDialog.value = true
}, 300)

// 导航到搜索结果
function navigateToResult(result: any) {
  router.push(result.path)
  showSearchDialog.value = false
  searchKeyword.value = ''
}

// 切换全屏
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 切换主题
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  settingsStore.setTheme(isDark.value ? 'dark' : 'light')
}

// 处理用户操作
function handleUserAction(command: string) {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 退出登录
async function handleLogout() {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出登录',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await userStore.logout()
    router.push('/login')
    ElMessage.success('已退出登录')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('退出登录失败:', error)
      ElMessage.error('退出登录失败')
    }
  }
}

// 标签页操作
function removeTab(targetName: string) {
  tabsStore.removeTab(targetName)
}

function handleTabClick(tab: any) {
  router.push(tab.paneName)
}

function handleTabAction(command: string) {
  switch (command) {
    case 'closeOthers':
      tabsStore.closeOtherTabs()
      break
    case 'closeAll':
      tabsStore.closeAllTabs()
      router.push('/dashboard')
      break
    case 'refresh':
      window.location.reload()
      break
  }
}

// 通知相关
function handleNotificationAction(command: string) {
  // 处理通知操作
}

function markAllAsRead() {
  api.notification
    .markAllAsRead()
    .then(() => loadNotifications())
    .catch((error: any) => {
      console.error('全部已读失败:', error)
    })
}

function markAsRead(notification: Notification) {
  if (notification.read) return
  api.notification
    .markAsRead(notification.id)
    .then(() => loadNotifications())
    .catch((error: any) => {
      console.error('标记已读失败:', error)
    })
}

function viewAllNotifications() {
  router.push('/notifications')
}

function getNotificationIcon(type: string) {
  const iconMap: Record<string, any> = {
    info: InfoFilled,
    warning: WarningFilled,
    success: CircleCheckFilled,
    error: CircleCloseFilled
  }
  return iconMap[type] || InfoFilled
}

function getNotificationColor(type: string) {
  const colorMap: Record<string, string> = {
    info: '#409EFF',
    warning: '#E6A23C',
    success: '#67C23A',
    error: '#F56C6C'
  }
  return colorMap[type] || '#409EFF'
}

// 加载通知
async function loadNotifications() {
  try {
    const res = await api.notification.getNotifications({ page: 1, pageSize: 10 })
    notifications.value = res.data.data.items
    unreadCount.value = notifications.value.filter(n => !n.read).length
  } catch (error) {
    console.error('加载通知失败:', error)
    notifications.value = []
    unreadCount.value = 0
  }
}

// 监听路由变化，更新标签页
watch(
  () => route.path,
  (newPath) => {
    if (newPath !== '/login') {
      const title = getBreadcrumbTitle(newPath) || '未知页面'
      tabsStore.addTab({
        path: newPath,
        title,
        closable: newPath !== '/dashboard'
      })
      tabsStore.setActiveTab(newPath)
    }
  },
  { immediate: true }
)

// 页面加载
onMounted(() => {
  loadNotifications()
  
  // 监听全屏变化
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
  
  // 初始化主题
  const theme = settingsStore.theme
  isDark.value = theme === 'dark'
  document.documentElement.setAttribute('data-theme', theme)
})
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background: var(--el-bg-color-page);
}

.sidebar {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1000;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  height: 60px;
  box-sizing: border-box;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.logo-image {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-btn {
  flex-shrink: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.sidebar-menu {
  border: none;
  background: transparent;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.system-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-danger);
  transition: background-color 0.3s ease;
}

.status-dot.online {
  background: var(--el-color-success);
}

.status-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.version-info {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  z-index: 999;
}

.header.fixed {
  position: sticky;
  top: 0;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  width: 200px;
}

.search-input {
  border-radius: 20px;
}

.notification-btn,
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.notification-btn:hover,
.action-btn:hover {
  background: var(--el-fill-color-light);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.user-info:hover {
  background: var(--el-fill-color-light);
}

.username {
  font-size: 14px;
  color: var(--el-text-color-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.tabs-container {
  display: flex;
  align-items: center;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0 20px;
}

.page-tabs {
  flex: 1;
  min-width: 0;
}

.page-tabs :deep(.el-tabs__header) {
  margin: 0;
  border: none;
}

.page-tabs :deep(.el-tabs__nav) {
  border: none;
}

.page-tabs :deep(.el-tabs__item) {
  border: none;
  border-radius: 6px 6px 0 0;
  margin-right: 4px;
}

.tabs-actions {
  flex-shrink: 0;
  margin-left: 12px;
}

.page-content {
  flex: 1;
  overflow: auto;
  background: var(--el-bg-color-page);
}

.page-content.with-tabs {
  
}

.notification-dropdown {
  width: 320px;
  max-height: 400px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-weight: 600;
}

.notification-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notification-item:hover {
  background: var(--el-fill-color-light);
}

.notification-item.unread {
  background: var(--el-color-primary-light-9);
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-message {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.no-notifications {
  text-align: center;
  padding: 40px 16px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}

.notification-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: center;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.search-result-item:hover {
  background: var(--el-fill-color-light);
}

.result-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  color: var(--el-color-primary);
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.result-description {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.no-results {
  text-align: center;
  padding: 40px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.sidebar-collapsed .sidebar {
  width: 64px !important;
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }
  
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 2000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.show {
    transform: translateX(0);
  }
  
  .main-content {
    width: 100%;
  }
  
  .header {
    padding: 0 12px;
  }
  
  .search-box {
    width: 150px;
  }
  
  .username {
    display: none;
  }
  
  .tabs-container {
    padding: 0 12px;
  }
  
  .breadcrumb {
    display: none;
  }
}
</style>