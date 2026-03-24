<template>
  <div class="settings-container">
    
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">系统设置</h1>
        <p class="page-description">配置系统参数和个人偏好</p>
      </div>
      <div class="header-right">
        <el-button @click="resetAllSettings">
          <el-icon><RefreshLeft /></el-icon>
          重置所有设置
        </el-button>
        <el-button type="primary" @click="saveAllSettings" :loading="saving">
          <el-icon><Check /></el-icon>
          {{ saving ? '保存中...' : '保存设置' }}
        </el-button>
      </div>
    </div>
    
    <div class="settings-content">
      
      <div class="settings-nav">
        <el-menu
          :default-active="activeTab"
          mode="vertical"
          @select="handleTabChange"
          class="nav-menu"
        >
          <el-menu-item index="general">
            <el-icon><Setting /></el-icon>
            <span>常规设置</span>
          </el-menu-item>
          <el-menu-item index="appearance">
            <el-icon><Brush /></el-icon>
            <span>外观设置</span>
          </el-menu-item>
          <el-menu-item index="notification">
            <el-icon><Bell /></el-icon>
            <span>通知设置</span>
          </el-menu-item>
          <el-menu-item index="security">
            <el-icon><Lock /></el-icon>
            <span>安全设置</span>
          </el-menu-item>
          <el-menu-item index="system">
            <el-icon><Monitor /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
          <el-menu-item index="advanced">
            <el-icon><Tools /></el-icon>
            <span>高级设置</span>
          </el-menu-item>
        </el-menu>
      </div>
      
      
      <div class="settings-panel">
        
        <div v-show="activeTab === 'general'" class="setting-section">
          <h2 class="section-title">常规设置</h2>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>基本信息</span>
              </div>
            </template>
            
            <el-form :model="settings.general" label-width="120px">
              <el-form-item label="系统名称">
                <el-input
                  v-model="settings.general.systemName"
                  placeholder="请输入系统名称"
                  maxlength="50"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="系统描述">
                <el-input
                  v-model="settings.general.systemDescription"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入系统描述"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="默认语言">
                <el-select v-model="settings.general.defaultLanguage" placeholder="请选择默认语言">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="繁体中文" value="zh-TW" />
                  <el-option label="English" value="en-US" />
                  <el-option label="日本語" value="ja-JP" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="时区">
                <el-select v-model="settings.general.timezone" placeholder="请选择时区" filterable>
                  <el-option
                    v-for="tz in timezones"
                    :key="tz.value"
                    :label="tz.label"
                    :value="tz.value"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item label="自动保存">
                <el-switch
                  v-model="settings.general.autoSave"
                  active-text="开启"
                  inactive-text="关闭"
                />
                <div class="setting-description">
                  开启后将自动保存用户操作和配置更改
                </div>
              </el-form-item>
            </el-form>
          </el-card>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>功能设置</span>
              </div>
            </template>
            
            <el-form :model="settings.general" label-width="120px">
              <el-form-item label="启用插件市场">
                <el-switch
                  v-model="settings.general.enablePluginMarket"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="启用AI助手">
                <el-switch
                  v-model="settings.general.enableAI"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="启用统计分析">
                <el-switch
                  v-model="settings.general.enableAnalytics"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="启用调试模式">
                <el-switch
                  v-model="settings.general.debugMode"
                  active-text="开启"
                  inactive-text="关闭"
                />
                <div class="setting-description">
                  开启后将显示详细的调试信息和日志
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
        
        
        <div v-show="activeTab === 'appearance'" class="setting-section">
          <h2 class="section-title">外观设置</h2>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>主题设置</span>
              </div>
            </template>
            
            <el-form :model="settings.appearance" label-width="120px">
              <el-form-item label="主题模式">
                <el-radio-group v-model="settings.appearance.theme">
                  <el-radio label="light">浅色主题</el-radio>
                  <el-radio label="dark">深色主题</el-radio>
                  <el-radio label="auto">跟随系统</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="主题色">
                <div class="color-picker-group">
                  <el-color-picker
                    v-model="settings.appearance.primaryColor"
                    show-alpha
                    :predefine="predefineColors"
                  />
                  <el-button size="small" @click="resetPrimaryColor">重置</el-button>
                </div>
              </el-form-item>
              
              <el-form-item label="字体大小">
                <el-slider
                  v-model="settings.appearance.fontSize"
                  :min="12"
                  :max="18"
                  :step="1"
                  show-stops
                  show-tooltip
                  :format-tooltip="(val) => val + 'px'"
                />
              </el-form-item>
              
              <el-form-item label="圆角大小">
                <el-slider
                  v-model="settings.appearance.borderRadius"
                  :min="0"
                  :max="12"
                  :step="1"
                  show-stops
                  show-tooltip
                  :format-tooltip="(val) => val + 'px'"
                />
              </el-form-item>
            </el-form>
          </el-card>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>布局设置</span>
              </div>
            </template>
            
            <el-form :model="settings.appearance" label-width="120px">
              <el-form-item label="侧边栏宽度">
                <el-slider
                  v-model="settings.appearance.sidebarWidth"
                  :min="200"
                  :max="300"
                  :step="10"
                  show-tooltip
                  :format-tooltip="(val) => val + 'px'"
                />
              </el-form-item>
              
              <el-form-item label="固定头部">
                <el-switch
                  v-model="settings.appearance.fixedHeader"
                  active-text="固定"
                  inactive-text="滚动"
                />
              </el-form-item>
              
              <el-form-item label="显示面包屑">
                <el-switch
                  v-model="settings.appearance.showBreadcrumb"
                  active-text="显示"
                  inactive-text="隐藏"
                />
              </el-form-item>
              
              <el-form-item label="显示标签页">
                <el-switch
                  v-model="settings.appearance.showTabs"
                  active-text="显示"
                  inactive-text="隐藏"
                />
              </el-form-item>
            </el-form>
          </el-card>
        </div>
        
        
        <div v-show="activeTab === 'notification'" class="setting-section">
          <h2 class="section-title">通知设置</h2>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>桌面通知</span>
              </div>
            </template>
            
            <el-form :model="settings.notification" label-width="120px">
              <el-form-item label="启用桌面通知">
                <el-switch
                  v-model="settings.notification.desktop"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="系统消息">
                <el-switch
                  v-model="settings.notification.system"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="插件通知">
                <el-switch
                  v-model="settings.notification.plugin"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="错误通知">
                <el-switch
                  v-model="settings.notification.error"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
            </el-form>
          </el-card>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>邮件通知</span>
              </div>
            </template>
            
            <el-form :model="settings.notification" label-width="120px">
              <el-form-item label="启用邮件通知">
                <el-switch
                  v-model="settings.notification.email.enabled"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="SMTP服务器" v-if="settings.notification.email.enabled">
                <el-input
                  v-model="settings.notification.email.smtp.host"
                  placeholder="请输入SMTP服务器地址"
                />
              </el-form-item>
              
              <el-form-item label="SMTP端口" v-if="settings.notification.email.enabled">
                <el-input-number
                  v-model="settings.notification.email.smtp.port"
                  :min="1"
                  :max="65535"
                  placeholder="请输入端口号"
                />
              </el-form-item>
              
              <el-form-item label="发件人邮箱" v-if="settings.notification.email.enabled">
                <el-input
                  v-model="settings.notification.email.smtp.user"
                  placeholder="请输入发件人邮箱"
                  type="email"
                />
              </el-form-item>
              
              <el-form-item label="邮箱密码" v-if="settings.notification.email.enabled">
                <el-input
                  v-model="settings.notification.email.smtp.password"
                  placeholder="请输入邮箱密码或授权码"
                  type="password"
                  show-password
                />
              </el-form-item>
              
              <el-form-item v-if="settings.notification.email.enabled">
                <el-button @click="testEmailSettings" :loading="testingEmail">
                  {{ testingEmail ? '测试中...' : '测试邮件设置' }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
        
        
        <div v-show="activeTab === 'security'" class="setting-section">
          <h2 class="section-title">安全设置</h2>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>登录安全</span>
              </div>
            </template>
            
            <el-form :model="settings.security" label-width="120px">
              <el-form-item label="会话超时">
                <el-input-number
                  v-model="settings.security.sessionTimeout"
                  :min="5"
                  :max="1440"
                  :step="5"
                  placeholder="分钟"
                />
                <span class="input-suffix">分钟</span>
              </el-form-item>
              
              <el-form-item label="最大登录尝试">
                <el-input-number
                  v-model="settings.security.maxLoginAttempts"
                  :min="3"
                  :max="10"
                  :step="1"
                />
              </el-form-item>
              
              <el-form-item label="锁定时间">
                <el-input-number
                  v-model="settings.security.lockoutDuration"
                  :min="5"
                  :max="60"
                  :step="5"
                  placeholder="分钟"
                />
                <span class="input-suffix">分钟</span>
              </el-form-item>
              
              <el-form-item label="强制HTTPS">
                <el-switch
                  v-model="settings.security.forceHttps"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="启用验证码">
                <el-switch
                  v-model="settings.security.enableCaptcha"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
            </el-form>
          </el-card>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>密码策略</span>
              </div>
            </template>
            
            <el-form :model="settings.security.password" label-width="120px">
              <el-form-item label="最小长度">
                <el-input-number
                  v-model="settings.security.password.minLength"
                  :min="6"
                  :max="20"
                  :step="1"
                />
              </el-form-item>
              
              <el-form-item label="要求大写字母">
                <el-switch
                  v-model="settings.security.password.requireUppercase"
                  active-text="要求"
                  inactive-text="不要求"
                />
              </el-form-item>
              
              <el-form-item label="要求小写字母">
                <el-switch
                  v-model="settings.security.password.requireLowercase"
                  active-text="要求"
                  inactive-text="不要求"
                />
              </el-form-item>
              
              <el-form-item label="要求数字">
                <el-switch
                  v-model="settings.security.password.requireNumbers"
                  active-text="要求"
                  inactive-text="不要求"
                />
              </el-form-item>
              
              <el-form-item label="要求特殊字符">
                <el-switch
                  v-model="settings.security.password.requireSpecialChars"
                  active-text="要求"
                  inactive-text="不要求"
                />
              </el-form-item>
              
              <el-form-item label="密码有效期">
                <el-input-number
                  v-model="settings.security.password.expiryDays"
                  :min="0"
                  :max="365"
                  :step="1"
                  placeholder="天数，0表示永不过期"
                />
                <span class="input-suffix">天</span>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
        
        
        <div v-show="activeTab === 'system'" class="setting-section">
          <h2 class="section-title">系统设置</h2>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>性能设置</span>
              </div>
            </template>
            
            <el-form :model="settings.system" label-width="120px">
              <el-form-item label="最大并发连接">
                <el-input-number
                  v-model="settings.system.maxConnections"
                  :min="10"
                  :max="1000"
                  :step="10"
                />
              </el-form-item>
              
              <el-form-item label="请求超时">
                <el-input-number
                  v-model="settings.system.requestTimeout"
                  :min="5"
                  :max="300"
                  :step="5"
                />
                <span class="input-suffix">秒</span>
              </el-form-item>
              
              <el-form-item label="缓存大小">
                <el-input-number
                  v-model="settings.system.cacheSize"
                  :min="10"
                  :max="1000"
                  :step="10"
                />
                <span class="input-suffix">MB</span>
              </el-form-item>
              
              <el-form-item label="日志保留天数">
                <el-input-number
                  v-model="settings.system.logRetentionDays"
                  :min="1"
                  :max="365"
                  :step="1"
                />
                <span class="input-suffix">天</span>
              </el-form-item>
            </el-form>
          </el-card>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>备份设置</span>
              </div>
            </template>
            
            <el-form :model="settings.system.backup" label-width="120px">
              <el-form-item label="自动备份">
                <el-switch
                  v-model="settings.system.backup.enabled"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="备份频率" v-if="settings.system.backup.enabled">
                <el-select v-model="settings.system.backup.frequency" placeholder="请选择备份频率">
                  <el-option label="每小时" value="hourly" />
                  <el-option label="每天" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="每月" value="monthly" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="保留备份数" v-if="settings.system.backup.enabled">
                <el-input-number
                  v-model="settings.system.backup.retention"
                  :min="1"
                  :max="100"
                  :step="1"
                />
              </el-form-item>
              
              <el-form-item label="备份路径" v-if="settings.system.backup.enabled">
                <el-input
                  v-model="settings.system.backup.path"
                  placeholder="请输入备份存储路径"
                />
              </el-form-item>
            </el-form>
          </el-card>
        </div>
        
        
        <div v-show="activeTab === 'advanced'" class="setting-section">
          <h2 class="section-title">高级设置</h2>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>开发者选项</span>
              </div>
            </template>
            
            <el-form :model="settings.advanced" label-width="120px">
              <el-form-item label="API调试模式">
                <el-switch
                  v-model="settings.advanced.apiDebug"
                  active-text="开启"
                  inactive-text="关闭"
                />
                <div class="setting-description">
                  开启后将在控制台显示所有API请求和响应
                </div>
              </el-form-item>
              
              <el-form-item label="性能监控">
                <el-switch
                  v-model="settings.advanced.performanceMonitor"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="错误上报">
                <el-switch
                  v-model="settings.advanced.errorReporting"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="实验性功能">
                <el-switch
                  v-model="settings.advanced.experimentalFeatures"
                  active-text="开启"
                  inactive-text="关闭"
                />
                <div class="setting-description">
                  开启后可以使用实验性功能，可能不稳定
                </div>
              </el-form-item>
            </el-form>
          </el-card>
          
          <el-card class="setting-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>数据管理</span>
              </div>
            </template>
            
            <div class="data-management">
              <div class="management-item">
                <div class="item-info">
                  <h4>导出设置</h4>
                  <p>导出当前所有设置配置</p>
                </div>
                <el-button @click="exportSettings" :loading="exporting">
                  {{ exporting ? '导出中...' : '导出设置' }}
                </el-button>
              </div>
              
              <div class="management-item">
                <div class="item-info">
                  <h4>导入设置</h4>
                  <p>从文件导入设置配置</p>
                </div>
                <el-upload
                  :action="''"
                  :before-upload="importSettings"
                  :show-file-list="false"
                  accept=".json"
                >
                  <el-button>选择文件</el-button>
                </el-upload>
              </div>
              
              <div class="management-item">
                <div class="item-info">
                  <h4>重置设置</h4>
                  <p>将所有设置恢复为默认值</p>
                </div>
                <el-button type="danger" @click="confirmResetSettings">
                  重置设置
                </el-button>
              </div>
              
              <div class="management-item">
                <div class="item-info">
                  <h4>清除缓存</h4>
                  <p>清除所有缓存数据</p>
                </div>
                <el-button @click="clearCache" :loading="clearingCache">
                  {{ clearingCache ? '清除中...' : '清除缓存' }}
                </el-button>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  Brush,
  Bell,
  Lock,
  Monitor,
  Tools,
  RefreshLeft,
  Check
} from '@element-plus/icons-vue'
import api from '@/api'
import { downloadFile } from '@/utils'
import type { AppSettings } from '@/types'

