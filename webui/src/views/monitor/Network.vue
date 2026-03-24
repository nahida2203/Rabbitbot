<template>
  <div class="network-monitor">
    
    <div class="page-header">
      <div class="header-left">
        <h2>网络监控</h2>
        <p>实时监控网络连接状态和流量使用情况</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="exportData">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
        <el-button @click="runNetworkTest">
          <el-icon><Connection /></el-icon>
          网络测试
        </el-button>
      </div>
    </div>

    
    <div class="network-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon connected">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ networkStatus.connected ? '已连接' : '未连接' }}</div>
                <div class="status-label">网络状态</div>
                <div class="status-detail">{{ networkStatus.type }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon upload">
                <el-icon><Top /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ networkStats.uploadSpeed }}</div>
                <div class="status-label">上传速度</div>
                <div class="status-detail">总计: {{ networkStats.totalUpload }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon download">
                <el-icon><Bottom /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ networkStats.downloadSpeed }}</div>
                <div class="status-label">下载速度</div>
                <div class="status-detail">总计: {{ networkStats.totalDownload }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon latency">
                <el-icon><Timer /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ networkStats.latency }}</div>
                <div class="status-label">网络延迟</div>
                <div class="status-detail">{{ getLatencyStatus(networkStats.latencyValue) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <div class="network-charts">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>实时流量监控</span>
                <el-switch
                  v-model="realTimeMode"
                  active-text="实时模式"
                  @change="toggleRealTime"
                />
              </div>
            </template>
            <div ref="trafficChart" class="chart-container"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>网络延迟趋势</span>
                <el-select v-model="timeRange" size="small" style="width: 120px">
                  <el-option label="最近1小时" value="1h" />
                  <el-option label="最近6小时" value="6h" />
                  <el-option label="最近24小时" value="24h" />
                </el-select>
              </div>
            </template>
            <div ref="latencyChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <el-card class="interfaces-card">
      <template #header>
        <div class="card-header">
          <span>网络接口</span>
          <el-button size="small" @click="refreshInterfaces">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <el-table
        :data="networkInterfaces"
        v-loading="interfacesLoading"
        stripe
      >
        <el-table-column prop="name" label="接口名称" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getInterfaceType(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'up' ? 'success' : 'danger'">
              {{ row.status === 'up' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ipAddress" label="IP地址" width="150" />
        <el-table-column prop="macAddress" label="MAC地址" width="180" />
        <el-table-column prop="speed" label="速度" width="120" />
        <el-table-column prop="rxBytes" label="接收字节" width="120" />
        <el-table-column prop="txBytes" label="发送字节" width="120" />
        <el-table-column prop="rxPackets" label="接收包数" width="120" />
        <el-table-column prop="txPackets" label="发送包数" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              text
              @click="showInterfaceDetail(row)"
            >
              详情
            </el-button>
            <el-button
              :type="row.status === 'up' ? 'warning' : 'success'"
              size="small"
              text
              @click="toggleInterface(row)"
            >
              {{ row.status === 'up' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    
    <el-card class="connections-card">
      <template #header>
        <div class="card-header">
          <span>活动连接</span>
          <div class="header-actions">
            <el-input
              v-model="connectionFilter"
              placeholder="搜索连接"
              size="small"
              style="width: 200px; margin-right: 10px"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="connectionTypeFilter"
              placeholder="连接类型"
              size="small"
              style="width: 120px; margin-right: 10px"
              clearable
            >
              <el-option label="全部" value="" />
              <el-option label="TCP" value="tcp" />
              <el-option label="UDP" value="udp" />
              <el-option label="HTTP" value="http" />
              <el-option label="HTTPS" value="https" />
            </el-select>
            <el-button size="small" @click="refreshConnections">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredConnections"
        v-loading="connectionsLoading"
        stripe
        height="300"
      >
        <el-table-column prop="protocol" label="协议" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="getProtocolType(row.protocol)">
              {{ row.protocol.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="localAddress" label="本地地址" width="180" />
        <el-table-column prop="remoteAddress" label="远程地址" width="180" />
        <el-table-column prop="state" label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getConnectionStateType(row.state)">
              {{ row.state }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="process" label="进程" width="150" show-overflow-tooltip />
        <el-table-column prop="pid" label="PID" width="80" />
        <el-table-column prop="duration" label="持续时间" width="120" />
        <el-table-column prop="bytes" label="传输字节" width="120" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              text
              @click="closeConnection(row)"
              :disabled="row.state === 'CLOSED'"
            >
              关闭
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="connectionPagination.page"
          v-model:page-size="connectionPagination.size"
          :total="connectionPagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleConnectionSizeChange"
          @current-change="handleConnectionPageChange"
        />
      </div>
    </el-card>

    
    <el-dialog
      v-model="testDialogVisible"
      title="网络测试"
      width="50%"
    >
      <div class="network-test">
        <el-form :model="testForm" label-width="100px">
          <el-form-item label="测试类型">
            <el-radio-group v-model="testForm.type">
              <el-radio label="ping">Ping测试</el-radio>
              <el-radio label="traceroute">路由跟踪</el-radio>
              <el-radio label="speedtest">速度测试</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="目标地址" v-if="testForm.type !== 'speedtest'">
            <el-input v-model="testForm.target" placeholder="请输入IP地址或域名" />
          </el-form-item>
          <el-form-item label="测试次数" v-if="testForm.type === 'ping'">
            <el-input-number v-model="testForm.count" :min="1" :max="100" />
          </el-form-item>
        </el-form>
        
        <div class="test-results" v-if="testResults">
          <h4>测试结果：</h4>
          <pre class="test-output">{{ testResults }}</pre>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="testDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="startNetworkTest" :loading="testRunning">
            {{ testRunning ? '测试中...' : '开始测试' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Download,
  Connection,
  Top,
  Bottom,
  Timer,
  Search
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

interface NetworkStatus {
  connected: boolean
  type: string
}

interface NetworkStats {
  uploadSpeed: string
  downloadSpeed: string
  totalUpload: string
  totalDownload: string
  latency: string
  latencyValue: number
}

interface NetworkInterface {
  name: string
  type: string
  status: string
  ipAddress: string
  macAddress: string
  speed: string
  rxBytes: string
  txBytes: string
  rxPackets: string
  txPackets: string
}

interface NetworkConnection {
  protocol: string
  localAddress: string
  remoteAddress: string
  state: string
  process: string
  pid: number
  duration: string
  bytes: string
}

const realTimeMode = ref(true)
const timeRange = ref('1h')
const interfacesLoading = ref(false)
const connectionsLoading = ref(false)
const connectionFilter = ref('')
const connectionTypeFilter = ref('')
const testDialogVisible = ref(false)
const testRunning = ref(false)
const testResults = ref('')

const trafficChart = ref<HTMLElement>()
const latencyChart = ref<HTMLElement>()

let trafficChartInstance: echarts.ECharts | null = null
let latencyChartInstance: echarts.ECharts | null = null
let updateTimer: NodeJS.Timeout | null = null

const networkStatus = reactive<NetworkStatus>({
  connected: true,
  type: 'WiFi 6 (802.11ax)'
})

const networkStats = reactive<NetworkStats>({
  uploadSpeed: '45.2 MB/s',
  downloadSpeed: '128.5 MB/s',
  totalUpload: '2.3 GB',
  totalDownload: '15.7 GB',
  latency: '12 ms',
  latencyValue: 12
})

const testForm = reactive({
  type: 'ping',
  target: 'www.baidu.com',
  count: 4
})

const connectionPagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

const networkInterfaces = ref<NetworkInterface[]>([
  {
    name: 'eth0',
    type: 'Ethernet',
    status: 'up',
    ipAddress: '192.168.1.100',
    macAddress: '00:1B:44:11:3A:B7',
    speed: '1000 Mbps',
    rxBytes: '1.2 GB',
    txBytes: '856 MB',
    rxPackets: '1,234,567',
    txPackets: '987,654'
  },
  {
    name: 'wlan0',
    type: 'WiFi',
    status: 'up',
    ipAddress: '192.168.1.101',
    macAddress: '00:1B:44:11:3A:B8',
    speed: '300 Mbps',
    rxBytes: '856 MB',
    txBytes: '432 MB',
    rxPackets: '567,890',
    txPackets: '345,678'
  }
])

const connections = ref<NetworkConnection[]>([
  {
    protocol: 'tcp',
    localAddress: '192.168.1.100:8080',
    remoteAddress: '203.208.60.1:443',
    state: 'ESTABLISHED',
    process: 'yunzai-bot',
    pid: 1234,
    duration: '00:15:32',
    bytes: '2.3 MB'
  },
  {
    protocol: 'tcp',
    localAddress: '192.168.1.100:3000',
    remoteAddress: '192.168.1.1:80',
    state: 'ESTABLISHED',
    process: 'node.js',
    pid: 5678,
    duration: '01:23:45',
    bytes: '15.7 MB'
  },
  {
    protocol: 'udp',
    localAddress: '192.168.1.100:53',
    remoteAddress: '8.8.8.8:53',
    state: 'ESTABLISHED',
    process: 'systemd-resolved',
    pid: 9012,
    duration: '02:45:12',
    bytes: '128 KB'
  }
])

const filteredConnections = computed(() => {
  let filtered = connections.value
  
  if (connectionFilter.value) {
    filtered = filtered.filter(conn => 
      conn.localAddress.includes(connectionFilter.value) ||
      conn.remoteAddress.includes(connectionFilter.value) ||
      conn.process.toLowerCase().includes(connectionFilter.value.toLowerCase())
    )
  }
  
  if (connectionTypeFilter.value) {
    filtered = filtered.filter(conn => conn.protocol === connectionTypeFilter.value)
  }
  
  connectionPagination.total = filtered.length
  return filtered
})

// 获取延迟状态
const getLatencyStatus = (latency: number) => {
  if (latency < 20) return '优秀'
  if (latency < 50) return '良好'
  if (latency < 100) return '一般'
  return '较差'
}

// 获取接口类型
const getInterfaceType = (type: string) => {
  const types: Record<string, string> = {
    'Ethernet': 'primary',
    'WiFi': 'success',
    'Loopback': 'info'
  }
  return types[type] || 'info'
}

// 获取协议类型
const getProtocolType = (protocol: string) => {
  const types: Record<string, string> = {
    'tcp': 'primary',
    'udp': 'success',
    'http': 'warning',
    'https': 'danger'
  }
  return types[protocol] || 'info'
}

// 获取连接状态类型
const getConnectionStateType = (state: string) => {
  const types: Record<string, string> = {
    'ESTABLISHED': 'success',
    'LISTENING': 'primary',
    'TIME_WAIT': 'warning',
    'CLOSED': 'info',
    'CLOSE_WAIT': 'warning'
  }
  return types[state] || 'info'
}

// 初始化图表
const initCharts = async () => {
  await nextTick()
  
  if (trafficChart.value) {
    trafficChartInstance = echarts.init(trafficChart.value)
    updateTrafficChart()
  }
  
  if (latencyChart.value) {
    latencyChartInstance = echarts.init(latencyChart.value)
    updateLatencyChart()
  }
}

// 更新流量图表
const updateTrafficChart = () => {
  if (!trafficChartInstance) return
  
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
        data: generateTrafficData(),
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
        data: generateTrafficData(),
        smooth: true,
        itemStyle: {
          color: '#409eff'
        },
        areaStyle: {
          opacity: 0.3
        }
      }
    ]
  }
  
  trafficChartInstance.setOption(option)
}

// 更新延迟图表
const updateLatencyChart = () => {
  if (!latencyChartInstance) return
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: generateTimeLabels()
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value} ms'
      }
    },
    series: [
      {
        name: '网络延迟',
        type: 'line',
        data: generateLatencyData(),
        smooth: true,
        itemStyle: {
          color: '#67c23a'
        },
        markLine: {
          data: [
            { yAxis: 50, name: '良好阈值' },
            { yAxis: 100, name: '一般阈值' }
          ]
        }
      }
    ]
  }
  
  latencyChartInstance.setOption(option)
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

// 生成流量数据
const generateTrafficData = () => {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 150))
}

// 生成延迟数据
const generateLatencyData = () => {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 80) + 10)
}

// 刷新数据
const refreshData = () => {
  // 模拟数据更新
  networkStats.uploadSpeed = `${(Math.random() * 100).toFixed(1)} MB/s`
  networkStats.downloadSpeed = `${(Math.random() * 200).toFixed(1)} MB/s`
  networkStats.latencyValue = Math.floor(Math.random() * 80) + 10
  networkStats.latency = `${networkStats.latencyValue} ms`
  
  updateTrafficChart()
  updateLatencyChart()
  
  ElMessage.success('网络数据已刷新')
}

// 导出数据
const exportData = () => {
  ElMessage.success('网络数据导出功能开发中')
}

// 运行网络测试
const runNetworkTest = () => {
  testDialogVisible.value = true
  testResults.value = ''
}

// 开始网络测试
const startNetworkTest = async () => {
  testRunning.value = true
  testResults.value = '正在测试中...\n'
  
  try {
    // 模拟测试过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (testForm.type === 'ping') {
      testResults.value = `PING ${testForm.target} (203.208.60.1): 56 data bytes\n64 bytes from 203.208.60.1: icmp_seq=0 ttl=55 time=12.345 ms\n64 bytes from 203.208.60.1: icmp_seq=1 ttl=55 time=11.234 ms\n64 bytes from 203.208.60.1: icmp_seq=2 ttl=55 time=13.456 ms\n64 bytes from 203.208.60.1: icmp_seq=3 ttl=55 time=10.987 ms\n\n--- ${testForm.target} ping statistics ---\n4 packets transmitted, 4 packets received, 0.0% packet loss\nround-trip min/avg/max/stddev = 10.987/12.006/13.456/1.012 ms`
    } else if (testForm.type === 'traceroute') {
      testResults.value = `traceroute to ${testForm.target} (203.208.60.1), 30 hops max, 60 byte packets\n 1  192.168.1.1 (192.168.1.1)  1.234 ms  1.123 ms  1.345 ms\n 2  10.0.0.1 (10.0.0.1)  5.678 ms  5.567 ms  5.789 ms\n 3  203.208.60.1 (203.208.60.1)  12.345 ms  12.234 ms  12.456 ms`
    } else {
      testResults.value = `测试服务器: speedtest.net\n下载速度: 128.5 Mbps\n上传速度: 45.2 Mbps\n延迟: 12 ms\n抖动: 2 ms`
    }
    
    ElMessage.success('网络测试完成')
  } catch (error) {
    testResults.value = '测试失败: ' + error
    ElMessage.error('网络测试失败')
  } finally {
    testRunning.value = false
  }
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

// 刷新接口列表
const refreshInterfaces = () => {
  interfacesLoading.value = true
  setTimeout(() => {
    interfacesLoading.value = false
    ElMessage.success('网络接口已刷新')
  }, 1000)
}

// 显示接口详情
const showInterfaceDetail = (iface: NetworkInterface) => {
  ElMessage.info(`接口详情功能开发中: ${iface.name}`)
}

// 切换接口状态
const toggleInterface = async (iface: NetworkInterface) => {
  try {
    await ElMessageBox.confirm(
      `确定要${iface.status === 'up' ? '禁用' : '启用'}接口 "${iface.name}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    iface.status = iface.status === 'up' ? 'down' : 'up'
    ElMessage.success(`接口 ${iface.name} 已${iface.status === 'up' ? '启用' : '禁用'}`)
  } catch {
    // 用户取消
  }
}

// 刷新连接列表
const refreshConnections = () => {
  connectionsLoading.value = true
  setTimeout(() => {
    connectionsLoading.value = false
    ElMessage.success('连接列表已刷新')
  }, 1000)
}

// 关闭连接
const closeConnection = async (connection: NetworkConnection) => {
  try {
    await ElMessageBox.confirm(
      `确定要关闭连接 "${connection.localAddress} -> ${connection.remoteAddress}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    connection.state = 'CLOSED'
    ElMessage.success('连接已关闭')
  } catch {
    // 用户取消
  }
}

// 分页处理
const handleConnectionSizeChange = (size: number) => {
  connectionPagination.size = size
}

const handleConnectionPageChange = (page: number) => {
  connectionPagination.page = page
}

// 窗口大小调整处理
const handleResize = () => {
  if (trafficChartInstance) {
    trafficChartInstance.resize()
  }
  if (latencyChartInstance) {
    latencyChartInstance.resize()
  }
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
  
  // 默认开启实时模式
  toggleRealTime(true)
})

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
  if (trafficChartInstance) {
    trafficChartInstance.dispose()
  }
  if (latencyChartInstance) {
    latencyChartInstance.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.network-monitor {
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

.network-overview {
  margin-bottom: 20px;
}

.status-card {
  cursor: pointer;
  transition: all 0.3s;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.status-icon.connected {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.status-icon.upload {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.status-icon.download {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.status-icon.latency {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.status-info {
  flex: 1;
}

.status-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.status-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 3px;
}

.status-detail {
  font-size: 12px;
  color: #c0c4cc;
}

.network-charts {
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

.interfaces-card,
.connections-card {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.network-test {
  padding: 20px 0;
}

.test-results {
  margin-top: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.test-output {
  background: #2d3748;
  color: #e2e8f0;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 10px 0 0 0;
  max-height: 300px;
  overflow-y: auto;
}

.dialog-footer {
  text-align: right;
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
  
  .network-overview :deep(.el-col) {
    margin-bottom: 15px;
  }
  
  .network-charts :deep(.el-col) {
    margin-bottom: 20px;
  }
  
  .chart-card {
    height: 300px;
  }
  
  .chart-container {
    height: 220px;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .header-actions > * {
    width: 100%;
  }
}
</style>