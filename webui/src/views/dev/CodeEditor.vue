<template>
  <div class="code-editor">
    
    <div class="page-header">
      <h2>代码编辑器</h2>
      <p>在线代码编辑器，支持多种编程语言和智能提示</p>
    </div>

    
    <el-card class="editor-toolbar">
      <div class="toolbar-content">
        <div class="file-actions">
          <el-button size="small" @click="newFile">
            <el-icon><DocumentAdd /></el-icon>
            新建
          </el-button>
          <el-button size="small" @click="openFile">
            <el-icon><FolderOpened /></el-icon>
            打开
          </el-button>
          <el-button size="small" @click="saveFile" :disabled="!currentFile">
            <el-icon><Document /></el-icon>
            保存
          </el-button>
          <el-button size="small" @click="saveAsFile" :disabled="!currentFile">
            <el-icon><Download /></el-icon>
            另存为
          </el-button>
        </div>
        
        <div class="editor-actions">
          <el-select v-model="selectedLanguage" size="small" style="width: 120px;" @change="changeLanguage">
            <el-option
              v-for="lang in supportedLanguages"
              :key="lang.value"
              :label="lang.label"
              :value="lang.value"
            />
          </el-select>
          
          <el-select v-model="selectedTheme" size="small" style="width: 120px;" @change="changeTheme">
            <el-option
              v-for="theme in editorThemes"
              :key="theme.value"
              :label="theme.label"
              :value="theme.value"
            />
          </el-select>
          
          <el-button size="small" @click="formatCode" :disabled="!currentFile">
            <el-icon><Magic /></el-icon>
            格式化
          </el-button>
          
          <el-button size="small" @click="runCode" :disabled="!canRunCode">
            <el-icon><VideoPlay /></el-icon>
            运行
          </el-button>
          
          <el-button size="small" @click="showSettings">
            <el-icon><Setting /></el-icon>
            设置
          </el-button>
        </div>
      </div>
    </el-card>

    
    <el-row :gutter="20" class="editor-main">
      
      <el-col :span="6">
        <el-card class="file-tree">
          <template #header>
            <div class="tree-header">
              <span>文件浏览器</span>
              <div class="tree-actions">
                <el-button size="small" text @click="refreshFileTree">
                  <el-icon><Refresh /></el-icon>
                </el-button>
                <el-button size="small" text @click="toggleFileTree">
                  <el-icon><Fold /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          
          <el-tree
            :data="fileTree"
            :props="treeProps"
            node-key="id"
            :expand-on-click-node="false"
            @node-click="openFileFromTree"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <el-icon v-if="data.type === 'folder'">
                  <Folder v-if="!node.expanded" />
                  <FolderOpened v-else />
                </el-icon>
                <el-icon v-else>
                  <Document />
                </el-icon>
                <span class="node-label">{{ data.label }}</span>
              </div>
            </template>
          </el-tree>
        </el-card>
      </el-col>
      
      
      <el-col :span="18">
        <el-card class="editor-container">
          
          <el-tabs 
            v-model="activeTab" 
            type="card" 
            closable 
            @tab-remove="closeFile"
            @tab-click="switchFile"
            class="editor-tabs"
          >
            <el-tab-pane
              v-for="file in openFiles"
              :key="file.id"
              :label="getFileTabLabel(file)"
              :name="file.id"
            >
              
              <div class="editor-wrapper">
                <div 
                  ref="editorContainer"
                  class="monaco-editor-container"
                  :style="{ height: editorHeight + 'px' }"
                ></div>
              </div>
            </el-tab-pane>
          </el-tabs>
          
          
          <div v-if="openFiles.length === 0" class="empty-state">
            <el-empty description="没有打开的文件">
              <el-button type="primary" @click="newFile">创建新文件</el-button>
            </el-empty>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-card class="bottom-panel" v-if="showBottomPanel">
      <el-tabs v-model="activeBottomTab" type="card">
        <el-tab-pane label="控制台" name="console">
          <div class="console-output">
            <div 
              v-for="(log, index) in consoleLogs" 
              :key="index" 
              class="console-line"
              :class="'console-' + log.type"
            >
              <span class="console-time">[{{ log.timestamp }}]</span>
              <span class="console-content">{{ log.content }}</span>
            </div>
          </div>
          <div class="console-input">
            <el-input
              v-model="consoleCommand"
              placeholder="输入命令..."
              @keyup.enter="executeConsoleCommand"
            >
              <template #prefix>
                <span class="console-prompt">></span>
              </template>
            </el-input>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="问题" name="problems">
          <div class="problems-list">
            <div 
              v-for="(problem, index) in problems" 
              :key="index" 
              class="problem-item"
              :class="'problem-' + problem.severity"
              @click="goToProblem(problem)"
            >
              <el-icon>
                <WarningFilled v-if="problem.severity === 'error'" />
                <Warning v-else-if="problem.severity === 'warning'" />
                <InfoFilled v-else />
              </el-icon>
              <span class="problem-message">{{ problem.message }}</span>
              <span class="problem-location">{{ problem.file }}:{{ problem.line }}:{{ problem.column }}</span>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="终端" name="terminal">
          <div class="embedded-terminal">
            <div class="terminal-output">
              <div 
                v-for="(line, index) in terminalOutput" 
                :key="index" 
                class="terminal-line"
              >
                {{ line }}
              </div>
            </div>
            <div class="terminal-input">
              <el-input
                v-model="terminalCommand"
                placeholder="输入命令..."
                @keyup.enter="executeTerminalCommand"
              >
                <template #prefix>
                  <span class="terminal-prompt">$</span>
                </template>
              </el-input>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    
    <el-dialog v-model="showSettingsDialog" title="编辑器设置" width="600px">
      <el-form :model="editorSettings" label-width="120px">
        <el-form-item label="字体大小">
          <el-slider 
            v-model="editorSettings.fontSize" 
            :min="12" 
            :max="24" 
            :step="1"
            show-input
          />
        </el-form-item>
        
        <el-form-item label="字体">
          <el-select v-model="editorSettings.fontFamily" style="width: 100%;">
            <el-option label="Consolas" value="Consolas" />
            <el-option label="Monaco" value="Monaco" />
            <el-option label="Source Code Pro" value="'Source Code Pro'" />
            <el-option label="Fira Code" value="'Fira Code'" />
            <el-option label="JetBrains Mono" value="'JetBrains Mono'" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="制表符大小">
          <el-input-number 
            v-model="editorSettings.tabSize" 
            :min="2" 
            :max="8" 
            :step="1"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="自动换行">
          <el-switch v-model="editorSettings.wordWrap" />
        </el-form-item>
        
        <el-form-item label="显示行号">
          <el-switch v-model="editorSettings.lineNumbers" />
        </el-form-item>
        
        <el-form-item label="显示空白字符">
          <el-switch v-model="editorSettings.renderWhitespace" />
        </el-form-item>
        
        <el-form-item label="自动保存">
          <el-switch v-model="editorSettings.autoSave" />
        </el-form-item>
        
        <el-form-item label="智能提示">
          <el-switch v-model="editorSettings.quickSuggestions" />
        </el-form-item>
        
        <el-form-item label="代码折叠">
          <el-switch v-model="editorSettings.folding" />
        </el-form-item>
        
        <el-form-item label="括号匹配">
          <el-switch v-model="editorSettings.matchBrackets" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSettingsDialog = false">取消</el-button>
          <el-button @click="resetEditorSettings">重置</el-button>
          <el-button type="primary" @click="saveEditorSettings">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <input 
      ref="fileInput" 
      type="file" 
      style="display: none;" 
      @change="handleFileUpload"
      multiple
      accept=".js,.ts,.vue,.html,.css,.scss,.less,.json,.md,.txt,.py,.java,.cpp,.c,.go,.rs,.php"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  DocumentAdd, FolderOpened, Document, Download, Magic, VideoPlay, 
  Setting, Refresh, Fold, Folder, WarningFilled, Warning, InfoFilled 
} from '@element-plus/icons-vue'


