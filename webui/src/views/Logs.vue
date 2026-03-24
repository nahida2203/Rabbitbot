<template>
  <div class="logs-container">
    
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">日志管理</h1>
        <p class="page-description">查看和管理系统日志</p>
      </div>
      <div class="header-right">
        <el-button @click="exportLogs">
          <el-icon><Download /></el-icon>
          导出日志
        </el-button>
        <el-button @click="clearLogs" type="danger">
          <el-icon><Delete /></el-icon>
          清空日志
        </el-button>
        <el-button @click="refreshLogs">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    
    <div class="stats-grid">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon error">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.errorCount }}</div>
            <div class="stat-label">错误日志</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon warning">
            <el-icon><WarningFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.warnCount }}</div>
            <div class="stat-label">警告日志</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon info">
            <el-icon><InfoFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.infoCount }}</div>
            <div class="stat-label">信息日志</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon total">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalCount }}</div>
            <div class="stat-label">总日志数</div>
          </div>
        </div>
      </el-card>
    </div>
    
    
    <el-card class="filter-card" shadow="never">
      <div class="filter-container">
        <div class="filter-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索日志内容"
            prefix-icon="Search"
            clearable
            @input="handleSearch"
            class="search-input"
          />
        </div>
        <div class="filter-right">
          <el-select
            v-model="filterLevel"
            placeholder="日志级别"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="错误" value="error" />
            <el-option label="警告" value="warn" />
            <el-option label="信息" value="info" />
            <el-option label="调试" value="debug" />
          </el-select>
          
          <el-select
            v-model="filterSource"
            placeholder="日志来源"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="source in sources"
              :key="source"
              :label="source"
              :value="source"
            />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            @change="handleFilter"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </div>
      </div>
    </el-card>
    
    
    <el-card class="logs-card" shadow="never">
      <div class="logs-header">
        <div class="logs-title">
          <h3>日志列表</h3>
          <el-tag v-if="filteredLogs.length !== logs.length" type="info">
            显示 {{ filteredLogs.length }} / {{ logs.length }} 条
          </el-tag>
        </div>
        <div class="logs-actions">
          <el-switch
            v-model="autoRefresh"
            @change="toggleAutoRefresh"
            active-text="自动刷新"
          />
          <el-switch
            v-model="showDetails"
            active-text="详细模式"
          />
        </div>
      </div>
      
      <div class="logs-content">
        <el-scrollbar height="600px" class="logs-scrollbar">
          <div
            v-for="log in paginatedLogs"
            :key="log.id"
            class="log-item"
            :class="`log-${log.level}`"
          >
            <div class="log-header">
              <div class="log-level">
                <el-tag
                  :type="getLevelType(log.level)"
                  size="small"
                >
                  {{ log.level.toUpperCase() }}
                </el-tag>
              </div>
              <div class="log-time">{{ formatTime(log.timestamp) }}</div>
              <div class="log-source">{{ log.source }}</div>
              <div class="log-actions">
                <el-button
                  size="small"
                  text
                  @click="copyLog(log)"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
                <el-button
                  size="small"
                  text
                  @click="showLogDetail(log)"
                >
                  <el-icon><View /></el-icon>
                </el-button>
              </div>
            </div>
            
            <div class="log-content">
              <div class="log-message">{{ log.message }}</div>
              
              <div v-if="showDetails && log.details" class="log-details">
                <el-collapse>
                  <el-collapse-item title="详细信息">
                    <pre class="log-details-content">{{ formatLogDetails(log.details) }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </div>
              
              <div v-if="log.stack" class="log-stack">
                <el-collapse>
                  <el-collapse-item title="错误堆栈">
                    <pre class="log-stack-content">{{ log.stack }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </div>
        </el-scrollbar>
        
        
        <div class="logs-pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="filteredLogs.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
      
      
      <el-empty
        v-if="filteredLogs.length === 0 && !loading"
        description="暂无日志"
        class="empty-state"
      />
      
      
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="10" animated />
      </div>
    </el-card>
    
    
    <el-dialog
      v-model="showDetailDialog"
      :title="`日志详情 - ${currentLog?.level?.toUpperCase()}`"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="级别">
            <el-tag :type="getLevelType(currentLog.level)">
              {{ currentLog.level.toUpperCase() }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ formatTime(currentLog.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            {{ currentLog.source }}
          </el-descriptions-item>
          <el-descriptions-item label="用户">
            {{ currentLog.userId || '系统' }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址" v-if="currentLog.ip">
            {{ currentLog.ip }}
          </el-descriptions-item>
          <el-descriptions-item label="用户代理" v-if="currentLog.userAgent">
            {{ currentLog.userAgent }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h4>消息内容</h4>
          <div class="detail-content">
            {{ currentLog.message }}
          </div>
        </div>
        
        <div v-if="currentLog.details" class="detail-section">
          <h4>详细信息</h4>
          <div class="detail-content">
            <pre>{{ formatLogDetails(currentLog.details) }}</pre>
          </div>
        </div>
        
        <div v-if="currentLog.stack" class="detail-section">
          <h4>错误堆栈</h4>
          <div class="detail-content">
            <pre>{{ currentLog.stack }}</pre>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button type="primary" @click="copyLog(currentLog)">
            复制日志
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Delete,
  Refresh,
  Search,
  Warning,
  WarningFilled,
  InfoFilled,
  Document,
  CopyDocument,
  View
} from '@element-plus/icons-vue'
import api from '@/api'
import { formatTime, debounce, copyToClipboard } from '@/utils'
import type { Log } from '@/types'

// 响应式数据
const logs = ref<Log[]>([])
const sources = ref<string[]>([])
const loading = ref(false)
const autoRefresh = ref(false)
const showDetails = ref(false)
const refreshTimer = ref<number | null>(null)

// 筛选和搜索
const searchKeyword = ref('')
const filterLevel = ref('')
const filterSource = ref('')
const dateRange = ref<[string, string] | null>(null)

// 分页
const currentPage = ref(1)
const pageSize = ref(50)

// 对话框
const showDetailDialog = ref(false)
const currentLog = ref<Log | null>(null)

// 统计数据
const stats = reactive({
  totalCount: 0,
  errorCount: 0,
  warnCount: 0,
  infoCount: 0
})

// 计算属性
const filteredLogs = computed(() => {
  let result = logs.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(log => 
      log.message.toLowerCase().includes(keyword) ||
      log.source.toLowerCase().includes(keyword) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(keyword))
    )
  }
  
  // 级别筛选
  if (filterLevel.value) {
    result = result.filter(log => log.level === filterLevel.value)
  }
  
  // 来源筛选
  if (filterSource.value) {
    result = result.filter(log => log.source === filterSource.value)
  }
  
  // 时间范围筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    result = result.filter(log => {
      const logTime = new Date(log.timestamp).getTime()
      const startTime = new Date(start).getTime()
      const endTime = new Date(end).getTime()
      return logTime >= startTime && logTime <= endTime
    })
  }
  
  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLogs.value.slice(start, end)
})

