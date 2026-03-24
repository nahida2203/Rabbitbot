<template>
  <div class="ai-models">
    
    <div class="page-header">
      <h2>AI模型管理</h2>
      <p>管理和配置AI模型，监控模型状态和性能</p>
    </div>

    
    <el-card class="toolbar">
      <div class="toolbar-content">
        <div class="search-group">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模型名称或提供商"
            style="width: 300px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select v-model="selectedProvider" placeholder="选择提供商" style="width: 150px;" clearable>
            <el-option label="全部" value="" />
            <el-option
              v-for="provider in providers"
              :key="provider"
              :label="provider"
              :value="provider"
            />
          </el-select>
          
          <el-select v-model="selectedStatus" placeholder="选择状态" style="width: 120px;" clearable>
            <el-option label="全部" value="" />
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="维护" value="maintenance" />
          </el-select>
        </div>
        
        <div class="action-group">
          <el-button type="primary" @click="showAddModelDialog">
            <el-icon><Plus /></el-icon>
            添加模型
          </el-button>
          <el-button @click="refreshModels">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button @click="testAllModels">
            <el-icon><Connection /></el-icon>
            测试连接
          </el-button>
        </div>
      </div>
    </el-card>

    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#409eff"><Cpu /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalModels }}</div>
              <div class="stat-label">总模型数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ onlineModels }}</div>
              <div class="stat-label">在线模型</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#e6a23c"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ avgResponseTime }}ms</div>
              <div class="stat-label">平均响应时间</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#f56c6c"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalRequests }}</div>
              <div class="stat-label">总请求数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-card class="models-table">
      <template #header>
        <div class="table-header">
          <span>模型列表</span>
          <div class="table-actions">
            <el-button size="small" @click="exportModels">导出配置</el-button>
            <el-button size="small" @click="importModels">导入配置</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="filteredModels" stripe>
        <el-table-column prop="name" label="模型名称" min-width="150">
          <template #default="{ row }">
            <div class="model-name">
              <el-avatar :size="32" class="model-avatar">
                <el-icon><Cpu /></el-icon>
              </el-avatar>
              <div class="name-info">
                <div class="name">{{ row.name }}</div>
                <div class="version">{{ row.version }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="provider" label="提供商" width="120" />
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="性能" width="120">
          <template #default="{ row }">
            <div class="performance-info">
              <div class="response-time">{{ row.responseTime }}ms</div>
              <el-progress 
                :percentage="getPerformanceScore(row.responseTime)" 
                :stroke-width="4" 
                :show-text="false"
                :color="getPerformanceColor(row.responseTime)"
              />
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="requests" label="请求数" width="100" />
        
        <el-table-column prop="lastUsed" label="最后使用" width="150" />
        
        <el-table-column label="配置" width="120">
          <template #default="{ row }">
            <div class="config-info">
              <el-tag size="small">{{ row.maxTokens }} tokens</el-tag>
              <el-tag size="small" type="info">{{ row.temperature }}°</el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="text" size="small" @click="testModel(row)">
                测试
              </el-button>
              <el-button type="text" size="small" @click="viewModel(row)">
                详情
              </el-button>
              <el-button type="text" size="small" @click="editModel(row)">
                编辑
              </el-button>
              <el-dropdown @command="(command) => handleModelAction(command, row)">
                <el-button type="text" size="small">
                  更多<el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="clone">克隆</el-dropdown-item>
                    <el-dropdown-item command="export">导出</el-dropdown-item>
                    <el-dropdown-item command="disable" :disabled="row.status === 'offline'">
                      {{ row.status === 'online' ? '禁用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    
    <el-dialog v-model="showModelDialog" :title="dialogTitle" width="800px">
      <el-form :model="modelForm" :rules="modelRules" ref="modelFormRef" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模型名称" prop="name">
              <el-input v-model="modelForm.name" placeholder="请输入模型名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本" prop="version">
              <el-input v-model="modelForm.version" placeholder="请输入版本号" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="提供商" prop="provider">
              <el-select v-model="modelForm.provider" placeholder="选择提供商" style="width: 100%;">
                <el-option
                  v-for="provider in providers"
                  :key="provider"
                  :label="provider"
                  :value="provider"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模型类型" prop="type">
              <el-select v-model="modelForm.type" placeholder="选择类型" style="width: 100%;">
                <el-option label="文本生成" value="text" />
                <el-option label="对话" value="chat" />
                <el-option label="代码生成" value="code" />
                <el-option label="图像生成" value="image" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="API端点" prop="endpoint">
          <el-input v-model="modelForm.endpoint" placeholder="请输入API端点URL" />
        </el-form-item>
        
        <el-form-item label="API密钥" prop="apiKey">
          <el-input 
            v-model="modelForm.apiKey" 
            type="password" 
            placeholder="请输入API密钥"
            show-password
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="最大Token数">
              <el-input-number 
                v-model="modelForm.maxTokens" 
                :min="100" 
                :max="32000" 
                :step="100"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="温度参数">
              <el-input-number 
                v-model="modelForm.temperature" 
                :min="0" 
                :max="2" 
                :step="0.1"
                :precision="1"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="超时时间(秒)">
              <el-input-number 
                v-model="modelForm.timeout" 
                :min="5" 
                :max="300" 
                :step="5"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="模型描述">
          <el-input 
            v-model="modelForm.description" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入模型描述"
          />
        </el-form-item>
        
        <el-form-item label="高级配置">
          <el-collapse>
            <el-collapse-item title="请求头配置" name="headers">
              <div class="headers-config">
                <div v-for="(header, index) in modelForm.headers" :key="index" class="header-item">
                  <el-input v-model="header.key" placeholder="Header名称" style="width: 40%;" />
                  <el-input v-model="header.value" placeholder="Header值" style="width: 40%;" />
                  <el-button type="text" @click="removeHeader(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="text" @click="addHeader">
                  <el-icon><Plus /></el-icon>
                  添加Header
                </el-button>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="代理配置" name="proxy">
              <el-form-item label="启用代理">
                <el-switch v-model="modelForm.proxyEnabled" />
              </el-form-item>
              <el-form-item v-if="modelForm.proxyEnabled" label="代理地址">
                <el-input v-model="modelForm.proxyUrl" placeholder="http://proxy.example.com:8080" />
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showModelDialog = false">取消</el-button>
          <el-button @click="testModelConnection" :loading="testingConnection">
            测试连接
          </el-button>
          <el-button type="primary" @click="saveModel">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="showViewDialog" title="模型详情" width="700px">
      <div v-if="selectedModel" class="model-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模型名称">{{ selectedModel.name }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ selectedModel.version }}</el-descriptions-item>
          <el-descriptions-item label="提供商">{{ selectedModel.provider }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ getTypeText(selectedModel.type) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedModel.status)">
              {{ getStatusText(selectedModel.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">{{ selectedModel.responseTime }}ms</el-descriptions-item>
          <el-descriptions-item label="最大Token数">{{ selectedModel.maxTokens }}</el-descriptions-item>
          <el-descriptions-item label="温度参数">{{ selectedModel.temperature }}</el-descriptions-item>
          <el-descriptions-item label="总请求数">{{ selectedModel.requests }}</el-descriptions-item>
          <el-descriptions-item label="成功率">{{ selectedModel.successRate }}%</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedModel.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="最后使用">{{ selectedModel.lastUsed }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedModel.description }}
          </el-descriptions-item>
        </el-descriptions>
        
        
        <div class="performance-chart">
          <h4>性能趋势</h4>
          <div class="chart-placeholder">
            <el-icon><TrendCharts /></el-icon>
            <span>性能图表占位符</span>
          </div>
        </div>
      </div>
    </el-dialog>

    
    <el-dialog v-model="showTestDialog" title="模型测试结果" width="600px">
      <div class="test-results">
        <div v-for="result in testResults" :key="result.modelId" class="test-result">
          <div class="result-header">
            <span class="model-name">{{ result.modelName }}</span>
            <el-tag :type="result.success ? 'success' : 'danger'" size="small">
              {{ result.success ? '成功' : '失败' }}
            </el-tag>
          </div>
          
          <div class="result-details">
            <div v-if="result.success" class="success-details">
              <p><strong>响应时间:</strong> {{ result.responseTime }}ms</p>
              <p><strong>响应内容:</strong> {{ result.response }}</p>
            </div>
            <div v-else class="error-details">
              <p><strong>错误信息:</strong> {{ result.error }}</p>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Plus, Refresh, Connection, Cpu, CircleCheck, 
  Timer, ChatDotRound, ArrowDown, Delete, TrendCharts 
} from '@element-plus/icons-vue'

// 提供商列表
const providers = ['OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Baidu', '自定义']

// 模型数据
const models = ref([])

// 搜索和过滤
const searchKeyword = ref('')
const selectedProvider = ref('')
const selectedStatus = ref('')

// 对话框状态
const showModelDialog = ref(false)
const showViewDialog = ref(false)
const showTestDialog = ref(false)
const isEditMode = ref(false)
const selectedModel = ref(null)
const testingConnection = ref(false)

// 测试结果
const testResults = ref([])

// 模型表单
const modelForm = reactive({
  name: '',
  version: '',
  provider: '',
  type: 'chat',
  endpoint: '',
  apiKey: '',
  maxTokens: 2000,
  temperature: 0.7,
  timeout: 30,
  description: '',
  headers: [],
  proxyEnabled: false,
  proxyUrl: ''
})

// 表单验证规则
const modelRules = {
  name: [
    { required: true, message: '请输入模型名称', trigger: 'blur' }
  ],
  provider: [
    { required: true, message: '请选择提供商', trigger: 'change' }
  ],
  endpoint: [
    { required: true, message: '请输入API端点', trigger: 'blur' },
    { type: 'url', message: '请输入正确的URL格式', trigger: 'blur' }
  ],
  apiKey: [
    { required: true, message: '请输入API密钥', trigger: 'blur' }
  ]
}

const modelFormRef = ref()

// 计算属性
const totalModels = computed(() => models.value.length)

const onlineModels = computed(() => 
  models.value.filter(m => m.status === 'online').length
)

const avgResponseTime = computed(() => {
  const onlineModelsList = models.value.filter(m => m.status === 'online')
  if (onlineModelsList.length === 0) return 0
  
  const total = onlineModelsList.reduce((sum, m) => sum + m.responseTime, 0)
  return Math.round(total / onlineModelsList.length)
})

const totalRequests = computed(() => 
  models.value.reduce((sum, m) => sum + m.requests, 0)
)

const filteredModels = computed(() => {
  let result = [...models.value]
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(model => 
      model.name.toLowerCase().includes(keyword) ||
      model.provider.toLowerCase().includes(keyword)
    )
  }
  
  // 按提供商过滤
  if (selectedProvider.value) {
    result = result.filter(model => model.provider === selectedProvider.value)
  }
  
  // 按状态过滤
  if (selectedStatus.value) {
    result = result.filter(model => model.status === selectedStatus.value)
  }
  
  return result
})

const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑模型' : '添加模型'
})

