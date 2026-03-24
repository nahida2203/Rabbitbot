<template>
  <div class="error-page">
    <div class="error-container">
      <div class="error-content">
        <div class="error-code">404</div>
        <div class="error-title">页面未找到</div>
        <div class="error-description">
          抱歉，您访问的页面不存在或已被移除。
        </div>
        <div class="error-actions">
          <el-button type="primary" @click="goHome">
            <el-icon><House /></el-icon>
            返回首页
          </el-button>
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回上页
          </el-button>
        </div>
      </div>
      <div class="error-illustration">
        <svg viewBox="0 0 404 300" class="error-svg">
          
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          
          <circle cx="202" cy="150" r="120" fill="url(#gradient1)" opacity="0.1" />
          
          
          <path d="M80 80 L80 180 L120 180 L120 120 L140 120 L140 180 L160 180 L160 80 L140 80 L140 100 L120 100 L120 80 Z" fill="url(#gradient1)" />
          
          
          <ellipse cx="202" cy="130" rx="30" ry="50" fill="none" stroke="url(#gradient1)" stroke-width="8" />
          
          
          <path d="M264 80 L264 180 L304 180 L304 120 L324 120 L324 180 L344 180 L344 80 L324 80 L324 100 L304 100 L304 80 Z" fill="url(#gradient1)" />
          
          
          <circle cx="100" cy="50" r="4" fill="#667eea" opacity="0.6" />
          <circle cx="320" cy="60" r="3" fill="#764ba2" opacity="0.6" />
          <circle cx="60" cy="200" r="5" fill="#667eea" opacity="0.4" />
          <circle cx="350" cy="220" r="4" fill="#764ba2" opacity="0.4" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { House, ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 2rem;
}

.error-container {
  display: flex;
  align-items: center;
  gap: 4rem;
  max-width: 800px;
  width: 100%;
}

.error-content {
  flex: 1;
  text-align: center;
}

.error-code {
  font-size: 6rem;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.error-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.error-illustration {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.error-svg {
  width: 100%;
  max-width: 400px;
  height: auto;
}

@media (max-width: 768px) {
  .error-container {
    flex-direction: column;
    gap: 2rem;
    text-align: center;
  }
  
  .error-code {
    font-size: 4rem;
  }
  
  .error-title {
    font-size: 1.5rem;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
    
    .el-button {
      width: 200px;
    }
  }
}

@media (max-width: 480px) {
  .error-page {
    padding: 1rem;
  }
  
  .error-code {
    font-size: 3rem;
  }
  
  .error-title {
    font-size: 1.25rem;
  }
  
  .error-description {
    font-size: 0.875rem;
  }
}
</style>