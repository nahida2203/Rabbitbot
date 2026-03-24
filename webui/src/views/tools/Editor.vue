<template>
  <div class="code-editor">
    
    <div class="page-header">
      <div class="header-left">
        <h2>代码编辑器</h2>
        <p>在线代码编辑器，支持多种编程语言</p>
      </div>
      <div class="header-right">
        <el-button @click="newFile">
          <el-icon><DocumentAdd /></el-icon>
          新建文件
        </el-button>
        <el-button @click="openFile">
          <el-icon><FolderOpened /></el-icon>
          打开文件
        </el-button>
        <el-button @click="saveFile" :disabled="!currentFile">
          <el-icon><Document /></el-icon>
          保存
        </el-button>
        <el-button @click="showSettings">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
      </div>
    </div>

    <div class="editor-container">
      
      <div class="sidebar" v-show="sidebarVisible">
        
        <div class="file-explorer">
          <div class="explorer-header">
            <h4>文件浏览器</h4>
            <div class="explorer-actions">
              <el-button size="small" text @click="refreshFiles">
                <el-icon><Refresh /></el-icon>
              </el-button>
              <el-button size="small" text @click="toggleSidebar">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
          
          <el-tree
            :data="fileTree"
            :props="treeProps"
            node-key="path"
            :expand-on-click-node="false"
            @node-click="handleNodeClick"
            class="file-tree"
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
                <span class="node-label">{{ data.name }}</span>
              </div>
            </template>
          </el-tree>
        </div>

        
        <div class="open-files">
          <div class="files-header">
            <h4>打开的文件</h4>
          </div>
          
          <div class="files-list">
            <div
              v-for="file in openFiles"
              :key="file.path"
              class="file-item"
              :class="{ active: currentFile?.path === file.path }"
              @click="switchFile(file)"
            >
              <el-icon class="file-icon">
                <Document />
              </el-icon>
              <span class="file-name">{{ file.name }}</span>
              <span v-if="file.modified" class="modified-indicator">●</span>
              <el-button
                size="small"
                text
                @click.stop="closeFile(file)"
                class="close-btn"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      
      <div class="main-editor">
        
        <div class="editor-tabs" v-if="openFiles.length > 0">
          <div
            v-for="file in openFiles"
            :key="file.path"
            class="tab-item"
            :class="{ active: currentFile?.path === file.path }"
            @click="switchFile(file)"
          >
            <span class="tab-name">{{ file.name }}</span>
            <span v-if="file.modified" class="modified-dot">●</span>
            <el-button
              size="small"
              text
              @click.stop="closeFile(file)"
              class="tab-close"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>

        
        <div class="editor-wrapper" v-if="currentFile">
          <div class="editor-toolbar">
            <div class="toolbar-left">
              <el-select
                v-model="currentFile.language"
                size="small"
                style="width: 120px"
                @change="changeLanguage"
              >
                <el-option
                  v-for="lang in supportedLanguages"
                  :key="lang.value"
                  :label="lang.label"
                  :value="lang.value"
                />
              </el-select>
              
              <el-button size="small" @click="formatCode">
                <el-icon><Magic /></el-icon>
                格式化
              </el-button>
              
              <el-button size="small" @click="findReplace">
                <el-icon><Search /></el-icon>
                查找替换
              </el-button>
            </div>
            
            <div class="toolbar-right">
              <span class="cursor-position">
                行 {{ cursorPosition.line }}, 列 {{ cursorPosition.column }}
              </span>
              <span class="file-encoding">UTF-8</span>
              <el-button size="small" text @click="toggleSidebar">
                <el-icon><Menu /></el-icon>
              </el-button>
            </div>
          </div>
          
          <div
            ref="editorContainer"
            class="monaco-editor-container"
            :style="{
              fontSize: editorSettings.fontSize + 'px',
              fontFamily: editorSettings.fontFamily
            }"
          ></div>
        </div>

        
        <div class="empty-state" v-else>
          <div class="empty-content">
            <el-icon size="64" color="#c0c4cc">
              <Document />
            </el-icon>
            <h3>没有打开的文件</h3>
            <p>创建新文件或打开现有文件开始编辑</p>
            <div class="empty-actions">
              <el-button type="primary" @click="newFile">
                <el-icon><DocumentAdd /></el-icon>
                新建文件
              </el-button>
              <el-button @click="openFile">
                <el-icon><FolderOpened /></el-icon>
                打开文件
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    
    <el-dialog v-model="settingsVisible" title="编辑器设置" width="50%">
      <el-form :model="editorSettings" label-width="120px">
        <el-form-item label="字体大小">
          <el-slider
            v-model="editorSettings.fontSize"
            :min="10"
            :max="24"
            show-input
            @change="updateEditorSettings"
          />
        </el-form-item>
        
        <el-form-item label="字体">
          <el-select v-model="editorSettings.fontFamily" @change="updateEditorSettings">
            <el-option label="Consolas" value="Consolas, monospace" />
            <el-option label="Monaco" value="Monaco, monospace" />
            <el-option label="Fira Code" value="'Fira Code', monospace" />
            <el-option label="Source Code Pro" value="'Source Code Pro', monospace" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="主题">
          <el-select v-model="editorSettings.theme" @change="updateEditorSettings">
            <el-option label="VS Code Dark" value="vs-dark" />
            <el-option label="VS Code Light" value="vs" />
            <el-option label="High Contrast Dark" value="hc-black" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="自动换行">
          <el-switch v-model="editorSettings.wordWrap" @change="updateEditorSettings" />
        </el-form-item>
        
        <el-form-item label="显示行号">
          <el-switch v-model="editorSettings.lineNumbers" @change="updateEditorSettings" />
        </el-form-item>
        
        <el-form-item label="显示空白字符">
          <el-switch v-model="editorSettings.renderWhitespace" @change="updateEditorSettings" />
        </el-form-item>
        
        <el-form-item label="自动保存">
          <el-switch v-model="editorSettings.autoSave" />
        </el-form-item>
        
        <el-form-item label="Tab大小">
          <el-input-number
            v-model="editorSettings.tabSize"
            :min="2"
            :max="8"
            @change="updateEditorSettings"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resetSettings">重置</el-button>
          <el-button @click="settingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="findReplaceVisible" title="查找和替换" width="40%">
      <el-form :model="findReplaceForm" label-width="80px">
        <el-form-item label="查找">
          <el-input
            v-model="findReplaceForm.find"
            placeholder="输入要查找的内容"
            @keyup.enter="findNext"
          />
        </el-form-item>
        
        <el-form-item label="替换">
          <el-input
            v-model="findReplaceForm.replace"
            placeholder="输入替换内容"
          />
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="findReplaceForm.caseSensitive">区分大小写</el-checkbox>
          <el-checkbox v-model="findReplaceForm.wholeWord">全词匹配</el-checkbox>
          <el-checkbox v-model="findReplaceForm.regex">正则表达式</el-checkbox>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="findNext">查找下一个</el-button>
          <el-button @click="findPrevious">查找上一个</el-button>
          <el-button @click="replaceNext">替换</el-button>
          <el-button @click="replaceAll">全部替换</el-button>
          <el-button @click="findReplaceVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    
    <input
      ref="fileInput"
      type="file"
      multiple
      accept=".js,.ts,.vue,.html,.css,.scss,.less,.json,.md,.txt,.py,.java,.cpp,.c,.h,.php,.go,.rs,.rb,.swift,.kt,.dart,.sql,.xml,.yaml,.yml"
      style="display: none"
      @change="handleFileUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DocumentAdd,
  FolderOpened,
  Document,
  Setting,
  Refresh,
  Close,
  Folder,
  Magic,
  Search,
  Menu
} from '@element-plus/icons-vue'

