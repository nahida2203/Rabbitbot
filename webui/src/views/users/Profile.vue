<template>
  <div class="user-profile">
    
    <div class="page-header">
      <h2>个人资料</h2>
      <p>管理您的个人信息和账户设置</p>
    </div>

    <el-row :gutter="20">
      
      <el-col :span="8">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <span>个人信息</span>
            </div>
          </template>
          
          <div class="profile-info">
            
            <div class="avatar-section">
              <el-avatar :size="120" :src="userInfo.avatar" class="user-avatar">
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <el-button type="primary" size="small" @click="showAvatarDialog = true" class="change-avatar-btn">
                更换头像
              </el-button>
            </div>
            
            
            <div class="basic-info">
              <div class="info-item">
                <span class="label">用户名：</span>
                <span class="value">{{ userInfo.username }}</span>
              </div>
              <div class="info-item">
                <span class="label">昵称：</span>
                <span class="value">{{ userInfo.nickname }}</span>
              </div>
              <div class="info-item">
                <span class="label">邮箱：</span>
                <span class="value">{{ userInfo.email }}</span>
              </div>
              <div class="info-item">
                <span class="label">角色：</span>
                <el-tag type="primary" size="small">{{ userInfo.role }}</el-tag>
              </div>
              <div class="info-item">
                <span class="label">注册时间：</span>
                <span class="value">{{ userInfo.createdAt }}</span>
              </div>
              <div class="info-item">
                <span class="label">最后登录：</span>
                <span class="value">{{ userInfo.lastLogin }}</span>
              </div>
            </div>
          </div>
        </el-card>
        
        
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <span>账户统计</span>
            </div>
          </template>
          
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon color="#409eff"><ChatDotRound /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ userStats.totalMessages }}</div>
                <div class="stat-label">总消息数</div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon color="#67c23a"><Calendar /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ userStats.activeDays }}</div>
                <div class="stat-label">活跃天数</div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon color="#e6a23c"><Trophy /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ userStats.level }}</div>
                <div class="stat-label">用户等级</div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon color="#f56c6c"><Star /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ userStats.points }}</div>
                <div class="stat-label">积分</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      
      <el-col :span="16">
        <el-tabs v-model="activeTab" class="profile-tabs">
          
          <el-tab-pane label="基本设置" name="basic">
            <el-card>
              <el-form :model="basicForm" :rules="basicRules" ref="basicFormRef" label-width="100px">
                <el-form-item label="昵称" prop="nickname">
                  <el-input v-model="basicForm.nickname" placeholder="请输入昵称" />
                </el-form-item>
                
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="basicForm.email" placeholder="请输入邮箱" />
                </el-form-item>
                
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="basicForm.phone" placeholder="请输入手机号" />
                </el-form-item>
                
                <el-form-item label="个人简介">
                  <el-input 
                    v-model="basicForm.bio" 
                    type="textarea" 
                    :rows="4" 
                    placeholder="请输入个人简介"
                  />
                </el-form-item>
                
                <el-form-item label="所在地区">
                  <el-cascader
                    v-model="basicForm.location"
                    :options="locationOptions"
                    placeholder="请选择所在地区"
                    style="width: 100%;"
                  />
                </el-form-item>
                
                <el-form-item label="生日">
                  <el-date-picker
                    v-model="basicForm.birthday"
                    type="date"
                    placeholder="请选择生日"
                    style="width: 100%;"
                  />
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="saveBasicInfo">保存基本信息</el-button>
                  <el-button @click="resetBasicForm">重置</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          
          <el-tab-pane label="安全设置" name="security">
            <el-card>
              <div class="security-section">
                
                <div class="section-item">
                  <h3>修改密码</h3>
                  <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="120px">
                    <el-form-item label="当前密码" prop="currentPassword">
                      <el-input 
                        v-model="passwordForm.currentPassword" 
                        type="password" 
                        placeholder="请输入当前密码"
                        show-password
                      />
                    </el-form-item>
                    
                    <el-form-item label="新密码" prop="newPassword">
                      <el-input 
                        v-model="passwordForm.newPassword" 
                        type="password" 
                        placeholder="请输入新密码"
                        show-password
                      />
                    </el-form-item>
                    
                    <el-form-item label="确认新密码" prop="confirmPassword">
                      <el-input 
                        v-model="passwordForm.confirmPassword" 
                        type="password" 
                        placeholder="请再次输入新密码"
                        show-password
                      />
                    </el-form-item>
                    
                    <el-form-item>
                      <el-button type="primary" @click="changePassword">修改密码</el-button>
                    </el-form-item>
                  </el-form>
                </div>
                
                <el-divider />
                
                
                <div class="section-item">
                  <h3>双因子认证</h3>
                  <div class="security-item">
                    <div class="item-info">
                      <div class="item-title">启用双因子认证</div>
                      <div class="item-desc">为您的账户添加额外的安全保护</div>
                    </div>
                    <div class="item-action">
                      <el-switch 
                        v-model="securitySettings.twoFactorEnabled" 
                        @change="toggleTwoFactor"
                      />
                    </div>
                  </div>
                </div>
                
                <el-divider />
                
                
                <div class="section-item">
                  <h3>登录设备</h3>
                  <div class="devices-list">
                    <div v-for="device in loginDevices" :key="device.id" class="device-item">
                      <div class="device-info">
                        <div class="device-icon">
                          <el-icon><Monitor /></el-icon>
                        </div>
                        <div class="device-details">
                          <div class="device-name">{{ device.name }}</div>
                          <div class="device-meta">
                            <span>{{ device.location }}</span>
                            <span>{{ device.lastActive }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="device-actions">
                        <el-tag v-if="device.isCurrent" type="success" size="small">当前设备</el-tag>
                        <el-button v-else type="text" size="small" @click="logoutDevice(device)">
                          注销
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-tab-pane>
          
          
          <el-tab-pane label="通知设置" name="notification">
            <el-card>
              <div class="notification-settings">
                <div class="setting-group">
                  <h3>系统通知</h3>
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">系统更新通知</div>
                      <div class="setting-desc">接收系统更新和维护通知</div>
                    </div>
                    <el-switch v-model="notificationSettings.systemUpdates" />
                  </div>
                  
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">安全警告</div>
                      <div class="setting-desc">接收账户安全相关警告</div>
                    </div>
                    <el-switch v-model="notificationSettings.securityAlerts" />
                  </div>
                </div>
                
                <el-divider />
                
                <div class="setting-group">
                  <h3>消息通知</h3>
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">新消息提醒</div>
                      <div class="setting-desc">收到新消息时显示通知</div>
                    </div>
                    <el-switch v-model="notificationSettings.newMessages" />
                  </div>
                  
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">@提及通知</div>
                      <div class="setting-desc">被@时发送通知</div>
                    </div>
                    <el-switch v-model="notificationSettings.mentions" />
                  </div>
                </div>
                
                <el-divider />
                
                <div class="setting-group">
                  <h3>邮件通知</h3>
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">每日摘要</div>
                      <div class="setting-desc">每日发送活动摘要邮件</div>
                    </div>
                    <el-switch v-model="notificationSettings.dailyDigest" />
                  </div>
                  
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">重要通知</div>
                      <div class="setting-desc">重要系统通知通过邮件发送</div>
                    </div>
                    <el-switch v-model="notificationSettings.importantNotifications" />
                  </div>
                </div>
                
                <div class="save-section">
                  <el-button type="primary" @click="saveNotificationSettings">保存通知设置</el-button>
                </div>
              </div>
            </el-card>
          </el-tab-pane>
          
          
          <el-tab-pane label="隐私设置" name="privacy">
            <el-card>
              <div class="privacy-settings">
                <div class="setting-group">
                  <h3>个人信息可见性</h3>
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">公开个人资料</div>
                      <div class="setting-desc">允许其他用户查看您的基本信息</div>
                    </div>
                    <el-switch v-model="privacySettings.publicProfile" />
                  </div>
                  
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">显示在线状态</div>
                      <div class="setting-desc">向其他用户显示您的在线状态</div>
                    </div>
                    <el-switch v-model="privacySettings.showOnlineStatus" />
                  </div>
                  
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">显示最后活动时间</div>
                      <div class="setting-desc">向其他用户显示您的最后活动时间</div>
                    </div>
                    <el-switch v-model="privacySettings.showLastActivity" />
                  </div>
                </div>
                
                <el-divider />
                
                <div class="setting-group">
                  <h3>数据控制</h3>
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">数据分析</div>
                      <div class="setting-desc">允许系统分析您的使用数据以改善服务</div>
                    </div>
                    <el-switch v-model="privacySettings.dataAnalytics" />
                  </div>
                  
                  <div class="setting-item">
                    <div class="setting-info">
                      <div class="setting-title">个性化推荐</div>
                      <div class="setting-desc">基于您的使用习惯提供个性化内容</div>
                    </div>
                    <el-switch v-model="privacySettings.personalizedRecommendations" />
                  </div>
                </div>
                
                <div class="save-section">
                  <el-button type="primary" @click="savePrivacySettings">保存隐私设置</el-button>
                  <el-button type="danger" @click="showDeleteAccountDialog">删除账户</el-button>
                </div>
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>

    
    <el-dialog v-model="showAvatarDialog" title="更换头像" width="400px">
      <div class="avatar-upload">
        <el-upload
          class="avatar-uploader"
          action="#"
          :show-file-list="false"
          :before-upload="beforeAvatarUpload"
          :on-success="handleAvatarSuccess"
        >
          <img v-if="newAvatar" :src="newAvatar" class="avatar-preview" />
          <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
        </el-upload>
        <div class="upload-tips">
          <p>支持 JPG、PNG 格式，文件大小不超过 2MB</p>
          <p>建议上传正方形图片，系统会自动裁剪</p>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAvatarDialog = false">取消</el-button>
          <el-button type="primary" @click="saveAvatar" :disabled="!newAvatar">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="showDeleteDialog" title="删除账户" width="500px">
      <div class="delete-account-warning">
        <el-alert
          title="警告：此操作不可恢复"
          type="error"
          description="删除账户将永久删除您的所有数据，包括消息记录、设置等。请谨慎操作。"
          show-icon
          :closable="false"
        />
        
        <div class="delete-confirmation">
          <p>请输入您的密码以确认删除操作：</p>
          <el-input 
            v-model="deletePassword" 
            type="password" 
            placeholder="请输入密码"
            show-password
          />
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" @click="deleteAccount" :disabled="!deletePassword">
            确认删除
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  UserFilled, ChatDotRound, Calendar, Trophy, Star, 
  Monitor, Plus 
} from '@element-plus/icons-vue'