// 响应式数据
const activeTab = ref('general')
const saving = ref(false)
const testingEmail = ref(false)
const exporting = ref(false)
const clearingCache = ref(false)

// 预定义颜色
const predefineColors = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#c71585',
  '#ff8c00',
  '#ffd700',
  '#90ee90',
  '#00ced1',
  '#1e90ff',
  '#c71585'
]

// 时区列表
const timezones = [
  { label: 'UTC+8 北京时间', value: 'Asia/Shanghai' },
  { label: 'UTC+9 东京时间', value: 'Asia/Tokyo' },
  { label: 'UTC+0 格林威治时间', value: 'UTC' },
  { label: 'UTC-5 纽约时间', value: 'America/New_York' },
  { label: 'UTC-8 洛杉矶时间', value: 'America/Los_Angeles' },
  { label: 'UTC+1 柏林时间', value: 'Europe/Berlin' },
  { label: 'UTC+3 莫斯科时间', value: 'Europe/Moscow' }
]

// 设置数据
const settings = reactive<AppSettings>({
  general: {
    systemName: 'Yunzai WebUI',
    systemDescription: 'Yunzai Bot 管理面板',
    defaultLanguage: 'zh-CN',
    timezone: 'Asia/Shanghai',
    autoSave: true,
    enablePluginMarket: true,
    enableAI: true,
    enableAnalytics: true,
    debugMode: false
  },
  appearance: {
    theme: 'light',
    primaryColor: '#409EFF',
    fontSize: 14,
    borderRadius: 4,
    sidebarWidth: 240,
    fixedHeader: true,
    showBreadcrumb: true,
    showTabs: true
  },
  notification: {
    desktop: true,
    system: true,
    plugin: true,
    error: true,
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        user: '',
        password: ''
      }
    }
  },
  security: {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    forceHttps: false,
    enableCaptcha: true,
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      expiryDays: 0
    }
  },
  system: {
    maxConnections: 100,
    requestTimeout: 30,
    cacheSize: 100,
    logRetentionDays: 30,
    backup: {
      enabled: false,
      frequency: 'daily',
      retention: 7,
      path: '/backup'
    }
  },
  advanced: {
    apiDebug: false,
    performanceMonitor: false,
    errorReporting: true,
    experimentalFeatures: false
  }
})

