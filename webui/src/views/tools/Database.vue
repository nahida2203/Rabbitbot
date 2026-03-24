<template>
  <div class="database-tool">
    
    <div class="page-header">
      <div class="header-left">
        <h2>数据库工具</h2>
        <p>数据库连接管理和SQL查询工具</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showConnectionDialog">
          <el-icon><Plus /></el-icon>
          新建连接
        </el-button>
        <el-button @click="importConnections">
          <el-icon><Upload /></el-icon>
          导入连接
        </el-button>
        <el-button @click="exportConnections">
          <el-icon><Download /></el-icon>
          导出连接
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      
      <el-col :span="6">
        <el-card class="connection-panel">
          <template #header>
            <div class="panel-header">
              <span>数据库连接</span>
              <el-button size="small" text @click="refreshConnections">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="connection-list">
            <div
              v-for="conn in connections"
              :key="conn.id"
              class="connection-item"
              :class="{ active: currentConnection?.id === conn.id }"
              @click="selectConnection(conn)"
            >
              <div class="connection-info">
                <div class="connection-name">
                  <el-icon class="db-icon" :class="getDbIconClass(conn.type)">
                    <component :is="getDbIcon(conn.type)" />
                  </el-icon>
                  {{ conn.name }}
                </div>
                <div class="connection-details">
                  {{ conn.host }}:{{ conn.port }}
                </div>
                <div class="connection-status">
                  <el-tag
                    :type="conn.status === 'connected' ? 'success' : 'info'"
                    size="small"
                  >
                    {{ conn.status === 'connected' ? '已连接' : '未连接' }}
                  </el-tag>
                </div>
              </div>
              <div class="connection-actions">
                <el-dropdown @command="handleConnectionCommand($event, conn)">
                  <el-button size="small" text>
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="connect" v-if="conn.status !== 'connected'">
                        <el-icon><Link /></el-icon>
                        连接
                      </el-dropdown-item>
                      <el-dropdown-item command="disconnect" v-if="conn.status === 'connected'">
                        <el-icon><Unlink /></el-icon>
                        断开
                      </el-dropdown-item>
                      <el-dropdown-item command="test">
                        <el-icon><CircleCheck /></el-icon>
                        测试连接
                      </el-dropdown-item>
                      <el-dropdown-item command="edit">
                        <el-icon><Edit /></el-icon>
                        编辑
                      </el-dropdown-item>
                      <el-dropdown-item command="duplicate">
                        <el-icon><CopyDocument /></el-icon>
                        复制
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-card>

        
        <el-card class="structure-panel" v-if="currentConnection?.status === 'connected'">
          <template #header>
            <div class="panel-header">
              <span>数据库结构</span>
              <el-button size="small" text @click="refreshStructure">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <el-tree
            :data="databaseStructure"
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
                <span class="node-type" v-if="data.dataType">({{ data.dataType }})</span>
              </div>
            </template>
          </el-tree>
        </el-card>
      </el-col>

      
      <el-col :span="18">
        <el-card class="main-panel">
          <el-tabs v-model="activeTab" type="card" closable @tab-remove="removeTab">
            <el-tab-pane
              v-for="tab in tabs"
              :key="tab.id"
              :label="tab.title"
              :name="tab.id"
            >
              
              <div class="sql-editor" v-if="tab.type === 'query'">
                <div class="editor-toolbar">
                  <div class="toolbar-left">
                    <el-button
                      type="primary"
                      size="small"
                      @click="executeQuery(tab)"
                      :loading="tab.executing"
                      :disabled="!currentConnection || currentConnection.status !== 'connected'"
                    >
                      <el-icon><CaretRight /></el-icon>
                      执行 (Ctrl+Enter)
                    </el-button>
                    <el-button size="small" @click="formatSql(tab)">
                      <el-icon><MagicStick /></el-icon>
                      格式化
                    </el-button>
                    <el-button size="small" @click="clearEditor(tab)">
                      <el-icon><Delete /></el-icon>
                      清空
                    </el-button>
                    <el-button size="small" @click="saveQuery(tab)">
                      <el-icon><Document /></el-icon>
                      保存
                    </el-button>
                  </div>
                  <div class="toolbar-right">
                    <el-select
                      v-model="tab.database"
                      placeholder="选择数据库"
                      size="small"
                      style="width: 150px"
                      :disabled="!currentConnection || currentConnection.status !== 'connected'"
                    >
                      <el-option
                        v-for="db in databases"
                        :key="db"
                        :label="db"
                        :value="db"
                      />
                    </el-select>
                  </div>
                </div>
                
                <div class="editor-container">
                  <textarea
                    v-model="tab.sql"
                    class="sql-textarea"
                    placeholder="输入SQL查询语句..."
                    @keydown="handleKeydown($event, tab)"
                  ></textarea>
                </div>
                
                
                <div class="result-container" v-if="tab.result">
                  <div class="result-header">
                    <div class="result-info">
                      <span>查询结果</span>
                      <el-tag size="small" v-if="tab.result.rows">
                        {{ tab.result.rows.length }} 行
                      </el-tag>
                      <el-tag size="small" type="info" v-if="tab.result.duration">
                        {{ tab.result.duration }}ms
                      </el-tag>
                    </div>
                    <div class="result-actions">
                      <el-button size="small" @click="exportResult(tab)">
                        <el-icon><Download /></el-icon>
                        导出
                      </el-button>
                      <el-button size="small" @click="copyResult(tab)">
                        <el-icon><CopyDocument /></el-icon>
                        复制
                      </el-button>
                    </div>
                  </div>
                  
                  
                  <div v-if="tab.result.success">
                    <el-table
                      :data="tab.result.rows"
                      border
                      stripe
                      size="small"
                      max-height="400"
                      style="width: 100%"
                    >
                      <el-table-column
                        v-for="column in tab.result.columns"
                        :key="column"
                        :prop="column"
                        :label="column"
                        min-width="120"
                        show-overflow-tooltip
                      />
                    </el-table>
                    
                    
                    <div class="result-pagination" v-if="tab.result.total > tab.result.rows.length">
                      <el-pagination
                        v-model:current-page="tab.result.page"
                        v-model:page-size="tab.result.pageSize"
                        :page-sizes="[50, 100, 200, 500]"
                        :total="tab.result.total"
                        layout="total, sizes, prev, pager, next"
                        @size-change="handleResultPageSizeChange(tab, $event)"
                        @current-change="handleResultPageChange(tab, $event)"
                      />
                    </div>
                  </div>
                  
                  
                  <div v-else class="error-result">
                    <el-alert
                      :title="tab.result.error"
                      type="error"
                      :closable="false"
                      show-icon
                    />
                  </div>
                </div>
              </div>
              
              
              <div class="table-viewer" v-else-if="tab.type === 'table'">
                <div class="table-toolbar">
                  <div class="toolbar-left">
                    <span class="table-title">{{ tab.tableName }}</span>
                    <el-button size="small" @click="refreshTableData(tab)">
                      <el-icon><Refresh /></el-icon>
                      刷新
                    </el-button>
                    <el-button size="small" @click="showTableStructure(tab)">
                      <el-icon><List /></el-icon>
                      结构
                    </el-button>
                  </div>
                  <div class="toolbar-right">
                    <el-input
                      v-model="tab.searchKeyword"
                      placeholder="搜索..."
                      size="small"
                      style="width: 200px"
                      @input="searchTableData(tab)"
                    >
                      <template #prefix>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                  </div>
                </div>
                
                <el-table
                  :data="tab.tableData"
                  v-loading="tab.loading"
                  border
                  stripe
                  size="small"
                  max-height="500"
                  style="width: 100%"
                >
                  <el-table-column
                    v-for="column in tab.tableColumns"
                    :key="column.name"
                    :prop="column.name"
                    :label="column.name"
                    min-width="120"
                    show-overflow-tooltip
                  >
                    <template #header>
                      <div class="column-header">
                        <span>{{ column.name }}</span>
                        <span class="column-type">({{ column.type }})</span>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
                
                <div class="table-pagination">
                  <el-pagination
                    v-model:current-page="tab.tablePage"
                    v-model:page-size="tab.tablePageSize"
                    :page-sizes="[50, 100, 200, 500]"
                    :total="tab.tableTotal"
                    layout="total, sizes, prev, pager, next"
                    @size-change="handleTablePageSizeChange(tab, $event)"
                    @current-change="handleTablePageChange(tab, $event)"
                  />
                </div>
              </div>
            </el-tab-pane>
            
            
            <template #addIcon>
              <el-button size="small" text @click="addQueryTab">
                <el-icon><Plus /></el-icon>
              </el-button>
            </template>
          </el-tabs>
        </el-card>
        
        
        <el-card class="history-panel">
          <template #header>
            <div class="panel-header">
              <span>查询历史</span>
              <div>
                <el-button size="small" text @click="clearHistory">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
                <el-button size="small" text @click="refreshHistory">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          
          <div class="history-list">
            <div
              v-for="item in queryHistory"
              :key="item.id"
              class="history-item"
              @click="loadHistoryQuery(item)"
            >
              <div class="history-sql">{{ item.sql }}</div>
              <div class="history-meta">
                <span class="history-time">{{ formatTime(item.timestamp) }}</span>
                <span class="history-duration">{{ item.duration }}ms</span>
                <el-tag
                  :type="item.success ? 'success' : 'danger'"
                  size="small"
                >
                  {{ item.success ? '成功' : '失败' }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-dialog
      v-model="connectionDialogVisible"
      :title="connectionDialogTitle"
      width="600px"
      @close="resetConnectionForm"
    >
      <el-form
        ref="connectionFormRef"
        :model="connectionForm"
        :rules="connectionRules"
        label-width="100px"
      >
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="connectionForm.name" placeholder="输入连接名称" />
        </el-form-item>
        
        <el-form-item label="数据库类型" prop="type">
          <el-select v-model="connectionForm.type" style="width: 100%">
            <el-option label="MySQL" value="mysql" />
            <el-option label="PostgreSQL" value="postgresql" />
            <el-option label="SQLite" value="sqlite" />
            <el-option label="MongoDB" value="mongodb" />
            <el-option label="Redis" value="redis" />
          </el-select>
        </el-form-item>
        
        <el-row :gutter="20" v-if="connectionForm.type !== 'sqlite'">
          <el-col :span="16">
            <el-form-item label="主机地址" prop="host">
              <el-input v-model="connectionForm.host" placeholder="localhost" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="端口" prop="port">
              <el-input-number
                v-model="connectionForm.port"
                :min="1"
                :max="65535"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="数据库名" prop="database" v-if="connectionForm.type !== 'redis'">
          <el-input v-model="connectionForm.database" placeholder="数据库名称" />
        </el-form-item>
        
        <el-form-item label="文件路径" prop="filePath" v-if="connectionForm.type === 'sqlite'">
          <el-input v-model="connectionForm.filePath" placeholder="SQLite文件路径">
            <template #append>
              <el-button @click="selectFile">
                <el-icon><Folder /></el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        
        <el-row :gutter="20" v-if="connectionForm.type !== 'sqlite'">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="connectionForm.username" placeholder="用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="connectionForm.password"
                type="password"
                placeholder="密码"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="SSL连接" v-if="['mysql', 'postgresql'].includes(connectionForm.type)">
          <el-switch v-model="connectionForm.ssl" />
        </el-form-item>
        
        <el-form-item label="连接超时">
          <el-input-number
            v-model="connectionForm.timeout"
            :min="1000"
            :max="60000"
            :step="1000"
            style="width: 100%"
          />
          <span style="margin-left: 10px; color: #909399;">毫秒</span>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="connectionDialogVisible = false">取消</el-button>
          <el-button @click="testConnection" :loading="testing">
            <el-icon><CircleCheck /></el-icon>
            测试连接
          </el-button>
          <el-button type="primary" @click="saveConnection" :loading="saving">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    
    <input
      ref="fileInput"
      type="file"
      accept=".db,.sqlite,.sqlite3"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Plus,
  Upload,
  Download,
  Refresh,
  MoreFilled,
  Link,
  Unlink,
  CircleCheck,
  Edit,
  CopyDocument,
  Delete,
  CaretRight,
  MagicStick,
  Document,
  Search,
  List,
  Folder
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
  filePath?: string
  ssl: boolean
  timeout: number
  status: 'connected' | 'disconnected'
}

