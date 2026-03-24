<template>
  <div class="system-config">
    <div class="config-header">
      <h1>系统配置</h1>
      <p>管理Yunzai系统的核心配置参数</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="16">
        <div class="config-sections">
          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Setting /></el-icon>
                <span>基础配置</span>
              </div>
            </template>
            <el-form :model="systemConfig" label-width="120px">
              <el-form-item label="系统名称">
                <el-input
                  v-model="systemConfig.systemName"
                  placeholder="请输入系统名称"
                />
              </el-form-item>
              <el-form-item label="系统版本">
                <el-input
                  v-model="systemConfig.version"
                  placeholder="请输入系统版本"
                  readonly
                />
              </el-form-item>
              <el-form-item label="运行环境">
                <el-select v-model="systemConfig.environment" style="width: 100%">
                  <el-option label="开发环境" value="development" />
                  <el-option label="测试环境" value="testing" />
                  <el-option label="生产环境" value="production" />
                </el-select>
              </el-form-item>
              <el-form-item label="调试模式">
                <el-switch
                  v-model="systemConfig.debug"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="日志级别">
                <el-select v-model="systemConfig.logLevel" style="width: 100%">
                  <el-option label="错误" value="error" />
                  <el-option label="警告" value="warn" />
                  <el-option label="信息" value="info" />
                  <el-option label="调试" value="debug" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Monitor /></el-icon>
                <span>性能配置</span>
              </div>
            </template>
            <el-form :model="performanceConfig" label-width="120px">
              <el-form-item label="最大并发数">
                <el-input-number
                  v-model="performanceConfig.maxConcurrency"
                  :min="1"
                  :max="1000"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="请求超时">
                <el-input-number
                  v-model="performanceConfig.requestTimeout"
                  :min="1000"
                  :max="60000"
                  :step="1000"
                  style="width: 100%"
                />
                <template #append>毫秒</template>
              </el-form-item>
              <el-form-item label="内存限制">
                <el-input-number
                  v-model="performanceConfig.memoryLimit"
                  :min="512"
                  :max="8192"
                  :step="256"
                  style="width: 100%"
                />
                <template #append>MB</template>
              </el-form-item>
              <el-form-item label="缓存大小">
                <el-input-number
                  v-model="performanceConfig.cacheSize"
                  :min="10"
                  :max="1000"
                  style="width: 100%"
                />
                <template #append>MB</template>
              </el-form-item>
              <el-form-item label="启用缓存">
                <el-switch
                  v-model="performanceConfig.enableCache"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
            </el-form>
          </el-card>

          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Lock /></el-icon>
                <span>安全配置</span>
              </div>
            </template>
            <el-form :model="securityConfig" label-width="120px">
              <el-form-item label="启用HTTPS">
                <el-switch
                  v-model="securityConfig.enableHttps"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="JWT密钥">
                <el-input
                  v-model="securityConfig.jwtSecret"
                  type="password"
                  placeholder="请输入JWT密钥"
                  show-password
                />
              </el-form-item>
              <el-form-item label="会话超时">
                <el-input-number
                  v-model="securityConfig.sessionTimeout"
                  :min="300"
                  :max="86400"
                  :step="300"
                  style="width: 100%"
                />
                <template #append>秒</template>
              </el-form-item>
              <el-form-item label="最大登录尝试">
                <el-input-number
                  v-model="securityConfig.maxLoginAttempts"
                  :min="3"
                  :max="10"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="IP白名单">
                <el-input
                  v-model="securityConfig.ipWhitelist"
                  type="textarea"
                  :rows="3"
                  placeholder="每行一个IP地址，支持CIDR格式"
                />
              </el-form-item>
            </el-form>
          </el-card>

          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Coin /></el-icon>
                <span>数据库配置</span>
              </div>
            </template>
            <el-form :model="databaseConfig" label-width="120px">
              <el-form-item label="数据库类型">
                <el-select v-model="databaseConfig.type" style="width: 100%">
                  <el-option label="SQLite" value="sqlite" />
                  <el-option label="MySQL" value="mysql" />
                  <el-option label="PostgreSQL" value="postgresql" />
                  <el-option label="MongoDB" value="mongodb" />
                </el-select>
              </el-form-item>
              <el-form-item label="主机地址" v-if="databaseConfig.type !== 'sqlite'">
                <el-input
                  v-model="databaseConfig.host"
                  placeholder="请输入数据库主机地址"
                />
              </el-form-item>
              <el-form-item label="端口" v-if="databaseConfig.type !== 'sqlite'">
                <el-input-number
                  v-model="databaseConfig.port"
                  :min="1"
                  :max="65535"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="数据库名">
                <el-input
                  v-model="databaseConfig.database"
                  placeholder="请输入数据库名称"
                />
              </el-form-item>
              <el-form-item label="用户名" v-if="databaseConfig.type !== 'sqlite'">
                <el-input
                  v-model="databaseConfig.username"
                  placeholder="请输入数据库用户名"
                />
              </el-form-item>
              <el-form-item label="密码" v-if="databaseConfig.type !== 'sqlite'">
                <el-input
                  v-model="databaseConfig.password"
                  type="password"
                  placeholder="请输入数据库密码"
                  show-password
                />
              </el-form-item>
              <el-form-item label="连接池大小">
                <el-input-number
                  v-model="databaseConfig.poolSize"
                  :min="1"
                  :max="100"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="testConnection">
                  <el-icon><Connection /></el-icon>
                  测试连接
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </el-col>

      <el-col :xs="24" :lg="8">
        <div class="sidebar">
          
          <el-card class="status-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Monitor /></el-icon>
                <span>系统状态</span>
              </div>
            </template>
            <div class="status-list">
              <div class="status-item">
                <span class="status-label">运行时间</span>
                <span class="status-value">{{ systemStatus.uptime }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">CPU使用率</span>
                <span class="status-value">
                  <el-progress
                    :percentage="systemStatus.cpuUsage"
                    :color="getProgressColor(systemStatus.cpuUsage)"
                    :show-text="false"
                    style="width: 60px"
                  />
                  {{ systemStatus.cpuUsage }}%
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">内存使用率</span>
                <span class="status-value">
                  <el-progress
                    :percentage="systemStatus.memoryUsage"
                    :color="getProgressColor(systemStatus.memoryUsage)"
                    :show-text="false"
                    style="width: 60px"
                  />
                  {{ systemStatus.memoryUsage }}%
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">磁盘使用率</span>
                <span class="status-value">
                  <el-progress
                    :percentage="systemStatus.diskUsage"
                    :color="getProgressColor(systemStatus.diskUsage)"
                    :show-text="false"
                    style="width: 60px"
                  />
                  {{ systemStatus.diskUsage }}%
                </span>
              </div>
              <div class="status-item">
                <span class="status-label">网络状态</span>
                <span class="status-value">
                  <el-tag :type="systemStatus.networkStatus === 'online' ? 'success' : 'danger'" size="small">
                    {{ systemStatus.networkStatus === 'online' ? '在线' : '离线' }}
                  </el-tag>
                </span>
              </div>
            </div>
          </el-card>

          
          <el-card class="actions-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Operation /></el-icon>
                <span>快捷操作</span>
              </div>
            </template>
            <div class="actions-list">
              <el-button type="primary" @click="saveAllConfig" :loading="saving">
                <el-icon><DocumentCopy /></el-icon>
                保存所有配置
              </el-button>
              <el-button @click="resetConfig">
                <el-icon><RefreshLeft /></el-icon>
                重置配置
              </el-button>
              <el-button @click="exportConfig">
                <el-icon><Download /></el-icon>
                导出配置
              </el-button>
              <el-button @click="importConfig">
                <el-icon><Upload /></el-icon>
                导入配置
              </el-button>
              <el-button type="warning" @click="restartSystem">
                <el-icon><RefreshRight /></el-icon>
                重启系统
              </el-button>
            </div>
          </el-card>

          
          <el-card class="history-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span>配置历史</span>
              </div>
            </template>
            <div class="history-list">
              <div
                v-for="history in configHistory"
                :key="history.id"
                class="history-item"
              >
                <div class="history-info">
                  <div class="history-time">{{ history.time }}</div>
                  <div class="history-desc">{{ history.description }}</div>
                </div>
                <el-button size="small" text @click="restoreConfig(history.id)">
                  恢复
                </el-button>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  Monitor,
  Lock,
  Coin,
  Connection,
  Operation,
  DocumentCopy,
  RefreshLeft,
  Download,
  Upload,
  RefreshRight,
  Clock
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'


const saving = ref(false)


const systemConfig = ref({
  systemName: 'Yunzai-Bot',
  version: '4.0.0',
  environment: 'development',
  debug: true,
  logLevel: 'info'
})


const performanceConfig = ref({
  maxConcurrency: 100,
  requestTimeout: 30000,
  memoryLimit: 2048,
  cacheSize: 256,
  enableCache: true
})


const securityConfig = ref({
  enableHttps: false,
  jwtSecret: 'your-jwt-secret-key',
  sessionTimeout: 3600,
  maxLoginAttempts: 5,
  ipWhitelist: '127.0.0.1\n192.168.1.0/24'
})


const databaseConfig = ref({
  type: 'sqlite',
  host: 'localhost',
  port: 3306,
  database: 'yunzai',
  username: 'root',
  password: '',
  poolSize: 10
})


const systemStatus = ref({
  uptime: '2天 14小时 32分钟',
  cpuUsage: 45,
  memoryUsage: 68,
  diskUsage: 32,
  networkStatus: 'online'
})


const configHistory = ref([
  {
    id: 1,
    time: dayjs().subtract(1, 'hour').format('MM-DD HH:mm'),
    description: '更新性能配置'
  },
  {
    id: 2,
    time: dayjs().subtract(3, 'hour').format('MM-DD HH:mm'),
    description: '修改安全设置'
  },
  {
    id: 3,
    time: dayjs().subtract(1, 'day').format('MM-DD HH:mm'),
    description: '初始化系统配置'
  }
])


const getProgressColor = (percentage: number) => {
  if (percentage < 50) return '#67c23a'
  if (percentage < 80) return '#e6a23c'
  return '#f56c6c'
}

const testConnection = async () => {
  try {
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('数据库连接测试成功')
  } catch {
    ElMessage.error('数据库连接测试失败')
  }
}

const saveAllConfig = async () => {
  saving.value = true
  try {
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    
    configHistory.value.unshift({
      id: Date.now(),
      time: dayjs().format('MM-DD HH:mm'),
      description: '保存所有配置'
    })
    
    ElMessage.success('配置保存成功')
  } catch {
    ElMessage.error('配置保存失败')
  } finally {
    saving.value = false
  }
}

const resetConfig = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有配置吗？此操作不可撤销。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    systemConfig.value = {
      systemName: 'Yunzai-Bot',
      version: '4.0.0',
      environment: 'development',
      debug: true,
      logLevel: 'info'
    }
    
    performanceConfig.value = {
      maxConcurrency: 100,
      requestTimeout: 30000,
      memoryLimit: 2048,
      cacheSize: 256,
      enableCache: true
    }
    
    securityConfig.value = {
      enableHttps: false,
      jwtSecret: 'your-jwt-secret-key',
      sessionTimeout: 3600,
      maxLoginAttempts: 5,
      ipWhitelist: '127.0.0.1\n192.168.1.0/24'
    }
    
    databaseConfig.value = {
      type: 'sqlite',
      host: 'localhost',
      port: 3306,
      database: 'yunzai',
      username: 'root',
      password: '',
      poolSize: 10
    }
    
    ElMessage.success('配置已重置')
  } catch {
    
  }
}