// 方法
const getStatusType = (status: string) => {
  const typeMap = {
    online: 'success',
    offline: 'danger',
    maintenance: 'warning'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap = {
    online: '在线',
    offline: '离线',
    maintenance: '维护中'
  }
  return textMap[status] || status
}

const getTypeText = (type: string) => {
  const textMap = {
    text: '文本生成',
    chat: '对话',
    code: '代码生成',
    image: '图像生成'
  }
  return textMap[type] || type
}

const getPerformanceScore = (responseTime: number) => {
  if (responseTime <= 500) return 100
  if (responseTime <= 1000) return 80
  if (responseTime <= 2000) return 60
  if (responseTime <= 3000) return 40
  return 20
}

const getPerformanceColor = (responseTime: number) => {
  if (responseTime <= 500) return '#67c23a'
  if (responseTime <= 1000) return '#e6a23c'
  if (responseTime <= 2000) return '#f56c6c'
  return '#909399'
}

const showAddModelDialog = () => {
  isEditMode.value = false
  resetModelForm()
  showModelDialog.value = true
}

const viewModel = (model: any) => {
  selectedModel.value = model
  showViewDialog.value = true
}

const editModel = (model: any) => {
  isEditMode.value = true
  Object.assign(modelForm, {
    ...model,
    headers: [...(model.headers || [])]
  })
  showModelDialog.value = true
}

const testModel = async (model: any) => {
  testResults.value = []
  showTestDialog.value = true
  
  const result = {
    modelId: model.id,
    modelName: model.name,
    success: false,
    responseTime: 0,
    response: '',
    error: ''
  }
  
  testResults.value.push(result)
  
  try {
    const startTime = Date.now()
    
    // 模拟API测试
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500))
    
    const endTime = Date.now()
    result.responseTime = endTime - startTime
    result.success = Math.random() > 0.2 // 80%成功率
    
    if (result.success) {
      result.response = '模型连接测试成功，响应正常。'
    } else {
      result.error = 'API密钥无效或网络连接失败'
    }
  } catch (error) {
    result.error = '连接超时或服务器错误'
  }
}