// 用户信息
const userInfo = reactive({
  username: 'admin',
  nickname: '系统管理员',
  email: 'admin@yunzai.com',
  phone: '138****8888',
  avatar: '',
  role: '超级管理员',
  bio: '这是一个系统管理员账户，负责系统的日常维护和管理工作。',
  location: ['北京市', '朝阳区'],
  birthday: '1990-01-01',
  createdAt: '2024-01-01 00:00:00',
  lastLogin: '2024-01-15 14:30:00'
})

// 用户统计
const userStats = reactive({
  totalMessages: 1234,
  activeDays: 365,
  level: 10,
  points: 9999
})

// 当前选中的标签页
const activeTab = ref('basic')

// 对话框状态
const showAvatarDialog = ref(false)
const showDeleteDialog = ref(false)
const newAvatar = ref('')
const deletePassword = ref('')

// 基本信息表单
const basicForm = reactive({
  nickname: userInfo.nickname,
  email: userInfo.email,
  phone: userInfo.phone,
  bio: userInfo.bio,
  location: userInfo.location,
  birthday: userInfo.birthday
})

// 基本信息验证规则
const basicRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const basicFormRef = ref()

// 密码修改表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码验证规则
const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const passwordFormRef = ref()

// 安全设置
const securitySettings = reactive({
  twoFactorEnabled: false
})

