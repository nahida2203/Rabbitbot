<template>
  <div class="database-tool">
    
    <div class="page-header">
      <div class="header-left">
        <h2>数据库工具</h2>
        <p>数据库连接管理和SQL查询工具</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="newConnection">
          <el-icon><Plus /></el-icon>
          新建连接
        </el-button>
        <el-button @click="refreshConnections">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      
      <el-col :span="6">
        <el-card class="connections-card">
          <template #header>
            <div class="card-header">
              <span>数据库连接</span>
              <el-button size="small" text @click="newConnection">
                <el-icon><Plus /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="connections-list">
            <div
              v-for="conn in connections"
              :key="conn.id"
              class="connection-item"
              :class="{ active: currentConnection?.id === conn.id }"
              @click="selectConnection(conn)"
            >
              <div class="connection-info">
                <div class="connection-name">
                  <el-icon class="connection-icon">
                    <component :is="getDbIcon(conn.type)" />
                  </el-icon>
                  {{ conn.name }}
                </div>
                <div class="connection-details">
                  <span class="connection-type">{{ conn.type }}</span>
                  <el-tag
                    :type="conn.status === 'connected' ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ conn.status === 'connected' ? '已连接' : '未连接' }}
                  </el-tag>
                </div>
              </div>
              <div class="connection-actions">
                <el-button
                  size="small"
                  text
                  @click.stop="testConnection(conn)"
                >
                  <el-icon><Connection /></el-icon>
                </el-button>
                <el-button
                  size="small"
                  text
                  @click.stop="editConnection(conn)"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-button
                  size="small"
                  text
                  type="danger"
                  @click.stop="deleteConnection(conn)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-card>

        
        <el-card v-if="currentConnection" class="structure-card">
          <template #header>
            <div class="card-header">
              <span>数据库结构</span>
              <el-button size="small" text @click="refreshStructure">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <el-tree
            :data="dbStructure"
            :props="treeProps"
            node-key="id"
            :expand-on-click-node="false"
            @node-click="handleNodeClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <el-icon class="node-icon">
                  <component :is="getNodeIcon(data.type)" />
                </el-icon>
                <span class="node-label">{{ node.label }}</span>
                <span v-if="data.type === 'table'" class="node-count">
                  ({{ data.rowCount || 0 }})
                </span>
              </div>
            </template>
          </el-tree>
        </el-card>
      </el-col>

      
      <el-col :span="18">
        
        <el-card class="editor-card">
          <template #header>
            <div class="card-header">
              <span>SQL编辑器</span>
              <div class="editor-actions">
                <el-button
                  size="small"
                  type="primary"
                  @click="executeQuery"
                  :disabled="!currentConnection || !sqlQuery.trim()"
                >
                  <el-icon><CaretRight /></el-icon>
                  执行 (Ctrl+Enter)
                </el-button>
                <el-button size="small" @click="formatSql">
                  <el-icon><MagicStick /></el-icon>
                  格式化
                </el-button>
                <el-button size="small" @click="clearEditor">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
                <el-button size="small" @click="saveQuery">
                  <el-icon><DocumentAdd /></el-icon>
                  保存
                </el-button>
              </div>
            </div>
          </template>
          
          <div class="sql-editor">
            <el-input
              v-model="sqlQuery"
              type="textarea"
              :rows="8"
              placeholder="请输入SQL查询语句..."
              @keydown="handleKeydown"
            />
          </div>
        </el-card>

        
        <el-card class="results-card">
          <template #header>
            <div class="card-header">
              <span>查询结果</span>
              <div class="result-actions" v-if="queryResults.length > 0">
                <span class="result-info">
                  共 {{ queryResults.length }} 条记录，耗时 {{ executionTime }}ms
                </span>
                <el-button size="small" @click="exportResults">
                  <el-icon><Download /></el-icon>
                  导出
                </el-button>
              </div>
            </div>
          </template>
          
          <div v-if="loading" class="loading-container">
            <el-loading-spinner />
            <p>正在执行查询...</p>
          </div>
          
          <div v-else-if="queryError" class="error-container">
            <el-alert
              :title="queryError"
              type="error"
              show-icon
              :closable="false"
            />
          </div>
          
          <div v-else-if="queryResults.length > 0" class="results-container">
            <el-table
              :data="paginatedResults"
              stripe
              border
              height="400"
              style="width: 100%"
            >
              <el-table-column
                v-for="column in resultColumns"
                :key="column"
                :prop="column"
                :label="column"
                show-overflow-tooltip
                min-width="120"
              />
            </el-table>
            
            <div class="pagination">
              <el-pagination
                v-model:current-page="resultPagination.page"
                v-model:page-size="resultPagination.size"
                :total="queryResults.length"
                :page-sizes="[50, 100, 200, 500]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleResultSizeChange"
                @current-change="handleResultPageChange"
              />
            </div>
          </div>
          
          <div v-else class="empty-container">
            <el-empty description="暂无查询结果" />
          </div>
        </el-card>

        
        <el-card class="history-card">
          <template #header>
            <div class="card-header">
              <span>查询历史</span>
              <el-button size="small" @click="clearHistory">
                <el-icon><Delete /></el-icon>
                清空历史
              </el-button>
            </div>
          </template>
          
          <div class="history-list">
            <div
              v-for="(query, index) in queryHistory"
              :key="index"
              class="history-item"
              @click="loadHistoryQuery(query)"
            >
              <div class="history-sql">
                <code>{{ query.sql.substring(0, 100) }}{{ query.sql.length > 100 ? '...' : '' }}</code>
              </div>
              <div class="history-meta">
                <span class="history-time">{{ formatTime(query.timestamp) }}</span>
                <span class="history-duration">{{ query.duration }}ms</span>
                <el-tag
                  :type="query.success ? 'success' : 'danger'"
                  size="small"
                >
                  {{ query.success ? '成功' : '失败' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-dialog
      v-model="connectionDialogVisible"
      :title="editingConnection ? '编辑连接' : '新建连接'"
      width="50%"
    >
      <el-form
        :model="connectionForm"
        :rules="connectionRules"
        ref="connectionFormRef"
        label-width="100px"
      >
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="connectionForm.name" placeholder="请输入连接名称" />
        </el-form-item>
        <el-form-item label="数据库类型" prop="type">
          <el-select v-model="connectionForm.type" placeholder="选择数据库类型">
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgresql" />
            <el-option label="SQLite" value="sqlite" />
            <el-option label="MongoDB" value="mongodb" />
            <el-option label="Redis" value="redis" />
          </el-select>
        </el-form-item>
        <el-form-item label="主机地址" prop="host" v-if="connectionForm.type !== 'sqlite'">
          <el-input v-model="connectionForm.host" placeholder="localhost" />
        </el-form-item>
        <el-form-item label="端口" prop="port" v-if="connectionForm.type !== 'sqlite'">
          <el-input-number
            v-model="connectionForm.port"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="数据库名" prop="database">
          <el-input v-model="connectionForm.database" placeholder="请输入数据库名" />
        </el-form-item>
        <el-form-item label="用户名" prop="username" v-if="connectionForm.type !== 'sqlite'">
          <el-input v-model="connectionForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="connectionForm.type !== 'sqlite'">
          <el-input
            v-model="connectionForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="SSL" v-if="['mysql', 'postgresql'].includes(connectionForm.type)">
          <el-switch v-model="connectionForm.ssl" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="connectionDialogVisible = false">取消</el-button>
          <el-button @click="testConnectionForm">测试连接</el-button>
          <el-button type="primary" @click="saveConnection">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog
      v-model="saveQueryDialogVisible"
      title="保存查询"
      width="30%"
    >
      <el-form :model="saveQueryForm" label-width="80px">
        <el-form-item label="查询名称">
          <el-input v-model="saveQueryForm.name" placeholder="请输入查询名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="saveQueryForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入查询描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="saveQueryDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSaveQuery">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Connection,
  Edit,
  Delete,
  CaretRight,
  MagicStick,
  DocumentAdd,
  Download,
  Database,
  Folder,
  Document
} from '@element-plus/icons-vue'

interface DatabaseConnection {
  id: string
  name: string
  type: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'redis'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  status: 'connected' | 'disconnected'
}

interface QueryHistory {
  sql: string
  timestamp: number
  duration: number
  success: boolean
  error?: string
}

interface DbNode {
  id: string
  label: string
  type: 'database' | 'table' | 'view' | 'column'
  children?: DbNode[]
  rowCount?: number
}

const loading = ref(false)
const connectionDialogVisible = ref(false)
const saveQueryDialogVisible = ref(false)
const editingConnection = ref(false)
const currentConnection = ref<DatabaseConnection | null>(null)
const sqlQuery = ref('')
const queryResults = ref<any[]>([])
const resultColumns = ref<string[]>([])
const queryError = ref('')
const executionTime = ref(0)
const connectionFormRef = ref()

const connections = ref<DatabaseConnection[]>([
  {
    id: '1',
    name: '本地MySQL',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'yunzai',
    username: 'root',
    password: '',
    ssl: false,
    status: 'connected'
  },
  {
    id: '2',
    name: '测试PostgreSQL',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    username: 'postgres',
    password: '',
    ssl: false,
    status: 'disconnected'
  }
])

const connectionForm = reactive<Partial<DatabaseConnection>>({
  name: '',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: '',
  ssl: false
})

const connectionRules = {
  name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库名', trigger: 'blur' }]
}

const saveQueryForm = reactive({
  name: '',
  description: ''
})

const queryHistory = ref<QueryHistory[]>([
  {
    sql: 'SELECT * FROM users WHERE status = "active"',
    timestamp: Date.now() - 3600000,
    duration: 125,
    success: true
  },
  {
    sql: 'UPDATE users SET last_login = NOW() WHERE id = 1',
    timestamp: Date.now() - 7200000,
    duration: 89,
    success: true
  },
  {
    sql: 'SELECT COUNT(*) FROM orders WHERE created_at > "2024-01-01"',
    timestamp: Date.now() - 10800000,
    duration: 256,
    success: false,
    error: 'Table orders does not exist'
  }
])

const dbStructure = ref<DbNode[]>([
  {
    id: 'db1',
    label: 'yunzai',
    type: 'database',
    children: [
      {
        id: 'table1',
        label: 'users',
        type: 'table',
        rowCount: 1250,
        children: [
          { id: 'col1', label: 'id (INT)', type: 'column' },
          { id: 'col2', label: 'username (VARCHAR)', type: 'column' },
          { id: 'col3', label: 'email (VARCHAR)', type: 'column' },
          { id: 'col4', label: 'created_at (DATETIME)', type: 'column' }
        ]
      },
      {
        id: 'table2',
        label: 'messages',
        type: 'table',
        rowCount: 5680,
        children: [
          { id: 'col5', label: 'id (INT)', type: 'column' },
          { id: 'col6', label: 'user_id (INT)', type: 'column' },
          { id: 'col7', label: 'content (TEXT)', type: 'column' },
          { id: 'col8', label: 'timestamp (DATETIME)', type: 'column' }
        ]
      },
      {
        id: 'view1',
        label: 'active_users',
        type: 'view',
        children: [
          { id: 'col9', label: 'id (INT)', type: 'column' },
          { id: 'col10', label: 'username (VARCHAR)', type: 'column' },
          { id: 'col11', label: 'last_login (DATETIME)', type: 'column' }
        ]
      }
    ]
  }
])

const treeProps = {
  children: 'children',
  label: 'label'
}

const resultPagination = reactive({
  page: 1,
  size: 50
})

const paginatedResults = computed(() => {
  const start = (resultPagination.page - 1) * resultPagination.size
  const end = start + resultPagination.size
  return queryResults.value.slice(start, end)
})


const getDbIcon = (type: string) => {
  const icons: Record<string, any> = {
    mysql: Database,
    postgresql: Database,
    sqlite: Database,
    mongodb: Database,
    redis: Database
  }
  return icons[type] || Database
}


const getNodeIcon = (type: string) => {
  const icons: Record<string, any> = {
    database: Database,
    table: Folder,
    view: Folder,
    column: Document
  }
  return icons[type] || Document
}


const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}


