<template>
  <div class="error-page">
    <div class="error-container">
      <div class="error-content">
        <div class="error-code">403</div>
        <div class="error-title">访问被拒绝</div>
        <div class="error-description">
          抱歉，您没有权限访问此页面。请联系管理员获取相应权限。
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
          <el-button @click="contactAdmin">
            <el-icon><Message /></el-icon>
            联系管理员
          </el-button>
        </div>
      </div>
      <div class="error-illustration">
        <svg viewBox="0 0 403 300" class="error-svg">
          
          <defs>
            <linearGradient id="gradient403" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#f56565;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#e53e3e;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          
          <circle cx="201" cy="150" r="120" fill="url(#gradient403)" opacity="0.1" />
          
          
          <path d="M80 80 L80 180 L120 180 L120 120 L140 120 L140 180 L160 180 L160 80 L140 80 L140 100 L120 100 L120 80 Z" fill="url(#gradient403)" />
          
          
          <ellipse cx="201" cy="130" rx="30" ry="50" fill="none" stroke="url(#gradient403)" stroke-width="8" />
          
          
          <path d="M264 80 L264 100 L304 100 L304 120 L284 120 L284 140 L304 140 L304 160 L264 160 L264 180 L324 180 L324 160 L324 140 L324 120 L324 100 L324 80 Z" fill="url(#gradient403)" />
          
          
          <g transform="translate(180, 200)">
            <rect x="10" y="15" width="25" height="20" rx="2" fill="url(#gradient403)" />
            <path d="M15 15 L15 10 Q15 5 20 5 Q25 5 25 10 L25 15" fill="none" stroke="url(#gradient403)" stroke-width="3" />
            <circle cx="22.5" cy="22" r="2" fill="white" />
          </g>
          
          
          <circle cx="100" cy="50" r="4" fill="#f56565" opacity="0.6" />
          <circle cx="320" cy="60" r="3" fill="#e53e3e" opacity="0.6" />
          <circle cx="60" cy="200" r="5" fill="#f56565" opacity="0.4" />
          <circle cx="350" cy="220" r="4" fill="#e53e3e" opacity="0.4" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { House, ArrowLeft, Message } from '@element-plus/icons-vue'

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

const contactAdmin = () => {
  ElMessage.info('请通过邮箱 admin@yunzai.com 联系管理员')
}
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
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
  color: var(--danger-color);
  line-height: 1;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
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