// 通知设置
const notificationSettings = reactive({
  systemUpdates: true,
  securityAlerts: true,
  newMessages: true,
  mentions: true,
  dailyDigest: false,
  importantNotifications: true
})

// 隐私设置
const privacySettings = reactive({
  publicProfile: true,
  showOnlineStatus: true,
  showLastActivity: false,
  dataAnalytics: true,
  personalizedRecommendations: true
})

// 地区选项
const locationOptions = [
  {
    value: '北京市',
    label: '北京市',
    children: [
      { value: '朝阳区', label: '朝阳区' },
      { value: '海淀区', label: '海淀区' },
      { value: '西城区', label: '西城区' }
    ]
  },
  {
    value: '上海市',
    label: '上海市',
    children: [
      { value: '浦东新区', label: '浦东新区' },
      { value: '黄浦区', label: '黄浦区' },
      { value: '静安区', label: '静安区' }
    ]
  }
]

// 登录设备列表
const loginDevices = ref([
  {
    id: 1,
    name: 'Windows PC - Chrome',
    location: '北京市',
    lastActive: '当前活动',
    isCurrent: true
  },
  {
    id: 2,
    name: 'iPhone 15 Pro - Safari',
    location: '上海市',
    lastActive: '2小时前',
    isCurrent: false
  },
  {
    id: 3,
    name: 'MacBook Pro - Safari',
    location: '深圳市',
    lastActive: '1天前',
    isCurrent: false
  }
])

// 保存基本信息
const saveBasicInfo = async () => {
  try {
    await basicFormRef.value.validate()
    
    // 更新用户信息
    Object.assign(userInfo, basicForm)
    
    ElMessage.success('基本信息保存成功')
  } catch (error) {
    ElMessage.error('请检查表单输入')
  }
}

