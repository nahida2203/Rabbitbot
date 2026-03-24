<template>
  <div class="auth-layout">
    <div class="auth-container">
      <div class="auth-header">
        <div class="logo">
          <img src="/logo.svg" alt="Yunzai" class="logo-img" />
          <h1 class="logo-text">Yunzai WebUI</h1>
        </div>
      </div>
      <div class="auth-content">
        <router-view />
      </div>
      <div class="auth-footer">
        <p>&copy; 2025 yunzai v4. All rights reserved</p>
      </div>
    </div>
    <div class="auth-background">
      <div class="bg-pattern"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'


onMounted(() => {
  document.title = 'Yunzai WebUI - 认证'
})
</script>

<style lang="scss" scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.auth-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  z-index: 1;
  position: relative;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.logo-img {
  width: 40px;
  height: 40px;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.auth-content {
  margin-bottom: 2rem;
}

.auth-footer {
  text-align: center;
  color: #666;
  font-size: 0.875rem;
}

.auth-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@media (max-width: 768px) {
  .auth-container {
    margin: 1rem;
    padding: 1.5rem;
  }
}
</style>