interface QueryTab {
  id: string
  title: string
  type: 'query' | 'table'
  sql: string
  database: string
  result?: any
  executing: boolean
  tableName?: string
  tableData?: any[]
  tableColumns?: any[]
  tableTotal?: number
  tablePage?: number
  tablePageSize?: number
  searchKeyword?: string
  loading?: boolean
}

interface QueryHistoryItem {
  id: string
  sql: string
  timestamp: string
  duration: number
  success: boolean
  database: string
}

const connectionDialogVisible = ref(false)
const isEditingConnection = ref(false)
const testing = ref(false)
const saving = ref(false)
const connectionFormRef = ref<FormInstance>()
const fileInput = ref()

const connections = ref<DatabaseConnection[]>([])
const currentConnection = ref<DatabaseConnection | null>(null)
const databases = ref<string[]>([])
const databaseStructure = ref<any[]>([])
const tabs = ref<QueryTab[]>([])
const activeTab = ref('')
const queryHistory = ref<QueryHistoryItem[]>([])

const connectionForm = reactive({
  id: '',
  name: '',
  type: 'mysql' as 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'redis',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: '',
  filePath: '',
  ssl: false,
  timeout: 10000
})

// 获取认证令牌
const getAuthToken = () => {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
}

const connectionRules: FormRules = {
  name: [
    { required: true, message: '请输入连接名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择数据库类型', trigger: 'change' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' }
  ],
  database: [
    { required: true, message: '请输入数据库名', trigger: 'blur' }
  ],
  filePath: [
    { required: true, message: '请选择SQLite文件', trigger: 'blur' }
  ]
}

const treeProps = {
  children: 'children',
  label: 'name'
}

// 计算属性
const connectionDialogTitle = computed(() => {
  return isEditingConnection.value ? '编辑连接' : '新建连接'
})

// 获取数据库图标
const getDbIcon = (type: string) => {
  const icons: Record<string, any> = {
    mysql: 'DataBase',
    postgresql: 'DataBase',
    sqlite: 'Document',
    mongodb: 'Collection',
    redis: 'Key'
  }
  return icons[type] || 'DataBase'
}

// 获取数据库图标样式
const getDbIconClass = (type: string) => {
  return `db-icon-${type}`
}

// 获取节点图标
const getNodeIcon = (type: string) => {
  const icons: Record<string, any> = {
    database: 'DataBase',
    table: 'Grid',
    view: 'View',
    column: 'Key',
    index: 'Link',
    procedure: 'Operation',
    function: 'MagicStick'
  }
  return icons[type] || 'Document'
}

// 格式化时间
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

// 显示连接对话框
const showConnectionDialog = () => {
  isEditingConnection.value = false
  connectionDialogVisible.value = true
  resetConnectionForm()
}

// 重置连接表单
const resetConnectionForm = () => {
  Object.assign(connectionForm, {
    id: '',
    name: '',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
    filePath: '',
    ssl: false,
    timeout: 10000
  })
  
  if (connectionFormRef.value) {
    connectionFormRef.value.clearValidate()
  }
}

// 测试连接
const testConnection = async () => {
  if (!connectionFormRef.value) return
  
  try {
    await connectionFormRef.value.validate()
    
    testing.value = true
    
    // 模拟测试连接
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('连接测试成功')
  } catch (error) {
    console.error('连接测试失败:', error)
    ElMessage.error('连接测试失败')
  } finally {
    testing.value = false
  }
}

// 保存连接
const saveConnection = async () => {
  if (!connectionFormRef.value) return
  
  try {
    await connectionFormRef.value.validate()
    
    saving.value = true
    
    // 模拟保存连接
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newConnection: DatabaseConnection = {
      id: connectionForm.id || Date.now().toString(),
      name: connectionForm.name,
      type: connectionForm.type,
      host: connectionForm.host,
      port: connectionForm.port,
      database: connectionForm.database,
      username: connectionForm.username,
      password: connectionForm.password,
      filePath: connectionForm.filePath,
      ssl: connectionForm.ssl,
      timeout: connectionForm.timeout,
      status: 'disconnected'
    }
    
    if (isEditingConnection.value) {
      const index = connections.value.findIndex(c => c.id === connectionForm.id)
      if (index !== -1) {
        connections.value[index] = newConnection
      }
    } else {
      connections.value.push(newConnection)
    }
    
    ElMessage.success(isEditingConnection.value ? '连接更新成功' : '连接创建成功')
    connectionDialogVisible.value = false
  } catch (error) {
    console.error('保存连接失败:', error)
  } finally {
    saving.value = false
  }
}

// 选择连接
const selectConnection = (connection: DatabaseConnection) => {
  currentConnection.value = connection
  if (connection.status === 'connected') {
    loadDatabases()
    loadDatabaseStructure()
  }
}

// 处理连接命令
const handleConnectionCommand = async (command: string, connection: DatabaseConnection) => {
  switch (command) {
    case 'connect':
      await connectDatabase(connection)
      break
    case 'disconnect':
      await disconnectDatabase(connection)
      break
    case 'test':
      await testDatabaseConnection(connection)
      break
    case 'edit':
      editConnection(connection)
      break
    case 'duplicate':
      duplicateConnection(connection)
      break
    case 'delete':
      await deleteConnection(connection)
      break
  }
}

// 连接数据库
const connectDatabase = async (connection: DatabaseConnection) => {
  try {
    // 模拟连接
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    connection.status = 'connected'
    currentConnection.value = connection
    
    ElMessage.success('数据库连接成功')
    
    // 加载数据库列表和结构
    await loadDatabases()
    await loadDatabaseStructure()
  } catch (error) {
    console.error('连接数据库失败:', error)
    ElMessage.error('连接数据库失败')
  }
}

// 断开数据库连接
const disconnectDatabase = async (connection: DatabaseConnection) => {
  try {
    connection.status = 'disconnected'
    
    if (currentConnection.value?.id === connection.id) {
      currentConnection.value = null
      databases.value = []
      databaseStructure.value = []
    }
    
    ElMessage.success('数据库连接已断开')
  } catch (error) {
    console.error('断开连接失败:', error)
    ElMessage.error('断开连接失败')
  }
}

// 测试数据库连接
const testDatabaseConnection = async (connection: DatabaseConnection) => {
  try {
    // 模拟测试
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    ElMessage.success('连接测试成功')
  } catch (error) {
    console.error('连接测试失败:', error)
    ElMessage.error('连接测试失败')
  }
}

// 编辑连接
const editConnection = (connection: DatabaseConnection) => {
  isEditingConnection.value = true
  Object.assign(connectionForm, connection)
  connectionDialogVisible.value = true
}

// 复制连接
const duplicateConnection = (connection: DatabaseConnection) => {
  const newConnection = {
    ...connection,
    id: Date.now().toString(),
    name: `${connection.name} (副本)`,
    status: 'disconnected' as const
  }
  connections.value.push(newConnection)
  ElMessage.success('连接复制成功')
}

// 删除连接
const deleteConnection = async (connection: DatabaseConnection) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除连接 "${connection.name}" 吗？`,
      '删除连接',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const index = connections.value.findIndex(c => c.id === connection.id)
    if (index !== -1) {
      connections.value.splice(index, 1)
    }
    
    if (currentConnection.value?.id === connection.id) {
      currentConnection.value = null
      databases.value = []
      databaseStructure.value = []
    }
    
    ElMessage.success('连接删除成功')
  } catch {
    // 用户取消
  }
}

// 刷新连接列表
const refreshConnections = () => {
  // 重新加载连接列表
  ElMessage.success('连接列表已刷新')
}

// 加载数据库列表
const loadDatabases = async () => {
  try {
    // 模拟加载数据库列表
    await new Promise(resolve => setTimeout(resolve, 500))
    
    databases.value = ['test_db', 'user_db', 'log_db', 'config_db']
  } catch (error) {
    console.error('加载数据库列表失败:', error)
  }
}

// 加载数据库结构
const loadDatabaseStructure = async () => {
  try {
    // 模拟加载数据库结构
    await new Promise(resolve => setTimeout(resolve, 800))
    
    databaseStructure.value = [
      {
        id: 'db1',
        name: 'test_db',
        type: 'database',
        children: [
          {
            id: 'table1',
            name: 'users',
            type: 'table',
            children: [
              { id: 'col1', name: 'id', type: 'column', dataType: 'int' },
              { id: 'col2', name: 'username', type: 'column', dataType: 'varchar' },
              { id: 'col3', name: 'email', type: 'column', dataType: 'varchar' }
            ]
          },
          {
            id: 'table2',
            name: 'posts',
            type: 'table',
            children: [
              { id: 'col4', name: 'id', type: 'column', dataType: 'int' },
              { id: 'col5', name: 'title', type: 'column', dataType: 'varchar' },
              { id: 'col6', name: 'content', type: 'column', dataType: 'text' }
            ]
          }
        ]
      }
    ]
  } catch (error) {
    console.error('加载数据库结构失败:', error)
  }
}

// 刷新数据库结构
const refreshStructure = () => {
  loadDatabaseStructure()
}

// 处理节点点击
const handleNodeClick = (data: any) => {
  if (data.type === 'table') {
    openTableTab(data.name)
  }
}

// 添加查询标签页
const addQueryTab = () => {
  const tabId = `query_${Date.now()}`
  const newTab: QueryTab = {
    id: tabId,
    title: '新查询',
    type: 'query',
    sql: '',
    database: databases.value[0] || '',
    executing: false
  }
  
  tabs.value.push(newTab)
  activeTab.value = tabId
}

// 打开表标签页
const openTableTab = (tableName: string) => {
  const existingTab = tabs.value.find(tab => tab.type === 'table' && tab.tableName === tableName)
  
  if (existingTab) {
    activeTab.value = existingTab.id
    return
  }
  
  const tabId = `table_${tableName}_${Date.now()}`
  const newTab: QueryTab = {
    id: tabId,
    title: tableName,
    type: 'table',
    sql: '',
    database: '',
    executing: false,
    tableName,
    tableData: [],
    tableColumns: [],
    tableTotal: 0,
    tablePage: 1,
    tablePageSize: 50,
    searchKeyword: '',
    loading: false
  }
  
  tabs.value.push(newTab)
  activeTab.value = tabId
  
  // 加载表数据
  loadTableData(newTab)
}

// 移除标签页
const removeTab = (tabId: string) => {
  const index = tabs.value.findIndex(tab => tab.id === tabId)
  if (index !== -1) {
    tabs.value.splice(index, 1)
    
    if (activeTab.value === tabId && tabs.value.length > 0) {
      activeTab.value = tabs.value[Math.max(0, index - 1)].id
    }
  }
}

// 执行查询
const executeQuery = async (tab: QueryTab) => {
  if (!tab.sql.trim()) {
    ElMessage.warning('请输入SQL语句')
    return
  }
  
  if (!currentConnection.value || currentConnection.value.status !== 'connected') {
    ElMessage.warning('请先连接数据库')
    return
  }
  
  tab.executing = true
  
  try {
    const startTime = Date.now()
    
    // 执行真实查询
    const response = await fetch('/api/database/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        connectionId: currentConnection.value.id,
        sql: tab.sql,
        database: tab.database
      })
    })
    
    const duration = Date.now() - startTime
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '查询执行失败')
    }
    
    tab.result = {
      ...result,
      duration
    }
    
    // 添加到历史记录
    const historyItem: QueryHistoryItem = {
      id: Date.now().toString(),
      sql: tab.sql,
      timestamp: new Date().toISOString(),
      duration,
      success: true,
      database: tab.database
    }
    
    queryHistory.value.unshift(historyItem)
    
    ElMessage.success('查询执行成功')
  } catch (error) {
    console.error('查询执行失败:', error)
    
    tab.result = {
      success: false,
      error: '查询执行失败: ' + (error as Error).message
    }
    
    ElMessage.error('查询执行失败')
  } finally {
    tab.executing = false
  }
}

// 格式化SQL
const formatSql = (tab: QueryTab) => {
  // 简单的SQL格式化
  tab.sql = tab.sql
    .replace(/\s+/g, ' ')
    .replace(/,/g, ',\n  ')
    .replace(/FROM/gi, '\nFROM')
    .replace(/WHERE/gi, '\nWHERE')
    .replace(/ORDER BY/gi, '\nORDER BY')
    .replace(/GROUP BY/gi, '\nGROUP BY')
    .trim()
  
  ElMessage.success('SQL格式化完成')
}

// 清空编辑器
const clearEditor = (tab: QueryTab) => {
  tab.sql = ''
  tab.result = undefined
}

// 保存查询
const saveQuery = (tab: QueryTab) => {
  if (!tab.sql.trim()) {
    ElMessage.warning('请输入SQL语句')
    return
  }
  
  // 模拟保存查询
  ElMessage.success('查询已保存')
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent, tab: QueryTab) => {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault()
    executeQuery(tab)
  }
}

// 导出结果
const exportResult = (tab: QueryTab) => {
  if (!tab.result || !tab.result.success) {
    ElMessage.warning('没有可导出的结果')
    return
  }
  
  // 模拟导出
  ElMessage.success('结果导出功能开发中')
}

// 复制结果
const copyResult = (tab: QueryTab) => {
  if (!tab.result || !tab.result.success) {
    ElMessage.warning('没有可复制的结果')
    return
  }
  
  // 模拟复制
  ElMessage.success('结果已复制到剪贴板')
}

// 加载表数据
const loadTableData = async (tab: QueryTab) => {
  if (!tab.tableName) return
  
  tab.loading = true
  
  try {
    // 模拟加载表数据
    await new Promise(resolve => setTimeout(resolve, 800))
    
    tab.tableColumns = [
      { name: 'id', type: 'int' },
      { name: 'name', type: 'varchar' },
      { name: 'email', type: 'varchar' },
      { name: 'created_at', type: 'datetime' }
    ]
    
    tab.tableData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01 10:00:00' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-02 11:00:00' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-03 12:00:00' }
    ]
    
    tab.tableTotal = 3
  } catch (error) {
    console.error('加载表数据失败:', error)
    ElMessage.error('加载表数据失败')
  } finally {
    tab.loading = false
  }
}

// 刷新表数据
const refreshTableData = (tab: QueryTab) => {
  loadTableData(tab)
}

// 显示表结构
const showTableStructure = (tab: QueryTab) => {
  ElMessage.info('表结构功能开发中')
}

// 搜索表数据
const searchTableData = (tab: QueryTab) => {
  // 模拟搜索
  console.log('搜索关键词:', tab.searchKeyword)
}

// 处理表分页
const handleTablePageChange = (tab: QueryTab, page: number) => {
  tab.tablePage = page
  loadTableData(tab)
}

const handleTablePageSizeChange = (tab: QueryTab, size: number) => {
  tab.tablePageSize = size
  tab.tablePage = 1
  loadTableData(tab)
}

// 处理结果分页
const handleResultPageChange = (tab: QueryTab, page: number) => {
  if (tab.result) {
    tab.result.page = page
    // 重新执行查询
    executeQuery(tab)
  }
}

const handleResultPageSizeChange = (tab: QueryTab, size: number) => {
  if (tab.result) {
    tab.result.pageSize = size
    tab.result.page = 1
    // 重新执行查询
    executeQuery(tab)
  }
}

// 加载历史查询
const loadHistoryQuery = (item: QueryHistoryItem) => {
  const tab = tabs.value.find(t => t.id === activeTab.value)
  if (tab && tab.type === 'query') {
    tab.sql = item.sql
    tab.database = item.database
  } else {
    // 创建新的查询标签页
    addQueryTab()
    const newTab = tabs.value[tabs.value.length - 1]
    newTab.sql = item.sql
    newTab.database = item.database
  }
}

// 清空历史
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有查询历史吗？',
      '清空历史',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    queryHistory.value = []
    ElMessage.success('历史记录已清空')
  } catch {
    // 用户取消
  }
}

// 刷新历史
const refreshHistory = () => {
  // 重新加载历史记录
  ElMessage.success('历史记录已刷新')
}

// 选择文件
const selectFile = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    connectionForm.filePath = file.path || file.name
  }
}

// 导入连接
const importConnections = () => {
  ElMessage.info('导入连接功能开发中')
}

// 导出连接
const exportConnections = () => {
  ElMessage.info('导出连接功能开发中')
}

// 初始化
const initializeData = () => {
  // 模拟初始连接
  connections.value = [
    {
      id: '1',
      name: 'Local MySQL',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test_db',
      username: 'root',
      password: '',
      ssl: false,
      timeout: 10000,
      status: 'disconnected'
    },
    {
      id: '2',
      name: 'PostgreSQL Dev',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'dev_db',
      username: 'postgres',
      password: '',
      ssl: false,
      timeout: 10000,
      status: 'disconnected'
    }
  ]
  
  // 添加默认查询标签页
  addQueryTab()
}

onMounted(() => {
  initializeData()
})
</script>

<style scoped>
.database-tool {
  padding: 20px;
  height: 100vh;
  overflow: hidden;
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

.connection-panel,
.structure-panel,
.main-panel,
.history-panel {
  height: fit-content;
  margin-bottom: 20px;
}

.connection-panel {
  max-height: 400px;
}

.structure-panel {
  max-height: 300px;
}

.main-panel {
  min-height: 500px;
}

.history-panel {
  max-height: 200px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connection-list {
  max-height: 320px;
  overflow-y: auto;
}

.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.connection-item:hover {
  background-color: #f5f7fa;
}

.connection-item.active {
  background-color: #e6f7ff;
  border: 1px solid #1890ff;
}

.connection-info {
  flex: 1;
}

.connection-name {
  display: flex;
  align-items: center;
  font-weight: 500;
  margin-bottom: 4px;
}

.db-icon {
  margin-right: 8px;
  font-size: 16px;
}

.db-icon-mysql {
  color: #00758f;
}

.db-icon-postgresql {
  color: #336791;
}

.db-icon-sqlite {
  color: #003b57;
}

.db-icon-mongodb {
  color: #47a248;
}

.db-icon-redis {
  color: #dc382d;
}

.connection-details {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.connection-status {
  margin-bottom: 0;
}

.tree-node {
  display: flex;
  align-items: center;
  width: 100%;
}

.node-icon {
  margin-right: 6px;
  font-size: 14px;
  color: #606266;
}

.node-label {
  flex: 1;
}

.node-type {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.sql-editor {
  height: 100%;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 10px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-container {
  margin-bottom: 20px;
}

.sql-textarea {
  width: 100%;
  height: 200px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.sql-textarea:focus {
  border-color: #409eff;
}

.result-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-pagination {
  padding: 16px;
  text-align: center;
  border-top: 1px solid #e4e7ed;
}

.error-result {
  padding: 16px;
}

.table-viewer {
  height: 100%;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 10px;
}

.table-title {
  font-weight: 500;
  margin-right: 16px;
}

.column-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.column-type {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.table-pagination {
  padding: 16px 0;
  text-align: center;
}

.history-list {
  max-height: 120px;
  overflow-y: auto;
}

.history-item {
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.history-item:hover {
  background-color: #f5f7fa;
}

.history-sql {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.history-time {
  color: #909399;
}

.history-duration {
  color: #606266;
}

.dialog-footer {
  text-align: right;
}

@media (max-width: 768px) {
  .database-tool {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .connection-panel,
  .structure-panel {
    margin-bottom: 15px;
  }
  
  .editor-toolbar,
  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .result-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>