// 切换标签页
function handleTabChange(key: string) {
  activeTab.value = key
}

// 重置主题色
function resetPrimaryColor() {
  settings.appearance.primaryColor = '#409EFF'
}

// 测试邮件设置
async function testEmailSettings() {
  testingEmail.value = true
  try {
    await api.system.testEmailSettings(settings.notification.email.smtp)
    ElMessage.success('邮件设置测试成功')
  } catch (error) {
    console.error('邮件设置测试失败:', error)
    ElMessage.error('邮件设置测试失败')
  } finally {
    testingEmail.value = false
  }
}

// 保存所有设置
async function saveAllSettings() {
  saving.value = true
  try {
    await api.system.updateSettings(settings)
    ElMessage.success('设置保存成功')
    
    // 应用主题设置
    applyThemeSettings()
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败')
  } finally {
    saving.value = false
  }
}

// 重置所有设置
async function resetAllSettings() {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有设置吗？此操作不可恢复。',
      '重置设置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await loadDefaultSettings()
    ElMessage.success('设置已重置')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置设置失败:', error)
      ElMessage.error('重置设置失败')
    }
  }
}

// 导出设置
async function exportSettings() {
  exporting.value = true
  try {
    const data = JSON.stringify(settings, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const filename = `yunzai-settings-${new Date().toISOString().split('T')[0]}.json`
    downloadFile(blob, filename)
    ElMessage.success('设置导出成功')
  } catch (error) {
    console.error('导出设置失败:', error)
    ElMessage.error('导出设置失败')
  } finally {
    exporting.value = false
  }
}

// 导入设置
function importSettings(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedSettings = JSON.parse(e.target?.result as string)
      Object.assign(settings, importedSettings)
      ElMessage.success('设置导入成功')
    } catch (error) {
      console.error('导入设置失败:', error)
      ElMessage.error('设置文件格式错误')
    }
  }
  reader.readAsText(file)
  return false // 阻止自动上传
}

