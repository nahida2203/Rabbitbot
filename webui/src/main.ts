import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import { setupDirectives } from './directives'
import { setupGlobalComponents } from './components'
import { useAppStore } from './stores/app'
import { useUserStore } from './stores/user'
import { useThemeStore } from './stores/theme'


import './styles/index.scss'


import NProgress from 'nprogress'
import 'nprogress/nprogress.css'


NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.3
})


const app = createApp(App)


const pinia = createPinia()
app.use(pinia)


app.use(router)


app.use(ElementPlus, {
  size: 'default',
  zIndex: 3000
})


for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}


setupDirectives(app)


setupGlobalComponents(app)


app.config.errorHandler = (err, vm, info) => {
  console.error('全局错误:', err)
  console.error('错误信息:', info)
  
  
  
}


app.config.warnHandler = (msg, vm, trace) => {
  console.warn('全局警告:', msg)
  console.warn('组件追踪:', trace)
}


async function bootstrap() {
  try {
    
    const appStore = useAppStore()
    const userStore = useUserStore()
    const themeStore = useThemeStore()
    
    
    await themeStore.initTheme()
    
    
    await appStore.initApp()
    
    
    await userStore.autoLogin()
    
    
    app.mount('#app')
    
    
    const loading = document.getElementById('loading')
    if (loading) {
      loading.style.opacity = '0'
      setTimeout(() => {
        loading.remove()
      }, 300)
    }
    
    console.log('🚀 Yunzai WebUI 启动成功!')
    
  } catch (error) {
    console.error(' 应用启动失败:', error)
    
    
    const loading = document.getElementById('loading')
    if (loading) {
      loading.innerHTML = `
        <div class="loading-content">
          <div class="loading-logo"></div>
          <div class="loading-text">应用启动失败</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 10px;">
            ${error.message || '未知错误'}
          </div>
          <button 
            onclick="location.reload()" 
            style="
              margin-top: 20px;
              padding: 8px 16px;
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              border-radius: 4px;
              color: white;
              cursor: pointer;
            "
          >
            重新加载
          </button>
        </div>
      `
    }
  }
}


bootstrap()


if (import.meta.env.DEV) {
  console.log('🔧 开发模式已启用')
  console.log('📦 Vue版本:', app.version)
  console.log('🌐 环境变量:', import.meta.env)
}


if (import.meta.env.PROD) {
  
  window.addEventListener('load', () => {
    const loadTime = performance.now()
    console.log(`📊 首屏加载时间: ${loadTime.toFixed(2)}ms`)
  })
}

export default app