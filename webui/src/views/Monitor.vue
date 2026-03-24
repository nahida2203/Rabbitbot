<template>
  <div class="monitor-container">
    
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">系统监控</h1>
        <p class="page-description">实时监控系统运行状态</p>
      </div>
      <div class="header-right">
        <el-switch
          v-model="autoRefresh"
          @change="toggleAutoRefresh"
          active-text="自动刷新"
        />
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    
    <div class="overview-grid">
      <el-card class="overview-card" shadow="hover">
        <div class="overview-content">
          <div class="overview-icon cpu">
            <el-icon><Cpu /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-label">CPU 使用率</div>
            <div class="overview-value">{{ systemInfo.cpu?.usage || 0 }}%</div>
            <div class="overview-detail">
              {{ systemInfo.cpu?.cores || 0 }} 核心 @ {{ systemInfo.cpu?.speed || 0 }}GHz
            </div>
          </div>
          <div class="overview-chart">
            <el-progress
              type="circle"
              :percentage="systemInfo.cpu?.usage || 0"
              :width="60"
              :stroke-width="6"
              :color="getProgressColor(systemInfo.cpu?.usage || 0)"
            />
          </div>
        </div>
      </el-card>
      
      <el-card class="overview-card" shadow="hover">
        <div class="overview-content">
          <div class="overview-icon memory">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-label">内存使用率</div>
            <div class="overview-value">{{ systemInfo.memory?.usage || 0 }}%</div>
            <div class="overview-detail">
              {{ formatBytes(systemInfo.memory?.used || 0) }} / {{ formatBytes(systemInfo.memory?.total || 0) }}
            </div>
          </div>
          <div class="overview-chart">
            <el-progress
              type="circle"
              :percentage="systemInfo.memory?.usage || 0"
              :width="60"
              :stroke-width="6"
              :color="getProgressColor(systemInfo.memory?.usage || 0)"
            />
          </div>
        </div>
      </el-card>
      
      <el-card class="overview-card" shadow="hover">
        <div class="overview-content">
          <div class="overview-icon disk">
            <el-icon><FolderOpened /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-label">磁盘使用率</div>
            <div class="overview-value">{{ systemInfo.disk?.usage || 0 }}%</div>
            <div class="overview-detail">
              {{ formatBytes(systemInfo.disk?.used || 0) }} / {{ formatBytes(systemInfo.disk?.total || 0) }}
            </div>
          </div>
          <div class="overview-chart">
            <el-progress
              type="circle"
              :percentage="systemInfo.disk?.usage || 0"
              :width="60"
              :stroke-width="6"
              :color="getProgressColor(systemInfo.disk?.usage || 0)"
            />
          </div>
        </div>
      </el-card>
      
      <el-card class="overview-card" shadow="hover">
        <div class="overview-content">
          <div class="overview-icon network">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-label">网络连接</div>
            <div class="overview-value">{{ systemInfo.network?.connections || 0 }}</div>
            <div class="overview-detail">
              ↑{{ formatBytes(systemInfo.network?.upload || 0) }}/s ↓{{ formatBytes(systemInfo.network?.download || 0) }}/s
            </div>
          </div>
          <div class="overview-chart">
            <div class="network-status" :class="{ active: systemInfo.network?.status === 'connected' }">
              <el-icon><CircleCheck /></el-icon>
            </div>
          </div>
        </div>
      </el-card>
    </div>
    
    
    <div class="charts-grid">
      
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <h3>CPU 使用率趋势</h3>
            <el-select v-model="cpuTimeRange" @change="updateCpuChart">
              <el-option label="最近1小时" value="1h" />
              <el-option label="最近6小时" value="6h" />
              <el-option label="最近24小时" value="24h" />
            </el-select>
          </div>
        </template>
        <div ref="cpuChartRef" class="chart-container"></div>
      </el-card>
      
      
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <h3>内存使用率趋势</h3>
            <el-select v-model="memoryTimeRange" @change="updateMemoryChart">
              <el-option label="最近1小时" value="1h" />
              <el-option label="最近6小时" value="6h" />
              <el-option label="最近24小时" value="24h" />
            </el-select>
          </div>
        </template>
        <div ref="memoryChartRef" class="chart-container"></div>
      </el-card>
    </div>
    
    
    <el-card class="chart-card full-width" shadow="never">
      <template #header>
        <div class="chart-header">
          <h3>网络流量监控</h3>
          <el-select v-model="networkTimeRange" @change="updateNetworkChart">
            <el-option label="最近1小时" value="1h" />
            <el-option label="最近6小时" value="6h" />
            <el-option label="最近24小时" value="24h" />
          </el-select>
        </div>
      </template>
      <div ref="networkChartRef" class="chart-container"></div>
    </el-card>
    
    
    <el-card class="process-card" shadow="never">
      <template #header>
        <div class="process-header">
          <h3>进程监控</h3>
          <div class="process-actions">
            <el-input
              v-model="processSearch"
              placeholder="搜索进程"
              prefix-icon="Search"
              clearable
              class="process-search"
            />
            <el-button @click="refreshProcesses">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table
        :data="filteredProcesses"
        stripe
        :default-sort="{ prop: 'cpu', order: 'descending' }"
        class="process-table"
      >
        <el-table-column prop="pid" label="PID" width="80" sortable />
        <el-table-column prop="name" label="进程名" min-width="200" sortable />
        <el-table-column prop="cpu" label="CPU (%)" width="100" sortable>
          <template #default="{ row }">
            <el-tag
              :type="row.cpu > 80 ? 'danger' : row.cpu > 50 ? 'warning' : 'success'"
              size="small"
            >
              {{ row.cpu }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="memory" label="内存" width="120" sortable>
          <template #default="{ row }">
            {{ formatBytes(row.memory) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" sortable>
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'running' ? 'success' : 'info'"
              size="small"
            >
              {{ getProcessStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="启动时间" width="150" sortable>
          <template #default="{ row }">
            {{ formatTime(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              text
              @click="killProcess(row)"
              :disabled="row.pid === currentPid"
            >
              终止
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    
    <div class="info-grid">
      <el-card class="info-card" shadow="never">
        <template #header>
          <h3>系统信息</h3>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作系统">
            {{ systemInfo.os?.platform }} {{ systemInfo.os?.release }}
          </el-descriptions-item>
          <el-descriptions-item label="架构">
            {{ systemInfo.os?.arch }}
          </el-descriptions-item>
          <el-descriptions-item label="主机名">
            {{ systemInfo.os?.hostname }}
          </el-descriptions-item>
          <el-descriptions-item label="运行时间">
            {{ formatUptime(systemInfo.os?.uptime || 0) }}
          </el-descriptions-item>
          <el-descriptions-item label="Node.js 版本">
            {{ systemInfo.runtime?.nodeVersion }}
          </el-descriptions-item>
          <el-descriptions-item label="V8 版本">
            {{ systemInfo.runtime?.v8Version }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
      
      <el-card class="info-card" shadow="never">
        <template #header>
          <h3>网络接口</h3>
        </template>
        <div class="network-interfaces">
          <div
            v-for="interface in systemInfo.network?.interfaces"
            :key="interface.name"
            class="interface-item"
          >
            <div class="interface-header">
              <span class="interface-name">{{ interface.name }}</span>
              <el-tag
                :type="interface.status === 'up' ? 'success' : 'info'"
                size="small"
              >
                {{ interface.status }}
              </el-tag>
            </div>
            <div class="interface-details">
              <div class="interface-ip">
                <span class="label">IPv4:</span>
                <span class="value">{{ interface.ipv4 || 'N/A' }}</span>
              </div>
              <div class="interface-ip">
                <span class="label">IPv6:</span>
                <span class="value">{{ interface.ipv6 || 'N/A' }}</span>
              </div>
              <div class="interface-mac">
                <span class="label">MAC:</span>
                <span class="value">{{ interface.mac || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Cpu,
  Monitor,
  FolderOpened,
  Connection,
  CircleCheck,
  Search
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/api'
import { formatBytes, formatTime, debounce } from '@/utils'
import type { SystemInfo, MonitorData } from '@/types'

// 响应式数据
const systemInfo = ref<SystemInfo>({
  cpu: { usage: 0, cores: 0, speed: 0 },
  memory: { usage: 0, total: 0, used: 0, free: 0 },
  disk: { usage: 0, total: 0, used: 0, free: 0 },
  network: { connections: 0, upload: 0, download: 0, status: 'disconnected', interfaces: [] },
  os: { platform: '', release: '', arch: '', hostname: '', uptime: 0 },
  runtime: { nodeVersion: '', v8Version: '' }
})

const processes = ref<Array<{
  pid: number
  name: string
  cpu: number
  memory: number
  status: string
  startTime: string
}>>([])

const monitorData = ref<MonitorData[]>([])
const autoRefresh = ref(true)
const refreshTimer = ref<number | null>(null)
const currentPid = ref(process.pid || 0)

// 图表相关
const cpuChartRef = ref()
const memoryChartRef = ref()
const networkChartRef = ref()
const cpuChart = ref<echarts.ECharts | null>(null)
const memoryChart = ref<echarts.ECharts | null>(null)
const networkChart = ref<echarts.ECharts | null>(null)

// 时间范围
const cpuTimeRange = ref('1h')
const memoryTimeRange = ref('1h')
const networkTimeRange = ref('1h')

// 进程搜索
const processSearch = ref('')

// 计算属性
const filteredProcesses = computed(() => {
  if (!processSearch.value) return processes.value
  
  const keyword = processSearch.value.toLowerCase()
  return processes.value.filter(process => 
    process.name.toLowerCase().includes(keyword) ||
    process.pid.toString().includes(keyword)
  )
})

// 获取进度条颜色
function getProgressColor(percentage: number) {
  if (percentage < 50) return '#67c23a'
  if (percentage < 80) return '#e6a23c'
  return '#f56c6c'
}

// 格式化运行时间
function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 获取进程状态文本
function getProcessStatusText(status: string) {
  const statusMap: Record<string, string> = {
    running: '运行中',
    sleeping: '休眠',
    stopped: '已停止',
    zombie: '僵尸进程'
  }
  return statusMap[status] || status
}

// 切换自动刷新
function toggleAutoRefresh(enabled: boolean) {
  if (enabled) {
    refreshTimer.value = window.setInterval(() => {
      refreshData()
    }, 5000) // 每5秒刷新一次
  } else {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
      refreshTimer.value = null
    }
  }
}

// 刷新数据
async function refreshData() {
  try {
    const [systemRes, processRes, monitorRes] = await Promise.all([
      api.monitor.getSystemInfo(),
      api.monitor.getProcesses(),
      api.monitor.getMonitorData({ timeRange: '1h' })
    ])
    
    systemInfo.value = systemRes.data.data
    processes.value = processRes.data.data
    monitorData.value = monitorRes.data.data
    
    // 更新图表
    updateCharts()
  } catch (error) {
    console.error('刷新监控数据失败:', error)
  }
}

// 刷新进程列表
async function refreshProcesses() {
  try {
    const res = await api.monitor.getProcesses()
    processes.value = res.data.data
  } catch (error) {
    console.error('刷新进程列表失败:', error)
    ElMessage.error('刷新进程列表失败')
  }
}

// 终止进程
async function killProcess(process: any) {
  try {
    await ElMessageBox.confirm(
      `确定要终止进程 "${process.name}" (PID: ${process.pid}) 吗？`,
      '终止进程',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.monitor.killProcess(process.pid)
    
    ElMessage.success('进程已终止')
    await refreshProcesses()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('终止进程失败:', error)
      ElMessage.error('终止进程失败')
    }
  }
}

// 初始化图表
function initCharts() {
  nextTick(() => {
    // CPU 图表
    if (cpuChartRef.value) {
      cpuChart.value = echarts.init(cpuChartRef.value)
      updateCpuChart()
    }
    
    // 内存图表
    if (memoryChartRef.value) {
      memoryChart.value = echarts.init(memoryChartRef.value)
      updateMemoryChart()
    }
    
    // 网络图表
    if (networkChartRef.value) {
      networkChart.value = echarts.init(networkChartRef.value)
      updateNetworkChart()
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
  })
}

// 更新所有图表
function updateCharts() {
  updateCpuChart()
  updateMemoryChart()
  updateNetworkChart()
}

// 更新 CPU 图表
function updateCpuChart() {
  if (!cpuChart.value) return
  
  const data = monitorData.value.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    value: item.cpu
  }))
  
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>CPU: {c}%'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.time),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [{
      name: 'CPU',
      type: 'line',
      data: data.map(item => item.value),
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
        ])
      },
      lineStyle: {
        color: '#409eff'
      }
    }],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }
  
  cpuChart.value.setOption(option)
}

// 更新内存图表
function updateMemoryChart() {
  if (!memoryChart.value) return
  
  const data = monitorData.value.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    value: item.memory
  }))
  
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>内存: {c}%'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.time),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [{
      name: '内存',
      type: 'line',
      data: data.map(item => item.value),
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
          { offset: 1, color: 'rgba(103, 194, 58, 0.1)' }
        ])
      },
      lineStyle: {
        color: '#67c23a'
      }
    }],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }
  
  memoryChart.value.setOption(option)
}

