<template>
  <div class="ai-training">
    
    <div class="page-header">
      <h2>模型训练</h2>
      <p>创建和管理AI模型训练任务，监控训练进度和性能</p>
    </div>

    
    <el-card class="toolbar">
      <div class="toolbar-content">
        <div class="search-group">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索训练任务"
            style="width: 300px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select v-model="selectedStatus" placeholder="选择状态" style="width: 120px;" clearable>
            <el-option label="全部" value="" />
            <el-option label="等待中" value="pending" />
            <el-option label="训练中" value="training" />
            <el-option label="已完成" value="completed" />
            <el-option label="已失败" value="failed" />
            <el-option label="已暂停" value="paused" />
          </el-select>
          
          <el-select v-model="selectedType" placeholder="选择类型" style="width: 150px;" clearable>
            <el-option label="全部" value="" />
            <el-option label="微调" value="fine-tuning" />
            <el-option label="预训练" value="pre-training" />
            <el-option label="强化学习" value="reinforcement" />
          </el-select>
        </div>
        
        <div class="action-group">
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            创建训练任务
          </el-button>
          <el-button @click="refreshTasks">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button @click="showTemplatesDialog">
            <el-icon><Document /></el-icon>
            训练模板
          </el-button>
        </div>
      </div>
    </el-card>

    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#409eff"><DataAnalysis /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalTasks }}</div>
              <div class="stat-label">总任务数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#67c23a"><Loading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ runningTasks }}</div>
              <div class="stat-label">运行中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#e6a23c"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ completedTasks }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#f56c6c"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ avgTrainingTime }}h</div>
              <div class="stat-label">平均训练时间</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-card class="tasks-table">
      <template #header>
        <div class="table-header">
          <span>训练任务</span>
          <div class="table-actions">
            <el-button size="small" @click="exportTasks">导出任务</el-button>
            <el-button size="small" @click="showBatchActions">批量操作</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="filteredTasks" stripe>
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="name" label="任务名称" min-width="180">
          <template #default="{ row }">
            <div class="task-name">
              <el-avatar :size="32" class="task-avatar">
                <el-icon><DataAnalysis /></el-icon>
              </el-avatar>
              <div class="name-info">
                <div class="name">{{ row.name }}</div>
                <div class="model">{{ row.baseModel }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="进度" width="150">
          <template #default="{ row }">
            <div class="progress-info">
              <el-progress 
                :percentage="row.progress" 
                :stroke-width="6"
                :color="getProgressColor(row.status)"
              />
              <div class="progress-text">{{ row.progress }}%</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="数据集" width="120">
          <template #default="{ row }">
            <div class="dataset-info">
              <div class="dataset-name">{{ row.dataset }}</div>
              <div class="dataset-size">{{ row.datasetSize }} 条</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="性能指标" width="120">
          <template #default="{ row }">
            <div class="metrics-info">
              <div v-if="row.accuracy" class="metric">准确率: {{ row.accuracy }}%</div>
              <div v-if="row.loss" class="metric">损失: {{ row.loss }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="duration" label="训练时长" width="120" />
        
        <el-table-column prop="createdAt" label="创建时间" width="150" />
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button 
                v-if="row.status === 'training'"
                type="text" 
                size="small" 
                @click="pauseTask(row)"
              >
                暂停
              </el-button>
              <el-button 
                v-if="row.status === 'paused'"
                type="text" 
                size="small" 
                @click="resumeTask(row)"
              >
                继续
              </el-button>
              <el-button type="text" size="small" @click="viewTask(row)">
                详情
              </el-button>
              <el-button type="text" size="small" @click="viewLogs(row)">
                日志
              </el-button>
              <el-dropdown @command="(command) => handleTaskAction(command, row)">
                <el-button type="text" size="small">
                  更多<el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="clone">克隆</el-dropdown-item>
                    <el-dropdown-item command="export">导出</el-dropdown-item>
                    <el-dropdown-item command="stop" :disabled="!['training', 'paused'].includes(row.status)">
                      停止
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

    
    <el-dialog v-model="showCreateTaskDialog" title="创建训练任务" width="800px">
      <el-form :model="taskForm" :rules="taskRules" ref="taskFormRef" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="任务名称" prop="name">
              <el-input v-model="taskForm.name" placeholder="请输入任务名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="训练类型" prop="type">
              <el-select v-model="taskForm.type" placeholder="选择训练类型" style="width: 100%;">
                <el-option label="微调" value="fine-tuning" />
                <el-option label="预训练" value="pre-training" />
                <el-option label="强化学习" value="reinforcement" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="基础模型" prop="baseModel">
              <el-select v-model="taskForm.baseModel" placeholder="选择基础模型" style="width: 100%;">
                <el-option label="GPT-3.5" value="gpt-3.5" />
                <el-option label="GPT-4" value="gpt-4" />
                <el-option label="Claude" value="claude" />
                <el-option label="自定义" value="custom" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据集" prop="dataset">
              <el-select v-model="taskForm.dataset" placeholder="选择数据集" style="width: 100%;">
                <el-option label="对话数据集" value="conversation" />
                <el-option label="问答数据集" value="qa" />
                <el-option label="代码数据集" value="code" />
                <el-option label="自定义数据集" value="custom" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="任务描述">
          <el-input 
            v-model="taskForm.description" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入任务描述"
          />
        </el-form-item>
        
        <el-divider content-position="left">训练参数</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="学习率">
              <el-input-number 
                v-model="taskForm.learningRate" 
                :min="0.0001" 
                :max="0.1" 
                :step="0.0001"
                :precision="4"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="批次大小">
              <el-input-number 
                v-model="taskForm.batchSize" 
                :min="1" 
                :max="128" 
                :step="1"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="训练轮数">
              <el-input-number 
                v-model="taskForm.epochs" 
                :min="1" 
                :max="100" 
                :step="1"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优化器">
              <el-select v-model="taskForm.optimizer" style="width: 100%;">
                <el-option label="Adam" value="adam" />
                <el-option label="SGD" value="sgd" />
                <el-option label="AdamW" value="adamw" />
                <el-option label="RMSprop" value="rmsprop" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="调度器">
              <el-select v-model="taskForm.scheduler" style="width: 100%;">
                <el-option label="线性" value="linear" />
                <el-option label="余弦" value="cosine" />
                <el-option label="指数" value="exponential" />
                <el-option label="阶梯" value="step" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">高级设置</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="早停轮数">
              <el-input-number 
                v-model="taskForm.earlyStoppingPatience" 
                :min="1" 
                :max="20" 
                :step="1"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="保存频率">
              <el-input-number 
                v-model="taskForm.saveFrequency" 
                :min="1" 
                :max="100" 
                :step="1"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="GPU设置">
          <el-checkbox-group v-model="taskForm.gpuIds">
            <el-checkbox v-for="gpu in availableGpus" :key="gpu.id" :label="gpu.id">
              {{ gpu.name }} ({{ gpu.memory }}GB)
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="自动启动">
          <el-switch v-model="taskForm.autoStart" />
          <span class="form-help">创建后立即开始训练</span>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateTaskDialog = false">取消</el-button>
          <el-button @click="validateTask" :loading="validatingTask">
            验证配置
          </el-button>
          <el-button type="primary" @click="createTask">创建任务</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="showTaskDetailDialog" title="训练任务详情" width="900px">
      <div v-if="selectedTask" class="task-detail">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="任务名称">{{ selectedTask.name }}</el-descriptions-item>
              <el-descriptions-item label="训练类型">{{ getTypeText(selectedTask.type) }}</el-descriptions-item>
              <el-descriptions-item label="基础模型">{{ selectedTask.baseModel }}</el-descriptions-item>
              <el-descriptions-item label="数据集">{{ selectedTask.dataset }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusType(selectedTask.status)">
                  {{ getStatusText(selectedTask.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="进度">{{ selectedTask.progress }}%</el-descriptions-item>
              <el-descriptions-item label="训练时长">{{ selectedTask.duration }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ selectedTask.createdAt }}</el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">
                {{ selectedTask.description }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <el-tab-pane label="训练参数" name="params">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="学习率">{{ selectedTask.learningRate }}</el-descriptions-item>
              <el-descriptions-item label="批次大小">{{ selectedTask.batchSize }}</el-descriptions-item>
              <el-descriptions-item label="训练轮数">{{ selectedTask.epochs }}</el-descriptions-item>
              <el-descriptions-item label="优化器">{{ selectedTask.optimizer }}</el-descriptions-item>
              <el-descriptions-item label="调度器">{{ selectedTask.scheduler }}</el-descriptions-item>
              <el-descriptions-item label="早停轮数">{{ selectedTask.earlyStoppingPatience }}</el-descriptions-item>
              <el-descriptions-item label="保存频率">{{ selectedTask.saveFrequency }}</el-descriptions-item>
              <el-descriptions-item label="使用GPU">{{ selectedTask.gpuIds?.join(', ') || '无' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <el-tab-pane label="性能指标" name="metrics">
            <div class="metrics-charts">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-card>
                    <template #header>
                      <span>损失曲线</span>
                    </template>
                    <div class="chart-placeholder">
                      <el-icon><TrendCharts /></el-icon>
                      <span>损失曲线图表</span>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card>
                    <template #header>
                      <span>准确率曲线</span>
                    </template>
                    <div class="chart-placeholder">
                      <el-icon><TrendCharts /></el-icon>
                      <span>准确率曲线图表</span>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
              
              <el-row :gutter="20" style="margin-top: 20px;">
                <el-col :span="24">
                  <el-card>
                    <template #header>
                      <span>学习率变化</span>
                    </template>
                    <div class="chart-placeholder">
                      <el-icon><TrendCharts /></el-icon>
                      <span>学习率变化图表</span>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="训练日志" name="logs">
            <div class="training-logs">
              <div class="log-controls">
                <el-button size="small" @click="refreshLogs">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
                <el-button size="small" @click="downloadLogs">
                  <el-icon><Download /></el-icon>
                  下载日志
                </el-button>
                <el-switch v-model="autoRefreshLogs" style="margin-left: 12px;" />
                <span style="margin-left: 8px;">自动刷新</span>
              </div>
              
              <div class="log-content">
                <div v-for="(log, index) in trainingLogs" :key="index" class="log-entry">
                  <span class="log-time">{{ log.timestamp }}</span>
                  <span :class="['log-level', `log-${log.level}`]">{{ log.level.toUpperCase() }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    
    <el-dialog v-model="showTemplatesDialog" title="训练模板" width="700px">
      <div class="templates-grid">
        <div v-for="template in trainingTemplates" :key="template.id" class="template-card">
          <el-card class="template-item" @click="useTemplate(template)">
            <div class="template-header">
              <h4>{{ template.name }}</h4>
              <el-tag :type="getTypeTagType(template.type)" size="small">
                {{ getTypeText(template.type) }}
              </el-tag>
            </div>
            <p class="template-description">{{ template.description }}</p>
            <div class="template-params">
              <div class="param-item">
                <span class="param-label">学习率:</span>
                <span class="param-value">{{ template.learningRate }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">批次大小:</span>
                <span class="param-value">{{ template.batchSize }}</span>
              </div>
              <div class="param-item">
                <span class="param-label">训练轮数:</span>
                <span class="param-value">{{ template.epochs }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Plus, Refresh, Document, DataAnalysis, Loading, 
  CircleCheck, Timer, ArrowDown, TrendCharts, Download 
} from '@element-plus/icons-vue'

// 训练任务数据
const tasks = ref([])

// API调用方法
const fetchTasks = async () => {
  try {
    // const response = await api.get('/training/tasks')
    // tasks.value = response.data
    console.log('获取训练任务列表')
  } catch (error) {
    console.error('获取训练任务失败:', error)
    ElMessage.error('获取训练任务失败')
  }
}

const createTaskAPI = async (taskData) => {
  try {
    // const response = await api.post('/training/tasks', taskData)
    // return response.data
    console.log('创建训练任务:', taskData)
    return { id: Date.now(), ...taskData }
  } catch (error) {
    console.error('创建训练任务失败:', error)
    throw error
  }
}

const updateTaskStatus = async (taskId, status) => {
  try {
    // const response = await api.patch(`/training/tasks/${taskId}`, { status })
    // return response.data
    console.log('更新任务状态:', taskId, status)
  } catch (error) {
    console.error('更新任务状态失败:', error)
    throw error
  }
}

const deleteTaskAPI = async (taskId) => {
  try {
    // await api.delete(`/training/tasks/${taskId}`)
    console.log('删除训练任务:', taskId)
  } catch (error) {
    console.error('删除训练任务失败:', error)
    throw error
  }
}

const fetchTaskLogs = async (taskId) => {
  try {
    // const response = await api.get(`/training/tasks/${taskId}/logs`)
    // return response.data
    console.log('获取任务日志:', taskId)
    return trainingLogs.value
  } catch (error) {
    console.error('获取任务日志失败:', error)
    throw error
  }
}

// 可用GPU列表
const availableGpus = ref([])

// 训练模板
const trainingTemplates = ref([])

// 搜索和过滤
const searchKeyword = ref('')
const selectedStatus = ref('')
const selectedType = ref('')

// 对话框状态
const showCreateTaskDialog = ref(false)
const showTaskDetailDialog = ref(false)
const showTemplatesDialog = ref(false)
const selectedTask = ref(null)
const activeTab = ref('info')
const validatingTask = ref(false)

// 日志相关
const autoRefreshLogs = ref(false)
const trainingLogs = ref([
  {
    timestamp: '2024-01-15 14:30:15',
    level: 'info',
    message: '开始训练任务: 对话模型微调'
  },
  {
    timestamp: '2024-01-15 14:30:16',
    level: 'info',
    message: '加载数据集: conversation (10000 条记录)'
  },
  {
    timestamp: '2024-01-15 14:30:18',
    level: 'info',
    message: '初始化模型: gpt-3.5'
  },
  {
    timestamp: '2024-01-15 14:30:20',
    level: 'info',
    message: 'Epoch 1/10 开始'
  },
  {
    timestamp: '2024-01-15 14:35:22',
    level: 'info',
    message: 'Epoch 1/10 完成 - Loss: 0.45, Accuracy: 78.2%'
  },
  {
    timestamp: '2024-01-15 14:35:23',
    level: 'info',
    message: 'Epoch 2/10 开始'
  },
  {
    timestamp: '2024-01-15 14:40:25',
    level: 'info',
    message: 'Epoch 2/10 完成 - Loss: 0.38, Accuracy: 82.1%'
  },
  {
    timestamp: '2024-01-15 14:40:26',
    level: 'warning',
    message: 'GPU内存使用率较高: 89%'
  },
  {
    timestamp: '2024-01-15 14:40:27',
    level: 'info',
    message: 'Epoch 3/10 开始'
  }
])

// 任务表单
const taskForm = reactive({
  name: '',
  type: 'fine-tuning',
  baseModel: '',
  dataset: '',
  description: '',
  learningRate: 0.0001,
  batchSize: 16,
  epochs: 10,
  optimizer: 'adam',
  scheduler: 'linear',
  earlyStoppingPatience: 3,
  saveFrequency: 5,
  gpuIds: [],
  autoStart: false
})

// 表单验证规则
const taskRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择训练类型', trigger: 'change' }
  ],
  baseModel: [
    { required: true, message: '请选择基础模型', trigger: 'change' }
  ],
  dataset: [
    { required: true, message: '请选择数据集', trigger: 'change' }
  ]
}

const taskFormRef = ref()

// 自动刷新定时器
let refreshTimer: NodeJS.Timeout | null = null

// 计算属性
const totalTasks = computed(() => tasks.value.length)

const runningTasks = computed(() => 
  tasks.value.filter(t => ['training', 'pending'].includes(t.status)).length
)

const completedTasks = computed(() => 
  tasks.value.filter(t => t.status === 'completed').length
)

const avgTrainingTime = computed(() => {
  const completedTasksList = tasks.value.filter(t => t.status === 'completed')
  if (completedTasksList.length === 0) return 0
  
  // 这里应该计算实际的平均训练时间
  return 6.5
})

const filteredTasks = computed(() => {
  let result = [...tasks.value]
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(task => 
      task.name.toLowerCase().includes(keyword) ||
      task.baseModel.toLowerCase().includes(keyword) ||
      task.dataset.toLowerCase().includes(keyword)
    )
  }
  
  // 按状态过滤
  if (selectedStatus.value) {
    result = result.filter(task => task.status === selectedStatus.value)
  }
  
  // 按类型过滤
  if (selectedType.value) {
    result = result.filter(task => task.type === selectedType.value)
  }
  
  return result
})

// 方法
const getStatusType = (status: string) => {
  const typeMap = {
    pending: 'info',
    training: 'warning',
    completed: 'success',
    failed: 'danger',
    paused: 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap = {
    pending: '等待中',
    training: '训练中',
    completed: '已完成',
    failed: '已失败',
    paused: '已暂停'
  }
  return textMap[status] || status
}

const getTypeText = (type: string) => {
  const textMap = {
    'fine-tuning': '微调',
    'pre-training': '预训练',
    'reinforcement': '强化学习'
  }
  return textMap[type] || type
}

const getTypeTagType = (type: string) => {
  const typeMap = {
    'fine-tuning': 'primary',
    'pre-training': 'success',
    'reinforcement': 'warning'
  }
  return typeMap[type] || 'info'
}

const getProgressColor = (status: string) => {
  const colorMap = {
    training: '#409eff',
    completed: '#67c23a',
    failed: '#f56c6c',
    paused: '#e6a23c'
  }
  return colorMap[status] || '#909399'
}

const showCreateDialog = () => {
  resetTaskForm()
  showCreateTaskDialog.value = true
}

const viewTask = (task: any) => {
  selectedTask.value = task
  activeTab.value = 'info'
  showTaskDetailDialog.value = true
}

const viewLogs = (task: any) => {
  selectedTask.value = task
  activeTab.value = 'logs'
  showTaskDetailDialog.value = true
}

const pauseTask = async (task: any) => {
  try {
    await ElMessageBox.confirm(`确定要暂停训练任务 "${task.name}" 吗？`, '确认暂停', {
      type: 'warning'
    })
    
    await updateTaskStatus(task.id, 'paused')
    task.status = 'paused'
    ElMessage.success('训练任务已暂停')
  } catch (error) {
    if (error.message !== 'cancel') {
      ElMessage.error('暂停任务失败')
    }
  }
}

const resumeTask = async (task: any) => {
  try {
    await updateTaskStatus(task.id, 'training')
    task.status = 'training'
    ElMessage.success('训练任务已继续')
  } catch (error) {
    ElMessage.error('继续任务失败')
  }
}

const handleTaskAction = (command: string, task: any) => {
  switch (command) {
    case 'clone':
      cloneTask(task)
      break
    case 'export':
      exportTask(task)
      break
    case 'stop':
      stopTask(task)
      break
    case 'delete':
      deleteTask(task)
      break
  }
}

const cloneTask = (task: any) => {
  const clonedTask = {
    ...task,
    id: Date.now(),
    name: `${task.name} - 副本`,
    status: 'pending',
    progress: 0,
    accuracy: 0,
    loss: 0,
    duration: '0h 0m',
    createdAt: new Date().toLocaleString()
  }
  
  tasks.value.push(clonedTask)
  ElMessage.success('训练任务克隆成功')
}

const exportTask = (task: any) => {
  const exportData = {
    name: task.name,
    type: task.type,
    baseModel: task.baseModel,
    dataset: task.dataset,
    description: task.description,
    learningRate: task.learningRate,
    batchSize: task.batchSize,
    epochs: task.epochs,
    optimizer: task.optimizer,
    scheduler: task.scheduler,
    earlyStoppingPatience: task.earlyStoppingPatience,
    saveFrequency: task.saveFrequency,
    gpuIds: task.gpuIds
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${task.name}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('训练任务配置导出成功')
}

const stopTask = async (task: any) => {
  try {
    await ElMessageBox.confirm(`确定要停止训练任务 "${task.name}" 吗？此操作不可恢复！`, '确认停止', {
      type: 'warning'
    })
    
    await updateTaskStatus(task.id, 'stopped')
    task.status = 'stopped'
    ElMessage.success('训练任务已停止')
  } catch (error) {
    if (error.message !== 'cancel') {
      ElMessage.error('停止任务失败')
    }
  }
}

const deleteTask = async (task: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除训练任务 "${task.name}" 吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    await deleteTaskAPI(task.id)
    const index = tasks.value.indexOf(task)
    if (index > -1) {
      tasks.value.splice(index, 1)
    }
    ElMessage.success('训练任务删除成功')
  } catch (error) {
    if (error.message !== 'cancel') {
      ElMessage.error('删除任务失败')
    }
  }
}

const resetTaskForm = () => {
  Object.assign(taskForm, {
    name: '',
    type: 'fine-tuning',
    baseModel: '',
    dataset: '',
    description: '',
    learningRate: 0.0001,
    batchSize: 16,
    epochs: 10,
    optimizer: 'adam',
    scheduler: 'linear',
    earlyStoppingPatience: 3,
    saveFrequency: 5,
    gpuIds: [],
    autoStart: false
  })
}

const validateTask = async () => {
  validatingTask.value = true
  
  try {
    await taskFormRef.value.validate()
    
    // 模拟配置验证
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('配置验证通过')
  } catch (error) {
    ElMessage.error('配置验证失败，请检查参数设置')
  } finally {
    validatingTask.value = false
  }
}

const createTask = async () => {
  try {
    await taskFormRef.value.validate()
    
    const taskData = {
      ...taskForm,
      status: taskForm.autoStart ? 'training' : 'pending'
    }
    
    const newTask = await createTaskAPI(taskData)
    tasks.value.push(newTask)
    
    ElMessage.success('训练任务创建成功')
    showCreateTaskDialog.value = false
    resetTaskForm()
    
    // 重新获取任务列表
    await fetchTasks()
  } catch (error) {
    console.error('创建任务失败:', error)
    ElMessage.error('创建任务失败')
  }
}

const useTemplate = (template: any) => {
  Object.assign(taskForm, {
    type: template.type,
    learningRate: template.learningRate,
    batchSize: template.batchSize,
    epochs: template.epochs,
    optimizer: template.optimizer,
    scheduler: template.scheduler
  })
  
  showTemplatesDialog.value = false
  showCreateTaskDialog.value = true
  
  ElMessage.success(`已应用模板: ${template.name}`)
}

const refreshTasks = async () => {
  try {
    await fetchTasks()
    ElMessage.success('任务列表已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

const refreshLogs = () => {
  // 这里应该调用API获取最新日志
  ElMessage.success('日志已刷新')
}

const downloadLogs = () => {
  const logText = trainingLogs.value
    .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`)
    .join('\n')
  
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `training-logs-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('日志下载成功')
}

const exportTasks = () => {
  const exportData = tasks.value.map(task => ({
    name: task.name,
    type: task.type,
    baseModel: task.baseModel,
    dataset: task.dataset,
    status: task.status,
    progress: task.progress,
    accuracy: task.accuracy,
    loss: task.loss,
    duration: task.duration,
    createdAt: task.createdAt
  }))
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'training-tasks.json'
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('任务数据导出成功')
}

const showBatchActions = () => {
  ElMessage.info('批量操作功能开发中')
}

// 自动刷新日志
const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  
  refreshTimer = setInterval(() => {
    if (autoRefreshLogs.value && activeTab.value === 'logs') {
      // 模拟新日志
      const newLog = {
        timestamp: new Date().toLocaleString(),
        level: 'info',
        message: `训练进度更新: ${Math.floor(Math.random() * 100)}%`
      }
      trainingLogs.value.push(newLog)
      
      // 保持日志数量在合理范围内
      if (trainingLogs.value.length > 100) {
        trainingLogs.value.shift()
      }
    }
  }, 5000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 生命周期
onMounted(() => {
  fetchTasks()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.ai-training {
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

.tasks-table {
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

.task-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-avatar {
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

.model {
  font-size: 12px;
  color: #909399;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  text-align: center;
}

.dataset-info {
  display: flex;
  flex-direction: column;
}

.dataset-name {
  font-weight: 500;
  color: #303133;
}

.dataset-size {
  font-size: 12px;
  color: #909399;
}

.metrics-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric {
  font-size: 12px;
  color: #606266;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-detail {
  max-height: 600px;
  overflow-y: auto;
}

.metrics-charts {
  margin-top: 16px;
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

.training-logs {
  height: 400px;
  display: flex;
  flex-direction: column;
}

.log-controls {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.log-entry {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  line-height: 1.4;
}

.log-time {
  color: #909399;
  margin-right: 8px;
  min-width: 140px;
}

.log-level {
  margin-right: 8px;
  min-width: 60px;
  font-weight: 600;
}

.log-info {
  color: #409eff;
}

.log-warning {
  color: #e6a23c;
}

.log-error {
  color: #f56c6c;
}

.log-message {
  flex: 1;
  color: #303133;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.template-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-item {
  height: 100%;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.template-header h4 {
  margin: 0;
  color: #303133;
}

.template-description {
  color: #606266;
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.4;
}

.template-params {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.param-label {
  color: #909399;
}

.param-value {
  color: #303133;
  font-weight: 500;
}

.form-help {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  .ai-training {
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
  
  .templates-grid {
    grid-template-columns: 1fr;
  }
  
  .log-entry {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .log-time,
  .log-level {
    min-width: auto;
  }
}
</style>