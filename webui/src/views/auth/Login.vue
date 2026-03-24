<template>
  <div class="login-form">
    <h2 class="form-title">登录</h2>
    <el-form
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      class="login-form-content"
      @submit.prevent="handleLogin"
    >
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          placeholder="请输入用户名或邮箱"
          size="large"
          prefix-icon="User"
          clearable
        />
      </el-form-item>
      
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          prefix-icon="Lock"
          show-password
          clearable
          @keyup.enter="handleLogin"
        />
      </el-form-item>
      
      <el-form-item>
        <div class="form-options">
          <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          <router-link to="/forgot-password" class="forgot-link">
            忘记密码？
          </router-link>
        </div>
      </el-form-item>
      
      <el-form-item>
        <div class="login-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>登录成功后48小时内无需重复登录</span>
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
          登录
        </el-button>
      </el-form-item>
      
      <div class="form-footer">
        <span>还没有账号？</span>
        <router-link to="/register" class="register-link">
          立即注册
        </router-link>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 128, message: '密码长度在 6 到 128 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    // 调用真实登录API
    const success = await userStore.loginWithCredentials({
      username: loginForm.username,
      password: loginForm.password,
      remember: loginForm.remember
    })
    
    if (success) {
      router.push('/')
    }
  } catch (error) {
    console.error('Login error:', error)
    ElMessage.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-form {
  width: 100%;
  max-width: 400px;
}

.form-title {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.login-form-content {
  .el-form-item {
    margin-bottom: 1.5rem;
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-tip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  background: var(--bg-secondary);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border-left: 3px solid var(--primary-color);
  
  .el-icon {
    color: var(--primary-color);
    font-size: 1rem;
  }
}

.forgot-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.875rem;
  
  &:hover {
    text-decoration: underline;
  }
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 1rem;
  font-weight: 500;
}

.form-footer {
  text-align: center;
  margin-top: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.register-link {
  color: var(--primary-color);
  text-decoration: none;
  margin-left: 0.5rem;
  
  &:hover {
    text-decoration: underline;
  }
}
</style>