const refreshConnections = () => {
  ElMessage.success('连接列表已刷新')
}


const newConnection = () => {
  editingConnection.value = false
  Object.assign(connectionForm, {
    name: '',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
    ssl: false
  })
  connectionDialogVisible.value = true
}


const editConnection = (connection: DatabaseConnection) => {
  editingConnection.value = true
  Object.assign(connectionForm, connection)
  connectionDialogVisible.value = true
}


const deleteConnection = async (connection: DatabaseConnection) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除连接 "${connection.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const index = connections.value.findIndex(c => c.id === connection.id)
    if (index > -1) {
      connections.value.splice(index, 1)
      if (currentConnection.value?.id === connection.id) {
        currentConnection.value = null
      }
      ElMessage.success('连接已删除')
    }
  } catch {
    
  }
}


const testConnection = async (connection: DatabaseConnection) => {
  loading.value = true
  try {
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    connection.status = 'connected'
    ElMessage.success('连接测试成功')
  } catch (error) {
    connection.status = 'disconnected'
    ElMessage.error('连接测试失败')
  } finally {
    loading.value = false
  }
}


const testConnectionForm = async () => {
  try {
    await connectionFormRef.value.validate()
    loading.value = true
    
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('连接测试成功')
  } catch (error) {
    ElMessage.error('连接测试失败')
  } finally {
    loading.value = false
  }
}