// 模拟 Monaco Editor（实际项目中需要安装 monaco-editor）
interface MonacoEditor {
  getValue(): string
  setValue(value: string): void
  getPosition(): { lineNumber: number; column: number }
  focus(): void
  dispose(): void
  updateOptions(options: any): void
}

interface EditorFile {
  path: string
  name: string
  content: string
  language: string
  modified: boolean
  original: string
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
}

const editorContainer = ref()
const fileInput = ref()
const settingsVisible = ref(false)
const findReplaceVisible = ref(false)
const sidebarVisible = ref(true)

const currentFile = ref<EditorFile | null>(null)
const openFiles = ref<EditorFile[]>([])
const monacoEditor = ref<MonacoEditor | null>(null)

const cursorPosition = reactive({
  line: 1,
  column: 1
})

const editorSettings = reactive({
  fontSize: 14,
  fontFamily: 'Consolas, monospace',
  theme: 'vs-dark',
  wordWrap: true,
  lineNumbers: true,
  renderWhitespace: false,
  autoSave: false,
  tabSize: 2
})

const findReplaceForm = reactive({
  find: '',
  replace: '',
  caseSensitive: false,
  wholeWord: false,
  regex: false
})

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
  { label: 'C', value: 'c' },
  { label: 'PHP', value: 'php' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Dart', value: 'dart' },
  { label: 'SQL', value: 'sql' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Plain Text', value: 'plaintext' }
]

const fileTree = ref<FileTreeNode[]>([
  {
    name: 'src',
    path: '/src',
    type: 'folder',
    children: [
      {
        name: 'components',
        path: '/src/components',
        type: 'folder',
        children: [
          { name: 'Header.vue', path: '/src/components/Header.vue', type: 'file' },
          { name: 'Footer.vue', path: '/src/components/Footer.vue', type: 'file' }
        ]
      },
      {
        name: 'views',
        path: '/src/views',
        type: 'folder',
        children: [
          { name: 'Home.vue', path: '/src/views/Home.vue', type: 'file' },
          { name: 'About.vue', path: '/src/views/About.vue', type: 'file' }
        ]
      },
      { name: 'main.ts', path: '/src/main.ts', type: 'file' },
      { name: 'App.vue', path: '/src/App.vue', type: 'file' }
    ]
  },
  {
    name: 'public',
    path: '/public',
    type: 'folder',
    children: [
      { name: 'index.html', path: '/public/index.html', type: 'file' },
      { name: 'favicon.ico', path: '/public/favicon.ico', type: 'file' }
    ]
  },
  { name: 'package.json', path: '/package.json', type: 'file' },
  { name: 'README.md', path: '/README.md', type: 'file' }
])

const treeProps = {
  children: 'children',
  label: 'name'
}

// 获取文件语言
const getFileLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    vue: 'vue',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    md: 'markdown',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    php: 'php',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    dart: 'dart',
    sql: 'sql',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml'
  }
  return langMap[ext || ''] || 'plaintext'
}

