<template>
  <div class="system-maintenance">
    
    <div class="page-header">
      <div class="header-left">
        <h2>系统维护</h2>
        <p>系统清理、优化和维护工具</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="startMaintenance">
          <el-icon><Tools /></el-icon>
          开始维护
        </el-button>
        <el-button @click="refreshStatus">
          <el-icon><Refresh /></el-icon>
          刷新状态
        </el-button>
      </div>
    </div>

    
    <div class="status-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ systemHealth.score }}%</div>
                <div class="status-label">系统健康度</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ formatDuration(systemHealth.uptime) }}</div>
                <div class="status-label">运行时间</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ systemHealth.issues }}</div>
                <div class="status-label">待处理问题</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="status-card">
            <div class="status-content">
              <div class="status-icon">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="status-info">
                <div class="status-value">{{ formatTime(systemHealth.lastMaintenance, 'date') }}</div>
                <div class="status-label">上次维护</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20">
      
      <el-col :span="16">
        <el-card class="tasks-card">
          <template #header>
            <div class="card-header">
              <span>维护任务</span>
              <div class="header-actions">
                <el-button size="small" @click="selectAllTasks">
                  {{ allTasksSelected ? '取消全选' : '全选' }}
                </el-button>
                <el-button
                  type="primary"
                  size="small"
                  @click="runSelectedTasks"
                  :disabled="selectedTasks.length === 0"
                >
                  执行选中任务
                </el-button>
              </div>
            </div>
          </template>
          
          <div class="tasks-list">
            <div
              v-for="task in maintenanceTasks"
              :key="task.id"
              class="task-item"
              :class="{ 'task-running': task.running, 'task-completed': task.completed }"
            >
              <div class="task-header">
                <div class="task-left">
                  <el-checkbox
                    v-model="task.selected"
                    @change="updateSelectedTasks"
                    :disabled="task.running"
                  />
                  <div class="task-info">
                    <h4>{{ task.name }}</h4>
                    <p>{{ task.description }}</p>
                  </div>
                </div>
                <div class="task-right">
                  <div class="task-meta">
                    <div class="task-status">
                      <el-tag :type="getTaskStatusType(task)" size="small">
                        {{ getTaskStatusText(task) }}
                      </el-tag>
                    </div>
                    <div class="task-duration">
                      {{ task.estimatedTime }}
                    </div>
                  </div>
                  <div class="task-actions">
                    <el-button
                      v-if="!task.running && !task.completed"
                      type="primary"
                      size="small"
                      @click="runTask(task)"
                    >
                      执行
                    </el-button>
                    <el-button
                      v-if="task.running"
                      type="warning"
                      size="small"
                      @click="stopTask(task)"
                    >
                      停止
                    </el-button>
                    <el-button
                      v-if="task.completed"
                      size="small"
                      @click="viewTaskResult(task)"
                    >
                      查看结果
                    </el-button>
                  </div>
                </div>
              </div>
              
              <div v-if="task.running" class="task-progress">
                <el-progress
                  :percentage="task.progress"
                  :status="task.progress === 100 ? 'success' : undefined"
                >
                  <template #default="{ percentage }">
                    <span class="progress-text">{{ percentage }}%</span>
                  </template>
                </el-progress>
                <div class="progress-info">
                  <span>{{ task.progressText || '正在执行...' }}</span>
                  <span v-if="task.eta">预计剩余: {{ formatDuration(task.eta) }}</span>
                </div>
              </div>
              
              <div v-if="task.completed && task.result" class="task-result">
                <div class="result-summary">
                  <el-icon class="result-icon" :class="task.result.success ? 'success' : 'error'">
                    <SuccessFilled v-if="task.result.success" />
                    <CircleCloseFilled v-else />
                  </el-icon>
                  <span class="result-text">
                    {{ task.result.success ? '执行成功' : '执行失败' }}
                  </span>
                  <span v-if="task.result.details" class="result-details">
                    {{ task.result.details }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      
      <el-col :span="8">
        
        <el-card class="cleanup-card">
          <template #header>
            <span>磁盘清理</span>
          </template>
          
          <div class="cleanup-content">
            <div class="cleanup-stats">
              <div class="stat-item">
                <span class="stat-label">可清理空间:</span>
                <span class="stat-value">{{ formatBytes(cleanupStats.cleanableSize) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">临时文件:</span>
                <span class="stat-value">{{ cleanupStats.tempFiles }} 个</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">日志文件:</span>
                <span class="stat-value">{{ formatBytes(cleanupStats.logSize) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">缓存文件:</span>
                <span class="stat-value">{{ formatBytes(cleanupStats.cacheSize) }}</span>
              </div>
            </div>
            
            <div class="cleanup-options">
              <el-checkbox-group v-model="cleanupOptions">
                <el-checkbox label="temp">临时文件</el-checkbox>
                <el-checkbox label="logs">旧日志文件</el-checkbox>
                <el-checkbox label="cache">缓存文件</el-checkbox>
                <el-checkbox label="backup">过期备份</el-checkbox>
              </el-checkbox-group>
            </div>
            
            <div class="cleanup-actions">
              <el-button
                type="primary"
                @click="startCleanup"
                :loading="cleanupRunning"
                :disabled="cleanupOptions.length === 0"
                block
              >
                {{ cleanupRunning ? '清理中...' : '开始清理' }}
              </el-button>
            </div>
          </div>
        </el-card>
        
        
        <el-card class="optimization-card">
          <template #header>
            <span>性能优化</span>
          </template>
          
          <div class="optimization-content">
            <div class="optimization-item">
              <div class="item-info">
                <h5>内存优化</h5>
                <p>清理内存碎片，释放未使用内存</p>
              </div>
              <el-button size="small" @click="optimizeMemory">
                优化
              </el-button>
            </div>
            
            <div class="optimization-item">
              <div class="item-info">
                <h5>数据库优化</h5>
                <p>重建索引，优化查询性能</p>
              </div>
              <el-button size="small" @click="optimizeDatabase">
                优化
              </el-button>
            </div>
            
            <div class="optimization-item">
              <div class="item-info">
                <h5>插件优化</h5>
                <p>清理插件缓存，重载插件</p>
              </div>
              <el-button size="small" @click="optimizePlugins">
                优化
              </el-button>
            </div>
            
            <div class="optimization-item">
              <div class="item-info">
                <h5>网络优化</h5>
                <p>清理DNS缓存，优化连接</p>
              </div>
              <el-button size="small" @click="optimizeNetwork">
                优化
              </el-button>
            </div>
          </div>
        </el-card>
        
        
        <el-card class="tools-card">
          <template #header>
            <span>系统工具</span>
          </template>
          
          <div class="tools-content">
            <el-button @click="restartService" type="warning" block>
              <el-icon><RefreshRight /></el-icon>
              重启服务
            </el-button>
            
            <el-button @click="exportLogs" block>
              <el-icon><Download /></el-icon>
              导出日志
            </el-button>
            
            <el-button @click="generateReport" block>
              <el-icon><Document /></el-icon>
              生成报告
            </el-button>
            
            <el-button @click="systemDiagnosis" block>
              <el-icon><Search /></el-icon>
              系统诊断
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>维护历史</span>
          <el-button size="small" text @click="viewAllHistory">
            查看全部
          </el-button>
        </div>
      </template>
      
      <el-table :data="maintenanceHistory" stripe>
        <el-table-column prop="date" label="维护时间" width="150">
          <template #default="{ row }">
            {{ formatTime(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="维护类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getHistoryType(row.type)" size="small">
              {{ getHistoryTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tasks" label="执行任务" width="100">
          <template #default="{ row }">
            {{ row.tasks }} 个
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时" width="100">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" text @click="viewHistoryDetails(row)">
              详情
            </el-button>
            <el-button
              v-if="row.reportPath"
              size="small"
              text
              @click="downloadReport(row)"
            >
              报告
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    
    <el-dialog
      v-model="resultVisible"
      title="任务执行结果"
      width="60%"
    >
      <div v-if="selectedTaskResult" class="task-result-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务名称" :span="2">
            <strong>{{ selectedTaskResult.name }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <el-tag :type="selectedTaskResult.result?.success ? 'success' : 'danger'">
              {{ selectedTaskResult.result?.success ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行时间">
            {{ formatDuration(selectedTaskResult.executionTime || 0) }}
          </el-descriptions-item>
          <el-descriptions-item label="开始时间" :span="2">
            {{ formatTime(selectedTaskResult.startTime || 0) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedTaskResult.result?.details" label="详细信息" :span="2">
            {{ selectedTaskResult.result.details }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="selectedTaskResult.result?.logs" class="result-logs">
          <h4>执行日志</h4>
          <div class="logs-container">
            <pre>{{ selectedTaskResult.result.logs }}</pre>
          </div>
        </div>
        
        <div v-if="selectedTaskResult.result?.stats" class="result-stats">
          <h4>统计信息</h4>
          <el-descriptions :column="2" size="small">
            <el-descriptions-item
              v-for="(value, key) in selectedTaskResult.result.stats"
              :key="key"
              :label="key"
            >
              {{ value }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-dialog>

    
    <el-dialog
      v-model="historyDetailVisible"
      title="维护历史详情"
      width="70%"
    >
      <div v-if="selectedHistory" class="history-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="维护时间" :span="2">
            {{ formatTime(selectedHistory.date) }}
          </el-descriptions-item>
          <el-descriptions-item label="维护类型">
            <el-tag :type="getHistoryType(selectedHistory.type)">
              {{ getHistoryTypeText(selectedHistory.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <el-tag :type="getStatusType(selectedHistory.status)">
              {{ getStatusText(selectedHistory.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行任务">
            {{ selectedHistory.tasks }} 个
          </el-descriptions-item>
          <el-descriptions-item label="执行耗时">
            {{ formatDuration(selectedHistory.duration) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedHistory.description }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="selectedHistory.taskDetails" class="history-tasks">
          <h4>任务详情</h4>
          <el-table :data="selectedHistory.taskDetails" stripe>
            <el-table-column prop="name" label="任务名称" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时" width="100">
              <template #default="{ row }">
                {{ formatDuration(row.duration) }}
              </template>
            </el-table-column>
            <el-table-column prop="result" label="结果" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Tools,
  Refresh,
  Monitor,
  Clock,
  Warning,
  Calendar,
  SuccessFilled,
  CircleCloseFilled,
  RefreshRight,
  Download,
  Document,
  Search
} from '@element-plus/icons-vue'

interface MaintenanceTask {
  id: string
  name: string
  description: string
  category: string
  estimatedTime: string
  selected: boolean
  running: boolean
  completed: boolean
  progress?: number
  progressText?: string
  eta?: number
  startTime?: number
  executionTime?: number
  result?: {
    success: boolean
    details?: string
    logs?: string
    stats?: Record<string, any>
  }
}

interface MaintenanceHistory {
  id: string
  date: number
  type: 'auto' | 'manual' | 'scheduled'
  tasks: number
  duration: number
  status: 'success' | 'failed' | 'partial'
  description: string
  reportPath?: string
  taskDetails?: Array<{
    name: string
    status: 'success' | 'failed'
    duration: number
    result: string
  }>
}

const resultVisible = ref(false)
const historyDetailVisible = ref(false)
const selectedTaskResult = ref<MaintenanceTask | null>(null)
const selectedHistory = ref<MaintenanceHistory | null>(null)
const cleanupRunning = ref(false)
const cleanupOptions = ref(['temp', 'logs'])
const selectedTasks = ref<string[]>([])

const systemHealth = reactive({
  score: 85,
  uptime: 5 * 24 * 60 * 60 * 1000,
  issues: 3,
  lastMaintenance: Date.now() - 7 * 24 * 60 * 60 * 1000
})

const cleanupStats = reactive({
  cleanableSize: 1.2 * 1024 * 1024 * 1024,
  tempFiles: 156,
  logSize: 800 * 1024 * 1024,
  cacheSize: 400 * 1024 * 1024
})

const maintenanceTasks = ref<MaintenanceTask[]>([
  {
    id: '1',
    name: '清理临时文件',
    description: '删除系统临时文件和缓存',
    category: 'cleanup',
    estimatedTime: '2-5分钟',
    selected: false,
    running: false,
    completed: false
  },
  {
    id: '2',
    name: '数据库优化',
    description: '重建数据库索引，优化查询性能',
    category: 'database',
    estimatedTime: '5-10分钟',
    selected: false,
    running: false,
    completed: false
  },
  {
    id: '3',
    name: '日志归档',
    description: '压缩和归档旧日志文件',
    category: 'logs',
    estimatedTime: '3-8分钟',
    selected: false,
    running: false,
    completed: false
  },
  {
    id: '4',
    name: '内存清理',
    description: '释放未使用的内存空间',
    category: 'memory',
    estimatedTime: '1-2分钟',
    selected: false,
    running: false,
    completed: false
  },
  {
    id: '5',
    name: '插件检查',
    description: '检查插件状态和依赖',
    category: 'plugins',
    estimatedTime: '2-4分钟',
    selected: false,
    running: false,
    completed: false
  },
  {
    id: '6',
    name: '配置验证',
    description: '验证系统配置文件完整性',
    category: 'config',
    estimatedTime: '1-3分钟',
    selected: false,
    running: false,
    completed: false
  }
])

const maintenanceHistory = ref<MaintenanceHistory[]>([
  {
    id: '1',
    date: Date.now() - 7 * 24 * 60 * 60 * 1000,
    type: 'manual',
    tasks: 4,
    duration: 8 * 60 * 1000,
    status: 'success',
    description: '手动执行系统维护',
    reportPath: '/reports/maintenance-20241124.pdf',
    taskDetails: [
      { name: '清理临时文件', status: 'success', duration: 2 * 60 * 1000, result: '清理了 1.2GB 临时文件' },
      { name: '数据库优化', status: 'success', duration: 4 * 60 * 1000, result: '重建了 15 个索引' },
      { name: '日志归档', status: 'success', duration: 1.5 * 60 * 1000, result: '归档了 800MB 日志' },
      { name: '内存清理', status: 'success', duration: 0.5 * 60 * 1000, result: '释放了 256MB 内存' }
    ]
  },
  {
    id: '2',
    date: Date.now() - 14 * 24 * 60 * 60 * 1000,
    type: 'auto',
    tasks: 3,
    duration: 5 * 60 * 1000,
    status: 'partial',
    description: '自动维护任务（部分失败）',
    taskDetails: [
      { name: '清理临时文件', status: 'success', duration: 2 * 60 * 1000, result: '清理了 800MB 临时文件' },
      { name: '数据库优化', status: 'failed', duration: 2 * 60 * 1000, result: '数据库锁定，优化失败' },
      { name: '内存清理', status: 'success', duration: 1 * 60 * 1000, result: '释放了 128MB 内存' }
    ]
  },
  {
    id: '3',
    date: Date.now() - 21 * 24 * 60 * 60 * 1000,
    type: 'scheduled',
    tasks: 6,
    duration: 12 * 60 * 1000,
    status: 'success',
    description: '定期维护任务',
    reportPath: '/reports/maintenance-20241110.pdf'
  }
])

const allTasksSelected = computed(() => {
  return maintenanceTasks.value.every(task => task.selected || task.running || task.completed)
})


const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}


const formatTime = (timestamp: number, format: 'datetime' | 'date' = 'datetime') => {
  const date = new Date(timestamp)
  if (format === 'date') {
    return date.toLocaleDateString('zh-CN')
  }
  return date.toLocaleString('zh-CN')
}


const formatDuration = (duration: number) => {
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))
  const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((duration % (1000 * 60)) / 1000)
  
  if (days > 0) {
    return `${days}天${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}


const getTaskStatusType = (task: MaintenanceTask) => {
  if (task.running) return 'warning'
  if (task.completed) {
    return task.result?.success ? 'success' : 'danger'
  }
  return 'info'
}


const getTaskStatusText = (task: MaintenanceTask) => {
  if (task.running) return '执行中'
  if (task.completed) {
    return task.result?.success ? '已完成' : '执行失败'
  }
  return '待执行'
}


const getHistoryType = (type: string) => {
  const types: Record<string, string> = {
    auto: 'success',
    manual: 'primary',
    scheduled: 'warning'
  }
  return types[type] || 'info'
}


const getHistoryTypeText = (type: string) => {
  const texts: Record<string, string> = {
    auto: '自动',
    manual: '手动',
    scheduled: '定期'
  }
  return texts[type] || type
}


const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    success: 'success',
    failed: 'danger',
    partial: 'warning'
  }
  return types[status] || 'info'
}


const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    success: '成功',
    failed: '失败',
    partial: '部分成功'
  }
  return texts[status] || status
}


const refreshStatus = () => {
  ElMessage.success('状态已刷新')
}


const startMaintenance = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要开始系统维护吗？这将执行所有推荐的维护任务。',
      '确认维护',
      {
        confirmButtonText: '开始',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    maintenanceTasks.value.forEach(task => {
      if (['1', '2', '4'].includes(task.id)) {
        task.selected = true
      }
    })
    
    updateSelectedTasks()
    runSelectedTasks()
  } catch {
    
  }
}


const selectAllTasks = () => {
  const shouldSelect = !allTasksSelected.value
  maintenanceTasks.value.forEach(task => {
    if (!task.running && !task.completed) {
      task.selected = shouldSelect
    }
  })
  updateSelectedTasks()
}


const updateSelectedTasks = () => {
  selectedTasks.value = maintenanceTasks.value
    .filter(task => task.selected)
    .map(task => task.id)
}


const runTask = async (task: MaintenanceTask) => {
  task.running = true
  task.progress = 0
  task.startTime = Date.now()
  task.progressText = '准备执行...'
  
  
  const interval = setInterval(() => {
    if (task.progress! < 100) {
      task.progress! += Math.random() * 15
      if (task.progress! > 100) task.progress = 100
      
      
      if (task.progress! < 30) {
        task.progressText = '初始化...'
      } else if (task.progress! < 70) {
        task.progressText = '执行中...'
      } else if (task.progress! < 90) {
        task.progressText = '清理中...'
      } else {
        task.progressText = '即将完成...'
      }
      
      
      const elapsed = Date.now() - task.startTime!
      const estimated = (elapsed / task.progress!) * 100
      task.eta = estimated - elapsed
    } else {
      clearInterval(interval)
      
      task.running = false
      task.completed = true
      task.executionTime = Date.now() - task.startTime!
      
      
      const success = Math.random() > 0.1 
      task.result = {
        success,
        details: success ? '任务执行成功' : '任务执行失败：权限不足',
        logs: `[${formatTime(task.startTime!)}] 开始执行任务\n[${formatTime(Date.now())}] 任务${success ? '成功' : '失败'}完成`,
        stats: {
          '处理文件': Math.floor(Math.random() * 100) + 50,
          '释放空间': formatBytes(Math.floor(Math.random() * 500 * 1024 * 1024)),
          '执行时间': formatDuration(task.executionTime!)
        }
      }
      
      ElMessage.success(`任务 "${task.name}" 执行完成`)
    }
  }, 500)
}


const stopTask = async (task: MaintenanceTask) => {
  try {
    await ElMessageBox.confirm(
      `确定要停止任务 "${task.name}" 吗？`,
      '确认停止',
      {
        confirmButtonText: '停止',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    task.running = false
    task.completed = true
    task.result = {
      success: false,
      details: '任务被用户停止'
    }
    
    ElMessage.warning(`任务 "${task.name}" 已停止`)
  } catch {
    
  }
}


const runSelectedTasks = async () => {
  const tasksToRun = maintenanceTasks.value.filter(task => task.selected && !task.running && !task.completed)
  
  if (tasksToRun.length === 0) {
    ElMessage.warning('没有可执行的任务')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要执行 ${tasksToRun.length} 个选中的任务吗？`,
      '确认执行',
      {
        confirmButtonText: '执行',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    for (const task of tasksToRun) {
      await runTask(task)
      
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!task.running) {
            clearInterval(checkInterval)
            resolve(void 0)
          }
        }, 1000)
      })
      
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    ElMessage.success('所有选中任务执行完成')
  } catch {
    
  }
}


const viewTaskResult = (task: MaintenanceTask) => {
  selectedTaskResult.value = task
  resultVisible.value = true
}


const startCleanup = async () => {
  cleanupRunning.value = true
  
  try {
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const cleanedSize = cleanupOptions.value.reduce((total, option) => {
      switch (option) {
        case 'temp': return total + 300 * 1024 * 1024
        case 'logs': return total + 500 * 1024 * 1024
        case 'cache': return total + 200 * 1024 * 1024
        case 'backup': return total + 100 * 1024 * 1024
        default: return total
      }
    }, 0)
    
    ElMessage.success(`清理完成，释放了 ${formatBytes(cleanedSize)} 空间`)
    
    
    cleanupStats.cleanableSize -= cleanedSize
    if (cleanupOptions.value.includes('temp')) {
      cleanupStats.tempFiles = Math.floor(cleanupStats.tempFiles * 0.1)
    }
    if (cleanupOptions.value.includes('logs')) {
      cleanupStats.logSize = Math.floor(cleanupStats.logSize * 0.3)
    }
    if (cleanupOptions.value.includes('cache')) {
      cleanupStats.cacheSize = Math.floor(cleanupStats.cacheSize * 0.2)
    }
  } catch (error) {
    ElMessage.error('清理失败')
  } finally {
    cleanupRunning.value = false
  }
}


const optimizeMemory = () => {
  ElMessage.success('内存优化完成')
}

const optimizeDatabase = () => {
  ElMessage.success('数据库优化完成')
}

const optimizePlugins = () => {
  ElMessage.success('插件优化完成')
}

const optimizeNetwork = () => {
  ElMessage.success('网络优化完成')
}


const restartService = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重启服务吗？这将中断当前所有连接。',
      '确认重启',
      {
        confirmButtonText: '重启',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.success('服务重启中...')
  } catch {
    
  }
}

const exportLogs = () => {
  ElMessage.success('日志导出已开始')
}

const generateReport = () => {
  ElMessage.success('报告生成中...')
}

const systemDiagnosis = () => {
  ElMessage.info('系统诊断功能开发中')
}


const viewHistoryDetails = (history: MaintenanceHistory) => {
  selectedHistory.value = history
  historyDetailVisible.value = true
}


const viewAllHistory = () => {
  ElMessage.info('查看全部历史功能开发中')
}


const downloadReport = (history: MaintenanceHistory) => {
  if (history.reportPath) {
    ElMessage.success('报告下载已开始')
  }
}

onMounted(() => {
  updateSelectedTasks()
})
</script>

<style scoped>
.system-maintenance {
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

.status-overview {
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
  background: linear-gradient(135deg, #409eff, #66b3ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.status-info {
  flex: 1;
}

.status-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.status-label {
  font-size: 14px;
  color: #909399;
}

.tasks-card,
.cleanup-card,
.optimization-card,
.tools-card,
.history-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.tasks-list {
  max-height: 600px;
  overflow-y: auto;
}

.task-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  transition: all 0.3s;
}

.task-item:hover {
  border-color: #409eff;
}

.task-item.task-running {
  border-color: #e6a23c;
  background-color: #fdf6ec;
}

.task-item.task-completed {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.task-left {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  flex: 1;
}

.task-info h4 {
  margin: 0 0 5px 0;
  color: #303133;
}

.task-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.task-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.task-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.task-duration {
  font-size: 12px;
  color: #909399;
}

.task-actions {
  display: flex;
  gap: 10px;
}

.task-progress {
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.progress-text {
  font-size: 12px;
  color: #606266;
}

.task-result {
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
}

.result-summary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-icon {
  font-size: 18px;
}

.result-icon.success {
  color: #67c23a;
}

.result-icon.error {
  color: #f56c6c;
}

.result-text {
  font-weight: 500;
  color: #303133;
}

.result-details {
  color: #606266;
  font-size: 14px;
}

.cleanup-content,
.optimization-content,
.tools-content {
  padding: 10px 0;
}

.cleanup-stats {
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #606266;
}

.stat-value {
  font-weight: 500;
  color: #303133;
}

.cleanup-options {
  margin-bottom: 20px;
}

.cleanup-options :deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.optimization-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}

.optimization-item:last-child {
  border-bottom: none;
}

.item-info h5 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 14px;
}

.item-info p {
  margin: 0;
  color: #909399;
  font-size: 12px;
}

.tools-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-result-details,
.history-details {
  max-height: 60vh;
  overflow-y: auto;
}

.result-logs,
.result-stats,
.history-tasks {
  margin-top: 20px;
}

.result-logs h4,
.result-stats h4,
.history-tasks h4 {
  margin-bottom: 15px;
  color: #303133;
}

.logs-container {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
  max-height: 200px;
  overflow-y: auto;
}

.logs-container pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
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
  
  .status-overview :deep(.el-col) {
    margin-bottom: 15px;
  }
  
  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .task-right {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .task-meta {
    align-items: flex-start;
  }
  
  .optimization-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>