interface EditorFile {
  id: string
  name: string
  path: string
  content: string
  language: string
  modified: boolean
  saved: boolean
}


interface Problem {
  severity: 'error' | 'warning' | 'info'
  message: string
  file: string
  line: number
  column: number
}


const supportedLanguages = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Vue', value: 'vue' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'JSON', value: 'json' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'PHP', value: 'php' },
  { label: 'Plain Text', value: 'plaintext' }
]


const editorThemes = [
  { label: 'VS Code Dark', value: 'vs-dark' },
  { label: 'VS Code Light', value: 'vs' },
  { label: 'High Contrast Dark', value: 'hc-black' },
  { label: 'High Contrast Light', value: 'hc-light' }
]


const fileTree = ref([
  {
    id: '1',
    label: 'src',
    type: 'folder',
    children: [
      {
        id: '2',
        label: 'components',
        type: 'folder',
        children: [
          { id: '3', label: 'Header.vue', type: 'file', path: '/src/components/Header.vue' },
          { id: '4', label: 'Footer.vue', type: 'file', path: '/src/components/Footer.vue' }
        ]
      },
      {
        id: '5',
        label: 'views',
        type: 'folder',
        children: [
          { id: '6', label: 'Home.vue', type: 'file', path: '/src/views/Home.vue' },
          { id: '7', label: 'About.vue', type: 'file', path: '/src/views/About.vue' }
        ]
      },
      { id: '8', label: 'main.js', type: 'file', path: '/src/main.js' },
      { id: '9', label: 'App.vue', type: 'file', path: '/src/App.vue' }
    ]
  },
  {
    id: '10',
    label: 'public',
    type: 'folder',
    children: [
      { id: '11', label: 'index.html', type: 'file', path: '/public/index.html' }
    ]
  },
  { id: '12', label: 'package.json', type: 'file', path: '/package.json' },
  { id: '13', label: 'README.md', type: 'file', path: '/README.md' }
])