// 获取级别类型
function getLevelType(level: string) {
  const types: Record<string, string> = {
    error: 'danger',
    warn: 'warning',
    info: 'info',
    debug: 'info'
  }
  return types[level] || 'info'
}

// 格式化日志详情
function formatLogDetails(details: any) {
  if (typeof details === 'string') {
    return details
  }
  return JSON.stringify(details, null, 2)
}

// 搜索处理
const handleSearch = debounce(() => {
  currentPage.value = 1
}, 300)

// 筛选处理
function handleFilter() {
  currentPage.value = 1
}

// 分页处理
function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
}

function handleCurrentChange(page: number) {
  currentPage.value = page
}

// 复制日志
function copyLog(log: Log | null) {
  if (!log) return
  
  const logText = `[${log.level.toUpperCase()}] ${formatTime(log.timestamp)} ${log.source}\n${log.message}${
    log.details ? '\n详细信息:\n' + formatLogDetails(log.details) : ''
  }${
    log.stack ? '\n错误堆栈:\n' + log.stack : ''
  }`
  
  copyToClipboard(logText)
  ElMessage.success('日志已复制到剪贴板')
}

// 显示日志详情
function showLogDetail(log: Log) {
  currentLog.value = log
  showDetailDialog.value = true
}

// 切换自动刷新
function toggleAutoRefresh(enabled: boolean) {
  if (enabled) {
    refreshTimer.value = window.setInterval(() => {
      loadLogs(false)
    }, 5000) // 每5秒刷新一次
  } else {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
      refreshTimer.value = null
    }
  }
}