// 创建模拟的 Monaco Editor
const createMockEditor = (): MonacoEditor => {
  let content = ''
  let position = { lineNumber: 1, column: 1 }
  
  return {
    getValue: () => content,
    setValue: (value: string) => {
      content = value
      updateCursorPosition()
    },
    getPosition: () => position,
    focus: () => {
      // 模拟聚焦
    },
    dispose: () => {
      // 模拟销毁
    },
    updateOptions: (options: any) => {
      // 模拟更新选项
    }
  }
}

// 初始化编辑器
const initEditor = () => {
  if (!editorContainer.value) return
  
  // 在实际项目中，这里应该初始化真正的 Monaco Editor
  monacoEditor.value = createMockEditor()
  
  // 创建一个简单的文本区域作为演示
  const textarea = document.createElement('textarea')
  textarea.style.width = '100%'
  textarea.style.height = '100%'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.resize = 'none'
  textarea.style.fontFamily = editorSettings.fontFamily
  textarea.style.fontSize = editorSettings.fontSize + 'px'
  textarea.style.backgroundColor = editorSettings.theme === 'vs-dark' ? '#1e1e1e' : '#ffffff'
  textarea.style.color = editorSettings.theme === 'vs-dark' ? '#d4d4d4' : '#000000'
  textarea.style.padding = '10px'
  
  textarea.addEventListener('input', (e) => {
    if (currentFile.value) {
      currentFile.value.content = (e.target as HTMLTextAreaElement).value
      currentFile.value.modified = currentFile.value.content !== currentFile.value.original
      updateCursorPosition()
    }
  })
  
  textarea.addEventListener('keyup', updateCursorPosition)
  textarea.addEventListener('click', updateCursorPosition)
  
  editorContainer.value.innerHTML = ''
  editorContainer.value.appendChild(textarea)
  
  // 保存 textarea 引用以便后续操作
  ;(monacoEditor.value as any).textarea = textarea
}

// 更新光标位置
const updateCursorPosition = () => {
  const textarea = (monacoEditor.value as any)?.textarea
  if (textarea) {
    const text = textarea.value
    const cursorPos = textarea.selectionStart
    const lines = text.substring(0, cursorPos).split('\n')
    cursorPosition.line = lines.length
    cursorPosition.column = lines[lines.length - 1].length + 1
  }
}

// 新建文件
const newFile = () => {
  const fileName = `untitled-${openFiles.value.length + 1}.txt`
  const newFile: EditorFile = {
    path: `/${fileName}`,
    name: fileName,
    content: '',
    language: 'plaintext',
    modified: false,
    original: ''
  }
  
  openFiles.value.push(newFile)
  switchFile(newFile)
  
  ElMessage.success('新文件已创建')
}

// 打开文件
const openFile = () => {
  fileInput.value?.click()
}

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files) return
  
  Array.from(files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const editorFile: EditorFile = {
        path: `/${file.name}`,
        name: file.name,
        content,
        language: getFileLanguage(file.name),
        modified: false,
        original: content
      }
      
      // 检查文件是否已经打开
      const existingFile = openFiles.value.find(f => f.path === editorFile.path)
      if (existingFile) {
        switchFile(existingFile)
      } else {
        openFiles.value.push(editorFile)
        switchFile(editorFile)
      }
    }
    reader.readAsText(file)
  })
  
  // 清空文件输入
  ;(event.target as HTMLInputElement).value = ''
}

