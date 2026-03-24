<template>
  <div class="error-page">
    <div class="error-container">
      <div class="error-content">
        <div class="error-code">500</div>
        <div class="error-title">服务器内部错误</div>
        <div class="error-description">
          抱歉，服务器遇到了一个错误，无法完成您的请求。我们正在努力修复这个问题。
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
          <el-button @click="refresh">
            <el-icon><Refresh /></el-icon>
            刷新页面
          </el-button>
          <el-button @click="reportError">
            <el-icon><Warning /></el-icon>
            报告错误
          </el-button>
        </div>
      </div>
      <div class="error-illustration">
        <svg viewBox="0 0 500 300" class="error-svg">
          
          <defs>
            <linearGradient id="gradient500" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#f6ad55;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#ed8936;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          
          <circle cx="250" cy="150" r="120" fill="url(#gradient500)" opacity="0.1" />
          
          
          <path d="M80 80 L80 100 L120 100 L120 120 L100 120 L100 140 L120 140 L120 160 L80 160 L80 180 L140 180 L140 160 L140 140 L140 120 L140 100 L140 80 Z" fill="url(#gradient500)" />
          
          
          <ellipse cx="200" cy="130" rx="30" ry="50" fill="none" stroke="url(#gradient500)" stroke-width="8" />
          
          
          <ellipse cx="300" cy="130" rx="30" ry="50" fill="none" stroke="url(#gradient500)" stroke-width="8" />
          
          
          <g transform="translate(220, 200)">
            <rect x="0" y="0" width="60" height="40" rx="4" fill="url(#gradient500)" />
            <rect x="5" y="5" width="50" height="6" rx="2" fill="white" opacity="0.8" />
            <rect x="5" y="15" width="30" height="4" rx="1" fill="white" opacity="0.6" />
            <rect x="5" y="22" width="40" height="4" rx="1" fill="white" opacity="0.6" />
            <rect x="5" y="29" width="25" height="4" rx="1" fill="white" opacity="0.6" />
            
            <circle cx="50" cy="18" r="3" fill="#e53e3e" />
            <circle cx="50" cy="28" r="3" fill="#e53e3e" opacity="0.6" />
          </g>
          
          
          <circle cx="100" cy="50" r="4" fill="#f6ad55" opacity="0.6" />
          <circle cx="400" cy="60" r="3" fill="#ed8936" opacity="0.6" />
          <circle cx="60" cy="200" r="5" fill="#f6ad55" opacity="0.4" />
          <circle cx="420" cy="220" r="4" fill="#ed8936" opacity="0.4" />
          
          
          <g transform="translate(350, 100)">
            <circle cx="15" cy="15" r="12" fill="#e53e3e" opacity="0.8" />
            <path d="M10 10 L20 20 M20 10 L10 20" stroke="white" stroke-width="2" stroke-linecap="round" />
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { House, ArrowLeft, Refresh, Warning } from '@element-plus/icons-vue'

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

const refresh = () => {
  window.location.reload()
}

const reportError = () => {
  ElMessage.info('错误报告已发送给技术团队，我们会尽快处理')
}
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
  padding: 2rem;
}

.error-container {
  display: flex;
  align-items: center;
  gap: 4rem;
  max-width: 900px;
  width: 100%;
}

.error-content {
  flex: 1;
  text-align: center;
}

.error-code {
  font-size: 6rem;
  font-weight: 700;
  color: var(--warning-color);
  line-height: 1;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
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
  max-width: 500px;
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