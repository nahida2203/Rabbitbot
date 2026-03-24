<template>
  <div class="alerts-monitor">
    
    <div class="page-header">
      <div class="header-left">
        <h2>告警管理</h2>
        <p>系统告警监控和管理中心</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="createAlert">
          <el-icon><Plus /></el-icon>
          新建告警
        </el-button>
        <el-button @click="refreshAlerts">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="exportAlerts">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    
    <div class="alert-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card critical">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ alertStats.critical }}</div>
                <div class="stat-label">严重告警</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card warning">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ alertStats.warning }}</div>
                <div class="stat-label">警告告警</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card info">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ alertStats.info }}</div>
                <div class="stat-label">信息告警</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card resolved">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><CircleCheckFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ alertStats.resolved }}</div>
                <div class="stat-label">已解决</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span>告警趋势</span>
          <el-select v-model="chartTimeRange" size="small" style="width: 120px">
            <el-option label="最近24小时" value="24h" />
            <el-option label="最近7天" value="7d" />
            <el-option label="最近30天" value="30d" />
          </el-select>
        </div>
      </template>
      <div ref="alertChart" class="chart-container"></div>
    </el-card>

    
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="告警级别">
          <el-select v-model="filters.level" placeholder="选择级别" clearable>
            <el-option label="全部" value="" />
            <el-option label="严重" value="critical" />
            <el-option label="警告" value="warning" />
            <el-option label="信息" value="info" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="活跃" value="active" />
            <el-option label="已确认" value="acknowledged" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已忽略" value="ignored" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警类型">
          <el-select v-model="filters.type" placeholder="选择类型" clearable>
            <el-option label="全部" value="" />
            <el-option label="系统" value="system" />
            <el-option label="网络" value="network" />
            <el-option label="应用" value="application" />
            <el-option label="安全" value="security" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索告警内容"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchAlerts">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilters">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    
    <el-card class="alerts-card">
      <template #header>
        <div class="card-header">
          <span>告警列表</span>
          <div class="header-actions">
            <el-button
              size="small"
              @click="batchAcknowledge"
              :disabled="selectedAlerts.length === 0"
            >
              批量确认
            </el-button>
            <el-button
              size="small"
              @click="batchResolve"
              :disabled="selectedAlerts.length === 0"
            >
              批量解决
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="batchIgnore"
              :disabled="selectedAlerts.length === 0"
            >
              批量忽略
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredAlerts"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)" :icon="getLevelIcon(row.level)">
              {{ getLevelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="告警标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeColor(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="次数" width="80" />
        <el-table-column prop="firstTime" label="首次时间" width="150">
          <template #default="{ row }">
            <el-text size="small">{{ formatTime(row.firstTime) }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="lastTime" label="最后时间" width="150">
          <template #default="{ row }">
            <el-text size="small">{{ formatTime(row.lastTime) }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              text
              @click="viewAlert(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              type="warning"
              size="small"
              text
              @click="acknowledgeAlert(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status !== 'resolved'"
              type="success"
              size="small"
              text
              @click="resolveAlert(row)"
            >
              解决
            </el-button>
            <el-button
              type="danger"
              size="small"
              text
              @click="ignoreAlert(row)"
            >
              忽略
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    
    <el-dialog
      v-model="detailVisible"
      title="告警详情"
      width="60%"
      :before-close="closeDetail"
    >
      <div v-if="selectedAlert" class="alert-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="告警标题" :span="2">
            <strong>{{ selectedAlert.title }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="告警级别">
            <el-tag :type="getLevelType(selectedAlert.level)" :icon="getLevelIcon(selectedAlert.level)">
              {{ getLevelText(selectedAlert.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警状态">
            <el-tag :type="getStatusType(selectedAlert.status)">
              {{ getStatusText(selectedAlert.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警类型">
            {{ getTypeText(selectedAlert.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="告警来源">
            {{ selectedAlert.source }}
          </el-descriptions-item>
          <el-descriptions-item label="首次时间">
            {{ formatTime(selectedAlert.firstTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后时间">
            {{ formatTime(selectedAlert.lastTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="告警次数">
            {{ selectedAlert.count }}
          </el-descriptions-item>
          <el-descriptions-item label="持续时间">
            {{ calculateDuration(selectedAlert.firstTime, selectedAlert.lastTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="告警描述" :span="2">
            <pre class="alert-description">{{ selectedAlert.description }}</pre>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedAlert.details" label="详细信息" :span="2">
            <pre class="alert-details">{{ JSON.stringify(selectedAlert.details, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="alert-actions" style="margin-top: 20px; text-align: right;">
          <el-button
            v-if="selectedAlert.status === 'active'"
            type="warning"
            @click="acknowledgeAlert(selectedAlert)"
          >
            确认告警
          </el-button>
          <el-button
            v-if="selectedAlert.status !== 'resolved'"
            type="success"
            @click="resolveAlert(selectedAlert)"
          >
            解决告警
          </el-button>
          <el-button
            type="danger"
            @click="ignoreAlert(selectedAlert)"
          >
            忽略告警
          </el-button>
        </div>
      </div>
    </el-dialog>

    
    <el-dialog
      v-model="createVisible"
      title="新建告警规则"
      width="50%"
    >
      <el-form :model="alertForm" :rules="alertRules" ref="alertFormRef" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="alertForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="告警级别" prop="level">
          <el-select v-model="alertForm.level" placeholder="选择告警级别">
            <el-option label="严重" value="critical" />
            <el-option label="警告" value="warning" />
            <el-option label="信息" value="info" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警类型" prop="type">
          <el-select v-model="alertForm.type" placeholder="选择告警类型">
            <el-option label="系统" value="system" />
            <el-option label="网络" value="network" />
            <el-option label="应用" value="application" />
            <el-option label="安全" value="security" />
          </el-select>
        </el-form-item>
        <el-form-item label="监控指标" prop="metric">
          <el-select v-model="alertForm.metric" placeholder="选择监控指标">
            <el-option label="CPU使用率" value="cpu_usage" />
            <el-option label="内存使用率" value="memory_usage" />
            <el-option label="磁盘使用率" value="disk_usage" />
            <el-option label="网络延迟" value="network_latency" />
            <el-option label="错误率" value="error_rate" />
          </el-select>
        </el-form-item>
        <el-form-item label="阈值条件" prop="condition">
          <el-row :gutter="10">
            <el-col :span="8">
              <el-select v-model="alertForm.operator" placeholder="操作符">
                <el-option label="大于" value=">" />
                <el-option label="小于" value="<" />
                <el-option label="等于" value="=" />
                <el-option label="大于等于" value=">=" />
                <el-option label="小于等于" value="<=" />
              </el-select>
            </el-col>
            <el-col :span="16">
              <el-input v-model="alertForm.threshold" placeholder="阈值" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="持续时间" prop="duration">
          <el-input v-model="alertForm.duration" placeholder="如：5m, 1h" />
        </el-form-item>
        <el-form-item label="通知方式" prop="notifications">
          <el-checkbox-group v-model="alertForm.notifications">
            <el-checkbox label="email">邮件</el-checkbox>
            <el-checkbox label="sms">短信</el-checkbox>
            <el-checkbox label="webhook">Webhook</el-checkbox>
            <el-checkbox label="dingtalk">钉钉</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="alertForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入告警规则描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAlert">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Download,
  WarningFilled,
  Warning,
  InfoFilled,
  CircleCheckFilled,
  Search,
  RefreshLeft
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info'
  title: string
  type: 'system' | 'network' | 'application' | 'security'
  source: string
  status: 'active' | 'acknowledged' | 'resolved' | 'ignored'
  count: number
  firstTime: string
  lastTime: string
  description: string
  details?: any
}

interface AlertStats {
  critical: number
  warning: number
  info: number
  resolved: number
}

const loading = ref(false)
const detailVisible = ref(false)
const createVisible = ref(false)
const selectedAlert = ref<Alert | null>(null)
const selectedAlerts = ref<Alert[]>([])
const chartTimeRange = ref('24h')
const alertChart = ref<HTMLElement>()
const alertFormRef = ref()

let alertChartInstance: echarts.ECharts | null = null

const alertStats = reactive<AlertStats>({
  critical: 5,
  warning: 12,
  info: 8,
  resolved: 45
})

const filters = reactive({
  level: '',
  status: '',
  type: '',
  dateRange: [],
  keyword: ''
})

const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

const alertForm = reactive({
  name: '',
  level: '',
  type: '',
  metric: '',
  operator: '',
  threshold: '',
  duration: '',
  notifications: [],
  description: ''
})

const alertRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择告警级别', trigger: 'change' }],
  type: [{ required: true, message: '请选择告警类型', trigger: 'change' }],
  metric: [{ required: true, message: '请选择监控指标', trigger: 'change' }],
  threshold: [{ required: true, message: '请输入阈值', trigger: 'blur' }]
}

const alerts = ref<Alert[]>([
  {
    id: '1',
    level: 'critical',
    title: 'CPU使用率过高',
    type: 'system',
    source: 'system-monitor',
    status: 'active',
    count: 15,
    firstTime: new Date(Date.now() - 3600000).toISOString(),
    lastTime: new Date().toISOString(),
    description: 'CPU使用率持续超过90%，可能影响系统性能',
    details: {
      currentValue: 95.2,
      threshold: 90,
      host: 'server-01'
    }
  },
  {
    id: '2',
    level: 'warning',
    title: '内存使用率较高',
    type: 'system',
    source: 'system-monitor',
    status: 'acknowledged',
    count: 8,
    firstTime: new Date(Date.now() - 7200000).toISOString(),
    lastTime: new Date(Date.now() - 300000).toISOString(),
    description: '内存使用率超过80%，建议检查内存泄漏',
    details: {
      currentValue: 85.6,
      threshold: 80,
      host: 'server-01'
    }
  },
  {
    id: '3',
    level: 'info',
    title: '新用户注册',
    type: 'application',
    source: 'user-service',
    status: 'resolved',
    count: 1,
    firstTime: new Date(Date.now() - 1800000).toISOString(),
    lastTime: new Date(Date.now() - 1800000).toISOString(),
    description: '检测到异常的用户注册活动',
    details: {
      userId: 'user123',
      ip: '192.168.1.100'
    }
  }
])

const filteredAlerts = computed(() => {
  let filtered = alerts.value
  
  if (filters.level) {
    filtered = filtered.filter(alert => alert.level === filters.level)
  }
  
  if (filters.status) {
    filtered = filtered.filter(alert => alert.status === filters.status)
  }
  
  if (filters.type) {
    filtered = filtered.filter(alert => alert.type === filters.type)
  }
  
  if (filters.keyword) {
    filtered = filtered.filter(alert => 
      alert.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
      alert.description.toLowerCase().includes(filters.keyword.toLowerCase())
    )
  }
  
  pagination.total = filtered.length
  return filtered
})


const getLevelType = (level: string) => {
  const types: Record<string, string> = {
    critical: 'danger',
    warning: 'warning',
    info: 'info'
  }
  return types[level] || 'info'
}


const getLevelIcon = (level: string) => {
  const icons: Record<string, any> = {
    critical: WarningFilled,
    warning: Warning,
    info: InfoFilled
  }
  return icons[level] || InfoFilled
}


const getLevelText = (level: string) => {
  const texts: Record<string, string> = {
    critical: '严重',
    warning: '警告',
    info: '信息'
  }
  return texts[level] || level
}


const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    system: 'primary',
    network: 'success',
    application: 'warning',
    security: 'danger'
  }
  return colors[type] || 'info'
}


const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    system: '系统',
    network: '网络',
    application: '应用',
    security: '安全'
  }
  return texts[type] || type
}


const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'danger',
    acknowledged: 'warning',
    resolved: 'success',
    ignored: 'info'
  }
  return types[status] || 'info'
}


const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '活跃',
    acknowledged: '已确认',
    resolved: '已解决',
    ignored: '已忽略'
  }
  return texts[status] || status
}


const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}


const calculateDuration = (startTime: string, endTime: string) => {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const duration = end - start
  
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}


const initChart = async () => {
  await nextTick()
  
  if (alertChart.value) {
    alertChartInstance = echarts.init(alertChart.value)
    updateChart()
  }
}


const updateChart = () => {
  if (!alertChartInstance) return
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['严重', '警告', '信息']
    },
    xAxis: {
      type: 'category',
      data: generateTimeLabels()
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '严重',
        type: 'line',
        data: generateAlertData(),
        smooth: true,
        itemStyle: {
          color: '#f56c6c'
        },
        areaStyle: {
          opacity: 0.3
        }
      },
      {
        name: '警告',
        type: 'line',
        data: generateAlertData(),
        smooth: true,
        itemStyle: {
          color: '#e6a23c'
        },
        areaStyle: {
          opacity: 0.3
        }
      },
      {
        name: '信息',
        type: 'line',
        data: generateAlertData(),
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
  
  alertChartInstance.setOption(option)
}


const generateTimeLabels = () => {
  const labels = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  }
  return labels
}


const generateAlertData = () => {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 10))
}


const refreshAlerts = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('告警列表已刷新')
  }, 1000)
}


const exportAlerts = () => {
  ElMessage.success('告警数据导出功能开发中')
}


const searchAlerts = () => {
  
  ElMessage.success('搜索完成')
}


const resetFilters = () => {
  filters.level = ''
  filters.status = ''
  filters.type = ''
  filters.dateRange = []
  filters.keyword = ''
}


const viewAlert = (alert: Alert) => {
  selectedAlert.value = alert
  detailVisible.value = true
}


const closeDetail = () => {
  detailVisible.value = false
  selectedAlert.value = null
}


const acknowledgeAlert = (alert: Alert) => {
  alert.status = 'acknowledged'
  ElMessage.success('告警已确认')
  updateStats()
}


const resolveAlert = (alert: Alert) => {
  alert.status = 'resolved'
  ElMessage.success('告警已解决')
  updateStats()
}


const ignoreAlert = async (alert: Alert) => {
  try {
    await ElMessageBox.confirm(
      '确定要忽略此告警吗？忽略后将不再显示。',
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    alert.status = 'ignored'
    ElMessage.success('告警已忽略')
    updateStats()
  } catch {
    
  }
}


const handleSelectionChange = (selection: Alert[]) => {
  selectedAlerts.value = selection
}

const batchAcknowledge = () => {
  selectedAlerts.value.forEach(alert => {
    if (alert.status === 'active') {
      alert.status = 'acknowledged'
    }
  })
  ElMessage.success(`已确认 ${selectedAlerts.value.length} 个告警`)
  updateStats()
}

const batchResolve = () => {
  selectedAlerts.value.forEach(alert => {
    if (alert.status !== 'resolved') {
      alert.status = 'resolved'
    }
  })
  ElMessage.success(`已解决 ${selectedAlerts.value.length} 个告警`)
  updateStats()
}

const batchIgnore = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要忽略选中的 ${selectedAlerts.value.length} 个告警吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    selectedAlerts.value.forEach(alert => {
      alert.status = 'ignored'
    })
    ElMessage.success(`已忽略 ${selectedAlerts.value.length} 个告警`)
    updateStats()
  } catch {
    
  }
}


const updateStats = () => {
  alertStats.critical = alerts.value.filter(a => a.level === 'critical' && a.status === 'active').length
  alertStats.warning = alerts.value.filter(a => a.level === 'warning' && a.status === 'active').length
  alertStats.info = alerts.value.filter(a => a.level === 'info' && a.status === 'active').length
  alertStats.resolved = alerts.value.filter(a => a.status === 'resolved').length
}


const createAlert = () => {
  createVisible.value = true
  
  Object.assign(alertForm, {
    name: '',
    level: '',
    type: '',
    metric: '',
    operator: '',
    threshold: '',
    duration: '',
    notifications: [],
    description: ''
  })
}


const saveAlert = async () => {
  try {
    await alertFormRef.value.validate()
    
    
    ElMessage.success('告警规则创建成功')
    createVisible.value = false
  } catch (error) {
    ElMessage.error('请完善表单信息')
  }
}


const handleSizeChange = (size: number) => {
  pagination.size = size
}

const handlePageChange = (page: number) => {
  pagination.page = page
}


const handleResize = () => {
  if (alertChartInstance) {
    alertChartInstance.resize()
  }
}

onMounted(() => {
  initChart()
  updateStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (alertChartInstance) {
    alertChartInstance.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.alerts-monitor {
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

.alert-stats {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-card.critical .stat-icon {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.stat-card.warning .stat-icon {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.stat-card.info .stat-icon {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.stat-card.resolved .stat-icon {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.chart-card {
  height: 400px;
  margin-bottom: 20px;
}

.chart-container {
  height: 320px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-card {
  margin-bottom: 20px;
}

.alerts-card {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.alert-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.alert-description,
.alert-details {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.alert-details {
  color: #606266;
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
  
  .alert-stats :deep(.el-col) {
    margin-bottom: 15px;
  }
  
  .filter-card :deep(.el-form) {
    flex-direction: column;
  }
  
  .filter-card :deep(.el-form-item) {
    margin-right: 0;
    margin-bottom: 15px;
  }
  
  .chart-card {
    height: 300px;
  }
  
  .chart-container {
    height: 220px;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 5px;
  }
}
</style>