<template>
  <div class="forgot-password-form">
    <h2 class="form-title">重置密码</h2>
    <p class="form-description">
      请输入您的邮箱地址，我们将向您发送重置密码的链接。
    </p>
    
    <el-form
      ref="forgotFormRef"
      :model="forgotForm"
      :rules="forgotRules"
      class="forgot-form-content"
      @submit.prevent="handleForgotPassword"
    >
      <el-form-item prop="email">
        <el-input
          v-model="forgotForm.email"
          type="email"
          placeholder="请输入您的邮箱地址"
          size="large"
          prefix-icon="Message"
          clearable
          @keyup.enter="handleForgotPassword"
        />
      </el-form-item>
      
      <el-form-item>
        <el-button
          type="primary"
          size="large"
          class="forgot-button"
          :loading="loading"
          @click="handleForgotPassword"
        >
          发送重置链接
        </el-button>
      </el-form-item>
    </el-form>
    
    <div class="form-footer">
      <router-link to="/login" class="back-link">
        <el-icon><ArrowLeft /></el-icon>
        返回登录
      </router-link>
    </div>
    
    
    <div v-if="emailSent" class="success-message">
      <el-result
        icon="success"
        title="邮件已发送"
        :sub-title="`重置密码的链接已发送到 ${forgotForm.email}，请查收邮件并按照指示操作。`"
      >
        <template #extra>
          <el-button type="primary" @click="resendEmail" :loading="resending">
            重新发送
          </el-button>
          <el-button @click="goToLogin">
            返回登录
          </el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

const forgotFormRef = ref<FormInstance>()
const loading = ref(false)
const emailSent = ref(false)
const resending = ref(false)

const forgotForm = reactive({
  email: ''
})

const forgotRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const handleForgotPassword = async () => {
  if (!forgotFormRef.value) return
  
  try {
    const valid = await forgotFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    // 模拟发送重置邮件请求
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 这里应该调用实际的重置密码API
    const response = await sendResetEmail(forgotForm.email)
    
    if (response.success) {
      emailSent.value = true
      ElMessage.success('重置邮件已发送')
    } else {
      ElMessage.error(response.message || '邮箱地址不存在')
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    ElMessage.error('发送失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const resendEmail = async () => {
  try {
    resending.value = true
    
    // 模拟重新发送邮件
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const response = await sendResetEmail(forgotForm.email)
    
    if (response.success) {
      ElMessage.success('重置邮件已重新发送')
    } else {
      ElMessage.error('重新发送失败，请稍后重试')
    }
  } catch (error) {
    console.error('Resend email error:', error)
    ElMessage.error('重新发送失败，请稍后重试')
  } finally {
    resending.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

// 模拟API调用
const sendResetEmail = async (email: string) => {
  // 这里应该是实际的API调用
  return {
    success: true,
    message: '重置邮件已发送'
  }
}
</script>

<style lang="scss" scoped>
.forgot-password-form {
  width: 100%;
  max-width: 400px;
}

.form-title {
  text-align: center;
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.form-description {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.forgot-form-content {
  .el-form-item {
    margin-bottom: 1.5rem;
  }
}

.forgot-button {
  width: 100%;
  height: 44px;
  font-size: 1rem;
  font-weight: 500;
}

.form-footer {
  text-align: center;
  margin-top: 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.3s;
  
  &:hover {
    color: var(--primary-color);
  }
}

.success-message {
  margin-top: 2rem;
  
  :deep(.el-result) {
    padding: 2rem 0;
  }
  
  :deep(.el-result__title) {
    margin-top: 1rem;
    font-size: 1.25rem;
  }
  
  :deep(.el-result__subtitle) {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  
  :deep(.el-result__extra) {
    margin-top: 1.5rem;
    
    .el-button {
      margin: 0 0.5rem;
    }
  }
}
</style>