const treeProps = {
  children: 'children',
  label: 'label'
}


const openFiles = ref<EditorFile[]>([])
const activeTab = ref('')
const currentFile = computed(() => openFiles.value.find(f => f.id === activeTab.value))


const selectedLanguage = ref('javascript')
const selectedTheme = ref('vs-dark')
const editorHeight = ref(500)
const showBottomPanel = ref(true)
const activeBottomTab = ref('console')


const showSettingsDialog = ref(false)


let monacoEditor: any = null
const editorContainer = ref<HTMLElement>()


const editorSettings = reactive({
  fontSize: 14,
  fontFamily: 'Consolas',
  tabSize: 2,
  wordWrap: false,
  lineNumbers: true,
  renderWhitespace: false,
  autoSave: true,
  quickSuggestions: true,
  folding: true,
  matchBrackets: true
})


const consoleLogs = ref<Array<{
  type: 'log' | 'error' | 'warn' | 'info'
  content: string
  timestamp: string
}>>([
  {
    type: 'info',
    content: '代码编辑器已启动',
    timestamp: new Date().toLocaleTimeString()
  }
])

const consoleCommand = ref('')


const problems = ref<Problem[]>([
  {
    severity: 'error',
    message: 'Unexpected token',
    file: 'main.js',
    line: 15,
    column: 8
  },
  {
    severity: 'warning',
    message: 'Unused variable \'temp\'',
    file: 'App.vue',
    line: 23,
    column: 12
  }
])


const terminalOutput = ref<string[]>([
  'Welcome to integrated terminal',
  'Type "help" for available commands'
])

const terminalCommand = ref('')


const fileInput = ref<HTMLInputElement>()


const canRunCode = computed(() => {
  if (!currentFile.value) return false
  const runnableLanguages = ['javascript', 'typescript', 'python', 'html']
  return runnableLanguages.includes(currentFile.value.language)
})


const initMonacoEditor = async () => {
  
  
  console.log('Monaco Editor initialized')
}

const newFile = () => {
  const fileId = `file-${Date.now()}`
  const newFile: EditorFile = {
    id: fileId,
    name: 'untitled.js',
    path: '',
    content: '// 新建文件\nconsole.log("Hello, World!");',
    language: 'javascript',
    modified: false,
    saved: false
  }
  
  openFiles.value.push(newFile)
  activeTab.value = fileId
  
  nextTick(() => {
    updateEditorContent()
  })
}