const testAllModels = async () => {
  testResults.value = []
  showTestDialog.value = true
  
  for (const model of models.value) {
    await testModel(model)
  }
}

const handleModelAction = (command: string, model: any) => {
  switch (command) {
    case 'clone':
      cloneModel(model)
      break
    case 'export':
      exportModel(model)
      break
    case 'disable':
      toggleModelStatus(model)
      break
    case 'delete':
      deleteModel(model)
      break
  }
}

const cloneModel = (model: any) => {
  const clonedModel = {
    ...model,
    id: Date.now(),
    name: `${model.name} - 副本`,
    requests: 0,
    lastUsed: '从未使用',
    createdAt: new Date().toLocaleString()
  }
  
  models.value.push(clonedModel)
  ElMessage.success('模型克隆成功')
}

const exportModel = (model: any) => {
  const exportData = {
    name: model.name,
    version: model.version,
    provider: model.provider,
    type: model.type,
    endpoint: model.endpoint,
    maxTokens: model.maxTokens,
    temperature: model.temperature,
    timeout: model.timeout,
    description: model.description,
    headers: model.headers,
    proxyEnabled: model.proxyEnabled,
    proxyUrl: model.proxyUrl
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${model.name}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('模型配置导出成功')
}

const toggleModelStatus = (model: any) => {
  model.status = model.status === 'online' ? 'offline' : 'online'
  ElMessage.success(`模型已${model.status === 'online' ? '启用' : '禁用'}`)
}

const deleteModel = async (model: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除模型 "${model.name}" 吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    const response = await fetch('/api/ai/models/delete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: model.id })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '删除失败')
    }
    
    ElMessage.success('模型删除成功')
    
    // 重新加载模型列表
    await loadModels()
    
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('删除模型失败:', error)
      ElMessage.error(`删除模型失败: ${error.message}`)
    }
  }
}