const saveConnection = async () => {
  try {
    await connectionFormRef.value.validate()
    
    if (editingConnection.value) {
      
      const index = connections.value.findIndex(c => c.id === connectionForm.id)
      if (index > -1) {
        Object.assign(connections.value[index], connectionForm)
      }
      ElMessage.success('连接已更新')
    } else {
      
      const newConn: DatabaseConnection = {
        ...connectionForm as DatabaseConnection,
        id: Date.now().toString(),
        status: 'disconnected'
      }
      connections.value.push(newConn)
      ElMessage.success('连接已创建')
    }
    
    connectionDialogVisible.value = false
  } catch (error) {
    ElMessage.error('请完善连接信息')
  }
}


const selectConnection = (connection: DatabaseConnection) => {
  currentConnection.value = connection
  if (connection.status === 'connected') {
    refreshStructure()
  }
}


const refreshStructure = () => {
  if (!currentConnection.value) return
  
  
  ElMessage.success('数据库结构已刷新')
}


const handleNodeClick = (data: DbNode) => {
  if (data.type === 'table') {
    sqlQuery.value = `SELECT * FROM ${data.label} LIMIT 100;`
  } else if (data.type === 'view') {
    sqlQuery.value = `SELECT * FROM ${data.label} LIMIT 100;`
  } else if (data.type === 'column') {
    
  }
}