// 重置基本信息表单
const resetBasicForm = () => {
  Object.assign(basicForm, {
    nickname: userInfo.nickname,
    email: userInfo.email,
    phone: userInfo.phone,
    bio: userInfo.bio,
    location: userInfo.location,
    birthday: userInfo.birthday
  })
}

// 修改密码
const changePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    
    // 这里应该调用API修改密码
    ElMessage.success('密码修改成功')
    
    // 清空表单
    Object.assign(passwordForm, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  } catch (error) {
    ElMessage.error('请检查表单输入')
  }
}

// 切换双因子认证
const toggleTwoFactor = (enabled: boolean) => {
  if (enabled) {
    ElMessage.success('双因子认证已启用')
  } else {
    ElMessage.success('双因子认证已关闭')
  }
}

// 注销设备
const logoutDevice = async (device: any) => {
  try {
    await ElMessageBox.confirm(`确定要注销设备 "${device.name}" 吗？`, '确认注销', {
      type: 'warning'
    })
    
    const index = loginDevices.value.indexOf(device)
    if (index > -1) {
      loginDevices.value.splice(index, 1)
      ElMessage.success('设备注销成功')
    }
  } catch {
    // 用户取消
  }
}

// 保存通知设置
const saveNotificationSettings = () => {
  ElMessage.success('通知设置保存成功')
}

// 保存隐私设置
const savePrivacySettings = () => {
  ElMessage.success('隐私设置保存成功')
}

// 显示删除账户对话框
const showDeleteAccountDialog = () => {
  showDeleteDialog.value = true
  deletePassword.value = ''
}

// 删除账户
const deleteAccount = async () => {
  try {
    await ElMessageBox.confirm(
      '您确定要删除账户吗？此操作不可恢复，所有数据将被永久删除！',
      '最终确认',
      {
        type: 'error',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )
    
    // 这里应该调用API删除账户
    ElMessage.success('账户删除成功')
    showDeleteDialog.value = false
  } catch {
    // 用户取消
  }
}

// 头像上传前验证
const beforeAvatarUpload = (file: File) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('头像只能是 JPG/PNG 格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB!')
    return false
  }
  
  // 预览图片
  const reader = new FileReader()
  reader.onload = (e) => {
    newAvatar.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
  
  return false // 阻止自动上传
}

// 头像上传成功
const handleAvatarSuccess = () => {
  // 这个方法在阻止自动上传时不会被调用
}

// 保存头像
const saveAvatar = () => {
  if (newAvatar.value) {
    userInfo.avatar = newAvatar.value
    ElMessage.success('头像更新成功')
    showAvatarDialog.value = false
    newAvatar.value = ''
  }
}
</script>

<style scoped>
.user-profile {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
}

.profile-card {
  margin-bottom: 20px;
}

.card-header {
  font-weight: 600;
  color: #303133;
}

.profile-info {
  text-align: center;
}

.avatar-section {
  margin-bottom: 24px;
}

.user-avatar {
  margin-bottom: 12px;
}

.change-avatar-btn {
  display: block;
  margin: 0 auto;
}

.basic-info {
  text-align: left;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: #909399;
  font-size: 14px;
}

.value {
  color: #303133;
  font-weight: 500;
}

.stats-card {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 24px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.profile-tabs {
  background: white;
}

.security-section {
  max-height: 600px;
  overflow-y: auto;
}

.section-item {
  margin-bottom: 24px;
}

.section-item h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.item-info {
  flex: 1;
}

.item-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 14px;
  color: #909399;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-icon {
  font-size: 20px;
  color: #409eff;
}

.device-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.device-meta {
  font-size: 14px;
  color: #909399;
}

.device-meta span {
  margin-right: 12px;
}

.notification-settings,
.privacy-settings {
  max-height: 600px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 14px;
  color: #909399;
}

.save-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 12px;
}

.avatar-upload {
  text-align: center;
}

.avatar-uploader {
  display: inline-block;
  margin-bottom: 16px;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 50%;
  cursor: pointer;
  transition: border-color 0.3s;
}

.avatar-uploader-icon:hover {
  border-color: #409eff;
}

.upload-tips {
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.upload-tips p {
  margin: 4px 0;
}

.delete-account-warning {
  margin-bottom: 20px;
}

.delete-confirmation {
  margin-top: 20px;
}

.delete-confirmation p {
  margin-bottom: 12px;
  color: #303133;
  font-weight: 500;
}

@media (max-width: 768px) {
  .user-profile {
    padding: 10px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .security-item,
  .device-item,
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .save-section {
    flex-direction: column;
  }
}
</style>