const exportConfig = () => {
  const config = {
    system: systemConfig.value,
    performance: performanceConfig.value,
    security: { ...securityConfig.value, jwtSecret: '***' }, 
    database: { ...databaseConfig.value, password: '***' }
  }
  
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json'
  })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `yunzai-config-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`
  a.click()
  
  URL.revokeObjectURL(url)
  ElMessage.success('配置导出成功')
}

const importConfig = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e: any) => {
      try {
        const config = JSON.parse(e.target.result)
        
        if (config.system) systemConfig.value = { ...systemConfig.value, ...config.system }
        if (config.performance) performanceConfig.value = { ...performanceConfig.value, ...config.performance }
        if (config.security) securityConfig.value = { ...securityConfig.value, ...config.security }
        if (config.database) databaseConfig.value = { ...databaseConfig.value, ...config.database }
        
        ElMessage.success('配置导入成功')
      } catch {
        ElMessage.error('配置文件格式错误')
      }
    }
    
    reader.readAsText(file)
  }
  
  input.click()
}

const restartSystem = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重启系统吗？重启后所有连接将断开。',
      '确认重启',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.info('系统正在重启...')
    
  } catch {
    
  }
}

const restoreConfig = (historyId: number) => {
  ElMessage.info(`恢复配置 ${historyId} 功能开发中...`)
}


