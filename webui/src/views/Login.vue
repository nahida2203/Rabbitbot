<template>
  <div class="login-container">
    
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>
    
    
    <div class="login-form-container">
      <div class="login-header">
        <div class="logo">
          <img src="/logo.svg" alt="Yunzai" class="logo-image" />
          <h1 class="logo-text">Yunzai 4.1</h1>
        </div>
        <p class="subtitle">高阶 WebUI 管理面板</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名 / 邮箱"
            prefix-icon="User"
            clearable
            :disabled="loading"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
            clearable
            :disabled="loading"
          />
        </el-form-item>
        
        
        <el-form-item v-if="showCaptcha" prop="captcha">
          <div class="captcha-container">
            <el-input
              v-model="loginForm.captcha"
              placeholder="验证码"
              prefix-icon="Picture"
              clearable
              :disabled="loading"
              class="captcha-input"
            />
            <div class="captcha-image" @click="refreshCaptcha">
              <img v-if="captchaImage" :src="captchaImage" alt="验证码" />
              <el-icon v-else class="loading-icon"><Loading /></el-icon>
            </div>
          </div>
        </el-form-item>
        
        
        <el-form-item>
          <div class="form-options">
            <el-checkbox v-model="loginForm.remember" :disabled="loading">
              记住登录
            </el-checkbox>
            <el-link 
              type="primary" 
              :underline="false" 
              @click="$router.push('/forgot-password')"
            >
              忘记密码？
            </el-link>
          </div>
        </el-form-item>
        
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
        
        
        <div class="register-link">
          <span>还没有账号？</span>
          <el-link 
            type="primary" 
            :underline="false" 
            @click="$router.push('/register')"
          >
            立即注册
          </el-link>
        </div>
      </el-form>
      
      
      <div class="other-login">
        <el-divider>其他登录方式</el-divider>
        <div class="social-login">
          <el-button 
            circle 
            size="large" 
            class="social-button github"
            @click="handleSocialLogin('github')"
          >
            <svg class="social-icon" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </el-button>
          
          <el-button 
            circle 
            size="large" 
            class="social-button google"
            @click="handleSocialLogin('google')"
          >
            <svg class="social-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </el-button>
          
          <el-button 
            circle 
            size="large" 
            class="social-button qq"
            @click="handleSocialLogin('qq')"
          >
            <svg class="social-icon" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v-.07zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#12B7F5"/>
            </svg>
          </el-button>
        </div>
      </div>
    </div>
    
    
    <div class="version-info">
      <span>Version {{ version }}</span>
      <span>© 2024 Yunzai Team</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElLoading } from 'element-plus'
import { User, Lock, Picture, Loading } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { retryLogin, handleLoginTimeout } from '@/utils/auth'
import api from '@/api'
import type { LoginRequest } from '@/types'

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

// 表单引用
const loginFormRef = ref<FormInstance>()

// 响应式数据
const loading = ref(false)
const showCaptcha = ref(false)
const captchaImage = ref('')
const captchaId = ref('')
const version = ref('4.1.0')

// 登录表单
const loginForm = reactive<LoginRequest>({
  username: '',
  password: '',
  remember: false,
  captcha: ''
})

// 表单验证规则
const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度在 6 到 50 个字符', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码长度为 4 位', trigger: 'blur' }
  ]
}

// 获取验证码
async function getCaptcha() {
  try {
    const res = await api.auth.getCaptcha()
    captchaImage.value = res.data.data.image
    captchaId.value = res.data.data.id
    showCaptcha.value = true
  } catch (error) {
    console.error('获取验证码失败:', error)
  }
}

// 刷新验证码
function refreshCaptcha() {
  getCaptcha()
  loginForm.captcha = ''
}

