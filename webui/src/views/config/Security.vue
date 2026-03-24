<template>
  <div class="security-config">
    
    <div class="page-header">
      <h2>安全配置</h2>
      <p>管理系统安全设置和权限控制</p>
    </div>

    
    <el-card class="config-section">
      <template #header>
        <span>认证设置</span>
      </template>
      <el-form :model="authConfig" label-width="120px">
        <el-form-item label="启用双因子认证">
          <el-switch v-model="authConfig.enableTwoFactor" />
          <span class="form-tip">增强账户安全性</span>
        </el-form-item>
        <el-form-item label="会话超时时间">
          <el-input-number
            v-model="authConfig.sessionTimeout"
            :min="5"
            :max="1440"
            controls-position="right"
          />
          <span class="form-tip">分钟</span>
        </el-form-item>
        <el-form-item label="最大登录尝试">
          <el-input-number
            v-model="authConfig.maxLoginAttempts"
            :min="3"
            :max="10"
            controls-position="right"
          />
          <span class="form-tip">次数</span>
        </el-form-item>
        <el-form-item label="账户锁定时间">
          <el-input-number
            v-model="authConfig.lockoutDuration"
            :min="5"
            :max="60"
            controls-position="right"
          />
          <span class="form-tip">分钟</span>
        </el-form-item>
        <el-form-item label="强制密码复杂度">
          <el-switch v-model="authConfig.enforcePasswordComplexity" />
          <span class="form-tip">要求包含大小写字母、数字和特殊字符</span>
        </el-form-item>
      </el-form>
    </el-card>

    
    <el-card class="config-section">
      <template #header>
        <div class="card-header">
          <span>访问控制</span>
          <el-button type="primary" size="small" @click="showAddIpDialog = true">
            <el-icon><Plus /></el-icon>
            添加IP规则
          </el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="IP白名单" name="whitelist">
          <el-table :data="ipWhitelist" style="width: 100%">
            <el-table-column prop="ip" label="IP地址" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="createdAt" label="创建时间" width="180" />
            <el-table-column label="操作" width="120">
              <template #default="{ row, $index }">
                <el-button type="danger" size="small" @click="removeIpRule('whitelist', $index)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="IP黑名单" name="blacklist">
          <el-table :data="ipBlacklist" style="width: 100%">
            <el-table-column prop="ip" label="IP地址" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="createdAt" label="创建时间" width="180" />
            <el-table-column label="操作" width="120">
              <template #default="{ row, $index }">
                <el-button type="danger" size="small" @click="removeIpRule('blacklist', $index)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    
    <el-card class="config-section">
      <template #header>
        <div class="card-header">
          <span>安全日志</span>
          <el-button type="warning" size="small" @click="clearSecurityLogs">
            清空日志
          </el-button>
        </div>
      </template>
      
      <el-table :data="securityLogs" style="width: 100%" max-height="400">
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getLogTypeColor(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP地址" width="150" />
        <el-table-column prop="user" label="用户" width="120" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    
    <el-card class="config-section">
      <template #header>
        <span>系统安全</span>
      </template>
      <el-form :model="systemSecurity" label-width="120px">
        <el-form-item label="启用HTTPS">
          <el-switch v-model="systemSecurity.enableHttps" />
          <span class="form-tip">强制使用HTTPS连接</span>
        </el-form-item>
        <el-form-item label="启用CSRF保护">
          <el-switch v-model="systemSecurity.enableCsrfProtection" />
          <span class="form-tip">防止跨站请求伪造攻击</span>
        </el-form-item>
        <el-form-item label="启用XSS保护">
          <el-switch v-model="systemSecurity.enableXssProtection" />
          <span class="form-tip">防止跨站脚本攻击</span>
        </el-form-item>
        <el-form-item label="启用SQL注入保护">
          <el-switch v-model="systemSecurity.enableSqlInjectionProtection" />
          <span class="form-tip">防止SQL注入攻击</span>
        </el-form-item>
        <el-form-item label="启用请求频率限制">
          <el-switch v-model="systemSecurity.enableRateLimit" />
          <span class="form-tip">防止暴力攻击</span>
        </el-form-item>
        <el-form-item label="请求频率限制" v-if="systemSecurity.enableRateLimit">
          <el-input-number
            v-model="systemSecurity.rateLimit"
            :min="10"
            :max="1000"
            controls-position="right"
          />
          <span class="form-tip">每分钟请求次数</span>
        </el-form-item>
      </el-form>
    </el-card>

    
    <div class="action-buttons">
      <el-button type="primary" @click="saveConfig" :loading="saving">
        保存配置
      </el-button>
      <el-button @click="resetConfig">
        重置配置
      </el-button>
      <el-button type="warning" @click="exportConfig">
        导出配置
      </el-button>
      <el-button type="info" @click="importConfig">
        导入配置
      </el-button>
    </div>

    
    <el-dialog v-model="showAddIpDialog" title="添加IP规则" width="500px">
      <el-form :model="ipRuleForm" label-width="80px">
        <el-form-item label="类型">
          <el-radio-group v-model="ipRuleForm.type">
            <el-radio label="whitelist">白名单</el-radio>
            <el-radio label="blacklist">黑名单</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="IP地址">
          <el-input v-model="ipRuleForm.ip" placeholder="请输入IP地址或IP段" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="ipRuleForm.description" placeholder="请输入描述信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddIpDialog = false">取消</el-button>
        <el-button type="primary" @click="addIpRule">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'


const authConfig = reactive({
  enableTwoFactor: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  enforcePasswordComplexity: true
})


const systemSecurity = reactive({
  enableHttps: true,
  enableCsrfProtection: true,
  enableXssProtection: true,
  enableSqlInjectionProtection: true,
  enableRateLimit: true,
  rateLimit: 100
})


const ipWhitelist = ref([
  {
    ip: '192.168.1.0/24',
    description: '内网IP段',
    createdAt: '2024-01-15 10:30:00'
  },
  {
    ip: '127.0.0.1',
    description: '本地回环地址',
    createdAt: '2024-01-15 10:30:00'
  }
])

const ipBlacklist = ref([
  {
    ip: '192.168.100.50',
    description: '恶意IP',
    createdAt: '2024-01-15 11:00:00'
  }
])


const securityLogs = ref([
  {
    timestamp: '2024-01-15 14:30:25',
    type: '登录',
    ip: '192.168.1.100',
    user: 'admin',
    description: '管理员登录',
    status: 'success'
  },
  {
    timestamp: '2024-01-15 14:25:10',
    type: '登录',
    ip: '192.168.100.50',
    user: 'unknown',
    description: '非法登录尝试',
    status: 'failed'
  },
  {
    timestamp: '2024-01-15 14:20:05',
    type: '配置变更',
    ip: '192.168.1.100',
    user: 'admin',
    description: '修改安全配置',
    status: 'success'
  }
])


const activeTab = ref('whitelist')
const showAddIpDialog = ref(false)
const saving = ref(false)


const ipRuleForm = reactive({
  type: 'whitelist',
  ip: '',
  description: ''
})


const getLogTypeColor = (type: string) => {
  const colorMap = {
    '登录': 'primary',
    '配置变更': 'warning',
    '权限变更': 'info',
    '安全事件': 'danger'
  }
  return colorMap[type] || ''
}


const addIpRule = () => {
  if (!ipRuleForm.ip) {
    ElMessage.error('请输入IP地址')
    return
  }

  const newRule = {
    ip: ipRuleForm.ip,
    description: ipRuleForm.description || '无描述',
    createdAt: new Date().toLocaleString()
  }

  if (ipRuleForm.type === 'whitelist') {
    ipWhitelist.value.push(newRule)
  } else {
    ipBlacklist.value.push(newRule)
  }

  ElMessage.success('IP规则添加成功')
  showAddIpDialog.value = false
  
  
  ipRuleForm.ip = ''
  ipRuleForm.description = ''
}


const removeIpRule = async (type: string, index: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条IP规则吗？', '确认删除', {
      type: 'warning'
    })
    
    if (type === 'whitelist') {
      ipWhitelist.value.splice(index, 1)
    } else {
      ipBlacklist.value.splice(index, 1)
    }
    
    ElMessage.success('IP规则删除成功')
  } catch {
    
  }
}


const clearSecurityLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有安全日志吗？', '确认清空', {
      type: 'warning'
    })
    securityLogs.value = []
    ElMessage.success('安全日志已清空')
  } catch {
    
  }
}


const saveConfig = async () => {
  saving.value = true
  try {
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('安全配置保存成功')
  } catch (error) {
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}


const resetConfig = async () => {
  try {
    await ElMessageBox.confirm('确定要重置所有安全配置吗？', '确认重置', {
      type: 'warning'
    })
    
    
    Object.assign(authConfig, {
      enableTwoFactor: false,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      enforcePasswordComplexity: true
    })
    
    
    Object.assign(systemSecurity, {
      enableHttps: true,
      enableCsrfProtection: true,
      enableXssProtection: true,
      enableSqlInjectionProtection: true,
      enableRateLimit: true,
      rateLimit: 100
    })
    
    ElMessage.success('配置已重置为默认值')
  } catch {
    
  }
}


const exportConfig = () => {
  const config = {
    authConfig,
    systemSecurity,
    ipWhitelist: ipWhitelist.value,
    ipBlacklist: ipBlacklist.value
  }
  
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json'
  })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'security-config.json'
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('配置导出成功')
}


const importConfig = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string)
          
          if (config.authConfig) {
            Object.assign(authConfig, config.authConfig)
          }
          if (config.systemSecurity) {
            Object.assign(systemSecurity, config.systemSecurity)
          }
          if (config.ipWhitelist) {
            ipWhitelist.value = config.ipWhitelist
          }
          if (config.ipBlacklist) {
            ipBlacklist.value = config.ipBlacklist
          }
          
          ElMessage.success('配置导入成功')
        } catch (error) {
          ElMessage.error('配置文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}
</script>

<style scoped>
.security-config {
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

.config-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .security-config {
    padding: 10px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .el-table {
    font-size: 12px;
  }
}
</style>