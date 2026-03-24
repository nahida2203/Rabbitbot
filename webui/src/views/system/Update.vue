<template>
  <div class="system-update">
    
    <div class="page-header">
      <div class="header-left">
        <h2>系统更新</h2>
        <p>检查和管理系统更新</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="checkUpdates" :loading="checking">
          <el-icon><Refresh /></el-icon>
          检查更新
        </el-button>
        <el-button @click="viewUpdateHistory">
          <el-icon><Clock /></el-icon>
          更新历史
        </el-button>
      </div>
    </div>

    
    <el-card class="version-card">
      <template #header>
        <div class="card-header">
          <span>当前版本信息</span>
          <el-tag :type="getVersionType(currentVersion.status)" size="large">
            {{ getVersionStatus(currentVersion.status) }}
          </el-tag>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="version-info">
            <div class="version-item">
              <div class="version-label">当前版本</div>
              <div class="version-value">{{ currentVersion.version }}</div>
            </div>
            <div class="version-item">
              <div class="version-label">构建版本</div>
              <div class="version-value">{{ currentVersion.build }}</div>
            </div>
            <div class="version-item">
              <div class="version-label">发布时间</div>
              <div class="version-value">{{ formatTime(currentVersion.releaseDate) }}</div>
            </div>
            <div class="version-item">
              <div class="version-label">运行时间</div>
              <div class="version-value">{{ formatDuration(currentVersion.uptime) }}</div>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="version-info">
            <div class="version-item">
              <div class="version-label">更新渠道</div>
              <div class="version-value">
                <el-select v-model="updateChannel" @change="changeUpdateChannel">
                  <el-option label="稳定版" value="stable" />
                  <el-option label="测试版" value="beta" />
                  <el-option label="开发版" value="dev" />
                </el-select>
              </div>
            </div>
            <div class="version-item">
              <div class="version-label">自动更新</div>
              <div class="version-value">
                <el-switch v-model="autoUpdate" @change="toggleAutoUpdate" />
              </div>
            </div>
            <div class="version-item">
              <div class="version-label">更新检查</div>
              <div class="version-value">
                <el-select v-model="updateCheckInterval" @change="changeCheckInterval">
                  <el-option label="每小时" value="hourly" />
                  <el-option label="每天" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="手动" value="manual" />
                </el-select>
              </div>
            </div>
            <div class="version-item">
              <div class="version-label">最后检查</div>
              <div class="version-value">{{ formatTime(lastCheckTime) }}</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    
    <el-card v-if="availableUpdates.length > 0" class="updates-card">
      <template #header>
        <div class="card-header">
          <span>可用更新 ({{ availableUpdates.length }})</span>
          <el-button type="primary" @click="updateAll" :loading="updating">
            <el-icon><Download /></el-icon>
            全部更新
          </el-button>
        </div>
      </template>
      
      <div class="updates-list">
        <div v-for="update in availableUpdates" :key="update.id" class="update-item">
          <div class="update-header">
            <div class="update-title">
              <h4>{{ update.name }} {{ update.version }}</h4>
              <div class="update-tags">
                <el-tag :type="getUpdateType(update.type)" size="small">
                  {{ getUpdateTypeText(update.type) }}
                </el-tag>
                <el-tag v-if="update.security" type="danger" size="small">
                  安全更新
                </el-tag>
                <el-tag v-if="update.critical" type="warning" size="small">
                  重要更新
                </el-tag>
              </div>
            </div>
            <div class="update-actions">
              <el-button size="small" @click="viewUpdateDetails(update)">
                详情
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="installUpdate(update)"
                :loading="update.installing"
              >
                {{ update.installing ? '安装中' : '安装' }}
              </el-button>
            </div>
          </div>
          
          <div class="update-content">
            <div class="update-info">
              <div class="info-item">
                <span class="info-label">版本:</span>
                <span class="info-value">{{ update.currentVersion }} → {{ update.version }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">大小:</span>
                <span class="info-value">{{ formatBytes(update.size) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">发布时间:</span>
                <span class="info-value">{{ formatTime(update.releaseDate) }}</span>
              </div>
            </div>
            
            <div class="update-description">
              <p>{{ update.description }}</p>
            </div>
            
            <div v-if="update.changelog" class="update-changelog">
              <h5>更新内容:</h5>
              <ul>
                <li v-for="(change, index) in update.changelog" :key="index">
                  {{ change }}
                </li>
              </ul>
            </div>
            
            <div v-if="update.installing" class="update-progress">
              <el-progress
                :percentage="update.progress"
                :status="update.progress === 100 ? 'success' : undefined"
              >
                <template #default="{ percentage }">
                  <span class="progress-text">{{ percentage }}%</span>
                </template>
              </el-progress>
              <div class="progress-info">
                <span>{{ update.progressText || '正在下载...' }}</span>
                <span v-if="update.downloadSpeed">{{ formatBytes(update.downloadSpeed) }}/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    
    <el-card v-else-if="!checking" class="no-updates-card">
      <div class="no-updates">
        <el-icon class="no-updates-icon"><SuccessFilled /></el-icon>
        <h3>系统已是最新版本</h3>
        <p>当前没有可用的更新</p>
        <el-button type="primary" @click="checkUpdates">
          重新检查
        </el-button>
      </div>
    </el-card>

    
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>最近更新</span>
          <el-button size="small" text @click="viewAllHistory">
            查看全部
          </el-button>
        </div>
      </template>
      
      <el-timeline>
        <el-timeline-item
          v-for="history in recentHistory"
          :key="history.id"
          :timestamp="formatTime(history.date)"
          :type="getHistoryType(history.status)"
        >
          <div class="history-item">
            <div class="history-header">
              <h4>{{ history.name }} {{ history.version }}</h4>
              <el-tag :type="getHistoryStatusType(history.status)" size="small">
                {{ getHistoryStatusText(history.status) }}
              </el-tag>
            </div>
            <p class="history-description">{{ history.description }}</p>
            <div v-if="history.duration" class="history-meta">
              <span>安装耗时: {{ formatDuration(history.duration) }}</span>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    
    <el-dialog
      v-model="detailsVisible"
      title="更新详情"
      width="60%"
      :before-close="closeDetails"
    >
      <div v-if="selectedUpdate" class="update-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="更新名称" :span="2">
            <strong>{{ selectedUpdate.name }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="当前版本">
            {{ selectedUpdate.currentVersion }}
          </el-descriptions-item>
          <el-descriptions-item label="新版本">
            {{ selectedUpdate.version }}
          </el-descriptions-item>
          <el-descriptions-item label="更新类型">
            <el-tag :type="getUpdateType(selectedUpdate.type)">
              {{ getUpdateTypeText(selectedUpdate.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="更新大小">
            {{ formatBytes(selectedUpdate.size) }}
          </el-descriptions-item>
          <el-descriptions-item label="发布时间" :span="2">
            {{ formatTime(selectedUpdate.releaseDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedUpdate.description }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="selectedUpdate.changelog" class="details-changelog">
          <h4>更新内容</h4>
          <ul>
            <li v-for="(change, index) in selectedUpdate.changelog" :key="index">
              {{ change }}
            </li>
          </ul>
        </div>
        
        <div v-if="selectedUpdate.requirements" class="details-requirements">
          <h4>系统要求</h4>
          <el-descriptions :column="1" size="small">
            <el-descriptions-item
              v-for="(value, key) in selectedUpdate.requirements"
              :key="key"
              :label="key"
            >
              {{ value }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div v-if="selectedUpdate.warnings" class="details-warnings">
          <h4>注意事项</h4>
          <el-alert
            v-for="(warning, index) in selectedUpdate.warnings"
            :key="index"
            :title="warning"
            type="warning"
            :closable="false"
            style="margin-bottom: 10px"
          />
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailsVisible = false">关闭</el-button>
          <el-button
            v-if="selectedUpdate && !selectedUpdate.installing"
            type="primary"
            @click="installUpdate(selectedUpdate)"
          >
            安装更新
          </el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog
      v-model="historyVisible"
      title="更新历史"
      width="70%"
    >
      <el-table :data="updateHistory" stripe>
        <el-table-column prop="name" label="更新名称" min-width="150" />
        <el-table-column prop="version" label="版本" width="120" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getUpdateType(row.type)" size="small">
              {{ getUpdateTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getHistoryStatusType(row.status)" size="small">
              {{ getHistoryStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="更新时间" width="150">
          <template #default="{ row }">
            {{ formatTime(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时" width="100">
          <template #default="{ row }">
            {{ row.duration ? formatDuration(row.duration) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Clock,
  Download,
  SuccessFilled
} from '@element-plus/icons-vue'

interface Update {
  id: string
  name: string
  version: string
  currentVersion: string
  type: 'major' | 'minor' | 'patch' | 'security'
  size: number
  description: string
  changelog?: string[]
  releaseDate: number
  security?: boolean
  critical?: boolean
  installing?: boolean
  progress?: number
  progressText?: string
  downloadSpeed?: number
  requirements?: Record<string, string>
  warnings?: string[]
}

interface UpdateHistory {
  id: string
  name: string
  version: string
  type: string
  status: 'success' | 'failed' | 'cancelled'
  date: number
  duration?: number
  description: string
}

const checking = ref(false)
const updating = ref(false)
const detailsVisible = ref(false)
const historyVisible = ref(false)
const selectedUpdate = ref<Update | null>(null)
const updateChannel = ref('stable')
const autoUpdate = ref(true)
const updateCheckInterval = ref('daily')
const lastCheckTime = ref(Date.now() - 2 * 60 * 60 * 1000)

const currentVersion = reactive({
  version: 'v3.2.1',
  build: '20241201.1',
  releaseDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
  uptime: 5 * 24 * 60 * 60 * 1000,
  status: 'stable'
})

const availableUpdates = ref<Update[]>([
  {
    id: '1',
    name: 'Yunzai-Bot',
    version: 'v3.2.2',
    currentVersion: 'v3.2.1',
    type: 'patch',
    size: 15 * 1024 * 1024,
    description: '修复了一些已知问题，提升了系统稳定性',
    changelog: [
      '修复插件加载时的内存泄漏问题',
      '优化消息处理性能',
      '更新依赖包到最新版本',
      '修复配置文件读取错误'
    ],
    releaseDate: Date.now() - 24 * 60 * 60 * 1000,
    security: false,
    critical: false,
    requirements: {
      'Node.js': '>= 16.0.0',
      '内存': '>= 512MB',
      '磁盘空间': '>= 100MB'
    }
  },
  {
    id: '2',
    name: 'Plugin-Manager',
    version: 'v2.1.0',
    currentVersion: 'v2.0.5',
    type: 'minor',
    size: 8 * 1024 * 1024,
    description: '插件管理器重大更新，新增多项功能',
    changelog: [
      '新增插件依赖检查功能',
      '支持插件热重载',
      '优化插件安装流程',
      '新增插件评分系统'
    ],
    releaseDate: Date.now() - 12 * 60 * 60 * 1000,
    security: false,
    critical: true,
    warnings: [
      '此更新可能需要重启服务',
      '建议在更新前备份插件配置'
    ]
  },
  {
    id: '3',
    name: 'Security-Patch',
    version: 'v1.0.3',
    currentVersion: 'v1.0.2',
    type: 'security',
    size: 2 * 1024 * 1024,
    description: '重要安全更新，修复了潜在的安全漏洞',
    changelog: [
      '修复权限验证绕过漏洞',
      '加强输入验证',
      '更新加密算法'
    ],
    releaseDate: Date.now() - 6 * 60 * 60 * 1000,
    security: true,
    critical: true,
    warnings: [
      '此为安全更新，强烈建议立即安装'
    ]
  }
])

const updateHistory = ref<UpdateHistory[]>([
  {
    id: '1',
    name: 'Yunzai-Bot',
    version: 'v3.2.1',
    type: 'patch',
    status: 'success',
    date: Date.now() - 7 * 24 * 60 * 60 * 1000,
    duration: 3 * 60 * 1000,
    description: '修复消息发送失败的问题'
  },
  {
    id: '2',
    name: 'Plugin-Manager',
    version: 'v2.0.5',
    type: 'patch',
    status: 'success',
    date: Date.now() - 14 * 24 * 60 * 60 * 1000,
    duration: 2 * 60 * 1000,
    description: '优化插件加载速度'
  },
  {
    id: '3',
    name: 'Core-System',
    version: 'v3.2.0',
    type: 'minor',
    status: 'failed',
    date: Date.now() - 21 * 24 * 60 * 60 * 1000,
    description: '系统核心更新失败，网络连接超时'
  },
  {
    id: '4',
    name: 'Yunzai-Bot',
    version: 'v3.1.8',
    type: 'patch',
    status: 'success',
    date: Date.now() - 30 * 24 * 60 * 60 * 1000,
    duration: 4 * 60 * 1000,
    description: '新增多项功能和性能优化'
  }
])

const recentHistory = computed(() => {
  return updateHistory.value.slice(0, 3)
})


const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}


const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}


const formatDuration = (duration: number) => {
  const days = Math.floor(duration / (1000 * 60 * 60 * 24))
  const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days}天${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}


const getVersionType = (status: string) => {
  const types: Record<string, string> = {
    stable: 'success',
    beta: 'warning',
    dev: 'danger',
    outdated: 'info'
  }
  return types[status] || 'info'
}


const getVersionStatus = (status: string) => {
  const texts: Record<string, string> = {
    stable: '稳定版',
    beta: '测试版',
    dev: '开发版',
    outdated: '过时版本'
  }
  return texts[status] || status
}


const getUpdateType = (type: string) => {
  const types: Record<string, string> = {
    major: 'danger',
    minor: 'warning',
    patch: 'success',
    security: 'danger'
  }
  return types[type] || 'info'
}


const getUpdateTypeText = (type: string) => {
  const texts: Record<string, string> = {
    major: '主要更新',
    minor: '次要更新',
    patch: '补丁更新',
    security: '安全更新'
  }
  return texts[type] || type
}


const getHistoryType = (status: string) => {
  const types: Record<string, string> = {
    success: 'success',
    failed: 'danger',
    cancelled: 'warning'
  }
  return types[status] || 'info'
}


const getHistoryStatusType = (status: string) => {
  const types: Record<string, string> = {
    success: 'success',
    failed: 'danger',
    cancelled: 'warning'
  }
  return types[status] || 'info'
}


const getHistoryStatusText = (status: string) => {
  const texts: Record<string, string> = {
    success: '成功',
    failed: '失败',
    cancelled: '已取消'
  }
  return texts[status] || status
}


const checkUpdates = async () => {
  checking.value = true
  
  try {
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    lastCheckTime.value = Date.now()
    ElMessage.success('更新检查完成')
  } catch (error) {
    ElMessage.error('检查更新失败')
  } finally {
    checking.value = false
  }
}


const installUpdate = async (update: Update) => {
  try {
    await ElMessageBox.confirm(
      `确定要安装 ${update.name} ${update.version} 吗？`,
      '确认更新',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    update.installing = true
    update.progress = 0
    update.progressText = '准备下载...'
    
    
    const interval = setInterval(() => {
      if (update.progress! < 100) {
        update.progress! += Math.random() * 10
        if (update.progress! > 100) update.progress = 100
        
        if (update.progress! < 30) {
          update.progressText = '正在下载...'
          update.downloadSpeed = Math.floor(Math.random() * 5 * 1024 * 1024) + 1024 * 1024
        } else if (update.progress! < 70) {
          update.progressText = '正在安装...'
          update.downloadSpeed = undefined
        } else if (update.progress! < 90) {
          update.progressText = '正在配置...'
        } else {
          update.progressText = '即将完成...'
        }
      } else {
        clearInterval(interval)
        
        
        const index = availableUpdates.value.findIndex(u => u.id === update.id)
        if (index > -1) {
          availableUpdates.value.splice(index, 1)
        }
        
        
        updateHistory.value.unshift({
          id: Date.now().toString(),
          name: update.name,
          version: update.version,
          type: update.type,
          status: 'success',
          date: Date.now(),
          duration: 3 * 60 * 1000,
          description: update.description
        })
        
        ElMessage.success(`${update.name} 更新完成`)
        
        
        if (update.name === 'Yunzai-Bot') {
          ElMessageBox.confirm(
            '系统更新完成，建议重启服务以确保更新生效。',
            '更新完成',
            {
              confirmButtonText: '立即重启',
              cancelButtonText: '稍后重启',
              type: 'success'
            }
          ).then(() => {
            ElMessage.info('正在重启服务...')
          }).catch(() => {
            
          })
        }
      }
    }, 500)
  } catch {
    
  }
}


const updateAll = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要安装所有 ${availableUpdates.value.length} 个更新吗？`,
      '确认批量更新',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    updating.value = true
    
    
    for (const update of availableUpdates.value) {
      if (!update.installing) {
        await installUpdate(update)
        
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!update.installing) {
              clearInterval(checkInterval)
              resolve(void 0)
            }
          }, 1000)
        })
      }
    }
    
    ElMessage.success('所有更新已完成')
  } catch {
    
  } finally {
    updating.value = false
  }
}


const viewUpdateDetails = (update: Update) => {
  selectedUpdate.value = update
  detailsVisible.value = true
}


const closeDetails = () => {
  detailsVisible.value = false
  selectedUpdate.value = null
}


const viewUpdateHistory = () => {
  historyVisible.value = true
}


const viewAllHistory = () => {
  historyVisible.value = true
}


const changeUpdateChannel = () => {
  ElMessage.success(`已切换到${getChannelText(updateChannel.value)}渠道`)
}


const getChannelText = (channel: string) => {
  const texts: Record<string, string> = {
    stable: '稳定版',
    beta: '测试版',
    dev: '开发版'
  }
  return texts[channel] || channel
}


const toggleAutoUpdate = () => {
  ElMessage.success(`自动更新已${autoUpdate.value ? '开启' : '关闭'}`)
}


const changeCheckInterval = () => {
  const texts: Record<string, string> = {
    hourly: '每小时',
    daily: '每天',
    weekly: '每周',
    manual: '手动'
  }
  ElMessage.success(`更新检查频率已设置为${texts[updateCheckInterval.value]}`)
}

onMounted(() => {
  
})
</script>

<style scoped>
.system-update {
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

.version-card,
.updates-card,
.no-updates-card,
.history-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-info {
  padding: 10px 0;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.version-item:last-child {
  border-bottom: none;
}

.version-label {
  font-weight: 500;
  color: #303133;
}

.version-value {
  color: #606266;
}

.updates-list {
  max-height: 600px;
  overflow-y: auto;
}

.update-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  transition: all 0.3s;
}

.update-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.update-title h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.update-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.update-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.update-content {
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
}

.update-info {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  gap: 5px;
}

.info-label {
  font-weight: 500;
  color: #909399;
}

.info-value {
  color: #303133;
}

.update-description {
  margin-bottom: 15px;
  color: #606266;
  line-height: 1.6;
}

.update-changelog {
  margin-bottom: 15px;
}

.update-changelog h5 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
}

.update-changelog ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
}

.update-changelog li {
  margin-bottom: 5px;
  line-height: 1.5;
}

.update-progress {
  margin-top: 15px;
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

.no-updates {
  text-align: center;
  padding: 40px 20px;
}

.no-updates-icon {
  font-size: 64px;
  color: #67c23a;
  margin-bottom: 20px;
}

.no-updates h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.no-updates p {
  margin: 0 0 20px 0;
  color: #909399;
}

.history-item {
  padding: 10px 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.history-header h4 {
  margin: 0;
  color: #303133;
  font-size: 14px;
}

.history-description {
  margin: 0 0 5px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}

.history-meta {
  font-size: 12px;
  color: #909399;
}

.update-details {
  max-height: 60vh;
  overflow-y: auto;
}

.details-changelog,
.details-requirements,
.details-warnings {
  margin-top: 20px;
}

.details-changelog h4,
.details-requirements h4,
.details-warnings h4 {
  margin-bottom: 15px;
  color: #303133;
}

.details-changelog ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
}

.details-changelog li {
  margin-bottom: 8px;
  line-height: 1.5;
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
  
  .update-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .update-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .update-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .version-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>