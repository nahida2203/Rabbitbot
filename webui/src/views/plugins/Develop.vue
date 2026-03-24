<template>
  <div class="plugin-develop">
    
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">插件开发</h1>
          <p class="page-description">创建和开发 Yunzai 插件</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="createNewPlugin">
            <el-icon><Plus /></el-icon>
            新建插件
          </el-button>
          <el-button @click="importPlugin">
            <el-icon><Upload /></el-icon>
            导入插件
          </el-button>
        </div>
      </div>
    </div>

    
    <div class="toolbar-section">
      <el-card shadow="never">
        <div class="toolbar-content">
          <div class="toolbar-left">
            <el-select v-model="currentProject" placeholder="选择项目" style="width: 200px">
              <el-option
                v-for="project in projects"
                :key="project.id"
                :label="project.name"
                :value="project.id"
              />
            </el-select>
            <el-button @click="runPlugin" :disabled="!currentProject">
              <el-icon><VideoPlay /></el-icon>
              运行
            </el-button>
            <el-button @click="debugPlugin" :disabled="!currentProject">
              <el-icon><Tools /></el-icon>
              调试
            </el-button>
            <el-button @click="buildPlugin" :disabled="!currentProject">
              <el-icon><Tools /></el-icon>
              构建
            </el-button>
          </div>
          <div class="toolbar-right">
            <el-button @click="openTerminal">
              <el-icon><Monitor /></el-icon>
              终端
            </el-button>
            <el-button @click="openDocs">
              <el-icon><Document /></el-icon>
              文档
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    
    <div class="main-content">
      <el-row :gutter="20">
        
        <el-col :xs="24" :lg="6">
          <el-card class="sidebar-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>项目文件</span>
                <el-button type="text" @click="refreshFiles">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="file-tree">
              <el-tree
                :data="fileTree"
                :props="treeProps"
                node-key="id"
                @node-click="openFile"
              >
                <template #default="{ node, data }">
                  <div class="tree-node">
                    <el-icon>
                      <component :is="getFileIcon(data.type)" />
                    </el-icon>
                    <span>{{ node.label }}</span>
                  </div>
                </template>
              </el-tree>
            </div>
          </el-card>
        </el-col>

        
        <el-col :xs="24" :lg="12">
          <el-card class="editor-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-tabs v-model="activeTab" type="card" @tab-remove="closeTab">
                  <el-tab-pane
                    v-for="tab in openTabs"
                    :key="tab.id"
                    :label="tab.name"
                    :name="tab.id"
                    :closable="openTabs.length > 1"
                  >
                  </el-tab-pane>
                </el-tabs>
                <div class="editor-actions">
                  <el-button size="small" @click="saveFile">
                    <el-icon><DocumentCopy /></el-icon>
                    保存
                  </el-button>
                  <el-button size="small" @click="formatCode">
                    <el-icon><Magic /></el-icon>
                    格式化
                  </el-button>
                </div>
              </div>
            </template>
            <div class="code-editor">
              <textarea
                v-model="currentFileContent"
                class="editor-textarea"
                placeholder="在此编写插件代码..."
                @input="onCodeChange"
              ></textarea>
            </div>
          </el-card>
        </el-col>

        
        <el-col :xs="24" :lg="6">
          <div class="right-panel">
            
            <el-card class="properties-card" shadow="hover">
              <template #header>
                <span>插件属性</span>
              </template>
              <el-form :model="pluginConfig" label-width="80px" size="small">
                <el-form-item label="插件名称">
                  <el-input v-model="pluginConfig.name" />
                </el-form-item>
                <el-form-item label="版本">
                  <el-input v-model="pluginConfig.version" />
                </el-form-item>
                <el-form-item label="作者">
                  <el-input v-model="pluginConfig.author" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="pluginConfig.description" type="textarea" :rows="3" />
                </el-form-item>
                <el-form-item label="分类">
                  <el-select v-model="pluginConfig.category" style="width: 100%">
                    <el-option label="娱乐" value="entertainment" />
                    <el-option label="工具" value="utility" />
                    <el-option label="管理" value="admin" />
                    <el-option label="游戏" value="game" />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-card>

            
            <el-card class="logs-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>运行日志</span>
                  <el-button type="text" @click="clearLogs">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </template>
              <div class="logs-content">
                <div
                  v-for="log in logs"
                  :key="log.id"
                  :class="['log-item', `log-${log.level}`]"
                >
                  <span class="log-time">{{ log.time }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>
    </div>

    
    <el-dialog
      v-model="newPluginDialogVisible"
      title="新建插件"
      width="600px"
      @close="resetNewPluginForm"
    >
      <el-form :model="newPluginForm" label-width="100px">
        <el-form-item label="插件名称" required>
          <el-input v-model="newPluginForm.name" placeholder="请输入插件名称" />
        </el-form-item>
        <el-form-item label="插件类型">
          <el-radio-group v-model="newPluginForm.type">
            <el-radio label="basic">基础插件</el-radio>
            <el-radio label="advanced">高级插件</el-radio>
            <el-radio label="template">模板插件</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="模板选择" v-if="newPluginForm.type === 'template'">
          <el-select v-model="newPluginForm.template" style="width: 100%">
            <el-option label="命令处理器" value="command" />
            <el-option label="事件监听器" value="event" />
            <el-option label="定时任务" value="schedule" />
            <el-option label="API 接口" value="api" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="newPluginForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入插件描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newPluginDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreatePlugin" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import {
  Plus,
  Upload,
  VideoPlay,
  Tools,
  Monitor,
  Document,
  Refresh,
  DocumentCopy,
  Magic,
  Delete,
  Folder,
  Document as FileIcon,
  Setting
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// 响应式数据
const currentProject = ref('')
const activeTab = ref('1')
const currentFileContent = ref('')
const newPluginDialogVisible = ref(false)
const creating = ref(false)

// 项目列表
const projects = ref([
  { id: '1', name: '签到插件' },
  { id: '2', name: '抽卡模拟器' },
  { id: '3', name: '天气查询' }
])

// 打开的标签页
const openTabs = ref([
  { id: '1', name: 'index.js', path: '/plugins/demo/index.js' }
])

// 文件树数据
const fileTree = ref([
  {
    id: '1',
    label: 'plugins',
    type: 'folder',
    children: [
      {
        id: '2',
        label: 'demo',
        type: 'folder',
        children: [
          { id: '3', label: 'index.js', type: 'file' },
          { id: '4', label: 'config.yaml', type: 'config' },
          { id: '5', label: 'README.md', type: 'file' }
        ]
      }
    ]
  }
])

const treeProps = {
  children: 'children',
  label: 'label'
}

// 插件配置
const pluginConfig = ref({
  name: '演示插件',
  version: '1.0.0',
  author: 'Developer',
  description: '这是一个演示插件',
  category: 'utility'
})

// 新建插件表单
const newPluginForm = ref({
  name: '',
  type: 'basic',
  template: '',
  description: ''
})

// 运行日志（真实数据）
const logs = ref<Array<{ id: string; time: string; level: string; message: string }>>([])

// 方法
const getFileIcon = (type: string) => {
  switch (type) {
    case 'folder': return 'Folder'
    case 'config': return 'Setting'
    default: return 'Document'
  }
}

const openFile = (data: any) => {
  if (data.type === 'file') {
    // 模拟打开文件
    currentFileContent.value = `// ${data.label}\nconsole.log('Hello from ${data.label}');`
    ElMessage.success(`已打开文件: ${data.label}`)
  }
}

const closeTab = (tabName: string) => {
  const index = openTabs.value.findIndex(tab => tab.id === tabName)
  if (index > -1) {
    openTabs.value.splice(index, 1)
    if (activeTab.value === tabName && openTabs.value.length > 0) {
      activeTab.value = openTabs.value[0].id
    }
  }
}

const saveFile = () => {
  ElMessage.success('文件已保存')
  // 保存后可刷新日志查看构建或检查输出
  refreshLogs()
}

const formatCode = () => {
  ElMessage.success('代码已格式化')
  refreshLogs()
}

const onCodeChange = () => {
  // 代码变更处理
}

const runPlugin = () => {
  ElMessage.success('插件运行中...')
  refreshLogs()
}

const debugPlugin = () => {
  ElMessage.info('调试模式启动')
  refreshLogs()
}

const buildPlugin = () => {
  ElMessage.success('插件构建中...')
  refreshLogs()
}

const openTerminal = () => {
  ElMessage.info('终端功能开发中...')
}

const openDocs = () => {
  ElMessage.info('文档功能开发中...')
}

const refreshFiles = () => {
  ElMessage.success('文件列表已刷新')
}

const clearLogs = async () => {
  try {
    const res = await api.log.clearLogs({})
    if (res?.data?.code === 200) {
      logs.value = []
      ElMessage.success('日志已清空')
    } else {
      ElMessage.error(res?.data?.message || '清空日志失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '清空日志失败')
  }
}

// 从后端获取聚合日志（复杂逻辑：分页与结构映射）
const refreshLogs = async () => {
  try {
    const res = await api.log.getLogs({ page: 1, size: 200 })
    const data = res?.data?.data
    const items = (data?.items || []) as Array<{ logger: string; level: string; message: string; timestamp: number }>
    logs.value = items.map((x, idx) => ({
      id: `${x.timestamp}-${idx}`,
      time: dayjs(x.timestamp).format('HH:mm:ss'),
      level: (x.level || 'info').toLowerCase(),
      message: typeof x.message === 'string' ? x.message : Array.isArray(x.message) ? x.message.join(' ') : String(x.message ?? '')
    }))
  } catch (e: any) {
    ElMessage.error(e?.message || '获取日志失败')
  }
}

const createNewPlugin = () => {
  newPluginDialogVisible.value = true
}

const importPlugin = () => {
  ElMessage.info('导入插件功能开发中...')
}

const resetNewPluginForm = () => {
  newPluginForm.value = {
    name: '',
    type: 'basic',
    template: '',
    description: ''
  }
}

const confirmCreatePlugin = async () => {
  if (!newPluginForm.value.name) {
    ElMessage.error('请输入插件名称')
    return
  }
  
  creating.value = true
  try {
    // 模拟创建过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success(`插件 "${newPluginForm.value.name}" 创建成功`)
    addLog('success', `新建插件: ${newPluginForm.value.name}`)
    newPluginDialogVisible.value = false
    resetNewPluginForm()
  } catch (error) {
    ElMessage.error('插件创建失败')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  // 初始化
  currentProject.value = projects.value[0]?.id || ''
  // 拉取真实日志数据
  refreshLogs()
})
</script>

<style lang="scss" scoped>
.plugin-develop {
  padding: 20px;
  background-color: var(--el-bg-color-page);
  height: calc(100vh - 60px);
  overflow: hidden;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
}

.header-left {
  .page-title {
    margin: 0 0 5px 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  .page-description {
    margin: 0;
    color: var(--el-text-color-regular);
  }
}

.header-actions {
  display: flex;
  gap: 10px;
}

.toolbar-section {
  margin-bottom: 20px;
  
  :deep(.el-card__body) {
    padding: 15px 20px;
  }
}

.toolbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.main-content {
  height: calc(100vh - 200px);
}

.sidebar-card,
.editor-card,
.properties-card,
.logs-card {
  height: 100%;
  
  :deep(.el-card__body) {
    padding: 0;
    height: calc(100% - 60px);
    overflow: hidden;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-tree {
  padding: 15px;
  height: 100%;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-card {
  :deep(.el-card__header) {
    padding: 0;
  }
  
  :deep(.el-card__body) {
    padding: 0;
  }
}

.editor-actions {
  display: flex;
  gap: 8px;
  padding: 10px 15px;
  border-left: 1px solid var(--el-border-color-light);
}

.code-editor {
  height: 100%;
  padding: 15px;
}

.editor-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.right-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.properties-card {
  flex: 0 0 auto;
  
  :deep(.el-card__body) {
    padding: 15px;
    height: auto;
  }
}

.logs-card {
  flex: 1;
  
  :deep(.el-card__body) {
    padding: 0;
  }
}

.logs-content {
  height: 100%;
  overflow-y: auto;
  padding: 15px;
}

.log-item {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12px;
  
  &.log-info {
    color: var(--el-color-info);
  }
  
  &.log-success {
    color: var(--el-color-success);
  }
  
  &.log-warning {
    color: var(--el-color-warning);
  }
  
  &.log-error {
    color: var(--el-color-danger);
  }
}

.log-time {
  flex: 0 0 auto;
  opacity: 0.7;
}

.log-message {
  flex: 1;
}

@media (max-width: 768px) {
  .plugin-develop {
    padding: 10px;
  }
  
  .main-content {
    height: auto;
  }
  
  .right-panel {
    margin-top: 20px;
  }
}
</style>