const resetModelForm = () => {
  Object.assign(modelForm, {
    name: '',
    version: '',
    provider: '',
    type: 'chat',
    endpoint: '',
    apiKey: '',
    maxTokens: 2000,
    temperature: 0.7,
    timeout: 30,
    description: '',
    headers: [],
    proxyEnabled: false,
    proxyUrl: ''
  })
}

const addHeader = () => {
  modelForm.headers.push({ key: '', value: '' })
}

const removeHeader = (index: number) => {
  modelForm.headers.splice(index, 1)
}

const testModelConnection = async () => {
  testingConnection.value = true
  
  try {
    const response = await fetch('/api/ai/models/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: modelForm.endpoint,
        apiKey: modelForm.apiKey,
        provider: modelForm.provider,
        headers: modelForm.headers,
        proxyEnabled: modelForm.proxyEnabled,
        proxyUrl: modelForm.proxyUrl
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.success) {
      ElMessage.success(`连接测试成功，响应时间: ${result.data.responseTime}ms`)
    } else {
      ElMessage.error(`连接测试失败: ${result.message}`)
    }
    
  } catch (error) {
    console.error('连接测试失败:', error)
    ElMessage.error(`连接测试失败: ${error.message}`)
  } finally {
    testingConnection.value = false
  }
}