// 加载日志
async function loadLogs(showLoading = true) {
  if (showLoading) {
    loading.value = true
  }
  
  try {
    const [logsRes, sourcesRes, statsRes] = await Promise.all([
      api.log.getLogs({
        page: 1,
        pageSize: 1000, // 加载更多日志用于前端筛选
        level: '',
        source: '',
        startTime: '',
        endTime: ''
      }),
      api.log.getLogSources(),
      api.log.getLogStats()
    ])
    
    logs.value = logsRes.data.data.items
    sources.value = sourcesRes.data.data
    
    // 更新统计数据
    const statsData = statsRes.data.data
    stats.totalCount = statsData.total
    stats.errorCount = statsData.error
    stats.warnCount = statsData.warn
    stats.infoCount = statsData.info
  } catch (error) {
    console.error('加载日志失败:', error)
    if (showLoading) {
      ElMessage.error('加载日志失败')
    }
  } finally {
    if (showLoading) {
      loading.value = false
    }
  }
}

// 刷新日志
function refreshLogs() {
  loadLogs()
}

// 导出日志
async function exportLogs() {
  try {
    const params = {
      level: filterLevel.value,
      source: filterSource.value,
      startTime: dateRange.value?.[0] || '',
      endTime: dateRange.value?.[1] || '',
      keyword: searchKeyword.value
    }
    
    const res = await api.log.exportLogs(params)
    
    // 创建下载链接
    const blob = new Blob([res.data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yunzai-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('日志导出成功')
  } catch (error) {
    console.error('导出日志失败:', error)
    ElMessage.error('导出日志失败')
  }
}

// 清空日志
async function clearLogs() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志吗？此操作不可恢复。',
      '清空日志',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.log.clearLogs()
    
    ElMessage.success('日志清空成功')
    await loadLogs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空日志失败:', error)
      ElMessage.error('清空日志失败')
    }
  }
}

// 页面加载
onMounted(() => {
  loadLogs()
})

// 页面卸载
onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
})
</script>

<style scoped>
.logs-container {
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
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.error {
  background: var(--el-color-danger);
}

.stat-icon.warning {
  background: var(--el-color-warning);
}

.stat-icon.info {
  background: var(--el-color-info);
}

.stat-icon.total {
  background: var(--el-color-primary);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.filter-card {
  margin-bottom: 20px;
  border: none;
}

.filter-container {
  display: flex;
  gap: 16px;
  align-items: center;
}

.filter-left {
  flex: 1;
}

.search-input {
  max-width: 400px;
}

.filter-right {
  display: flex;
  gap: 12px;
}

.logs-card {
  border: none;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.logs-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logs-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.logs-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.logs-content {
  position: relative;
}

.logs-scrollbar {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.log-item {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.3s;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item:hover {
  background: var(--el-fill-color-light);
}

.log-item.log-error {
  border-left: 4px solid var(--el-color-danger);
}

.log-item.log-warn {
  border-left: 4px solid var(--el-color-warning);
}

.log-item.log-info {
  border-left: 4px solid var(--el-color-info);
}

.log-item.log-debug {
  border-left: 4px solid var(--el-color-success);
}

.log-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.log-level {
  flex-shrink: 0;
}

.log-time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-family: 'Courier New', monospace;
}

.log-source {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 4px;
}

.log-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.log-content {
  margin-left: 0;
}

.log-message {
  color: var(--el-text-color-primary);
  line-height: 1.5;
  word-break: break-word;
  margin-bottom: 8px;
}

.log-details,
.log-stack {
  margin-top: 8px;
}

.log-details-content,
.log-stack-content {
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-regular);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.logs-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.empty-state {
  margin: 60px 0;
}

.loading-state {
  padding: 20px;
}

.log-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-content {
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-content pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .logs-container {
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
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-right {
    justify-content: space-between;
  }
  
  .logs-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .logs-actions {
    justify-content: space-between;
  }
  
  .log-header {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .log-time {
    order: 1;
    width: 100%;
  }
  
  .log-actions {
    margin-left: 0;
  }
  
  .logs-pagination {
    overflow-x: auto;
  }
}
</style>