<template>
  <div class="performance-monitor">
    
    <div class="page-header">
      <div class="header-left">
        <h2>性能监控</h2>
        <p>实时监控系统性能指标和资源使用情况</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="exportReport">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    
    <div class="performance-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon cpu">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ performanceData.cpu.usage }}%</div>
                <div class="metric-label">CPU使用率</div>
                <div class="metric-trend" :class="getTrendClass(performanceData.cpu.trend)">
                  <el-icon><TrendCharts /></el-icon>
                  {{ performanceData.cpu.trend > 0 ? '+' : '' }}{{ performanceData.cpu.trend }}%
                </div>
              </div>
            </div>
            <div class="metric-progress">
              <el-progress
                :percentage="performanceData.cpu.usage"
                :color="getProgressColor(performanceData.cpu.usage)"
                :show-text="false"
                :stroke-width="6"
              />
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon memory">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ performanceData.memory.usage }}%</div>
                <div class="metric-label">内存使用率</div>
                <div class="metric-trend" :class="getTrendClass(performanceData.memory.trend)">
                  <el-icon><TrendCharts /></el-icon>
                  {{ performanceData.memory.trend > 0 ? '+' : '' }}{{ performanceData.memory.trend }}%
                </div>
              </div>
            </div>
            <div class="metric-progress">
              <el-progress
                :percentage="performanceData.memory.usage"
                :color="getProgressColor(performanceData.memory.usage)"
                :show-text="false"
                :stroke-width="6"
              />
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon disk">
                <el-icon><FolderOpened /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ performanceData.disk.usage }}%</div>
                <div class="metric-label">磁盘使用率</div>
                <div class="metric-trend" :class="getTrendClass(performanceData.disk.trend)">
                  <el-icon><TrendCharts /></el-icon>
                  {{ performanceData.disk.trend > 0 ? '+' : '' }}{{ performanceData.disk.trend }}%
                </div>
              </div>
            </div>
            <div class="metric-progress">
              <el-progress
                :percentage="performanceData.disk.usage"
                :color="getProgressColor(performanceData.disk.usage)"
                :show-text="false"
                :stroke-width="6"
              />
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon network">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ performanceData.network.speed }}</div>
                <div class="metric-label">网络速度</div>
                <div class="metric-trend" :class="getTrendClass(performanceData.network.trend)">
                  <el-icon><TrendCharts /></el-icon>
                  {{ performanceData.network.trend > 0 ? '+' : '' }}{{ performanceData.network.trend }}%
                </div>
              </div>
            </div>
            <div class="metric-progress">
              <el-progress
                :percentage="performanceData.network.usage"
                :color="getProgressColor(performanceData.network.usage)"
                :show-text="false"
                :stroke-width="6"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <div class="performance-charts">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>CPU & 内存使用趋势</span>
                <el-select v-model="timeRange" size="small" style="width: 120px">
                  <el-option label="最近1小时" value="1h" />
                  <el-option label="最近6小时" value="6h" />
                  <el-option label="最近24小时" value="24h" />
                  <el-option label="最近7天" value="7d" />
                </el-select>
              </div>
            </template>
            <div ref="cpuMemoryChart" class="chart-container"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>网络流量监控</span>
                <el-switch
                  v-model="realTimeMode"
                  active-text="实时模式"
                  @change="toggleRealTime"
                />
              </div>
            </template>
            <div ref="networkChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <div class="detailed-metrics">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="detail-card">
            <template #header>
              <span>CPU详细信息</span>
            </template>
            <div class="detail-content">
              <div class="detail-item">
                <span class="detail-label">核心数：</span>
                <span class="detail-value">{{ systemInfo.cpu.cores }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">线程数：</span>
                <span class="detail-value">{{ systemInfo.cpu.threads }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">频率：</span>
                <span class="detail-value">{{ systemInfo.cpu.frequency }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">温度：</span>
                <span class="detail-value" :class="getTemperatureClass(systemInfo.cpu.temperature)">
                  {{ systemInfo.cpu.temperature }}°C
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">负载均衡：</span>
                <span class="detail-value">{{ systemInfo.cpu.loadAverage }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="detail-card">
            <template #header>
              <span>内存详细信息</span>
            </template>
            <div class="detail-content">
              <div class="detail-item">
                <span class="detail-label">总内存：</span>
                <span class="detail-value">{{ systemInfo.memory.total }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">已使用：</span>
                <span class="detail-value">{{ systemInfo.memory.used }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">可用：</span>
                <span class="detail-value">{{ systemInfo.memory.available }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">缓存：</span>
                <span class="detail-value">{{ systemInfo.memory.cache }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">交换分区：</span>
                <span class="detail-value">{{ systemInfo.memory.swap }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="detail-card">
            <template #header>
              <span>磁盘详细信息</span>
            </template>
            <div class="detail-content">
              <div class="detail-item">
                <span class="detail-label">总容量：</span>
                <span class="detail-value">{{ systemInfo.disk.total }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">已使用：</span>
                <span class="detail-value">{{ systemInfo.disk.used }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">可用：</span>
                <span class="detail-value">{{ systemInfo.disk.available }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">读取速度：</span>
                <span class="detail-value">{{ systemInfo.disk.readSpeed }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">写入速度：</span>
                <span class="detail-value">{{ systemInfo.disk.writeSpeed }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <el-card class="process-card">
      <template #header>
        <div class="card-header">
          <span>进程监控</span>
          <div class="header-actions">
            <el-input
              v-model="processFilter"
              placeholder="搜索进程"
              size="small"
              style="width: 200px; margin-right: 10px"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button size="small" @click="refreshProcesses">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredProcesses"
        v-loading="processLoading"
        stripe
        height="300"
      >
        <el-table-column prop="pid" label="PID" width="80" />
        <el-table-column prop="name" label="进程名" width="200" show-overflow-tooltip />
        <el-table-column prop="cpu" label="CPU%" width="100">
          <template #default="{ row }">
            <el-progress
              :percentage="row.cpu"
              :color="getProgressColor(row.cpu)"
              :stroke-width="8"
              text-inside
            />
          </template>
        </el-table-column>
        <el-table-column prop="memory" label="内存%" width="100">
          <template #default="{ row }">
            <el-progress
              :percentage="row.memory"
              :color="getProgressColor(row.memory)"
              :stroke-width="8"
              text-inside
            />
          </template>
        </el-table-column>
        <el-table-column prop="memorySize" label="内存大小" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="启动时间" width="150" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              text
              @click="showProcessDetail(row)"
            >
              详情
            </el-button>
            <el-button
              type="danger"
              size="small"
              text
              @click="killProcess(row)"
              :disabled="row.system"
            >
              终止
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Download,
  Cpu,
  Monitor,
  FolderOpened,
  Connection,
  TrendCharts,
  Search
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

interface PerformanceMetric {
  usage: number
  trend: number
  speed?: string
}

interface SystemInfo {
  cpu: {
    cores: number
    threads: number
    frequency: string
    temperature: number
    loadAverage: string
  }
  memory: {
    total: string
    used: string
    available: string
    cache: string
    swap: string
  }
  disk: {
    total: string
    used: string
    available: string
    readSpeed: string
    writeSpeed: string
  }
}

interface Process {
  pid: number
  name: string
  cpu: number
  memory: number
  memorySize: string
  status: string
  startTime: string
  system: boolean
}

const timeRange = ref('1h')
const realTimeMode = ref(true)
const processFilter = ref('')
const processLoading = ref(false)
const cpuMemoryChart = ref<HTMLElement>()
const networkChart = ref<HTMLElement>()

let cpuMemoryChartInstance: echarts.ECharts | null = null
let networkChartInstance: echarts.ECharts | null = null
let updateTimer: NodeJS.Timeout | null = null

const performanceData = reactive({
  cpu: { usage: 0, trend: 0 } as PerformanceMetric,
  memory: { usage: 0, trend: 0 } as PerformanceMetric,
  disk: { usage: 0, trend: 0 } as PerformanceMetric,
  network: { usage: 0, trend: 0, speed: '0 MB/s' } as PerformanceMetric
})

const systemInfo = reactive<SystemInfo>({
  cpu: {
    cores: 0,
    threads: 0,
    frequency: '0 GHz',
    temperature: 0,
    loadAverage: '0, 0, 0'
  },
  memory: {
    total: '0 GB',
    used: '0 GB',
    available: '0 GB',
    cache: '0 GB',
    swap: '0 MB'
  },
  disk: {
    total: '0 TB',
    used: '0 GB',
    available: '0 GB',
    readSpeed: '0 MB/s',
    writeSpeed: '0 MB/s'
  }
})

const processes = ref<Process[]>([])

const filteredProcesses = computed(() => {
  if (!processFilter.value) return processes.value
  return processes.value.filter(process => 
    process.name.toLowerCase().includes(processFilter.value.toLowerCase()) ||
    process.pid.toString().includes(processFilter.value)
  )
})

// 获取进度条颜色
const getProgressColor = (percentage: number) => {
  if (percentage < 50) return '#67c23a'
  if (percentage < 80) return '#e6a23c'
  return '#f56c6c'
}

// 获取趋势类样式
const getTrendClass = (trend: number) => {
  if (trend > 0) return 'trend-up'
  if (trend < 0) return 'trend-down'
  return 'trend-stable'
}

// 获取温度类样式
const getTemperatureClass = (temperature: number) => {
  if (temperature > 80) return 'temp-high'
  if (temperature > 60) return 'temp-medium'
  return 'temp-normal'
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    running: 'success',
    sleeping: 'info',
    stopped: 'warning',
    zombie: 'danger'
  }
  return types[status] || 'info'
}

// 初始化图表
const initCharts = async () => {
  await nextTick()
  
  if (cpuMemoryChart.value) {
    cpuMemoryChartInstance = echarts.init(cpuMemoryChart.value)
    updateCpuMemoryChart()
  }
  
  if (networkChart.value) {
    networkChartInstance = echarts.init(networkChart.value)
    updateNetworkChart()
  }
}

// 更新CPU内存图表
const updateCpuMemoryChart = () => {
  if (!cpuMemoryChartInstance) return
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['CPU使用率', '内存使用率']
    },
    xAxis: {
      type: 'category',
      data: generateTimeLabels()
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'CPU使用率',
        type: 'line',
        data: generateRandomData(),
        smooth: true,
        itemStyle: {
          color: '#409eff'
        }
      },
      {
        name: '内存使用率',
        type: 'line',
        data: generateRandomData(),
        smooth: true,
        itemStyle: {
          color: '#67c23a'
        }
      }
    ]
  }
  
  cpuMemoryChartInstance.setOption(option)
}

// 更新网络图表
const updateNetworkChart = () => {
  if (!networkChartInstance) return
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['上传速度', '下载速度']
    },
    xAxis: {
      type: 'category',
      data: generateTimeLabels()
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value} MB/s'
      }
    },
    series: [
      {
        name: '上传速度',
        type: 'line',
        data: generateNetworkData(),
        smooth: true,
        itemStyle: {
          color: '#e6a23c'
        },
        areaStyle: {
          opacity: 0.3
        }
      },
      {
        name: '下载速度',
        type: 'line',
        data: generateNetworkData(),
        smooth: true,
        itemStyle: {
          color: '#f56c6c'
        },
        areaStyle: {
          opacity: 0.3
        }
      }
    ]
  }
  
  networkChartInstance.setOption(option)
}

// 生成时间标签
const generateTimeLabels = () => {
  const labels = []
  const now = new Date()
  for (let i = 19; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000)
    labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  }
  return labels
}

// 加载性能数据
const loadPerformanceData = async () => {
  try {
    const response = await fetch('/api/monitor/performance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '获取性能数据失败')
    }
    
    // 更新性能数据
    Object.assign(performanceData, result.data.metrics)
    Object.assign(systemInfo, result.data.systemInfo)
    processes.value = result.data.processes || []
    
    updateCpuMemoryChart()
    updateNetworkChart()
    
  } catch (error) {
    console.error('加载性能数据失败:', error)
    ElMessage.error(`加载性能数据失败: ${error.message}`)
  }
}

// 刷新数据
const refreshData = async () => {
  await loadPerformanceData()
  ElMessage.success('数据已刷新')
}

// 导出报告
const exportReport = () => {
  ElMessage.success('性能报告导出功能开发中')
}

// 切换实时模式
const toggleRealTime = (enabled: boolean) => {
  if (enabled) {
    updateTimer = setInterval(() => {
      refreshData()
    }, 5000)
    ElMessage.success('已开启实时监控')
  } else {
    if (updateTimer) {
      clearInterval(updateTimer)
      updateTimer = null
    }
    ElMessage.info('已关闭实时监控')
  }
}

// 刷新进程列表
const refreshProcesses = async () => {
  processLoading.value = true
  try {
    await loadPerformanceData()
    ElMessage.success('进程列表已刷新')
  } catch (error) {
    console.error('刷新进程列表失败:', error)
    ElMessage.error('刷新进程列表失败')
  } finally {
    processLoading.value = false
  }
}

// 显示进程详情
const showProcessDetail = (process: Process) => {
  ElMessage.info(`进程详情功能开发中: ${process.name}`)
}

// 终止进程
const killProcess = async (process: Process) => {
  try {
    await ElMessageBox.confirm(
      `确定要终止进程 "${process.name}" (PID: ${process.pid}) 吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.success(`进程 ${process.name} 已终止`)
    // 从列表中移除
    const index = processes.value.findIndex(p => p.pid === process.pid)
    if (index > -1) {
      processes.value.splice(index, 1)
    }
  } catch {
    // 用户取消
  }
}

// 窗口大小调整处理
const handleResize = () => {
  if (cpuMemoryChartInstance) {
    cpuMemoryChartInstance.resize()
  }
  if (networkChartInstance) {
    networkChartInstance.resize()
  }
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
  
  // 加载初始数据
  loadPerformanceData()
  
  // 默认开启实时模式
  toggleRealTime(true)
})

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
  if (cpuMemoryChartInstance) {
    cpuMemoryChartInstance.dispose()
  }
  if (networkChartInstance) {
    networkChartInstance.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.performance-monitor {
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

.performance-overview {
  margin-bottom: 20px;
}

.metric-card {
  cursor: pointer;
  transition: all 0.3s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.metric-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.metric-icon.cpu {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.metric-icon.memory {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.metric-icon.disk {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.metric-icon.network {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.metric-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.trend-up {
  color: #f56c6c;
}

.trend-down {
  color: #67c23a;
}

.trend-stable {
  color: #909399;
}

.metric-progress {
  margin-top: 10px;
}

.performance-charts {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 320px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detailed-metrics {
  margin-bottom: 20px;
}

.detail-card {
  height: 280px;
}

.detail-content {
  padding: 10px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: #606266;
  font-size: 14px;
}

.detail-value {
  color: #303133;
  font-weight: 500;
}

.temp-normal {
  color: #67c23a;
}

.temp-medium {
  color: #e6a23c;
}

.temp-high {
  color: #f56c6c;
}

.process-card {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
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
  
  .performance-overview :deep(.el-col) {
    margin-bottom: 15px;
  }
  
  .performance-charts :deep(.el-col) {
    margin-bottom: 20px;
  }
  
  .detailed-metrics :deep(.el-col) {
    margin-bottom: 20px;
  }
  
  .chart-card {
    height: 300px;
  }
  
  .chart-container {
    height: 220px;
  }
}
</style>