// 确认重置设置
async function confirmResetSettings() {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有设置为默认值吗？此操作不可恢复。',
      '重置设置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await loadDefaultSettings()
    await saveAllSettings()
    ElMessage.success('设置已重置为默认值')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置设置失败:', error)
      ElMessage.error('重置设置失败')
    }
  }
}

// 清除缓存
async function clearCache() {
  clearingCache.value = true
  try {
    await api.system.clearCache()
    ElMessage.success('缓存清除成功')
  } catch (error) {
    console.error('清除缓存失败:', error)
    ElMessage.error('清除缓存失败')
  } finally {
    clearingCache.value = false
  }
}

// 加载设置
async function loadSettings() {
  try {
    const res = await api.system.getSettings()
    Object.assign(settings, res.data.data)
    applyThemeSettings()
  } catch (error) {
    console.error('加载设置失败:', error)
    ElMessage.error('加载设置失败')
  }
}

// 加载默认设置
async function loadDefaultSettings() {
  try {
    const res = await api.system.getDefaultSettings()
    Object.assign(settings, res.data.data)
  } catch (error) {
    console.error('加载默认设置失败:', error)
    ElMessage.error('加载默认设置失败')
  }
}

// 应用主题设置
function applyThemeSettings() {
  const { theme, primaryColor, fontSize, borderRadius } = settings.appearance
  
  // 设置主题
  document.documentElement.setAttribute('data-theme', theme)
  
  // 设置主题色
  document.documentElement.style.setProperty('--el-color-primary', primaryColor)
  
  // 设置字体大小
  document.documentElement.style.setProperty('--el-font-size-base', fontSize + 'px')
  
  // 设置圆角
  document.documentElement.style.setProperty('--el-border-radius-base', borderRadius + 'px')
}