// 登录API调用函数
async function performLogin(loginData: any): Promise<any> {
  console.log('🚀 准备发送登录请求:', loginData)
  const res = await api.auth.login(loginData)
  
  console.log('登录响应数据:', res)
  
  // 检查响应格式
  if (res.data && res.data.success && res.data.data) {
    const { token, refreshToken, user, expiresIn } = res.data.data
    
    // 验证必要字段
    if (!token || !user) {
      throw new Error('登录响应数据不完整')
    }
    
    return { token, refreshToken, user, expiresIn }
  } else {
    throw new Error('登录响应格式错误')
  }
}

// 处理登录
async function handleLogin() {
  if (!loginFormRef.value) return
  
  try {
    // 表单验证
    await loginFormRef.value.validate()
    
    loading.value = true
    appStore.setLoading(true)
    
    console.log('🔐 开始登录处理流程')
    console.log('🔐 当前登录状态:', userStore.isLoggedIn)
    console.log('🔐 当前路由:', router.currentRoute.value.path)
    
    // 使用 userStore 的 loginWithCredentials 方法
    const success = await userStore.loginWithCredentials({
      username: loginForm.username,
      password: loginForm.password,
      remember: loginForm.remember
    })
    
    console.log('🔐 登录结果:', success)
    console.log('🔐 登录后状态:', userStore.isLoggedIn)
    console.log('🔐 用户信息:', userStore.userInfo)
    console.log('🔐 用户角色:', userStore.roles)
    
    if (success) {
      console.log('🔐 登录成功，准备跳转')
      ElMessage.success('登录成功')
      
      // 跳转到首页或之前访问的页面
      const redirect = router.currentRoute.value.query.redirect as string
      const targetPath = redirect || '/dashboard'
      console.log('🔐 跳转目标:', targetPath)
      
      // 多重跳转策略，确保一定能跳转成功
      let redirectSuccess = false
      
      // 策略1: 等待状态更新后使用 router.replace
      try {
        await nextTick()
        console.log('🔐 nextTick后登录状态:', userStore.isLoggedIn)
        
        await router.replace(targetPath)
        console.log('🔐 router.replace 跳转完成')
        redirectSuccess = true
      } catch (routerError) {
        console.warn('🔐 router.replace 跳转失败:', routerError)
      }
      
      // 策略2: 如果 router.replace 失败，尝试 router.push
      if (!redirectSuccess) {
        try {
          await router.push(targetPath)
          console.log('🔐 router.push 跳转完成')
          redirectSuccess = true
        } catch (routerError) {
          console.warn('🔐 router.push 跳转失败:', routerError)
        }
      }
      
      // 策略3: 延迟后再次尝试路由跳转
      if (!redirectSuccess) {
        console.log('🔐 延迟500ms后再次尝试路由跳转')
        setTimeout(async () => {
          try {
            await router.replace(targetPath)
            console.log('🔐 延迟 router.replace 跳转完成')
            redirectSuccess = true
          } catch (error) {
            console.warn('🔐 延迟路由跳转也失败:', error)
            // 策略4: 最终使用原生JavaScript强制跳转
            console.log('🔐 使用原生JavaScript强制跳转')
            window.location.href = targetPath
          }
        }, 500)
      }
      
      // 策略5: 如果所有路由跳转都失败，1秒后强制刷新到目标页面
      if (!redirectSuccess) {
        console.log('🔐 所有路由跳转失败，1秒后强制跳转')
        setTimeout(() => {
          console.log('🔐 执行强制页面跳转')
          window.location.href = targetPath
        }, 1000)
      }
      
    } else {
      console.error('🔐 登录失败')
    }
    
  } catch (error: any) {
    console.error('🔐 登录处理失败:', error)
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
    appStore.setLoading(false)
  }
}

// 处理社交登录
function handleSocialLogin(provider: string) {
  ElMessage.info(`${provider} 登录功能开发中...`)
  // TODO: 实现社交登录
}