// 更新网络图表
function updateNetworkChart() {
  if (!networkChart.value) return
  
  const data = monitorData.value.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    upload: item.network?.upload || 0,
    download: item.network?.download || 0
  }))
  
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const time = params[0].axisValue
        const upload = formatBytes(params[0].value)
        const download = formatBytes(params[1].value)
        return `${time}<br/>上传: ${upload}/s<br/>下载: ${download}/s`
      }
    },
    legend: {
      data: ['上传', '下载']
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.time),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: function(value: number) {
          return formatBytes(value) + '/s'
        }
      }
    },
    series: [
      {
        name: '上传',
        type: 'line',
        data: data.map(item => item.upload),
        smooth: true,
        lineStyle: {
          color: '#e6a23c'
        }
      },
      {
        name: '下载',
        type: 'line',
        data: data.map(item => item.download),
        smooth: true,
        lineStyle: {
          color: '#f56c6c'
        }
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }
  
  networkChart.value.setOption(option)
}

// 处理窗口大小变化
function handleResize() {
  cpuChart.value?.resize()
  memoryChart.value?.resize()
  networkChart.value?.resize()
}

// 页面加载
onMounted(() => {
  refreshData()
  initCharts()
  toggleAutoRefresh(true)
})

// 页面卸载
onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
  
  window.removeEventListener('resize', handleResize)
  
  cpuChart.value?.dispose()
  memoryChart.value?.dispose()
  networkChart.value?.dispose()
})
</script>

