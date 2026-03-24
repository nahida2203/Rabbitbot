<template>
  <div class="register-form">
    <h2 class="form-title">注册</h2>
    <el-form
      ref="registerFormRef"
      :model="registerForm"
      :rules="registerRules"
      class="register-form-content"
      @submit.prevent="handleRegister"
    >
      <el-form-item prop="username">
        <el-input
          v-model="registerForm.username"
          placeholder="请输入用户名"
          size="large"
          prefix-icon="User"
          clearable
        />
      </el-form-item>
      
      <el-form-item prop="email">
        <el-input
          v-model="registerForm.email"
          type="email"
          placeholder="请输入邮箱"
          size="large"
          prefix-icon="Message"
          clearable
        />
      </el-form-item>
      
      <el-form-item prop="password">
        <el-input
          v-model="registerForm.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          prefix-icon="Lock"
          show-password
          clearable
        />
      </el-form-item>
      
      <el-form-item prop="confirmPassword">
        <el-input
          v-model="registerForm.confirmPassword"
          type="password"
          placeholder="请确认密码"
          size="large"
          prefix-icon="Lock"
          show-password
          clearable
          @keyup.enter="handleRegister"
        />
      </el-form-item>
      
      <el-form-item prop="agreement">
        <el-checkbox v-model="registerForm.agreement">
          我已阅读并同意
          <a href="#" class="agreement-link" @click.prevent="showTerms">
            《用户协议》
          </a>
          和
          <a href="#" class="agreement-link" @click.prevent="showPrivacy">
            《隐私政策》
          </a>
        </el-checkbox>
      </el-form-item>
      
      <el-form-item>
        <el-button
          type="primary"
          size="large"
          class="register-button"
          :loading="loading"
          @click="handleRegister"
        >
          注册
        </el-button>
      </el-form-item>
      
      <div class="form-footer">
        <span>已有账号？</span>
        <router-link to="/login" class="login-link">
          立即登录
        </router-link>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const registerFormRef = ref<FormInstance>()
const loading = ref(false)

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreement: false
})

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请确认密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 128, message: '密码长度在 6 到 128 个字符', trigger: 'blur' },
    { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, message: '密码必须包含大小写字母和数字', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ],
  agreement: [
    { required: true, message: '请阅读并同意用户协议和隐私政策', trigger: 'change' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  try {
    const valid = await registerFormRef.value.validate()
    if (!valid) return
    
    if (!registerForm.agreement) {
      ElMessage.warning('请先同意用户协议和隐私政策')
      return
    }
    
    loading.value = true
    
    // 调用真实注册API
    const success = await userStore.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    })
    
    if (success) {
      router.push('/login')
    }
  } catch (error) {
    console.error('Register error:', error)
    ElMessage.error('注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const showTerms = () => {
  ElMessageBox.alert(
    '这里是用户协议的内容...',
    '用户协议',
    {
      confirmButtonText: '我知道了',
      type: 'info'
    }
  )
}

const showPrivacy = () => {
  ElMessageBox.alert(
    '这里是隐私政策的内容...',
    '隐私政策',
    {
      confirmButtonText: '我知道了',
      type: 'info'
    }
  )
}
</script>

<style lang="scss" scoped>
.register-form {
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

.register-form-content {
  .el-form-item {
    margin-bottom: 1.5rem;
  }
}

.agreement-link {
  color: var(--primary-color);
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}

.register-button {
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

.login-link {
  color: var(--primary-color);
  text-decoration: none;
  margin-left: 0.5rem;
  
  &:hover {
    text-decoration: underline;
  }
}
</style>