// 检查是否需要验证码
function checkCaptchaRequired() {
  // 如果之前登录失败次数过多，显示验证码
  const failedAttempts = localStorage.getItem('login_failed_attempts')
  if (failedAttempts && parseInt(failedAttempts) >= 3) {
    getCaptcha()
  }
}

// 自动填充演示账号（开发环境）
function fillDemoAccount() {
  if (import.meta.env.DEV) {
    loginForm.username = 'admin'
    loginForm.password = 'admin123'
  }
}

// 页面加载完成
onMounted(() => {
  // 检查是否已登录
  if (userStore.isLoggedIn) {
    router.push('/dashboard')
    return
  }
  
  // 检查是否需要验证码
  checkCaptchaRequired()
  
  // 开发环境自动填充演示账号
  if (import.meta.env.DEV) {
    setTimeout(fillDemoAccount, 500)
  }
  
  // 设置页面标题
  document.title = 'Yunzai 4.1 - 登录'
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.circle-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 10%;
  animation-delay: 2s;
}

.circle-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.login-form-container {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.logo-image {
  width: 48px;
  height: 48px;
  margin-right: 12px;
}

.logo-text {
  font-size: 32px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.subtitle {
  color: var(--el-text-color-regular);
  font-size: 16px;
  margin: 0;
}

.login-form {
  margin-bottom: 24px;
}

.login-form .el-form-item {
  margin-bottom: 24px;
}

.captcha-container {
  display: flex;
  gap: 12px;
}

.captcha-input {
  flex: 1;
}

.captcha-image {
  width: 100px;
  height: 40px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  transition: all 0.3s;
}

.captcha-image:hover {
  border-color: var(--el-color-primary);
}

.captcha-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 3px;
}

.loading-icon {
  font-size: 16px;
  color: var(--el-text-color-placeholder);
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.register-link {
  text-align: center;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.register-link .el-link {
  margin-left: 8px;
  font-weight: 500;
}

.other-login {
  margin-top: 32px;
}

.other-login .el-divider {
  margin: 24px 0;
}

.social-login {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.social-button {
  width: 48px;
  height: 48px;
  border: none;
  transition: all 0.3s;
}

.social-button:hover {
  transform: translateY(-2px);
}

.social-button.github {
  background: #24292e;
  color: white;
}

.social-button.github:hover {
  background: #1a1e22;
  box-shadow: 0 8px 25px rgba(36, 41, 46, 0.3);
}

.social-button.google {
  background: white;
  border: 1px solid #dadce0;
}

.social-button.google:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.social-button.qq {
  background: #12b7f5;
  color: white;
}

.social-button.qq:hover {
  background: #0ea5e9;
  box-shadow: 0 8px 25px rgba(18, 183, 245, 0.3);
}

.social-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.version-info {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  z-index: 1;
}


@media (max-width: 768px) {
  .login-form-container {
    margin: 20px;
    padding: 30px 24px;
    max-width: none;
  }
  
  .logo-text {
    font-size: 28px;
  }
  
  .subtitle {
    font-size: 14px;
  }
  
  .login-button {
    height: 44px;
    font-size: 15px;
  }
  
  .social-button {
    width: 44px;
    height: 44px;
  }
  
  .social-icon {
    width: 18px;
    height: 18px;
  }
  
  .version-info {
    bottom: 10px;
    flex-direction: column;
    text-align: center;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .login-form-container {
    margin: 12px;
    padding: 24px 20px;
  }
  
  .captcha-container {
    flex-direction: column;
  }
  
  .captcha-image {
    width: 100%;
    height: 48px;
  }
  
  .social-login {
    gap: 12px;
  }
}

n.dark .login-form-container {
  background: rgba(0, 0, 0, 0.8);
  color: var(--el-text-color-primary);
}

.dark .subtitle {
  color: var(--el-text-color-regular);
}

.dark .captcha-image {
  background: var(--el-fill-color-dark);
  border-color: var(--el-border-color);
}

.dark .social-button.google {
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
  color: var(--el-text-color-primary);
}
</style>