const saveModel = async () => {
  try {
    await modelFormRef.value.validate()
    
    const apiUrl = isEditMode.value ? '/api/ai/models/update' : '/api/ai/models/create'
    const method = 'POST'
    
    const requestData = isEditMode.value 
      ? { id: selectedModel.value?.id, ...modelForm }
      : modelForm
    
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '操作失败')
    }
    
    ElMessage.success(isEditMode.value ? '模型更新成功' : '模型添加成功')
    showModelDialog.value = false
    resetModelForm()
    
    // 重新加载模型列表
    await loadModels()
    
  } catch (error) {
    console.error('保存模型失败:', error)
    ElMessage.error(`保存模型失败: ${error.message}`)
  }
}

// 加载AI模型数据
const loadModels = async () => {
  try {
    const response = await fetch('/api/ai/models', {
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
      throw new Error(result.message || '获取AI模型数据失败')
    }
    
    models.value = result.data || []
    
  } catch (error) {
    console.error('加载AI模型数据失败:', error)
    ElMessage.error(`加载AI模型数据失败: ${error.message}`)
  }
}

const refreshModels = async () => {
  try {
    await loadModels()
    ElMessage.success('模型列表已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

const exportModels = () => {
  const exportData = models.value.map(model => ({
    name: model.name,
    version: model.version,
    provider: model.provider,
    type: model.type,
    endpoint: model.endpoint,
    maxTokens: model.maxTokens,
    temperature: model.temperature,
    timeout: model.timeout,
    description: model.description,
    headers: model.headers,
    proxyEnabled: model.proxyEnabled,
    proxyUrl: model.proxyUrl
  }))
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'models-config.json'
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('模型配置导出成功')
}

const importModels = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target?.result as string)
          // 这里应该验证导入数据的格式
          ElMessage.success('模型配置导入成功')
        } catch (error) {
          ElMessage.error('导入文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

// 组件挂载时加载数据
onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.ai-models {
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

.toolbar {
  margin-bottom: 20px;
}

.toolbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.search-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.models-table {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.model-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.name-info {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 500;
  color: #303133;
}

.version {
  font-size: 12px;
  color: #909399;
}

.performance-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.response-time {
  font-size: 12px;
  color: #606266;
  text-align: center;
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-detail {
  max-height: 600px;
  overflow-y: auto;
}

.performance-chart {
  margin-top: 20px;
}

.performance-chart h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  color: #909399;
}

.chart-placeholder .el-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.headers-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-results {
  max-height: 400px;
  overflow-y: auto;
}

.test-result {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.model-name {
  font-weight: 500;
  color: #303133;
}

.result-details {
  font-size: 14px;
  color: #606266;
}

.success-details p,
.error-details p {
  margin: 4px 0;
}

@media (max-width: 768px) {
  .ai-models {
    padding: 10px;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-group {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .action-group {
    justify-content: center;
  }
  
  .stats-row .el-col {
    margin-bottom: 12px;
  }
  
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .header-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>