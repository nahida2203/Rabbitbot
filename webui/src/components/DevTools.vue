<template>
  <div v-if="isDev" class="dev-tools">
    <div class="dev-tools-toggle" @click="togglePanel">
      <el-icon><Tools /></el-icon>
    </div>
    
    <transition name="slide-left">
      <div v-show="showPanel" class="dev-tools-panel">
        <div class="dev-tools-header">
          <h3>开发工具</h3>
          <el-button 
            type="text" 
            size="small" 
            @click="togglePanel"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="dev-tools-content">
          
          <div class="dev-section">
            <h4>环境信息</h4>
            <div class="dev-info">
              <div class="info-item">
                <span class="label">模式:</span>
                <span class="value">{{ mode }}</span>
              </div>
              <div class="info-item">
                <span class="label">Vue版本:</span>
                <span class="value">{{ vueVersion }}</span>
              </div>
              <div class="info-item">
                <span class="label">构建时间:</span>
                <span class="value">{{ buildTime }}</span>
              </div>
            </div>
          </div>
          
          
          <div class="dev-section">
            <h4>当前路由</h4>
            <div class="dev-info">
              <div class="info-item">
                <span class="label">路径:</span>
                <span class="value">{{ route.path }}</span>
              </div>
              <div class="info-item">
                <span class="label">名称:</span>
                <span class="value">{{ route.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">参数:</span>
                <span class="value">{{ JSON.stringify(route.params) }}</span>
              </div>
            </div>
          </div>
          
          
          <div class="dev-section">
            <h4>用户状态</h4>
            <div class="dev-info">
              <div class="info-item">
                <span class="label">登录状态:</span>
                <span class="value">{{ userStore.isLoggedIn ? '已登录' : '未登录' }}</span>
              </div>
              <div class="info-item" v-if="userStore.userInfo">
                <span class="label">用户名:</span>
                <span class="value">{{ userStore.userInfo.username }}</span>
              </div>
              <div class="info-item" v-if="userStore.roles.length">
                <span class="label">角色:</span>
                <span class="value">{{ userStore.roles.join(', ') }}</span>
              </div>
            </div>
          </div>
          
          
          <div class="dev-section">
            <h4>主题设置</h4>
            <div class="dev-info">
              <div class="info-item">
                <span class="label">当前主题:</span>
                <span class="value">{{ themeStore.theme }}</span>
              </div>
              <div class="info-item">
                <span class="label">主色调:</span>
                <span class="value">{{ themeStore.primaryColor }}</span>
              </div>
            </div>
          </div>
          
          
          <div class="dev-section">
            <h4>快捷操作</h4>
            <div class="dev-actions">
              <el-button size="small" @click="clearStorage">
                清除存储
              </el-button>
              <el-button size="small" @click="toggleTheme">
                切换主题
              </el-button>
              <el-button size="small" @click="reloadApp">
                重载应用
              </el-button>
            </div>
          </div>
          
          
          <div class="dev-section">
            <h4>性能信息</h4>
            <div class="dev-info">
              <div class="info-item">
                <span class="label">内存使用:</span>
                <span class="value">{{ memoryUsage }}</span>
              </div>
              <div class="info-item">
                <span class="label">页面加载时间:</span>
                <span class="value">{{ loadTime }}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Tools, Close } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const userStore = useUserStore()
const themeStore = useThemeStore()
const appStore = useAppStore()

const showPanel = ref(false)
const loadTime = ref(0)
const memoryUsage = ref('N/A')

const isDev = computed(() => import.meta.env.DEV)
const mode = computed(() => import.meta.env.MODE)
const vueVersion = computed(() => '3.x')
const buildTime = computed(() => import.meta.env.VITE_BUILD_TIME || 'Unknown')

const togglePanel = () => {
  showPanel.value = !showPanel.value
}

const clearStorage = () => {
  localStorage.clear()
  sessionStorage.clear()
  ElMessage.success('存储已清除')
}

const toggleTheme = () => {
  themeStore.toggleTheme()
  ElMessage.success('主题已切换')
}

const reloadApp = () => {
  window.location.reload()
}

const updatePerformanceInfo = () => {
  
  if (performance.timing) {
    loadTime.value = performance.timing.loadEventEnd - performance.timing.navigationStart
  }
  
  
  if ('memory' in performance) {
    const memory = (performance as any).memory
    const used = Math.round(memory.usedJSHeapSize / 1048576)
    const total = Math.round(memory.totalJSHeapSize / 1048576)
    memoryUsage.value = `${used}MB / ${total}MB`
  }
}

onMounted(() => {
  updatePerformanceInfo()
  
  
  setInterval(updatePerformanceInfo, 5000)
})
</script>

<style lang="scss" scoped>
.dev-tools {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  z-index: 9999;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.dev-tools-toggle {
  position: absolute;
  right: 0;
  top: 0;
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  color: white;
  border-radius: 8px 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  
  &:hover {
    background: var(--primary-dark);
    transform: translateX(-2px);
  }
}

.dev-tools-panel {
  position: absolute;
  right: 40px;
  top: 0;
  width: 320px;
  max-height: 80vh;
  background: var(--bg-color);
  border: 1px solid var(--border-base);
  border-radius: 8px 0 0 8px;
  box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dev-tools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--fill-color-light);
  border-bottom: 1px solid var(--border-base);
  
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.dev-tools-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  
  @include scrollbar;
}

.dev-section {
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.dev-info {
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: 12px;
    
    .label {
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    .value {
      color: var(--text-primary);
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      max-width: 180px;
      text-align: right;
      word-break: break-all;
    }
  }
}

.dev-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  .el-button {
    width: 100%;
    font-size: 12px;
  }
}

// 动画
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(100%);
}

// 响应式
@media (max-width: 768px) {
  .dev-tools-panel {
    width: 280px;
  }
}

@media (max-width: 480px) {
  .dev-tools {
    display: none;
  }
}
</style>