// 保存文件
const saveFile = () => {
  if (!currentFile.value) return
  
  // 模拟保存文件
  currentFile.value.original = currentFile.value.content
  currentFile.value.modified = false
  
  // 实际项目中这里应该调用 API 保存文件
  const blob = new Blob([currentFile.value.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = currentFile.value.name
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('文件已保存')
}

// 切换文件
const switchFile = (file: EditorFile) => {
  currentFile.value = file
  
  nextTick(() => {
    const textarea = (monacoEditor.value as any)?.textarea
    if (textarea) {
      textarea.value = file.content
      updateCursorPosition()
    }
  })
}

// 关闭文件
const closeFile = async (file: EditorFile) => {
  if (file.modified) {
    try {
      await ElMessageBox.confirm(
        '文件已修改，是否保存？',
        '确认关闭',
        {
          confirmButtonText: '保存',
          cancelButtonText: '不保存',
          distinguishCancelAndClose: true,
          type: 'warning'
        }
      )
      
      // 保存文件
      const originalFile = currentFile.value
      currentFile.value = file
      saveFile()
      currentFile.value = originalFile
    } catch (action) {
      if (action === 'close') {
        return // 用户取消关闭
      }
      // 用户选择不保存，继续关闭
    }
  }
  
  const index = openFiles.value.findIndex(f => f.path === file.path)
  if (index > -1) {
    openFiles.value.splice(index, 1)
    
    // 如果关闭的是当前文件，切换到其他文件
    if (currentFile.value?.path === file.path) {
      if (openFiles.value.length > 0) {
        const newIndex = Math.max(0, index - 1)
        switchFile(openFiles.value[newIndex])
      } else {
        currentFile.value = null
      }
    }
  }
}

// 处理文件树节点点击
const handleNodeClick = (data: FileTreeNode) => {
  if (data.type === 'file') {
    // 检查文件是否已经打开
    const existingFile = openFiles.value.find(f => f.path === data.path)
    if (existingFile) {
      switchFile(existingFile)
    } else {
      // 模拟加载文件内容
      const content = `// ${data.name}\n// 这是一个示例文件\n\nconsole.log('Hello, World!');`
      const editorFile: EditorFile = {
        path: data.path,
        name: data.name,
        content,
        language: getFileLanguage(data.name),
        modified: false,
        original: content
      }
      
      openFiles.value.push(editorFile)
      switchFile(editorFile)
    }
  }
}

// 刷新文件
const refreshFiles = () => {
  ElMessage.success('文件列表已刷新')
}

// 切换侧边栏
const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

// 更改语言
const changeLanguage = () => {
  if (currentFile.value) {
    ElMessage.success(`语言已切换为 ${currentFile.value.language}`)
  }
}

// 格式化代码
const formatCode = () => {
  if (currentFile.value) {
    // 简单的格式化示例（实际项目中应该使用专业的格式化工具）
    let formatted = currentFile.value.content
    
    // 简单的 JSON 格式化
    if (currentFile.value.language === 'json') {
      try {
        const parsed = JSON.parse(formatted)
        formatted = JSON.stringify(parsed, null, 2)
      } catch (e) {
        ElMessage.error('JSON 格式错误，无法格式化')
        return
      }
    }
    
    currentFile.value.content = formatted
    currentFile.value.modified = formatted !== currentFile.value.original
    
    const textarea = (monacoEditor.value as any)?.textarea
    if (textarea) {
      textarea.value = formatted
    }
    
    ElMessage.success('代码已格式化')
  }
}

// 查找替换
const findReplace = () => {
  findReplaceVisible.value = true
}

// 查找下一个
const findNext = () => {
  if (!findReplaceForm.find) {
    ElMessage.warning('请输入要查找的内容')
    return
  }
  
  ElMessage.info('查找功能需要集成到编辑器中')
}

// 查找上一个
const findPrevious = () => {
  if (!findReplaceForm.find) {
    ElMessage.warning('请输入要查找的内容')
    return
  }
  
  ElMessage.info('查找功能需要集成到编辑器中')
}

// 替换下一个
const replaceNext = () => {
  if (!findReplaceForm.find) {
    ElMessage.warning('请输入要查找的内容')
    return
  }
  
  ElMessage.info('替换功能需要集成到编辑器中')
}

// 全部替换
const replaceAll = () => {
  if (!findReplaceForm.find) {
    ElMessage.warning('请输入要查找的内容')
    return
  }
  
  if (currentFile.value) {
    const count = (currentFile.value.content.match(new RegExp(findReplaceForm.find, 'g')) || []).length
    currentFile.value.content = currentFile.value.content.replace(
      new RegExp(findReplaceForm.find, 'g'),
      findReplaceForm.replace
    )
    currentFile.value.modified = currentFile.value.content !== currentFile.value.original
    
    const textarea = (monacoEditor.value as any)?.textarea
    if (textarea) {
      textarea.value = currentFile.value.content
    }
    
    ElMessage.success(`已替换 ${count} 处`)
  }
}

// 显示设置
const showSettings = () => {
  settingsVisible.value = true
}

// 更新编辑器设置
const updateEditorSettings = () => {
  const textarea = (monacoEditor.value as any)?.textarea
  if (textarea) {
    textarea.style.fontFamily = editorSettings.fontFamily
    textarea.style.fontSize = editorSettings.fontSize + 'px'
    textarea.style.backgroundColor = editorSettings.theme === 'vs-dark' ? '#1e1e1e' : '#ffffff'
    textarea.style.color = editorSettings.theme === 'vs-dark' ? '#d4d4d4' : '#000000'
  }
}

// 保存设置
const saveSettings = () => {
  localStorage.setItem('editor-settings', JSON.stringify(editorSettings))
  settingsVisible.value = false
  ElMessage.success('设置已保存')
}

// 重置设置
const resetSettings = () => {
  Object.assign(editorSettings, {
    fontSize: 14,
    fontFamily: 'Consolas, monospace',
    theme: 'vs-dark',
    wordWrap: true,
    lineNumbers: true,
    renderWhitespace: false,
    autoSave: false,
    tabSize: 2
  })
  
  updateEditorSettings()
  ElMessage.success('设置已重置')
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
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
      case 'f':
        event.preventDefault()
        findReplace()
        break
      case 'w':
        event.preventDefault()
        if (currentFile.value) {
          closeFile(currentFile.value)
        }
        break
    }
  }
}

