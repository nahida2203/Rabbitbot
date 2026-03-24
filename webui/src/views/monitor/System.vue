<template>
  <div class="system-monitor">
    
    <div class="page-header">
      <h2>系统监控</h2>
      <p>实时监控系统运行状态和性能指标</p>
    </div>

    
    <el-row :gutter="20" class="status-row">
      <el-col :span="6">
        <el-card class="status-card cpu">
          <div class="status-content">
            <div class="status-icon">
              <el-icon size="24"><Cpu /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ systemStatus.cpu }}%</div>
              <div class="status-label">CPU使用率</div>
            </div>
          </div>
          <div class="status-progress">
            <el-progress :percentage="systemStatus.cpu" :show-text="false" :stroke-width="6" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="status-card memory">
          <div class="status-content">
            <div class="status-icon">
              <el-icon size="24"><Monitor /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ systemStatus.memory }}%</div>
              <div class="status-label">内存使用率</div>
            </div>
          </div>
          <div class="status-progress">
            <el-progress :percentage="systemStatus.memory" :show-text="false" :stroke-width="6" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="status-card disk">
          <div class="status-content">
            <div class="status-icon">
              <el-icon size="24"><Coin /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ systemStatus.disk }}%</div>
              <div class="status-label">磁盘使用率</div>
            </div>
          </div>
          <div class="status-progress">
            <el-progress :percentage="systemStatus.disk" :show-text="false" :stroke-width="6" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="status-card network">
          <div class="status-content">
            <div class="status-icon">
              <el-icon size="24"><Connection /></el-icon>
            </div>
            <div class="status-info">
              <div class="status-value">{{ systemStatus.network }}</div>
              <div class="status-label">网络状态</div>
            </div>
          </div>
          <div class="status-indicator">
            <el-tag :type="getNetworkTagType(systemStatus.network)" size="small">
              {{ systemStatus.network }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>CPU & 内存使用趋势</span>
              <el-button-group size="small">
                <el-button :type="timeRange === '1h' ? 'primary' : ''" @click="timeRange = '1h'">1小时</el-button>
                <el-button :type="timeRange === '6h' ? 'primary' : ''" @click="timeRange = '6h'">6小时</el-button>
                <el-button :type="timeRange === '24h' ? 'primary' : ''" @click="timeRange = '24h'">24小时</el-button>
              </el-button-group>
            </div>
          </template>
          <div class="chart-container">
            <div ref="cpuMemoryChartRef" class="chart-canvas"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>网络流量</span>
          </template>
          <div class="chart-container">
            <div ref="networkChartRef" class="chart-canvas"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-row :gutter="20" class="info-row">
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>系统信息</span>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="操作系统">{{ systemInfo.os }}</el-descriptions-item>
            <el-descriptions-item label="系统版本">{{ systemInfo.version }}</el-descriptions-item>
            <el-descriptions-item label="架构">{{ systemInfo.arch }}</el-descriptions-item>
            <el-descriptions-item label="主机名">{{ systemInfo.hostname }}</el-descriptions-item>
            <el-descriptions-item label="运行时间">{{ systemInfo.uptime }}</el-descriptions-item>
            <el-descriptions-item label="负载均衡">{{ systemInfo.loadAverage }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>硬件信息</span>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="CPU型号">{{ hardwareInfo.cpu }}</el-descriptions-item>
            <el-descriptions-item label="CPU核心数">{{ hardwareInfo.cores }}</el-descriptions-item>
            <el-descriptions-item label="总内存">{{ hardwareInfo.totalMemory }}</el-descriptions-item>
            <el-descriptions-item label="可用内存">{{ hardwareInfo.freeMemory }}</el-descriptions-item>
            <el-descriptions-item label="总磁盘">{{ hardwareInfo.totalDisk }}</el-descriptions-item>
            <el-descriptions-item label="可用磁盘">{{ hardwareInfo.freeDisk }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>进程信息</span>
          </template>
          <div class="process-list">
            <div v-for="(process, index) in topProcesses" :key="index" class="process-item">
              <div class="process-name">{{ process.name }}</div>
              <div class="process-stats">
                <span class="cpu-usage">CPU: {{ process.cpu }}%</span>
                <span class="memory-usage">内存: {{ process.memory }}%</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-row :gutter="20" class="services-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>服务状态</span>
              <el-button size="small" @click="refreshServices">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>
          <el-table :data="services" style="width: 100%" size="small">
            <el-table-column prop="name" label="服务名称" width="150" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="getServiceTagType(row.status)" size="small">
                  {{ getServiceStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="port" label="端口" width="80" />
            <el-table-column prop="uptime" label="运行时间" width="120" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'running'"
                  type="danger"
                  size="small"
                  @click="stopService(row)"
                >
                  停止
                </el-button>
                <el-button
                  v-else
                  type="success"
                  size="small"
                  @click="startService(row)"
                >
                  启动
                </el-button>
                <el-button type="warning" size="small" @click="restartService(row)">
                  重启
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>系统日志</span>
              <el-button size="small" @click="clearLogs">
                <el-icon><Delete /></el-icon>
                清空
              </el-button>
            </div>
          </template>
          <div class="log-container">
            <div v-for="(log, index) in systemLogs" :key="index" class="log-item" :class="log.level">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-level">[{{ log.levelLabel }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-row :gutter="20" class="alerts-row">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>监控警报</span>
              <el-button type="primary" size="small" @click="showAlertDialog = true">
                <el-icon><Plus /></el-icon>
                添加警报
              </el-button>
            </div>
          </template>
          <el-table :data="alerts" style="width: 100%" size="small">
            <el-table-column prop="name" label="警报名称" width="150" />
            <el-table-column prop="metric" label="监控指标" width="120" />
            <el-table-column prop="condition" label="触发条件" width="150" />
            <el-table-column prop="threshold" label="阈值" width="100" />
            <el-table-column prop="enabled" label="状态" width="80">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" @change="toggleAlert(row)" />
              </template>
            </el-table-column>
            <el-table-column prop="lastTriggered" label="最后触发" width="180" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="text" size="small" @click="editAlert(row)">
                  编辑
                </el-button>
                <el-button type="text" size="small" @click="deleteAlert(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    
    <el-dialog v-model="showAlertDialog" title="警报设置" width="600px">
      <el-form :model="alertForm" label-width="100px">
        <el-form-item label="警报名称">
          <el-input v-model="alertForm.name" placeholder="请输入警报名称" />
        </el-form-item>
        <el-form-item label="监控指标">
          <el-select v-model="alertForm.metric" placeholder="请选择监控指标">
            <el-option label="CPU使用率" value="cpu" />
            <el-option label="内存使用率" value="memory" />
            <el-option label="磁盘使用率" value="disk" />
            <el-option label="网络延迟" value="network" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发条件">
          <el-select v-model="alertForm.condition" placeholder="请选择触发条件">
            <el-option label="大于" value="gt" />
            <el-option label="小于" value="lt" />
            <el-option label="等于" value="eq" />
          </el-select>
        </el-form-item>
        <el-form-item label="阈值">
          <el-input-number v-model="alertForm.threshold" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="通知方式">
          <el-checkbox-group v-model="alertForm.notifications">
            <el-checkbox label="email">邮件</el-checkbox>
            <el-checkbox label="sms">短信</el-checkbox>
            <el-checkbox label="webhook">Webhook</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAlertDialog = false">取消</el-button>
          <el-button type="primary" @click="saveAlert">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Cpu, Monitor, Coin, Connection, Refresh, Delete, Plus 
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/api'
import { formatFileSize } from '@/utils'
import type { Log, MonitorData } from '@/types'


const systemStatus = ref({
  cpu: 45,
  memory: 68,
  disk: 32,
  network: 'normal'
})


const systemInfo = ref({
  os: 'Windows 11',
  version: '22H2',
  arch: 'x64',
  hostname: 'YUNZAI-SERVER',
  uptime: '5天 12小时 30分钟',
  loadAverage: '0.45, 0.52, 0.48'
})


const hardwareInfo = ref({
  cpu: 'Intel Core i7-12700K',
  cores: '12核心 20线程',
  totalMemory: 'N/A',
  freeMemory: 'N/A',
  totalDisk: 'N/A',
  freeDisk: 'N/A'
})


const topProcesses = ref([
  { name: 'yunzai.exe', cpu: 15.2, memory: 8.5 },
  { name: 'node.exe', cpu: 12.8, memory: 6.2 },
  { name: 'chrome.exe', cpu: 8.4, memory: 12.1 },
  { name: 'vscode.exe', cpu: 5.6, memory: 4.8 },
  { name: 'system', cpu: 3.2, memory: 2.1 }
])


const services = ref([
  { name: 'Yunzai-Bot', status: 'running', port: 3000, uptime: '2天 5小时' },
  { name: 'Redis', status: 'running', port: 6379, uptime: '5天 12小时' },
  { name: 'MongoDB', status: 'stopped', port: 27017, uptime: '-' },
  { name: 'Nginx', status: 'running', port: 80, uptime: '5天 12小时' }
])


const systemLogs = ref<Array<{
  time: string
  level: 'info' | 'warning' | 'error'
  levelLabel: string
  message: string
}>>([])


const alerts = ref([
  {
    name: 'CPU高使用率警报',
    metric: 'cpu',
    condition: 'gt',
    threshold: 80,
    enabled: true,
    lastTriggered: '2024-01-15 14:29:10'
  },
  {
    name: '内存不足警报',
    metric: 'memory',
    condition: 'gt',
    threshold: 90,
    enabled: true,
    lastTriggered: '-'
  },
  {
    name: '磁盘空间警报',
    metric: 'disk',
    condition: 'gt',
    threshold: 85,
    enabled: false,
    lastTriggered: '-'
  }
])


const timeRange = ref('1h')


const cpuMemoryChartRef = ref<HTMLElement | null>(null)
const networkChartRef = ref<HTMLElement | null>(null)
let cpuMemoryChartInstance: echarts.ECharts | null = null
let networkChartInstance: echarts.ECharts | null = null
const monitorData = ref<MonitorData[]>([])

const fetchMonitorData = async () => {
  try {
    const realtimeRes = await api.monitor.getRealTimeData()
    const realtimeData = realtimeRes.data?.data
    monitorData.value = realtimeData ? [realtimeData] : []
  } catch (error) {
    console.error('获取实时监控数据失败:', error)
    monitorData.value = []
  }
}

const normalizeLogLevel = (level?: string) => {
  if (level === 'error' || level === 'fatal') {
    return { level: 'error' as const, label: level?.toUpperCase() || 'ERROR' }
  }

  if (level === 'warn' || level === 'warning') {
    return { level: 'warning' as const, label: 'WARNING' }
  }

  return { level: 'info' as const, label: level?.toUpperCase() || 'INFO' }
}

const toPercent = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const toFileSizeText = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? formatFileSize(value) : 'N/A'
}

const formatRate = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${formatFileSize(value)}/s` : '0 B/s'
}

const fetchSystemLogs = async () => {
  try {
    const res = await api.log.getLogs({ page: 1, size: 20 })
    const items = Array.isArray(res.data?.data?.items) ? res.data.data.items : []

    systemLogs.value = items.map((log: Log) => {
      const normalized = normalizeLogLevel(log.level)
      const timestamp = log.createdAt || ''
      return {
        time: timestamp ? new Date(timestamp).toLocaleTimeString() : '--:--:--',
        level: normalized.level,
        levelLabel: normalized.label,
        message: log.message || ''
      }
    })
  } catch (error) {
    console.error('获取系统日志失败:', error)
    systemLogs.value = []
  }
}

const fetchSystemInfo = async () => {
  try {
    const res = await api.monitor.getSystemInfo()
    const data: any = res.data?.data
    const systemData = data?.system || data
    const osData = systemData?.os || {}
    const hardwareData = systemData?.hardware || {}
    const cpuData = hardwareData?.cpu || systemData?.cpu || {}
    const memoryData = hardwareData?.memory || systemData?.memory || {}
    const diskData = hardwareData?.disk || systemData?.disk || {}
    const networkData = systemData?.network || {}

    const cpuUsage = toPercent(systemData?.cpuUsage ?? cpuData?.usage)
    const memoryUsage = toPercent(systemData?.memoryUsage ?? memoryData?.usage)
    const diskUsage = toPercent(systemData?.diskUsage ?? diskData?.usage)
    const memoryTotal = memoryData?.total
    const memoryFree = memoryData?.available ?? memoryData?.free
    const diskTotal = diskData?.total
    const diskFree = diskData?.available ?? diskData?.free
    const osUptimeRaw = systemData?.bootTime
    const uptimeText = typeof systemData?.uptime === 'string'
      ? systemData.uptime
      : typeof osData?.uptime === 'number'
        ? `${Math.floor(osData.uptime / 86400)}天 ${Math.floor((osData.uptime % 86400) / 3600)}小时`
        : typeof osUptimeRaw === 'number'
          ? `${Math.floor((Date.now() - osUptimeRaw) / 86400000)}天 ${Math.floor(((Date.now() - osUptimeRaw) % 86400000) / 3600000)}小时`
          : 'N/A'

    systemStatus.value = {
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskUsage,
      network: typeof networkData?.connections === 'number' ? `${networkData.connections}` : systemStatus.value.network
    }

    systemInfo.value = {
      os: osData?.platform || osData?.name || 'N/A',
      version: osData?.version || 'N/A',
      arch: osData?.arch || 'N/A',
      hostname: osData?.hostname || 'N/A',
      uptime: uptimeText,
      loadAverage: Array.isArray(cpuData?.loadAverage) ? cpuData.loadAverage.join(', ') : 'N/A'
    }

    hardwareInfo.value = {
      ...hardwareInfo.value,
      cpu: cpuData?.model || hardwareInfo.value.cpu,
      cores: typeof cpuData?.cores === 'number' ? `${cpuData.cores}核心${typeof cpuData?.threads === 'number' ? ` ${cpuData.threads}线程` : ''}` : hardwareInfo.value.cores,
      totalMemory: toFileSizeText(memoryTotal),
      freeMemory: toFileSizeText(memoryFree),
      totalDisk: toFileSizeText(diskTotal),
      freeDisk: toFileSizeText(diskFree)
    }

    if (!monitorData.value.length) {
      monitorData.value = [
        {
          timestamp: Date.now(),
          cpu: cpuUsage,
          memory: memoryUsage,
          disk: diskUsage,
          network: {
            rx: typeof networkData?.rx === 'number' ? networkData.rx : 0,
            tx: typeof networkData?.tx === 'number' ? networkData.tx : 0
          },
          connections: typeof networkData?.connections === 'number' ? networkData.connections : 0,
          requests: 0,
          errors: 0
        }
      ]
    }
  } catch (error) {
    console.error('获取系统信息失败:', error)
    hardwareInfo.value = {
      ...hardwareInfo.value,
      totalMemory: 'N/A',
      freeMemory: 'N/A',
      totalDisk: 'N/A',
      freeDisk: 'N/A'
    }
  }
}

const updateCpuMemoryChart = () => {
  if (!cpuMemoryChartInstance) return

  const labels = monitorData.value.map(item => new Date(item.timestamp).toLocaleTimeString())
  const cpuSeries = monitorData.value.map(item => item.cpu)
  const memSeries = monitorData.value.map(item => item.memory)

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['CPU使用率', '内存使用率'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      { name: 'CPU使用率', type: 'line', smooth: true, data: cpuSeries },
      { name: '内存使用率', type: 'line', smooth: true, data: memSeries }
    ]
  }

  cpuMemoryChartInstance.setOption(option, true)
}

const updateNetworkChart = () => {
  if (!networkChartInstance) return

  const labels = monitorData.value.map(item => new Date(item.timestamp).toLocaleTimeString())
  const uploadSeries = monitorData.value.map(item => item.network?.tx || 0)
  const downloadSeries = monitorData.value.map(item => item.network?.rx || 0)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const time = params?.[0]?.axisValue ?? ''
        const up = formatRate(params?.[0]?.value)
        const down = formatRate(params?.[1]?.value)
        return `${time}<br/>上传: ${up}<br/>下载: ${down}`
      }
    },
    legend: { data: ['上传', '下载'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatRate(value)
      }
    },
    series: [
      { name: '上传', type: 'line', smooth: true, data: uploadSeries },
      { name: '下载', type: 'line', smooth: true, data: downloadSeries }
    ]
  }

  networkChartInstance.setOption(option, true)
}

const initCharts = async () => {
  await nextTick()

  if (cpuMemoryChartRef.value) {
    cpuMemoryChartInstance?.dispose()
    cpuMemoryChartInstance = echarts.init(cpuMemoryChartRef.value)
  }

  if (networkChartRef.value) {
    networkChartInstance?.dispose()
    networkChartInstance = echarts.init(networkChartRef.value)
  }

  updateCpuMemoryChart()
  updateNetworkChart()
}

const handleResize = () => {
  cpuMemoryChartInstance?.resize()
  networkChartInstance?.resize()
}


const showAlertDialog = ref(false)
const alertForm = reactive({
  name: '',
  metric: '',
  condition: '',
  threshold: 0,
  notifications: []
})


let statusTimer: NodeJS.Timeout | null = null


const getNetworkTagType = (status: string) => {
  const typeMap = {
    normal: 'success',
    slow: 'warning',
    error: 'danger'
  }
  return typeMap[status] || ''
}


const getServiceTagType = (status: string) => {
  const typeMap = {
    running: 'success',
    stopped: 'danger',
    error: 'warning'
  }
  return typeMap[status] || ''
}


const getServiceStatusText = (status: string) => {
  const textMap = {
    running: '运行中',
    stopped: '已停止',
    error: '错误'
  }
  return textMap[status] || status
}


const startService = async (service: any) => {
  try {
    
    service.status = 'running'
    service.uptime = '刚刚启动'
    ElMessage.success(`服务 ${service.name} 启动成功`)
  } catch (error) {
    ElMessage.error(`服务 ${service.name} 启动失败`)
  }
}


const stopService = async (service: any) => {
  try {
    await ElMessageBox.confirm(`确定要停止服务 ${service.name} 吗？`, '确认停止', {
      type: 'warning'
    })
    
    
    service.status = 'stopped'
    service.uptime = '-'
    ElMessage.success(`服务 ${service.name} 已停止`)
  } catch {
    
  }
}


const restartService = async (service: any) => {
  try {
    await ElMessageBox.confirm(`确定要重启服务 ${service.name} 吗？`, '确认重启', {
      type: 'warning'
    })
    
    
    service.status = 'running'
    service.uptime = '刚刚重启'
    ElMessage.success(`服务 ${service.name} 重启成功`)
  } catch {
    
  }
}


const refreshServices = async () => {
  try {
    
    ElMessage.success('服务状态已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}


const clearLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空系统日志吗？', '确认清空', {
      type: 'warning'
    })

    await api.log.clearLogs()
    await fetchSystemLogs()
    ElMessage.success('系统日志已清空')
  } catch {
    
  }
}


const toggleAlert = (alert: any) => {
  const status = alert.enabled ? '启用' : '禁用'
  ElMessage.success(`警报 ${alert.name} 已${status}`)
}


const editAlert = (alert: any) => {
  Object.assign(alertForm, alert)
  showAlertDialog.value = true
}


const deleteAlert = async (alert: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除警报 ${alert.name} 吗？`, '确认删除', {
      type: 'warning'
    })
    
    const index = alerts.value.indexOf(alert)
    if (index > -1) {
      alerts.value.splice(index, 1)
      ElMessage.success('警报删除成功')
    }
  } catch {
    
  }
}


const saveAlert = () => {
  if (!alertForm.name || !alertForm.metric || !alertForm.condition) {
    ElMessage.error('请填写完整的警报信息')
    return
  }
  
  
  const existingIndex = alerts.value.findIndex(alert => alert.name === alertForm.name)
  
  if (existingIndex > -1) {
    
    Object.assign(alerts.value[existingIndex], alertForm)
    ElMessage.success('警报更新成功')
  } else {
    
    alerts.value.push({
      ...alertForm,
      enabled: true,
      lastTriggered: '-'
    })
    ElMessage.success('警报添加成功')
  }
  
  
  Object.assign(alertForm, {
    name: '',
    metric: '',
    condition: '',
    threshold: 0,
    notifications: []
  })
  
  showAlertDialog.value = false
}


const updateSystemStatus = () => {
  fetchSystemInfo()
  fetchSystemLogs()
}


const startStatusUpdate = () => {
  statusTimer = setInterval(updateSystemStatus, 5000) 
}


const stopStatusUpdate = () => {
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
}

onMounted(() => {
  startStatusUpdate()
  Promise.all([fetchMonitorData(), fetchSystemInfo(), fetchSystemLogs()]).then(() => initCharts())
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopStatusUpdate()
  window.removeEventListener('resize', handleResize)
  cpuMemoryChartInstance?.dispose()
  networkChartInstance?.dispose()
  cpuMemoryChartInstance = null
  networkChartInstance = null
})

watch(
  () => timeRange.value,
  async () => {
    await Promise.all([fetchMonitorData(), fetchSystemInfo()])
    updateCpuMemoryChart()
    updateNetworkChart()
  }
)
</script>

<style scoped>
.system-monitor {
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

.status-row,
.charts-row,
.info-row,
.services-row,
.alerts-row {
  margin-bottom: 20px;
}

.status-card {
  position: relative;
  overflow: hidden;
}

.status-card.cpu {
  border-left: 4px solid #409eff;
}

.status-card.memory {
  border-left: 4px solid #67c23a;
}

.status-card.disk {
  border-left: 4px solid #e6a23c;
}

.status-card.network {
  border-left: 4px solid #f56c6c;
}

.status-content {
  display: flex;
  align-items: center;
  padding: 16px;
}

.status-icon {
  margin-right: 16px;
  color: #409eff;
}

.status-info {
  flex: 1;
}

.status-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.status-label {
  font-size: 14px;
  color: #909399;
}

.status-progress {
  padding: 0 16px 16px;
}

.status-indicator {
  padding: 0 16px 16px;
  text-align: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.chart-placeholder {
  color: #909399;
  font-size: 16px;
}

.process-list {
  max-height: 300px;
  overflow-y: auto;
}

.process-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.process-item:last-child {
  border-bottom: none;
}

.process-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.process-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.cpu-usage {
  color: #409eff;
}

.memory-usage {
  color: #67c23a;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.log-item.info {
  color: #606266;
}

.log-item.warning {
  color: #e6a23c;
}

.log-item.error {
  color: #f56c6c;
}

.log-time {
  color: #909399;
  min-width: 80px;
}

.log-level {
  min-width: 60px;
  font-weight: bold;
}

.log-message {
  flex: 1;
}

@media (max-width: 768px) {
  .system-monitor {
    padding: 10px;
  }
  
  .status-content {
    flex-direction: column;
    text-align: center;
  }
  
  .status-icon {
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .chart-container {
    height: 200px;
  }
  
  .process-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .el-table {
    font-size: 12px;
  }
}
</style>