<template>
  <div class="system-info">
    
    <div class="page-header">
      <div class="header-left">
        <h2>系统信息</h2>
        <p>查看系统运行状态和详细信息</p>
      </div>
      <div class="header-right">
        <el-button @click="refreshInfo">
          <el-icon><Refresh /></el-icon>
          刷新信息
        </el-button>
        <el-button @click="exportInfo">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    
    <div class="system-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ systemInfo.uptime }}</div>
                <div class="overview-label">系统运行时间</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ systemInfo.cpuUsage }}%</div>
                <div class="overview-label">CPU使用率</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon">
                <el-icon><MemoryCard /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ systemInfo.memoryUsage }}%</div>
                <div class="overview-label">内存使用率</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon">
                <el-icon><FolderOpened /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ systemInfo.diskUsage }}%</div>
                <div class="overview-label">磁盘使用率</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20">
      
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>系统基本信息</span>
              <el-icon><Platform /></el-icon>
            </div>
          </template>
          
          <el-descriptions :column="1" border>
            <el-descriptions-item label="操作系统">
              <el-tag type="primary">{{ systemInfo.os.name }}</el-tag>
              <span class="ml-2">{{ systemInfo.os.version }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="系统架构">
              {{ systemInfo.os.arch }}
            </el-descriptions-item>
            <el-descriptions-item label="主机名">
              {{ systemInfo.os.hostname }}
            </el-descriptions-item>
            <el-descriptions-item label="启动时间">
              {{ formatTime(systemInfo.bootTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="时区">
              {{ systemInfo.os.timezone }}
            </el-descriptions-item>
            <el-descriptions-item label="语言">
              {{ systemInfo.os.language }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>硬件信息</span>
              <el-icon><Cpu /></el-icon>
            </div>
          </template>
          
          <el-descriptions :column="1" border>
            <el-descriptions-item label="CPU型号">
              {{ systemInfo.hardware.cpu.model }}
            </el-descriptions-item>
            <el-descriptions-item label="CPU核心数">
              {{ systemInfo.hardware.cpu.cores }} 核心 / {{ systemInfo.hardware.cpu.threads }} 线程
            </el-descriptions-item>
            <el-descriptions-item label="CPU频率">
              {{ systemInfo.hardware.cpu.frequency }} GHz
            </el-descriptions-item>
            <el-descriptions-item label="总内存">
              {{ formatBytes(systemInfo.hardware.memory.total) }}
            </el-descriptions-item>
            <el-descriptions-item label="可用内存">
              {{ formatBytes(systemInfo.hardware.memory.available) }}
            </el-descriptions-item>
            <el-descriptions-item label="GPU">
              {{ systemInfo.hardware.gpu || '未检测到独立显卡' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>网络信息</span>
              <el-icon><Connection /></el-icon>
            </div>
          </template>
          
          <div class="network-interfaces">
            <div
              v-for="(interface_, index) in systemInfo.network.interfaces"
              :key="index"
              class="interface-item"
            >
              <div class="interface-header">
                <span class="interface-name">{{ interface_.name }}</span>
                <el-tag
                  :type="interface_.status === 'up' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ interface_.status === 'up' ? '已连接' : '未连接' }}
                </el-tag>
              </div>
              <div class="interface-details">
                <div class="detail-item">
                  <span class="detail-label">类型:</span>
                  <span class="detail-value">{{ interface_.type }}</span>
                </div>
                <div class="detail-item" v-if="interface_.ipv4">
                  <span class="detail-label">IPv4:</span>
                  <span class="detail-value">{{ interface_.ipv4 }}</span>
                </div>
                <div class="detail-item" v-if="interface_.ipv6">
                  <span class="detail-label">IPv6:</span>
                  <span class="detail-value">{{ interface_.ipv6 }}</span>
                </div>
                <div class="detail-item" v-if="interface_.mac">
                  <span class="detail-label">MAC:</span>
                  <span class="detail-value">{{ interface_.mac }}</span>
                </div>
                <div class="detail-item" v-if="interface_.speed">
                  <span class="detail-label">速度:</span>
                  <span class="detail-value">{{ interface_.speed }} Mbps</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>磁盘信息</span>
              <el-icon><FolderOpened /></el-icon>
            </div>
          </template>
          
          <div class="disk-list">
            <div
              v-for="(disk, index) in systemInfo.storage.disks"
              :key="index"
              class="disk-item"
            >
              <div class="disk-header">
                <span class="disk-name">{{ disk.name }}</span>
                <span class="disk-type">{{ disk.type }}</span>
              </div>
              <div class="disk-usage">
                <div class="usage-info">
                  <span>{{ formatBytes(disk.used) }} / {{ formatBytes(disk.total) }}</span>
                  <span class="usage-percent">{{ disk.usagePercent }}%</span>
                </div>
                <el-progress
                  :percentage="disk.usagePercent"
                  :color="getUsageColor(disk.usagePercent)"
                  :show-text="false"
                />
              </div>
              <div class="disk-details">
                <div class="detail-item">
                  <span class="detail-label">文件系统:</span>
                  <span class="detail-value">{{ disk.filesystem }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">挂载点:</span>
                  <span class="detail-value">{{ disk.mountpoint }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>应用信息</span>
              <el-icon><Box /></el-icon>
            </div>
          </template>
          
          <el-descriptions :column="1" border>
            <el-descriptions-item label="应用名称">
              {{ appInfo.name }}
            </el-descriptions-item>
            <el-descriptions-item label="应用版本">
              <el-tag type="success">{{ appInfo.version }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="构建版本">
              {{ appInfo.buildVersion }}
            </el-descriptions-item>
            <el-descriptions-item label="构建时间">
              {{ formatTime(appInfo.buildTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="运行环境">
              {{ appInfo.environment }}
            </el-descriptions-item>
            <el-descriptions-item label="配置文件">
              {{ appInfo.configPath }}
            </el-descriptions-item>
            <el-descriptions-item label="日志级别">
              <el-tag :type="getLogLevelType(appInfo.logLevel)">{{ appInfo.logLevel }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>运行时信息</span>
              <el-icon><Timer /></el-icon>
            </div>
          </template>
          
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Node.js版本">
              {{ runtimeInfo.nodeVersion }}
            </el-descriptions-item>
            <el-descriptions-item label="V8引擎版本">
              {{ runtimeInfo.v8Version }}
            </el-descriptions-item>
            <el-descriptions-item label="进程ID">
              {{ runtimeInfo.pid }}
            </el-descriptions-item>
            <el-descriptions-item label="父进程ID">
              {{ runtimeInfo.ppid }}
            </el-descriptions-item>
            <el-descriptions-item label="工作目录">
              {{ runtimeInfo.cwd }}
            </el-descriptions-item>
            <el-descriptions-item label="执行文件">
              {{ runtimeInfo.execPath }}
            </el-descriptions-item>
            <el-descriptions-item label="内存使用">
              <div class="memory-usage">
                <div class="memory-item">
                  <span>RSS: {{ formatBytes(runtimeInfo.memory.rss) }}</span>
                </div>
                <div class="memory-item">
                  <span>堆总计: {{ formatBytes(runtimeInfo.memory.heapTotal) }}</span>
                </div>
                <div class="memory-item">
                  <span>堆使用: {{ formatBytes(runtimeInfo.memory.heapUsed) }}</span>
                </div>
                <div class="memory-item">
                  <span>外部: {{ formatBytes(runtimeInfo.memory.external) }}</span>
                </div>
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <span>环境变量</span>
          <div class="header-actions">
            <el-input
              v-model="envSearch"
              placeholder="搜索环境变量"
              size="small"
              style="width: 200px; margin-right: 10px"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button size="small" @click="toggleEnvVisibility">
              <el-icon><View /></el-icon>
              {{ showSensitiveEnv ? '隐藏敏感信息' : '显示敏感信息' }}
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="env-variables">
        <el-table
          :data="filteredEnvVars"
          stripe
          height="300"
          style="width: 100%"
        >
          <el-table-column prop="key" label="变量名" width="300" show-overflow-tooltip />
          <el-table-column prop="value" label="值" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="isSensitiveEnv(row.key) && !showSensitiveEnv" class="sensitive-value">
                ********
              </span>
              <span v-else class="env-value">{{ row.value }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button
                size="small"
                text
                @click="copyEnvValue(row.value)"
              >
                <el-icon><DocumentCopy /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Download,
  Monitor,
  Cpu,
  MemoryCard,
  FolderOpened,
  Platform,
  Connection,
  Box,
  Timer,
  Search,
  View,
  DocumentCopy
} from '@element-plus/icons-vue'

interface SystemInfo {
  uptime: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  bootTime: number
  os: {
    name: string
    version: string
    arch: string
    hostname: string
    timezone: string
    language: string
  }
  hardware: {
    cpu: {
      model: string
      cores: number
      threads: number
      frequency: number
    }
    memory: {
      total: number
      available: number
    }
    gpu: string
  }
  network: {
    interfaces: Array<{
      name: string
      type: string
      status: string
      ipv4?: string
      ipv6?: string
      mac?: string
      speed?: number
    }>
  }
  storage: {
    disks: Array<{
      name: string
      type: string
      total: number
      used: number
      usagePercent: number
      filesystem: string
      mountpoint: string
    }>
  }
}

interface AppInfo {
  name: string
  version: string
  buildVersion: string
  buildTime: number
  environment: string
  configPath: string
  logLevel: string
}

interface RuntimeInfo {
  nodeVersion: string
  v8Version: string
  pid: number
  ppid: number
  cwd: string
  execPath: string
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
}

const envSearch = ref('')
const showSensitiveEnv = ref(false)

const systemInfo = reactive<SystemInfo>({
  uptime: '15天 8小时 32分钟',
  cpuUsage: 25.6,
  memoryUsage: 68.3,
  diskUsage: 45.2,
  bootTime: Date.now() - 15 * 24 * 60 * 60 * 1000,
  os: {
    name: 'Windows',
    version: '11 Pro 22H2',
    arch: 'x64',
    hostname: 'DESKTOP-ABC123',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN'
  },
  hardware: {
    cpu: {
      model: 'Intel Core i7-12700K',
      cores: 12,
      threads: 20,
      frequency: 3.6
    },
    memory: {
      total: 32 * 1024 * 1024 * 1024,
      available: 10 * 1024 * 1024 * 1024
    },
    gpu: 'NVIDIA GeForce RTX 4070'
  },
  network: {
    interfaces: [
      {
        name: 'Ethernet',
        type: '有线网络',
        status: 'up',
        ipv4: '192.168.1.100',
        ipv6: 'fe80::1234:5678:9abc:def0',
        mac: '00:11:22:33:44:55',
        speed: 1000
      },
      {
        name: 'Wi-Fi',
        type: '无线网络',
        status: 'down'
      },
      {
        name: 'Loopback',
        type: '回环接口',
        status: 'up',
        ipv4: '127.0.0.1',
        ipv6: '::1'
      }
    ]
  },
  storage: {
    disks: [
      {
        name: 'C:',
        type: 'SSD',
        total: 500 * 1024 * 1024 * 1024,
        used: 226 * 1024 * 1024 * 1024,
        usagePercent: 45,
        filesystem: 'NTFS',
        mountpoint: 'C:\\'
      },
      {
        name: 'D:',
        type: 'HDD',
        total: 2 * 1024 * 1024 * 1024 * 1024,
        used: 800 * 1024 * 1024 * 1024,
        usagePercent: 39,
        filesystem: 'NTFS',
        mountpoint: 'D:\\'
      }
    ]
  }
})

const appInfo = reactive<AppInfo>({
  name: 'Yunzai-Bot',
  version: '4.0.0',
  buildVersion: '4.0.0-beta.1',
  buildTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
  environment: 'production',
  configPath: './config/config.yaml',
  logLevel: 'info'
})

const runtimeInfo = reactive<RuntimeInfo>({
  nodeVersion: 'v18.17.0',
  v8Version: '10.2.154.26',
  pid: 12345,
  ppid: 1234,
  cwd: 'D:\\AI\\v4 zai\\Yunzai',
  execPath: 'C:\\Program Files\\nodejs\\node.exe',
  memory: {
    rss: 156 * 1024 * 1024,
    heapTotal: 89 * 1024 * 1024,
    heapUsed: 67 * 1024 * 1024,
    external: 12 * 1024 * 1024
  }
})

const envVars = ref([
  { key: 'NODE_ENV', value: 'production' },
  { key: 'PATH', value: 'C:\\Windows\\system32;C:\\Windows;C:\\Program Files\\nodejs' },
  { key: 'YUNZAI_CONFIG_PATH', value: './config' },
  { key: 'YUNZAI_LOG_LEVEL', value: 'info' },
  { key: 'DATABASE_URL', value: 'mysql:
  { key: 'API_SECRET_KEY', value: 'sk-1234567890abcdef' },
  { key: 'REDIS_URL', value: 'redis://localhost:6379' },
  { key: 'TEMP', value: 'C:\\Users\\User\\AppData\\Local\\Temp' },
  { key: 'USERNAME', value: 'Administrator' },
  { key: 'COMPUTERNAME', value: 'DESKTOP-ABC123' }
])

const filteredEnvVars = computed(() => {
  if (!envSearch.value) {
    return envVars.value
  }
  
  const search = envSearch.value.toLowerCase()
  return envVars.value.filter(env => 
    env.key.toLowerCase().includes(search) ||
    env.value.toLowerCase().includes(search)
  )
})


const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}


const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}


const getUsageColor = (percentage: number) => {
  if (percentage < 50) return '#67c23a'
  if (percentage < 80) return '#e6a23c'
  return '#f56c6c'
}


const getLogLevelType = (level: string) => {
  const types: Record<string, string> = {
    debug: 'info',
    info: 'success',
    warn: 'warning',
    error: 'danger'
  }
  return types[level] || 'info'
}


const isSensitiveEnv = (key: string) => {
  const sensitiveKeys = [
    'password', 'secret', 'key', 'token', 'auth',
    'DATABASE_URL', 'API_SECRET_KEY', 'REDIS_URL'
  ]
  
  return sensitiveKeys.some(sensitive => 
    key.toLowerCase().includes(sensitive.toLowerCase())
  )
}


const toggleEnvVisibility = () => {
  showSensitiveEnv.value = !showSensitiveEnv.value
}


const copyEnvValue = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}


const refreshInfo = () => {
  
  systemInfo.cpuUsage = Math.random() * 100
  systemInfo.memoryUsage = Math.random() * 100
  systemInfo.diskUsage = Math.random() * 100
  
  
  runtimeInfo.memory.rss = Math.floor(Math.random() * 200 * 1024 * 1024)
  runtimeInfo.memory.heapUsed = Math.floor(Math.random() * 100 * 1024 * 1024)
  
  ElMessage.success('系统信息已刷新')
}


const exportInfo = () => {
  const info = {
    timestamp: new Date().toISOString(),
    system: systemInfo,
    application: appInfo,
    runtime: runtimeInfo,
    environment: envVars.value
  }
  
  const dataStr = JSON.stringify(info, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(dataBlob)
  link.download = `system-info-${Date.now()}.json`
  link.click()
  
  ElMessage.success('系统信息已导出')
}

onMounted(() => {
  
  refreshInfo()
})
</script>

<style scoped>
.system-info {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 5px 0;
  color: #303133;
}

.header-left p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 10px;
}

.system-overview {
  margin-bottom: 20px;
}

.overview-card {
  cursor: pointer;
  transition: all 0.3s;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.overview-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.overview-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff, #66b3ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.overview-info {
  flex: 1;
}

.overview-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.overview-label {
  font-size: 14px;
  color: #909399;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.network-interfaces,
.disk-list {
  max-height: 400px;
  overflow-y: auto;
}

.interface-item,
.disk-item {
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
}

.interface-header,
.disk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.interface-name,
.disk-name {
  font-weight: 500;
  color: #303133;
}

.disk-type {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}

.interface-details,
.disk-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.detail-label {
  color: #909399;
  margin-right: 10px;
}

.detail-value {
  color: #303133;
  font-family: monospace;
}

.disk-usage {
  margin-bottom: 10px;
}

.usage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 13px;
  color: #606266;
}

.usage-percent {
  font-weight: 500;
}

.memory-usage {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.memory-item {
  font-size: 13px;
  color: #606266;
  font-family: monospace;
}

.env-variables {
  max-height: 300px;
  overflow-y: auto;
}

.sensitive-value {
  color: #909399;
  font-family: monospace;
}

.env-value {
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
}

.ml-2 {
  margin-left: 8px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .system-overview :deep(.el-col) {
    margin-bottom: 15px;
  }
  
  .overview-content {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .interface-details,
  .disk-details {
    grid-template-columns: 1fr;
  }
  
  .memory-usage {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions .el-input {
    width: 100% !important;
    margin-right: 0 !important;
  }
}
</style>