const executeQuery = async () => {
  if (!currentConnection.value) {
    ElMessage.error('请先选择数据库连接')
    return
  }
  
  if (!sqlQuery.value.trim()) {
    ElMessage.error('请输入SQL查询语句')
    return
  }
  
  loading.value = true
  queryError.value = ''
  
  const startTime = Date.now()
  
  try {
    
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    
    const mockResults = [
      { id: 1, username: 'admin', email: 'admin@example.com', created_at: '2024-01-01 10:00:00' },
      { id: 2, username: 'user1', email: 'user1@example.com', created_at: '2024-01-02 11:00:00' },
      { id: 3, username: 'user2', email: 'user2@example.com', created_at: '2024-01-03 12:00:00' }
    ]
    
    queryResults.value = mockResults
    resultColumns.value = Object.keys(mockResults[0] || {})
    executionTime.value = Date.now() - startTime
    
    
    queryHistory.value.unshift({
      sql: sqlQuery.value,
      timestamp: Date.now(),
      duration: executionTime.value,
      success: true
    })
    
    
    if (queryHistory.value.length > 50) {
      queryHistory.value = queryHistory.value.slice(0, 50)
    }
    
    ElMessage.success(`查询执行成功，耗时 ${executionTime.value}ms`)
  } catch (error) {
    queryError.value = '查询执行失败：' + (error as Error).message
    
    
    queryHistory.value.unshift({
      sql: sqlQuery.value,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      success: false,
      error: queryError.value
    })
    
    ElMessage.error('查询执行失败')
  } finally {
    loading.value = false
    resultPagination.page = 1
  }
}