const updateSystemStatus = () => {
  systemStatus.value.cpuUsage = Math.floor(Math.random() * 100)
  systemStatus.value.memoryUsage = Math.floor(Math.random() * 100)
  systemStatus.value.diskUsage = Math.floor(Math.random() * 100)
}

onMounted(() => {
  
  setInterval(updateSystemStatus, 5000)
})
</script>

<style lang="scss" scoped>
.system-config {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}

.config-header {
  margin-bottom: 30px;
  
  h1 {
    margin: 0 0 10px 0;
    font-size: 28px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  p {
    margin: 0;
    font-size: 16px;
    color: var(--el-text-color-regular);
  }
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-card {
  :deep(.el-card__body) {
    padding: 25px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  @media (max-width: 992px) {
    margin-top: 20px;
  }
}

.status-card,
.actions-card,
.history-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .status-label {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }
  
  .status-value {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    font-size: 14px;
  }
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  .el-button {
    justify-content: flex-start;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 6px;
  
  .history-info {
    flex: 1;
    
    .history-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
    
    .history-desc {
      font-size: 14px;
      color: var(--el-text-color-primary);
      margin-top: 2px;
    }
  }
}

@media (max-width: 768px) {
  .system-config {
    padding: 10px;
  }
  
  .config-header {
    margin-bottom: 20px;
    
    h1 {
      font-size: 24px;
    }
  }
}
</style>