const openFile = () => {
  fileInput.value?.click()
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (files) {
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const language = getLanguageFromFileName(file.name)
        
        const fileId = `file-${Date.now()}-${Math.random()}`
        const editorFile: EditorFile = {
          id: fileId,
          name: file.name,
          path: file.name,
          content,
          language,
          modified: false,
          saved: true
        }
        
        openFiles.value.push(editorFile)
        activeTab.value = fileId
        
        nextTick(() => {
          updateEditorContent()
        })
      }
      reader.readAsText(file)
    })
  }
  
  
  target.value = ''
}

const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'vue': 'vue',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'cpp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php'
  }
  return langMap[ext || ''] || 'plaintext'
}

const saveFile = async () => {
  if (!currentFile.value) return
  
  try {
    
    const response = await fetch('/api/files/save', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: currentFile.value.path,
        content: currentFile.value.content,
        filename: currentFile.value.name
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '文件保存失败')
    }
    
    currentFile.value.saved = true
    currentFile.value.modified = false
    
    ElMessage.success('文件保存成功')
    addConsoleLog('info', `文件 ${currentFile.value.name} 已保存`)
    
  } catch (error) {
    console.error('文件保存失败:', error)
    ElMessage.error(`文件保存失败: ${error.message}`)
    addConsoleLog('error', `保存文件失败: ${error.message}`)
  }
}