// 监听主题变化
watch(
  () => settings.appearance,
  () => {
    applyThemeSettings()
  },
  { deep: true }
)

// 页面加载
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-container {
  padding: 20px;
  background: var(--el-bg-color-page);
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.page-description {
  color: var(--el-text-color-regular);
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.settings-content {
  display: flex;
  gap: 20px;
}

.settings-nav {
  width: 200px;
  flex-shrink: 0;
}

.nav-menu {
  border: none;
  background: var(--el-bg-color);
  border-radius: 8px;
}

.settings-panel {
  flex: 1;
  min-width: 0;
}

.setting-section {
  max-width: 800px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 20px 0;
}

.setting-card {
  margin-bottom: 20px;
  border: none;
  border-radius: 8px;
}

.card-header {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.setting-description {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
  line-height: 1.4;
}

.color-picker-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-suffix {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.data-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.management-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.item-info {
  flex: 1;
}

.item-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.item-info p {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

@media (max-width: 768px) {
  .settings-container {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-end;
  }
  
  .settings-content {
    flex-direction: column;
  }
  
  .settings-nav {
    width: 100%;
  }
  
  .nav-menu {
    display: flex;
    overflow-x: auto;
  }
  
  .nav-menu .el-menu-item {
    flex-shrink: 0;
  }
  
  .management-item {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .item-info {
    text-align: center;
  }
}
</style>