onMounted(() => {
  // 加载设置
  const savedSettings = localStorage.getItem('editor-settings')
  if (savedSettings) {
    Object.assign(editorSettings, JSON.parse(savedSettings))
  }
  
  // 初始化编辑器
  nextTick(() => {
    initEditor()
  })
  
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeydown)
  
  // 销毁编辑器
  if (monacoEditor.value) {
    monacoEditor.value.dispose()
  }
})
</script>

<style scoped>
.code-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
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

.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background-color: #ffffff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.file-explorer {
  flex: 1;
  border-bottom: 1px solid #e4e7ed;
}

.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.explorer-header h4 {
  margin: 0;
  color: #303133;
  font-size: 14px;
}

.explorer-actions {
  display: flex;
  gap: 5px;
}

.file-tree {
  padding: 10px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-label {
  font-size: 14px;
  color: #606266;
}

.open-files {
  height: 200px;
  overflow-y: auto;
}

.files-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.files-header h4 {
  margin: 0;
  color: #303133;
  font-size: 14px;
}

.files-list {
  padding: 5px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #f5f7fa;
}

.file-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.file-icon {
  font-size: 16px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modified-indicator {
  color: #e6a23c;
  font-weight: bold;
}

.close-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .close-btn {
  opacity: 1;
}

.main-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.editor-tabs {
  display: flex;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  cursor: pointer;
  border-right: 1px solid #e4e7ed;
  background-color: #f5f7fa;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.tab-item:hover {
  background-color: #ecf5ff;
}

.tab-item.active {
  background-color: #ffffff;
  border-bottom: 2px solid #409eff;
}

.tab-name {
  font-size: 14px;
  color: #606266;
}

.tab-item.active .tab-name {
  color: #409eff;
}

.modified-dot {
  color: #e6a23c;
  font-weight: bold;
}

.tab-close {
  opacity: 0;
  transition: opacity 0.2s;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 12px;
  color: #909399;
}

.cursor-position,
.file-encoding {
  font-family: 'Consolas', monospace;
}

.monaco-editor-container {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  color: #909399;
}

.empty-content h3 {
  margin: 20px 0 10px 0;
  color: #606266;
}

.empty-content p {
  margin: 0 0 30px 0;
}

.empty-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.dialog-footer {
  text-align: right;
}

@media (max-width: 768px) {
  .editor-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: 300px;
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
  
  .editor-tabs {
    flex-wrap: wrap;
  }
  
  .toolbar-right {
    display: none;
  }
}
</style>