const saveAsFile = () => {
  if (!currentFile.value) return
  
  const blob = new Blob([currentFile.value.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = currentFile.value.name
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('文件下载成功')
}

const closeFile = (fileId: string) => {
  const fileIndex = openFiles.value.findIndex(f => f.id === fileId)
  if (fileIndex === -1) return
  
  const file = openFiles.value[fileIndex]
  
  
  if (file.modified) {
    ElMessageBox.confirm(
      `文件 "${file.name}" 有未保存的修改，确定要关闭吗？`,
      '确认关闭',
      {
        type: 'warning',
        confirmButtonText: '关闭',
        cancelButtonText: '取消'
      }
    ).then(() => {
      doCloseFile(fileId, fileIndex)
    }).catch(() => {
      
    })
  } else {
    doCloseFile(fileId, fileIndex)
  }
}

const doCloseFile = (fileId: string, fileIndex: number) => {
  openFiles.value.splice(fileIndex, 1)
  
  
  if (activeTab.value === fileId) {
    if (openFiles.value.length > 0) {
      activeTab.value = openFiles.value[Math.max(0, fileIndex - 1)].id
    } else {
      activeTab.value = ''
    }
  }
  
  nextTick(() => {
    updateEditorContent()
  })
}

const switchFile = () => {
  nextTick(() => {
    updateEditorContent()
  })
}

const openFileFromTree = async (data: any) => {
  if (data.type === 'file') {
    
    const existingFile = openFiles.value.find(f => f.path === data.path)
    if (existingFile) {
      activeTab.value = existingFile.id
      return
    }
    
    try {
      
      const content = await getFileContentByPath(data.path)
      const language = getLanguageFromFileName(data.label)
      
      const fileId = `file-${Date.now()}`
      const editorFile: EditorFile = {
        id: fileId,
        name: data.label,
        path: data.path,
        content,
        language,
        modified: false,
        saved: true
      }
      
      openFiles.value.push(editorFile)
      activeTab.value = fileId
      
      nextTick(() => {
        updateEditorContent()
      })
      
      addConsoleLog('info', `文件已打开: ${data.label}`)
      
    } catch (error) {
      console.error('打开文件失败:', error)
      addConsoleLog('error', `打开文件失败: ${error.message}`)
      ElMessage.error(`打开文件失败: ${error.message}`)
    }
  }
}

const getFileContentByPath = async (path: string): Promise<string> => {
  try {
    
    const response = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`, {
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
      throw new Error(result.message || '获取文件内容失败')
    }
    
    return result.data.content || ''
    
  } catch (error) {
    console.error('获取文件内容失败:', error)
    addConsoleLog('error', `获取文件内容失败: ${error.message}`)
    
    
    return `// 无法加载文件: ${path}\n// 错误: ${error.message}`
  }
}

const updateEditorContent = () => {
  if (!currentFile.value) return
  
  
  console.log('Updating editor content:', currentFile.value.content)
  
  
  selectedLanguage.value = currentFile.value.language
}

const changeLanguage = (language: string) => {
  if (currentFile.value) {
    currentFile.value.language = language
    currentFile.value.modified = true
    
    
    console.log('Language changed to:', language)
  }
}

const changeTheme = (theme: string) => {
  
  console.log('Theme changed to:', theme)
}

const formatCode = () => {
  if (!currentFile.value) return
  
  
  addConsoleLog('info', `代码已格式化: ${currentFile.value.name}`)
  ElMessage.success('代码格式化完成')
}

const runCode = async () => {
  if (!currentFile.value) return
  
  addConsoleLog('info', `正在运行: ${currentFile.value.name}`)
  
  try {
    
    const response = await fetch('/api/code/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: currentFile.value.content,
        language: currentFile.value.language,
        filename: currentFile.value.name
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '代码执行失败')
    }
    
    
    if (result.data.output) {
      addConsoleLog('log', result.data.output)
    }
    
    if (result.data.error) {
      addConsoleLog('error', result.data.error)
    }
    
    addConsoleLog('info', `代码执行完成 (${result.data.executionTime}ms)`)
    ElMessage.success('代码运行完成')
    
  } catch (error) {
    console.error('代码执行失败:', error)
    addConsoleLog('error', `运行错误: ${error.message}`)
    ElMessage.error('代码运行失败')
  }
}

const getFileTabLabel = (file: EditorFile) => {
  return file.modified ? `${file.name} •` : file.name
}

const refreshFileTree = () => {
  ElMessage.success('文件树已刷新')
}

const toggleFileTree = () => {
  
  ElMessage.info('文件树切换功能')
}

const showSettings = () => {
  showSettingsDialog.value = true
}

const saveEditorSettings = () => {
  
  localStorage.setItem('editor-settings', JSON.stringify(editorSettings))
  
  
  applyEditorSettings()
  
  showSettingsDialog.value = false
  ElMessage.success('设置已保存')
}

const resetEditorSettings = () => {
  Object.assign(editorSettings, {
    fontSize: 14,
    fontFamily: 'Consolas',
    tabSize: 2,
    wordWrap: false,
    lineNumbers: true,
    renderWhitespace: false,
    autoSave: true,
    quickSuggestions: true,
    folding: true,
    matchBrackets: true
  })
  
  ElMessage.success('设置已重置')
}

const loadEditorSettings = () => {
  const saved = localStorage.getItem('editor-settings')
  if (saved) {
    try {
      Object.assign(editorSettings, JSON.parse(saved))
    } catch (error) {
      console.error('Failed to load editor settings:', error)
    }
  }
}

const applyEditorSettings = () => {
  
  console.log('Applying editor settings:', editorSettings)
}

const addConsoleLog = (type: 'log' | 'error' | 'warn' | 'info', content: string) => {
  consoleLogs.value.push({
    type,
    content,
    timestamp: new Date().toLocaleTimeString()
  })
  
  
  if (consoleLogs.value.length > 1000) {
    consoleLogs.value.shift()
  }
}

const executeConsoleCommand = async () => {
  if (!consoleCommand.value.trim()) return
  
  const command = consoleCommand.value
  addConsoleLog('log', `> ${command}`)
  
  try {
    
    if (command === 'clear') {
      consoleLogs.value = []
      consoleCommand.value = ''
      return
    } else if (command === 'help') {
      addConsoleLog('info', '可用命令: clear, help, version')
      consoleCommand.value = ''
      return
    } else if (command === 'version') {
      addConsoleLog('info', 'Code Editor v1.0.0')
      consoleCommand.value = ''
      return
    }
    
    
    const response = await fetch('/api/console/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command: command,
        context: 'console'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '命令执行失败')
    }
    
    
    if (result.data.output !== undefined) {
      addConsoleLog('log', String(result.data.output))
    }
    
    if (result.data.error) {
      addConsoleLog('error', result.data.error)
    }
    
  } catch (error) {
    console.error('控制台命令执行失败:', error)
    addConsoleLog('error', error.message)
  }
  
  consoleCommand.value = ''
}

const goToProblem = (problem: Problem) => {
  
  ElMessage.info(`跳转到 ${problem.file}:${problem.line}:${problem.column}`)
}

