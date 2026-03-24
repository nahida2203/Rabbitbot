<template>
  <div class="dashboard">
    
    <div class="stats-grid">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon users">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatNumber(stats.users.total) }}</div>
            <div class="stat-label">用户总数</div>
            <div class="stat-change positive">
              <el-icon><ArrowUp /></el-icon>
              +{{ stats.users.new }}
            </div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon plugins">
            <el-icon><Grid /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.plugins.total }}</div>
            <div class="stat-label">插件总数</div>
            <div class="stat-change">
              <span class="active">{{ stats.plugins.active }} 活跃</span>
            </div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon messages">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatNumber(stats.messages.total) }}</div>
            <div class="stat-label">消息总数</div>
            <div class="stat-change positive">
              <el-icon><ArrowUp /></el-icon>
              +{{ stats.messages.today }}
            </div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon system">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatUptime(stats.system.uptime) }}</div>
            <div class="stat-label">系统运行时间</div>
            <div class="stat-change">
              <span class="status healthy">运行正常</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>
    
    
    <div class="charts-grid">
      
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>系统监控</span>
            <el-button-group size="small">
              <el-button 
                v-for="period in timePeriods" 
                :key="period.value"
                :type="selectedPeriod === period.value ? 'primary' : ''"
                @click="selectedPeriod = period.value; loadMonitorData()"
              >
                {{ period.label }}
              </el-button>
            </el-button-group>
          </div>
        </template>
        <div ref="systemChart" class="chart-container"></div>
      </el-card>
      
      
      <el-card class="chart-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>消息统计</span>
            <el-switch
              v-model="showMessageDetails"
              active-text="详细"
              inactive-text="简单"
            />
          </div>
        </template>
        <div ref="messageChart" class="chart-container"></div>
      </el-card>
    </div>
    
    
    <div class="details-grid">
      
      <el-card class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>在线用户</span>
            <el-badge :value="onlineUsers.length" type="success">
              <el-icon><User /></el-icon>
            </el-badge>
          </div>
        </template>
        <div class="online-users">
          <div 
            v-for="user in onlineUsers.slice(0, 10)" 
            :key="user.id" 
            class="user-item"
          >
            <el-avatar :src="user.avatar" :size="32">
              {{ user.username.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="user-info">
              <div class="username">{{ user.username }}</div>
              <div class="login-time">{{ formatTime(user.lastLoginTime) }}</div>
            </div>
            <div class="user-status online"></div>
          </div>
          <div v-if="onlineUsers.length > 10" class="more-users">
            还有 {{ onlineUsers.length - 10 }} 个用户在线
          </div>
        </div>
      </el-card>
      
      
      <el-card class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>最新日志</span>
            <el-button size="small" @click="$router.push('/logs')">
              查看全部
            </el-button>
          </div>
        </template>
        <div class="recent-logs">
          <div 
            v-for="log in recentLogs" 
            :key="log.id" 
            class="log-item"
            :class="log.level"
          >
            <div class="log-level">
              <el-tag :type="getLogLevelType(log.level)" size="small">
                {{ log.level.toUpperCase() }}
              </el-tag>
            </div>
            <div class="log-content">
              <div class="log-message">{{ log.message }}</div>
              <div class="log-meta">
                <span class="log-source">{{ log.source }}</span>
                <span class="log-time">{{ formatTime(log.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
      
      
      <el-card class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>系统状态</span>
            <el-button 
              size="small" 
              :loading="refreshing" 
              @click="refreshSystemInfo"
            >
              刷新
            </el-button>
          </div>
        </template>
        <div class="system-status">
          <div class="status-item">
            <div class="status-label">CPU 使用率</div>
            <el-progress 
              :percentage="systemInfo.cpu.usage" 
              :color="getProgressColor(systemInfo.cpu.usage)"
              :show-text="false"
            />
            <div class="status-value">{{ systemInfo.cpu.usage.toFixed(1) }}%</div>
          </div>
          
          <div class="status-item">
            <div class="status-label">内存使用率</div>
            <el-progress 
              :percentage="systemInfo.memory.usage" 
              :color="getProgressColor(systemInfo.memory.usage)"
              :show-text="false"
            />
            <div class="status-value">{{ systemInfo.memory.usage.toFixed(1) }}%</div>
          </div>
          
          <div class="status-item">
            <div class="status-label">磁盘使用率</div>
            <el-progress 
              :percentage="systemInfo.disk.usage" 
              :color="getProgressColor(systemInfo.disk.usage)"
              :show-text="false"
            />
            <div class="status-value">{{ systemInfo.disk.usage.toFixed(1) }}%</div>
          </div>
          
          <div class="status-item">
            <div class="status-label">网络连接</div>
            <div class="status-value">{{ systemInfo.network.connections }} 个</div>
          </div>
        </div>
      </el-card>
      
      
      <el-card class="detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>快捷操作</span>
          </div>
        </template>
        <div class="quick-actions">
          <el-button 
            v-for="action in quickActions" 
            :key="action.key"
            :type="action.type"
            :icon="action.icon"
            @click="handleQuickAction(action.key)"
          >
            {{ action.label }}
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  UserFilled,
  Grid,
  ChatDotRound,
  Monitor,
  ArrowUp,
  User,
  Setting,
  Refresh,
  Download,
  Upload
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/api'
import { formatNumber, formatTime, formatFileSize } from '@/utils'
import type { Statistics, SystemInfo, Log, User as UserType, MonitorData } from '@/types'

const router = useRouter()

// 响应式数据
const stats = reactive<Statistics>({
  users: { total: 0, active: 0, new: 0, online: 0 },
  plugins: { total: 0, active: 0, inactive: 0, error: 0 },
  messages: { total: 0, today: 0, success: 0, failed: 0 },
  system: { uptime: 0, cpu: 0, memory: 0, disk: 0 }
})

const systemInfo = reactive<SystemInfo>({
  os: { platform: '', arch: '', version: '', hostname: '', uptime: 0 },
  cpu: { model: '', cores: 0, usage: 0, loadAverage: [] },
  memory: { total: 0, used: 0, free: 0, usage: 0 },
  disk: { total: 0, used: 0, free: 0, usage: 0 },
  network: { interfaces: [], connections: 0 },
  process: { pid: 0, ppid: 0, uptime: 0, memory: 0, cpu: 0 },
  node: { version: '', arch: '', platform: '' },
  yunzai: { version: '', plugins: 0, users: 0, messages: 0 }
})

const onlineUsers = ref<UserType[]>([])
const recentLogs = ref<Log[]>([])
const monitorData = ref<MonitorData[]>([])

const selectedPeriod = ref('1h')
const showMessageDetails = ref(false)
const refreshing = ref(false)

// 图表引用
const systemChart = ref<HTMLElement>()
const messageChart = ref<HTMLElement>()
let systemChartInstance: echarts.ECharts | null = null
let messageChartInstance: echarts.ECharts | null = null

// 时间周期选项
const timePeriods = [
  { label: '1小时', value: '1h' },
  { label: '6小时', value: '6h' },
  { label: '24小时', value: '24h' },
  { label: '7天', value: '7d' }
]

// 快捷操作
const quickActions = [
  { key: 'plugins', label: '插件管理', type: 'primary', icon: Grid },
  { key: 'config', label: '系统配置', type: 'success', icon: Setting },
  { key: 'backup', label: '创建备份', type: 'warning', icon: Download },
  { key: 'restart', label: '重启系统', type: 'danger', icon: Refresh }
]

// 格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}天${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 获取日志级别类型
function getLogLevelType(level: string) {
  const types: Record<string, string> = {
    trace: 'info',
    debug: 'primary',
    info: 'success',
    warn: 'warning',
    error: 'danger',
    fatal: 'danger'
  }
  return types[level] || 'info'
}

// 获取进度条颜色
function getProgressColor(percentage: number) {
  if (percentage < 50) return '#67C23A'
  if (percentage < 80) return '#E6A23C'
  return '#F56C6C'
}

// 加载仪表盘数据
async function loadDashboardData() {
  try {
    const [statsRes, systemRes, usersRes, logsRes] = await Promise.all([
      api.stats.getDashboardStats(),
      api.monitor.getSystemInfo(),
      api.user.getUsers({ page: 1, size: 20 }),
      api.log.getLogs({ page: 1, size: 10 })
    ])
    
    Object.assign(stats, statsRes.data.data)
    Object.assign(systemInfo, systemRes.data.data)
    onlineUsers.value = usersRes.data.data.items.filter(user => user.status === 'active')
    recentLogs.value = logsRes.data.data.items
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
    ElMessage.error('加载仪表盘数据失败')
  }
}

// 加载监控数据
async function loadMonitorData() {
  try {
    const res = await api.monitor.getMonitorData({
      interval: selectedPeriod.value
    })
    monitorData.value = res.data.data
    
    await nextTick()
    updateSystemChart()
    updateMessageChart()
  } catch (error) {
    console.error('加载监控数据失败:', error)
  }
}

// 更新系统监控图表
function updateSystemChart() {
  if (!systemChartInstance || !monitorData.value.length) return
  
  const times = monitorData.value.map(item => 
    new Date(item.timestamp).toLocaleTimeString()
  )
  const cpuData = monitorData.value.map(item => item.cpu)
  const memoryData = monitorData.value.map(item => item.memory)
  const diskData = monitorData.value.map(item => item.disk)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['CPU', '内存', '磁盘']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: times
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'CPU',
        type: 'line',
        data: cpuData,
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '内存',
        type: 'line',
        data: memoryData,
        smooth: true,
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '磁盘',
        type: 'line',
        data: diskData,
        smooth: true,
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  systemChartInstance.setOption(option)
}

// 更新消息统计图表
function updateMessageChart() {
  if (!messageChartInstance || !monitorData.value.length) return
  
  const times = monitorData.value.map(item => 
    new Date(item.timestamp).toLocaleTimeString()
  )
  const requestsData = monitorData.value.map(item => item.requests)
  const errorsData = monitorData.value.map(item => item.errors)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: showMessageDetails.value ? ['请求数', '错误数'] : ['请求数']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: times
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '请求数',
        type: 'bar',
        data: requestsData,
        itemStyle: { color: '#409EFF' }
      },
      ...(showMessageDetails.value ? [{
        name: '错误数',
        type: 'line',
        data: errorsData,
        itemStyle: { color: '#F56C6C' }
      }] : [])
    ]
  }
  
  messageChartInstance.setOption(option)
}

// 初始化图表
function initCharts() {
  nextTick(() => {
    if (systemChart.value) {
      systemChartInstance = echarts.init(systemChart.value)
    }
    if (messageChart.value) {
      messageChartInstance = echarts.init(messageChart.value)
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      systemChartInstance?.resize()
      messageChartInstance?.resize()
    })
  })
}

// 刷新系统信息
async function refreshSystemInfo() {
  refreshing.value = true
  try {
    const res = await api.monitor.getSystemInfo()
    Object.assign(systemInfo, res.data.data)
    ElMessage.success('系统信息已刷新')
  } catch (error) {
    ElMessage.error('刷新系统信息失败')
  } finally {
    refreshing.value = false
  }
}

// 处理快捷操作
function handleQuickAction(key: string) {
  switch (key) {
    case 'plugins':
      router.push('/plugins')
      break
    case 'config':
      router.push('/config')
      break
    case 'backup':
      createBackup()
      break
    case 'restart':
      restartSystem()
      break
  }
}

// 创建备份
async function createBackup() {
  try {
    await ElMessageBox.confirm(
      '确定要创建系统备份吗？这可能需要几分钟时间。',
      '创建备份',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.system.createBackup()
    ElMessage.success('备份创建成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('创建备份失败')
    }
  }
}

// 重启系统
async function restartSystem() {
  try {
    await ElMessageBox.confirm(
      '确定要重启系统吗？这将断开所有连接。',
      '重启系统',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.system.restart()
    ElMessage.success('系统正在重启...')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重启系统失败')
    }
  }
}

// 定时刷新数据
let refreshTimer: NodeJS.Timeout | null = null

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    loadDashboardData()
    loadMonitorData()
  }, 30000) // 30秒刷新一次
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 生命周期
onMounted(async () => {
  await loadDashboardData()
  initCharts()
  await loadMonitorData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
  systemChartInstance?.dispose()
  messageChartInstance?.dispose()
  window.removeEventListener('resize', () => {
    systemChartInstance?.resize()
    messageChartInstance?.resize()
  })
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  background: var(--el-bg-color-page);
  min-height: calc(100vh - 60px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stat-icon.users {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.plugins {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.messages {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.system {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.stat-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-change.positive {
  color: var(--el-color-success);
}

.stat-change .active {
  color: var(--el-color-primary);
}

.stat-change .status.healthy {
  color: var(--el-color-success);
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  border: none;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.detail-card {
  border: none;
  border-radius: 12px;
}

.online-users {
  max-height: 300px;
  overflow-y: auto;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.user-item:last-child {
  border-bottom: none;
}

.user-info {
  flex: 1;
  margin-left: 12px;
}

.username {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.login-time {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.user-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 8px;
}

.user-status.online {
  background: var(--el-color-success);
}

.more-users {
  text-align: center;
  padding: 12px;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.recent-logs {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.log-item:last-child {
  border-bottom: none;
}

.log-level {
  margin-right: 12px;
}

.log-content {
  flex: 1;
}

.log-message {
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.log-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.system-status {
  space-y: 16px;
}

.status-item {
  margin-bottom: 16px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.status-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-align: right;
  margin-top: 4px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.quick-actions .el-button {
  height: 48px;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 12px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .stat-content {
    padding: 8px;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style>