const formatSql = () => {
  if (!sqlQuery.value.trim()) {
    ElMessage.warning('请输入SQL语句')
    return
  }
  
  
  let formatted = sqlQuery.value
    .replace(/\s+/g, ' ')
    .replace(/,/g, ',\n  ')
    .replace(/\bFROM\b/gi, '\nFROM')
    .replace(/\bWHERE\b/gi, '\nWHERE')
    .replace(/\bORDER BY\b/gi, '\nORDER BY')
    .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
    .replace(/\bHAVING\b/gi, '\nHAVING')
    .replace(/\bLIMIT\b/gi, '\nLIMIT')
  
  sqlQuery.value = formatted
  ElMessage.success('SQL已格式化')
}


const clearEditor = () => {
  sqlQuery.value = ''
  queryResults.value = []
  resultColumns.value = []
  queryError.value = ''
}


const saveQuery = () => {
  if (!sqlQuery.value.trim()) {
    ElMessage.warning('请输入SQL语句')
    return
  }
  
  saveQueryForm.name = ''
  saveQueryForm.description = ''
  saveQueryDialogVisible.value = true
}


const confirmSaveQuery = () => {
  if (!saveQueryForm.name.trim()) {
    ElMessage.warning('请输入查询名称')
    return
  }
  
  
  ElMessage.success('查询已保存')
  saveQueryDialogVisible.value = false
}


const exportResults = () => {
  if (queryResults.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  
  
  ElMessage.success('数据导出功能开发中')
}


const loadHistoryQuery = (query: QueryHistory) => {
  sqlQuery.value = query.sql
}


const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有查询历史吗？',
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    queryHistory.value = []
    ElMessage.success('查询历史已清空')
  } catch {
    
  }
}


const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault()
    executeQuery()
  }
}


const handleResultSizeChange = (size: number) => {
  resultPagination.size = size
  resultPagination.page = 1
}

const handleResultPageChange = (page: number) => {
  resultPagination.page = page
}

onMounted(() => {
  
  if (connections.value.length > 0) {
    selectConnection(connections.value[0])
  }
})
</script>

<style scoped>
.database-tool {
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

.connections-card,
.structure-card {
  margin-bottom: 20px;
}

.structure-card {
  max-height: 400px;
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connections-list {
  max-height: 300px;
  overflow-y: auto;
}

.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.connection-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.connection-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.connection-info {
  flex: 1;
}

.connection-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  margin-bottom: 4px;
}

.connection-icon {
  color: #409eff;
}

.connection-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.connection-type {
  text-transform: uppercase;
}

.connection-actions {
  display: flex;
  gap: 4px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.node-icon {
  color: #909399;
}

.node-label {
  flex: 1;
}

.node-count {
  font-size: 12px;
  color: #909399;
}

.editor-card {
  margin-bottom: 20px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.sql-editor {
  font-family: 'Courier New', monospace;
}

.sql-editor :deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.results-card {
  margin-bottom: 20px;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.result-info {
  font-size: 14px;
  color: #909399;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading-container p {
  margin-top: 15px;
  color: #909399;
}

.results-container {
  min-height: 400px;
}

.pagination {
  margin-top: 15px;
  text-align: right;
}

.history-card {
  max-height: 300px;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.history-sql {
  margin-bottom: 8px;
}

.history-sql code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #606266;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}

.history-time,
.history-duration {
  font-family: monospace;
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
  
  .editor-actions {
    flex-wrap: wrap;
    gap: 5px;
  }
  
  .result-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .connection-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .connection-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>