<template>
  <div class="backup-system">
    
    <div class="page-header">
      <div class="header-left">
        <h2>系统备份</h2>
        <p>数据备份与恢复管理</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="createBackup">
          <el-icon><FolderAdd /></el-icon>
          创建备份
        </el-button>
        <el-button @click="refreshBackups">
          <el-icon><Refresh /></el-icon>
          刷新列表
        </el-button>
      </div>
    </div>

    
    <div class="backup-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><FolderOpened /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ backupStats.total }}</div>
                <div class="stat-label">总备份数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ backupStats.recent }}</div>
                <div class="stat-label">最近7天</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Coin /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatBytes(backupStats.totalSize) }}</div>
                <div class="stat-label">总大小</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ backupStats.successful }}</div>
                <div class="stat-label">成功备份</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20">
      
      <el-col :span="8">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>备份配置</span>
              <el-button size="small" text @click="editConfig">
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="config-content">
            <div class="config-item">
              <div class="config-label">自动备份</div>
              <div class="config-value">
                <el-switch
                  v-model="backupConfig.autoBackup"
                  @change="updateConfig"
                />
              </div>
            </div>
            
            <div class="config-item">
              <div class="config-label">备份频率</div>
              <div class="config-value">
                <el-select
                  v-model="backupConfig.frequency"
                  size="small"
                  @change="updateConfig"
                >
                  <el-option label="每小时" value="hourly" />
                  <el-option label="每天" value="daily" />
                  <el-option label="每周" value="weekly" />
                  <el-option label="每月" value="monthly" />
                </el-select>
              </div>
            </div>
            
            <div class="config-item">
              <div class="config-label">保留数量</div>
              <div class="config-value">
                <el-input-number
                  v-model="backupConfig.retentionCount"
                  :min="1"
                  :max="100"
                  size="small"
                  @change="updateConfig"
                />
              </div>
            </div>
            
            <div class="config-item">
              <div class="config-label">备份路径</div>
              <div class="config-value">
                <el-input
                  v-model="backupConfig.backupPath"
                  size="small"
                  readonly
                >
                  <template #append>
                    <el-button @click="selectBackupPath">
                      <el-icon><Folder /></el-icon>
                    </el-button>
                  </template>
                </el-input>
              </div>
            </div>
            
            <div class="config-item">
              <div class="config-label">压缩备份</div>
              <div class="config-value">
                <el-switch
                  v-model="backupConfig.compression"
                  @change="updateConfig"
                />
              </div>
            </div>
            
            <div class="config-item">
              <div class="config-label">加密备份</div>
              <div class="config-value">
                <el-switch
                  v-model="backupConfig.encryption"
                  @change="updateConfig"
                />
              </div>
            </div>
            
            <div class="config-item">
              <div class="config-label">下次备份</div>
              <div class="config-value next-backup">
                {{ formatTime(backupConfig.nextBackup) }}
              </div>
            </div>
          </div>
        </el-card>
        
        
        <el-card class="content-card">
          <template #header>
            <span>备份内容</span>
          </template>
          
          <div class="backup-content">
            <el-checkbox-group v-model="backupContent">
              <div class="content-item">
                <el-checkbox label="database">数据库</el-checkbox>
                <span class="content-size">~{{ formatBytes(contentSizes.database) }}</span>
              </div>
              <div class="content-item">
                <el-checkbox label="config">配置文件</el-checkbox>
                <span class="content-size">~{{ formatBytes(contentSizes.config) }}</span>
              </div>
              <div class="content-item">
                <el-checkbox label="plugins">插件数据</el-checkbox>
                <span class="content-size">~{{ formatBytes(contentSizes.plugins) }}</span>
              </div>
              <div class="content-item">
                <el-checkbox label="logs">日志文件</el-checkbox>
                <span class="content-size">~{{ formatBytes(contentSizes.logs) }}</span>
              </div>
              <div class="content-item">
                <el-checkbox label="resources">资源文件</el-checkbox>
                <span class="content-size">~{{ formatBytes(contentSizes.resources) }}</span>
              </div>
              <div class="content-item">
                <el-checkbox label="userdata">用户数据</el-checkbox>
                <span class="content-size">~{{ formatBytes(contentSizes.userdata) }}</span>
              </div>
            </el-checkbox-group>
            
            <div class="total-size">
              <strong>预计大小: {{ formatBytes(estimatedSize) }}</strong>
            </div>
          </div>
        </el-card>
      </el-col>

      
      <el-col :span="16">
        <el-card class="backups-card">
          <template #header>
            <div class="card-header">
              <span>备份列表</span>
              <div class="header-actions">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索备份"
                  size="small"
                  style="width: 200px; margin-right: 10px"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-select
                  v-model="statusFilter"
                  placeholder="状态筛选"
                  size="small"
                  style="width: 120px"
                  clearable
                >
                  <el-option label="全部" value="" />
                  <el-option label="成功" value="success" />
                  <el-option label="失败" value="failed" />
                  <el-option label="进行中" value="running" />
                </el-select>
              </div>
            </div>
          </template>
          
          <el-table
            :data="filteredBackups"
            v-loading="loading"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="name" label="备份名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getTypeColor(row.type)" size="small">
                  {{ getTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="size" label="大小" width="100">
              <template #default="{ row }">
                {{ formatBytes(row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="progress" label="进度" width="120">
              <template #default="{ row }">
                <el-progress
                  v-if="row.status === 'running'"
                  :percentage="row.progress"
                  :show-text="false"
                  size="small"
                />
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时" width="100">
              <template #default="{ row }">
                {{ row.duration ? formatDuration(row.duration) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'success'"
                  type="primary"
                  size="small"
                  text
                  @click="restoreBackup(row)"
                >
                  恢复
                </el-button>
                <el-button
                  v-if="row.status === 'success'"
                  size="small"
                  text
                  @click="downloadBackup(row)"
                >
                  下载
                </el-button>
                <el-button
                  size="small"
                  text
                  @click="viewBackupDetails(row)"
                >
                  详情
                </el-button>
                <el-button
                  v-if="row.status === 'running'"
                  type="warning"
                  size="small"
                  text
                  @click="cancelBackup(row)"
                >
                  取消
                </el-button>
                <el-button
                  v-else
                  type="danger"
                  size="small"
                  text
                  @click="deleteBackup(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.size"
              :total="pagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-dialog
      v-model="createBackupVisible"
      title="创建备份"
      width="50%"
    >
      <el-form :model="backupForm" :rules="backupRules" ref="backupFormRef" label-width="100px">
        <el-form-item label="备份名称" prop="name">
          <el-input v-model="backupForm.name" placeholder="请输入备份名称" />
        </el-form-item>
        <el-form-item label="备份类型" prop="type">
          <el-radio-group v-model="backupForm.type">
            <el-radio label="full">完整备份</el-radio>
            <el-radio label="incremental">增量备份</el-radio>
            <el-radio label="differential">差异备份</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备份内容">
          <el-checkbox-group v-model="backupForm.content">
            <el-checkbox label="database">数据库</el-checkbox>
            <el-checkbox label="config">配置文件</el-checkbox>
            <el-checkbox label="plugins">插件数据</el-checkbox>
            <el-checkbox label="logs">日志文件</el-checkbox>
            <el-checkbox label="resources">资源文件</el-checkbox>
            <el-checkbox label="userdata">用户数据</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="压缩">
          <el-switch v-model="backupForm.compression" />
        </el-form-item>
        <el-form-item label="加密">
          <el-switch v-model="backupForm.encryption" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="backupForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入备份描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createBackupVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCreateBackup">开始备份</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog
      v-model="detailsVisible"
      title="备份详情"
      width="60%"
    >
      <div v-if="selectedBackup" class="backup-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="备份名称" :span="2">
            <strong>{{ selectedBackup.name }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="备份类型">
            <el-tag :type="getTypeColor(selectedBackup.type)">
              {{ getTypeText(selectedBackup.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备份状态">
            <el-tag :type="getStatusType(selectedBackup.status)">
              {{ getStatusText(selectedBackup.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="文件大小">
            {{ formatBytes(selectedBackup.size) }}
          </el-descriptions-item>
          <el-descriptions-item label="压缩率">
            {{ selectedBackup.compressionRatio }}%
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(selectedBackup.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时间">
            {{ selectedBackup.completedAt ? formatTime(selectedBackup.completedAt) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="备份内容" :span="2">
            <el-tag
              v-for="content in selectedBackup.content"
              :key="content"
              size="small"
              style="margin-right: 5px"
            >
              {{ getContentText(content) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="文件路径" :span="2">
            <code>{{ selectedBackup.filePath }}</code>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedBackup.description" label="描述" :span="2">
            {{ selectedBackup.description }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedBackup.error" label="错误信息" :span="2">
            <el-alert :title="selectedBackup.error" type="error" :closable="false" />
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="selectedBackup.files" class="backup-files">
          <h4>备份文件列表</h4>
          <el-table :data="selectedBackup.files" stripe max-height="300">
            <el-table-column prop="path" label="文件路径" show-overflow-tooltip />
            <el-table-column prop="size" label="大小" width="100">
              <template #default="{ row }">
                {{ formatBytes(row.size) }}
              </template>
            </el-table-column>
            <el-table-column prop="modifiedAt" label="修改时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.modifiedAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>

    
    <el-dialog
      v-model="restoreVisible"
      title="恢复备份"
      width="40%"
    >
      <div class="restore-warning">
        <el-alert
          title="警告"
          type="warning"
          description="恢复备份将覆盖当前数据，此操作不可逆。建议在恢复前先创建当前数据的备份。"
          show-icon
          :closable="false"
        />
        
        <div class="restore-options" style="margin-top: 20px;">
          <el-checkbox v-model="restoreOptions.createBackupBefore">
            恢复前创建当前数据备份
          </el-checkbox>
          <el-checkbox v-model="restoreOptions.stopServices">
            恢复时停止相关服务
          </el-checkbox>
          <el-checkbox v-model="restoreOptions.verifyIntegrity">
            验证备份文件完整性
          </el-checkbox>
        </div>
        
        <div class="confirmation" style="margin-top: 20px;">
          <el-input
            v-model="confirmText"
            placeholder="请输入 'RESTORE' 确认恢复操作"
          />
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="restoreVisible = false">取消</el-button>
          <el-button
            type="danger"
            @click="confirmRestore"
            :disabled="confirmText !== 'RESTORE'"
          >
            确认恢复
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderAdd,
  Refresh,
  FolderOpened,
  Clock,
  Coin,
  SuccessFilled,
  Edit,
  Folder,
  Search
} from '@element-plus/icons-vue'

interface Backup {
  id: string
  name: string
  type: 'full' | 'incremental' | 'differential'
  status: 'success' | 'failed' | 'running'
  size: number
  progress?: number
  createdAt: number
  completedAt?: number
  duration?: number
  content: string[]
  filePath: string
  description?: string
  error?: string
  compressionRatio: number
  files?: Array<{
    path: string
    size: number
    modifiedAt: number
  }>
}

const loading = ref(false)
const createBackupVisible = ref(false)
const detailsVisible = ref(false)
const restoreVisible = ref(false)
const selectedBackup = ref<Backup | null>(null)
const searchKeyword = ref('')
const statusFilter = ref('')
const confirmText = ref('')
const backupFormRef = ref()

const backupStats = reactive({
  total: 15,
  recent: 3,
  totalSize: 2.5 * 1024 * 1024 * 1024,
  successful: 13
})

const backupConfig = reactive({
  autoBackup: true,
  frequency: 'daily',
  retentionCount: 10,
  backupPath: './backups',
  compression: true,
  encryption: false,
  nextBackup: Date.now() + 24 * 60 * 60 * 1000
})

const backupContent = ref(['database', 'config', 'plugins'])

const contentSizes = {
  database: 150 * 1024 * 1024,
  config: 5 * 1024 * 1024,
  plugins: 80 * 1024 * 1024,
  logs: 200 * 1024 * 1024,
  resources: 500 * 1024 * 1024,
  userdata: 300 * 1024 * 1024
}

const estimatedSize = computed(() => {
  return backupContent.value.reduce((total, content) => {
    return total + (contentSizes[content as keyof typeof contentSizes] || 0)
  }, 0)
})

const backupForm = reactive({
  name: '',
  type: 'full',
  content: ['database', 'config'],
  compression: true,
  encryption: false,
  description: ''
})

const backupRules = {
  name: [{ required: true, message: '请输入备份名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择备份类型', trigger: 'change' }]
}

const restoreOptions = reactive({
  createBackupBefore: true,
  stopServices: true,
  verifyIntegrity: true
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

const backups = ref<Backup[]>([
  {
    id: '1',
    name: '自动备份-20241201',
    type: 'full',
    status: 'success',
    size: 256 * 1024 * 1024,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    completedAt: Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000,
    duration: 5 * 60 * 1000,
    content: ['database', 'config', 'plugins'],
    filePath: './backups/auto-backup-20241201.tar.gz',
    description: '每日自动备份',
    compressionRatio: 65,
    files: [
      { path: 'database/yunzai.db', size: 150 * 1024 * 1024, modifiedAt: Date.now() - 25 * 60 * 60 * 1000 },
      { path: 'config/config.yaml', size: 2048, modifiedAt: Date.now() - 48 * 60 * 60 * 1000 },
      { path: 'plugins/plugin-data.json', size: 80 * 1024 * 1024, modifiedAt: Date.now() - 12 * 60 * 60 * 1000 }
    ]
  },
  {
    id: '2',
    name: '手动备份-升级前',
    type: 'full',
    status: 'success',
    size: 512 * 1024 * 1024,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    completedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000,
    duration: 8 * 60 * 1000,
    content: ['database', 'config', 'plugins', 'userdata'],
    filePath: './backups/manual-backup-upgrade.tar.gz',
    description: '系统升级前的完整备份',
    compressionRatio: 58
  },
  {
    id: '3',
    name: '增量备份-20241130',
    type: 'incremental',
    status: 'running',
    size: 0,
    progress: 45,
    createdAt: Date.now() - 30 * 60 * 1000,
    content: ['database', 'logs'],
    filePath: './backups/incremental-20241130.tar.gz',
    compressionRatio: 0
  },
  {
    id: '4',
    name: '配置备份-20241129',
    type: 'differential',
    status: 'failed',
    size: 0,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    content: ['config'],
    filePath: './backups/config-backup-20241129.tar.gz',
    error: '磁盘空间不足',
    compressionRatio: 0
  }
])

const filteredBackups = computed(() => {
  let filtered = backups.value
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(backup => 
      backup.name.toLowerCase().includes(keyword) ||
      backup.description?.toLowerCase().includes(keyword)
    )
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(backup => backup.status === statusFilter.value)
  }
  
  pagination.total = filtered.length
  return filtered
})

// 格式化字节
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 格式化持续时间
const formatDuration = (duration: number) => {
  const minutes = Math.floor(duration / (1000 * 60))
  const seconds = Math.floor((duration % (1000 * 60)) / 1000)
  return `${minutes}分${seconds}秒`
}

// 获取类型颜色
const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    full: 'primary',
    incremental: 'success',
    differential: 'warning'
  }
  return colors[type] || 'info'
}

// 获取类型文本
const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    full: '完整',
    incremental: '增量',
    differential: '差异'
  }
  return texts[type] || type
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    success: 'success',
    failed: 'danger',
    running: 'warning'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    success: '成功',
    failed: '失败',
    running: '进行中'
  }
  return texts[status] || status
}

// 获取内容文本
const getContentText = (content: string) => {
  const texts: Record<string, string> = {
    database: '数据库',
    config: '配置文件',
    plugins: '插件数据',
    logs: '日志文件',
    resources: '资源文件',
    userdata: '用户数据'
  }
  return texts[content] || content
}

// 刷新备份列表
const refreshBackups = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('备份列表已刷新')
  }, 1000)
}

// 创建备份
const createBackup = () => {
  backupForm.name = `手动备份-${new Date().toISOString().split('T')[0]}`
  backupForm.type = 'full'
  backupForm.content = ['database', 'config']
  backupForm.compression = true
  backupForm.encryption = false
  backupForm.description = ''
  createBackupVisible.value = true
}

// 确认创建备份
const confirmCreateBackup = async () => {
  try {
    await backupFormRef.value.validate()
    
    const newBackup: Backup = {
      id: Date.now().toString(),
      name: backupForm.name,
      type: backupForm.type as any,
      status: 'running',
      size: 0,
      progress: 0,
      createdAt: Date.now(),
      content: backupForm.content,
      filePath: `./backups/${backupForm.name.toLowerCase().replace(/\s+/g, '-')}.tar.gz`,
      description: backupForm.description,
      compressionRatio: 0
    }
    
    backups.value.unshift(newBackup)
    createBackupVisible.value = false
    
    // 模拟备份进度
    simulateBackupProgress(newBackup)
    
    ElMessage.success('备份任务已开始')
  } catch (error) {
    ElMessage.error('请完善备份信息')
  }
}

// 模拟备份进度
const simulateBackupProgress = (backup: Backup) => {
  const interval = setInterval(() => {
    if (backup.progress! < 100) {
      backup.progress! += Math.random() * 10
      if (backup.progress! > 100) backup.progress = 100
    } else {
      backup.status = 'success'
      backup.completedAt = Date.now()
      backup.duration = backup.completedAt - backup.createdAt
      backup.size = Math.floor(Math.random() * 500 * 1024 * 1024) + 100 * 1024 * 1024
      backup.compressionRatio = Math.floor(Math.random() * 40) + 50
      clearInterval(interval)
      ElMessage.success(`备份 "${backup.name}" 已完成`)
    }
  }, 1000)
}

// 查看备份详情
const viewBackupDetails = (backup: Backup) => {
  selectedBackup.value = backup
  detailsVisible.value = true
}

// 恢复备份
const restoreBackup = (backup: Backup) => {
  selectedBackup.value = backup
  confirmText.value = ''
  restoreVisible.value = true
}

// 确认恢复
const confirmRestore = async () => {
  if (confirmText.value !== 'RESTORE') {
    ElMessage.error('请输入正确的确认文本')
    return
  }
  
  try {
    loading.value = true
    
    // 模拟恢复过程
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    restoreVisible.value = false
    ElMessage.success('备份恢复成功')
  } catch (error) {
    ElMessage.error('备份恢复失败')
  } finally {
    loading.value = false
  }
}

// 下载备份
const downloadBackup = (backup: Backup) => {
  // 模拟下载
  const link = document.createElement('a')
  link.href = '#'
  link.download = backup.name + '.tar.gz'
  link.click()
  
  ElMessage.success('备份下载已开始')
}

// 取消备份
const cancelBackup = async (backup: Backup) => {
  try {
    await ElMessageBox.confirm(
      '确定要取消此备份任务吗？',
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    backup.status = 'failed'
    backup.error = '用户取消'
    ElMessage.success('备份任务已取消')
  } catch {
    // 用户取消
  }
}

// 删除备份
const deleteBackup = async (backup: Backup) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除备份 "${backup.name}" 吗？此操作不可逆。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const index = backups.value.findIndex(b => b.id === backup.id)
    if (index > -1) {
      backups.value.splice(index, 1)
      ElMessage.success('备份已删除')
    }
  } catch {
    // 用户取消
  }
}

// 编辑配置
const editConfig = () => {
  ElMessage.info('配置编辑功能开发中')
}

// 更新配置
const updateConfig = () => {
  ElMessage.success('配置已更新')
}

// 选择备份路径
const selectBackupPath = () => {
  ElMessage.info('路径选择功能开发中')
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.size = size
}

const handlePageChange = (page: number) => {
  pagination.page = page
}

onMounted(() => {
  pagination.total = backups.value.length
})
</script>

<style scoped>
.backup-system {
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

.backup-stats {
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
  background: linear-gradient(135deg, #409eff, #66b3ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
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

.config-card,
.content-card,
.backups-card {
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

.config-content {
  max-height: 400px;
  overflow-y: auto;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.config-item:last-child {
  border-bottom: none;
}

.config-label {
  font-weight: 500;
  color: #303133;
}

.config-value {
  flex: 1;
  max-width: 200px;
  text-align: right;
}

.next-backup {
  font-size: 13px;
  color: #909399;
  font-family: monospace;
}

.backup-content {
  padding: 10px 0;
}

.content-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.content-size {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

.total-size {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
  color: #409eff;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.backup-details {
  max-height: 60vh;
  overflow-y: auto;
}

.backup-files {
  margin-top: 20px;
}

.backup-files h4 {
  margin-bottom: 15px;
  color: #303133;
}

.restore-warning {
  padding: 10px 0;
}

.restore-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirmation {
  margin-top: 15px;
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
  
  .backup-stats :deep(.el-col) {
    margin-bottom: 15px;
  }
  
  .header-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-actions .el-input,
  .header-actions .el-select {
    width: 100% !important;
  }
  
  .config-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .config-value {
    max-width: none;
    width: 100%;
    text-align: left;
  }
  
  .content-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>