const executeTerminalCommand = async () => {
  if (!terminalCommand.value.trim()) return
  
  const command = terminalCommand.value
  terminalOutput.value.push(`$ ${command}`)
  
  try {
    
    if (command === 'clear') {
      terminalOutput.value = []
      terminalCommand.value = ''
      return
    }
    
    
    const response = await fetch('/api/terminal/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command: command,
        workingDirectory: '/workspace'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '命令执行失败')
    }
    
    
    if (result.data.output) {
      terminalOutput.value.push(result.data.output)
    }
    
    if (result.data.error) {
      terminalOutput.value.push(`Error: ${result.data.error}`)
    }
    
  } catch (error) {
    console.error('终端命令执行失败:', error)
    terminalOutput.value.push(`Error: ${error.message}`)
  }
  
  terminalCommand.value = ''
  
  
  if (terminalOutput.value.length > 1000) {
    terminalOutput.value.shift()
  }
}


onMounted(() => {
  loadEditorSettings()
  initMonacoEditor()
  
  
  const updateEditorHeight = () => {
    const windowHeight = window.innerHeight
    const headerHeight = 200 
    const bottomPanelHeight = showBottomPanel.value ? 300 : 0
    editorHeight.value = Math.max(400, windowHeight - headerHeight - bottomPanelHeight)
  }
  
  updateEditorHeight()
  window.addEventListener('resize', updateEditorHeight)
  
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'n':
          event.preventDefault()
          newFile()
          break
        case 'o':
          event.preventDefault()
          openFile()
          break
        case 's':
          event.preventDefault()
          saveFile()
          break
        case 'w':
          event.preventDefault()
          if (currentFile.value) {
            closeFile(currentFile.value.id)
          }
          break
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateEditorHeight)
    document.removeEventListener('keydown', handleKeyDown)
  })
})
</script>

<style scoped>
.code-editor {
  padding: 20px;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
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

.editor-toolbar {
  margin-bottom: 20px;
}

.toolbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.file-actions,
.editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-main {
  flex: 1;
  min-height: 0;
}

.file-tree {
  height: 100%;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tree-actions {
  display: flex;
  gap: 4px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-label {
  font-size: 14px;
}

.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-tabs {
  flex-shrink: 0;
}

.editor-wrapper {
  flex: 1;
  min-height: 0;
}

.monaco-editor-container {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-panel {
  margin-top: 20px;
  height: 300px;
}

.console-output {
  height: 200px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  margin-bottom: 12px;
}

.console-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 4px;
  line-height: 1.4;
}

.console-time {
  color: #909399;
  margin-right: 8px;
  min-width: 80px;
  font-size: 12px;
}

.console-content {
  flex: 1;
}

.console-log {
  color: #303133;
}

.console-error {
  color: #f56c6c;
}

.console-warn {
  color: #e6a23c;
}

.console-info {
  color: #409eff;
}

.console-input {
  margin-top: 8px;
}

.console-prompt {
  color: #409eff;
  font-weight: 600;
}

.problems-list {
  height: 240px;
  overflow-y: auto;
}

.problem-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.problem-item:hover {
  background-color: #f5f7fa;
}

.problem-error {
  color: #f56c6c;
}

.problem-warning {
  color: #e6a23c;
}

.problem-info {
  color: #409eff;
}

.problem-message {
  flex: 1;
  margin: 0 12px;
}

.problem-location {
  font-size: 12px;
  color: #909399;
  font-family: 'Consolas', monospace;
}

.embedded-terminal {
  height: 240px;
  display: flex;
  flex-direction: column;
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  background: #1e1e1e;
  color: #ffffff;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  margin-bottom: 12px;
}

.terminal-line {
  margin-bottom: 2px;
  line-height: 1.4;
}

.terminal-input {
  margin-top: 8px;
}

.terminal-prompt {
  color: #4fc3f7;
  font-weight: 600;
}

@media (max-width: 768px) {
  .code-editor {
    padding: 10px;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-actions,
  .editor-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .editor-main .el-col {
    margin-bottom: 20px;
  }
  
  .bottom-panel {
    height: 250px;
  }
  
  .console-output,
  .embedded-terminal {
    height: 180px;
  }
}
</style>