<style scoped>
.monitor-container {
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
  gap: 16px;
  align-items: center;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.overview-card {
  border: none;
  border-radius: 12px;
}

.overview-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.overview-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}

.overview-icon.cpu {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.overview-icon.memory {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.overview-icon.disk {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.overview-icon.network {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.overview-info {
  flex: 1;
}

.overview-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
}

.overview-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.overview-detail {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.overview-chart {
  flex-shrink: 0;
}

.network-status {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  transition: all 0.3s;
}

.network-status.active {
  background: var(--el-color-success);
  color: white;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  border: none;
  border-radius: 8px;
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-container {
  height: 300px;
  width: 100%;
}

.process-card {
  border: none;
  border-radius: 8px;
  margin-bottom: 24px;
}

.process-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.process-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.process-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.process-search {
  width: 200px;
}

.process-table {
  margin-top: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.info-card {
  border: none;
  border-radius: 8px;
}

.info-card h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.network-interfaces {
  max-height: 300px;
  overflow-y: auto;
}

.interface-item {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  margin-bottom: 8px;
}

.interface-item:last-child {
  margin-bottom: 0;
}

.interface-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.interface-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.interface-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.interface-ip,
.interface-mac {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.interface-ip .label,
.interface-mac .label {
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.interface-ip .value,
.interface-mac .value {
  color: var(--el-text-color-primary);
  font-family: 'Courier New', monospace;
}

@media (max-width: 768px) {
  .monitor-container {
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
  
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .overview-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .overview-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }
  
  .overview-value {
    font-size: 24px;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .process-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .process-actions {
    justify-content: space-between;
  }
  
  .process-search {
    flex: 1;
    max-width: none;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .interface-details {
    grid-template-columns: 1fr;
  }
}
</style>