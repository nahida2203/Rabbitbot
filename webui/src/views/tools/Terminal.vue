<template>
  <div class="terminal-tool">
    
    <div class="page-header">
      <div class="header-left">
        <h2>在线终端</h2>
        <p>Web终端工具，支持命令行操作</p>
      </div>
      <div class="header-right">
        <el-button @click="addTab">
          <el-icon><Plus /></el-icon>
          新建标签
        </el-button>
        <el-button @click="showSettings">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
      </div>
    </div>

    
    <el-tabs
      v-model="activeTab"
      type="card"
      closable
      @tab-remove="removeTab"
      @tab-click="switchTab"
      class="terminal-tabs"
    >
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.id"
        :label="tab.name"
        :name="tab.id"
      >
        <div class="terminal-container">
          
          <div class="terminal-toolbar">
            <div class="toolbar-left">
              <el-button size="small" @click="clearTerminal(tab)">
                <el-icon><Delete /></el-icon>
                清屏
              </el-button>
              <el-button size="small" @click="copyOutput(tab)">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
              <el-button size="small" @click="saveOutput(tab)">
                <el-icon><Download /></el-icon>
                保存
              </el-button>
            </div>
            <div class="toolbar-right">
              <span class="status-indicator" :class="{ connected: tab.connected }">
                {{ tab.connected ? '已连接' : '未连接' }}
              </span>
              <el-button size="small" @click="toggleConnection(tab)">
                {{ tab.connected ? '断开' : '连接' }}
              </el-button>
            </div>
          </div>

          
          <div
            class="terminal-display"
            :style="{
              backgroundColor: terminalSettings.backgroundColor,
              color: terminalSettings.textColor,
              fontSize: terminalSettings.fontSize + 'px',
              fontFamily: terminalSettings.fontFamily
            }"
            @click="focusInput(tab)"
          >
            <div class="terminal-output" ref="terminalOutput">
              <div
                v-for="(line, index) in tab.output"
                :key="index"
                class="output-line"
                :class="line.type"
              >
                <span class="line-prefix">{{ line.prefix }}</span>
                <span class="line-content" v-html="line.content"></span>
              </div>
            </div>
            
            
            <div class="terminal-input-line">
              <span class="input-prefix">{{ tab.prompt }}</span>
              <input
                v-model="tab.currentInput"
                ref="terminalInput"
                class="terminal-input"
                @keydown="handleKeydown($event, tab)"
                @keyup="handleKeyup($event, tab)"
                :style="{
                  backgroundColor: 'transparent',
                  color: terminalSettings.textColor,
                  fontSize: terminalSettings.fontSize + 'px',
                  fontFamily: terminalSettings.fontFamily
                }"
              />
              <span
                v-if="terminalSettings.showCursor"
                class="cursor"
                :class="{ blink: terminalSettings.cursorBlink }"
              >█</span>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    
    <el-dialog v-model="settingsVisible" title="终端设置" width="50%">
      <el-form :model="terminalSettings" label-width="120px">
        <el-form-item label="字体大小">
          <el-slider
            v-model="terminalSettings.fontSize"
            :min="10"
            :max="24"
            show-input
          />
        </el-form-item>
        
        <el-form-item label="字体">
          <el-select v-model="terminalSettings.fontFamily">
            <el-option label="Consolas" value="Consolas, monospace" />
            <el-option label="Monaco" value="Monaco, monospace" />
            <el-option label="Courier New" value="'Courier New', monospace" />
            <el-option label="Ubuntu Mono" value="'Ubuntu Mono', monospace" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="背景色">
          <el-color-picker v-model="terminalSettings.backgroundColor" />
        </el-form-item>
        
        <el-form-item label="文字颜色">
          <el-color-picker v-model="terminalSettings.textColor" />
        </el-form-item>
        
        <el-form-item label="光标闪烁">
          <el-switch v-model="terminalSettings.cursorBlink" />
        </el-form-item>
        
        <el-form-item label="显示光标">
          <el-switch v-model="terminalSettings.showCursor" />
        </el-form-item>
        
        <el-form-item label="自动滚动">
          <el-switch v-model="terminalSettings.autoScroll" />
        </el-form-item>
        
        <el-form-item label="历史记录限制">
          <el-input-number
            v-model="terminalSettings.historyLimit"
            :min="100"
            :max="10000"
            :step="100"
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

    
    <el-dialog v-model="helpVisible" title="快捷键帮助" width="40%">
      <div class="help-content">
        <h4>常用快捷键</h4>
        <ul class="shortcut-list">
          <li><kbd>Ctrl + C</kbd> - 中断当前命令</li>
          <li><kbd>Ctrl + L</kbd> - 清屏</li>
          <li><kbd>Ctrl + A</kbd> - 光标移到行首</li>
          <li><kbd>Ctrl + E</kbd> - 光标移到行尾</li>
          <li><kbd>↑/↓</kbd> - 浏览命令历史</li>
          <li><kbd>Tab</kbd> - 自动补全</li>
          <li><kbd>Ctrl + T</kbd> - 新建标签页</li>
          <li><kbd>Ctrl + W</kbd> - 关闭当前标签页</li>
        </ul>
        
        <h4>内置命令</h4>
        <ul class="command-list">
          <li><code>help</code> - 显示帮助信息</li>
          <li><code>clear</code> - 清屏</li>
          <li><code>history</code> - 显示命令历史</li>
          <li><code>pwd</code> - 显示当前目录</li>
          <li><code>ls</code> - 列出文件</li>
          <li><code>cd [dir]</code> - 切换目录</li>
          <li><code>echo [text]</code> - 输出文本</li>
          <li><code>date</code> - 显示当前时间</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus,
  Setting,
  Delete,
  CopyDocument,
  Download
} from '@element-plus/icons-vue'

interface TerminalTab {
  id: string
  name: string
  connected: boolean
  output: Array<{
    type: 'input' | 'output' | 'error' | 'info'
    prefix: string
    content: string
    timestamp: number
  }>
  currentInput: string
  prompt: string
  history: string[]
  historyIndex: number
  currentDirectory: string
}

const activeTab = ref('1')
const settingsVisible = ref(false)
const helpVisible = ref(false)
const terminalOutput = ref()
const terminalInput = ref()

const tabs = ref<TerminalTab[]>([
  {
    id: '1',
    name: 'Terminal 1',
    connected: true,
    output: [
      {
        type: 'info',
        prefix: '',
        content: '欢迎使用 Yunzai Web Terminal v1.0.0',
        timestamp: Date.now()
      },
      {
        type: 'info',
        prefix: '',
        content: '输入 "help" 查看可用命令',
        timestamp: Date.now()
      }
    ],
    currentInput: '',
    prompt: 'yunzai@web:~$ ',
    history: [],
    historyIndex: -1,
    currentDirectory: '~'
  }
])

const terminalSettings = reactive({
  fontSize: 14,
  fontFamily: 'Consolas, monospace',
  backgroundColor: '#1e1e1e',
  textColor: '#ffffff',
  cursorBlink: true,
  showCursor: true,
  autoScroll: true,
  historyLimit: 1000
})

// 内置命令
const builtinCommands = {
  help: () => {
    return [
      '可用命令:',
      '  help     - 显示此帮助信息',
      '  clear    - 清屏',
      '  history  - 显示命令历史',
      '  pwd      - 显示当前目录',
      '  ls       - 列出文件和目录',
      '  cd [dir] - 切换目录',
      '  echo     - 输出文本',
      '  date     - 显示当前时间',
      '  whoami   - 显示当前用户',
      '  uname    - 显示系统信息'
    ]
  },
  
  clear: () => {
    const tab = getCurrentTab()
    if (tab) {
      tab.output = []
    }
    return []
  },
  
  history: () => {
    const tab = getCurrentTab()
    if (tab) {
      return tab.history.map((cmd, index) => `${index + 1}  ${cmd}`)
    }
    return []
  },
  
  pwd: () => {
    const tab = getCurrentTab()
    return [tab?.currentDirectory || '~']
  },
  
  ls: () => {
    return [
      'drwxr-xr-x  2 yunzai yunzai 4096 Dec  1 10:00 config',
      'drwxr-xr-x  2 yunzai yunzai 4096 Dec  1 10:00 plugins',
      'drwxr-xr-x  2 yunzai yunzai 4096 Dec  1 10:00 data',
      'drwxr-xr-x  2 yunzai yunzai 4096 Dec  1 10:00 logs',
      '-rw-r--r--  1 yunzai yunzai 1024 Dec  1 10:00 package.json',
      '-rw-r--r--  1 yunzai yunzai  512 Dec  1 10:00 README.md'
    ]
  },
  
  cd: (args: string[]) => {
    const tab = getCurrentTab()
    if (!tab) return ['错误: 无法获取当前标签页']
    
    const dir = args[0] || '~'
    if (dir === '~' || dir === '/home/yunzai') {
      tab.currentDirectory = '~'
      tab.prompt = 'yunzai@web:~$ '
    } else if (dir === '..') {
      if (tab.currentDirectory !== '~') {
        const parts = tab.currentDirectory.split('/')
        parts.pop()
        tab.currentDirectory = parts.join('/') || '~'
        tab.prompt = `yunzai@web:${tab.currentDirectory}$ `
      }
    } else {
      tab.currentDirectory = tab.currentDirectory === '~' ? `~/${dir}` : `${tab.currentDirectory}/${dir}`
      tab.prompt = `yunzai@web:${tab.currentDirectory}$ `
    }
    
    return []
  },
  
  echo: (args: string[]) => {
    return [args.join(' ')]
  },
  
  date: () => {
    return [new Date().toString()]
  },
  
  whoami: () => {
    return ['yunzai']
  },
  
  uname: () => {
    return ['Linux yunzai-web 5.4.0 #1 SMP Web Terminal x86_64 GNU/Linux']
  }
}

// 获取当前标签页
const getCurrentTab = () => {
  return tabs.value.find(tab => tab.id === activeTab.value)
}

// 添加标签页
const addTab = () => {
  const newId = (tabs.value.length + 1).toString()
  const newTab: TerminalTab = {
    id: newId,
    name: `Terminal ${newId}`,
    connected: true,
    output: [
      {
        type: 'info',
        prefix: '',
        content: '新终端会话已创建',
        timestamp: Date.now()
      }
    ],
    currentInput: '',
    prompt: 'yunzai@web:~$ ',
    history: [],
    historyIndex: -1,
    currentDirectory: '~'
  }
  
  tabs.value.push(newTab)
  activeTab.value = newId
  
  nextTick(() => {
    focusInput(newTab)
  })
}

// 移除标签页
const removeTab = (targetName: string) => {
  if (tabs.value.length === 1) {
    ElMessage.warning('至少需要保留一个标签页')
    return
  }
  
  const index = tabs.value.findIndex(tab => tab.id === targetName)
  if (index > -1) {
    tabs.value.splice(index, 1)
    
    // 如果删除的是当前标签页，切换到其他标签页
    if (activeTab.value === targetName) {
      activeTab.value = tabs.value[Math.max(0, index - 1)].id
    }
  }
}

// 切换标签页
const switchTab = () => {
  nextTick(() => {
    const tab = getCurrentTab()
    if (tab) {
      focusInput(tab)
    }
  })
}

// 聚焦输入框
const focusInput = (tab: TerminalTab) => {
  if (terminalInput.value) {
    const inputs = Array.isArray(terminalInput.value) ? terminalInput.value : [terminalInput.value]
    const input = inputs.find(el => el)
    if (input) {
      input.focus()
    }
  }
}

// 处理键盘按下事件
const handleKeydown = (event: KeyboardEvent, tab: TerminalTab) => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      executeCommand(tab)
      break
      
    case 'ArrowUp':
      event.preventDefault()
      navigateHistory(tab, 'up')
      break
      
    case 'ArrowDown':
      event.preventDefault()
      navigateHistory(tab, 'down')
      break
      
    case 'Tab':
      event.preventDefault()
      autoComplete(tab)
      break
      
    case 'l':
      if (event.ctrlKey) {
        event.preventDefault()
        clearTerminal(tab)
      }
      break
      
    case 'c':
      if (event.ctrlKey) {
        event.preventDefault()
        interruptCommand(tab)
      }
      break
      
    case 't':
      if (event.ctrlKey) {
        event.preventDefault()
        addTab()
      }
      break
      
    case 'w':
      if (event.ctrlKey) {
        event.preventDefault()
        removeTab(tab.id)
      }
      break
  }
}

// 处理键盘释放事件
const handleKeyup = (event: KeyboardEvent, tab: TerminalTab) => {
  // 可以在这里处理一些键盘释放后的逻辑
}

// 执行命令
const executeCommand = (tab: TerminalTab) => {
  const command = tab.currentInput.trim()
  if (!command) return
  
  // 添加到输出
  tab.output.push({
    type: 'input',
    prefix: tab.prompt,
    content: command,
    timestamp: Date.now()
  })
  
  // 添加到历史记录
  tab.history.push(command)
  if (tab.history.length > terminalSettings.historyLimit) {
    tab.history.shift()
  }
  tab.historyIndex = -1
  
  // 解析命令
  const parts = command.split(' ')
  const cmd = parts[0]
  const args = parts.slice(1)
  
  // 执行内置命令
  if (cmd in builtinCommands) {
    const result = (builtinCommands as any)[cmd](args)
    if (Array.isArray(result)) {
      result.forEach(line => {
        tab.output.push({
          type: 'output',
          prefix: '',
          content: line,
          timestamp: Date.now()
        })
      })
    }
  } else {
    // 模拟命令执行
    tab.output.push({
      type: 'error',
      prefix: '',
      content: `bash: ${cmd}: command not found`,
      timestamp: Date.now()
    })
  }
  
  // 清空输入
  tab.currentInput = ''
  
  // 自动滚动
  if (terminalSettings.autoScroll) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 浏览历史命令
const navigateHistory = (tab: TerminalTab, direction: 'up' | 'down') => {
  if (tab.history.length === 0) return
  
  if (direction === 'up') {
    if (tab.historyIndex === -1) {
      tab.historyIndex = tab.history.length - 1
    } else if (tab.historyIndex > 0) {
      tab.historyIndex--
    }
  } else {
    if (tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++
    } else {
      tab.historyIndex = -1
      tab.currentInput = ''
      return
    }
  }
  
  tab.currentInput = tab.history[tab.historyIndex]
}

// 自动补全
const autoComplete = (tab: TerminalTab) => {
  const input = tab.currentInput
  const commands = Object.keys(builtinCommands)
  const matches = commands.filter(cmd => cmd.startsWith(input))
  
  if (matches.length === 1) {
    tab.currentInput = matches[0]
  } else if (matches.length > 1) {
    tab.output.push({
      type: 'info',
      prefix: '',
      content: matches.join('  '),
      timestamp: Date.now()
    })
    
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 中断命令
const interruptCommand = (tab: TerminalTab) => {
  tab.output.push({
    type: 'info',
    prefix: '',
    content: '^C',
    timestamp: Date.now()
  })
  
  tab.currentInput = ''
}

// 清屏
const clearTerminal = (tab: TerminalTab) => {
  tab.output = []
}

// 复制输出
const copyOutput = (tab: TerminalTab) => {
  const text = tab.output.map(line => `${line.prefix}${line.content}`).join('\n')
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('输出已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 保存输出
const saveOutput = (tab: TerminalTab) => {
  const text = tab.output.map(line => `${line.prefix}${line.content}`).join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `terminal-${tab.name}-${new Date().toISOString().slice(0, 19)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('输出已保存')
}

// 切换连接状态
const toggleConnection = (tab: TerminalTab) => {
  tab.connected = !tab.connected
  
  tab.output.push({
    type: 'info',
    prefix: '',
    content: tab.connected ? '连接已建立' : '连接已断开',
    timestamp: Date.now()
  })
  
  ElMessage.success(tab.connected ? '已连接' : '已断开连接')
}

// 显示设置
const showSettings = () => {
  settingsVisible.value = true
}

// 保存设置
const saveSettings = () => {
  localStorage.setItem('terminal-settings', JSON.stringify(terminalSettings))
  settingsVisible.value = false
  ElMessage.success('设置已保存')
}

// 重置设置
const resetSettings = () => {
  Object.assign(terminalSettings, {
    fontSize: 14,
    fontFamily: 'Consolas, monospace',
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    cursorBlink: true,
    showCursor: true,
    autoScroll: true,
    historyLimit: 1000
  })
  
  ElMessage.success('设置已重置')
}

// 滚动到底部
const scrollToBottom = () => {
  if (terminalOutput.value) {
    const outputs = Array.isArray(terminalOutput.value) ? terminalOutput.value : [terminalOutput.value]
    outputs.forEach(output => {
      if (output) {
        output.scrollTop = output.scrollHeight
      }
    })
  }
}

// 全局键盘事件
const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'F1') {
    event.preventDefault()
    helpVisible.value = true
  }
}

onMounted(() => {
  // 加载设置
  const savedSettings = localStorage.getItem('terminal-settings')
  if (savedSettings) {
    Object.assign(terminalSettings, JSON.parse(savedSettings))
  }
  
  // 聚焦第一个终端
  nextTick(() => {
    const tab = getCurrentTab()
    if (tab) {
      focusInput(tab)
    }
  })
  
  // 添加全局键盘事件监听
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  // 移除全局键盘事件监听
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.terminal-tool {
  padding: 20px;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
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

.terminal-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.terminal-tabs :deep(.el-tabs__content) {
  flex: 1;
  padding: 0;
}

.terminal-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.terminal-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.terminal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.toolbar-left {
  display: flex;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  font-size: 12px;
  color: #f56c6c;
}

.status-indicator.connected {
  color: #67c23a;
}

.terminal-display {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  font-family: 'Consolas', monospace;
  line-height: 1.5;
  cursor: text;
}

.terminal-output {
  min-height: calc(100% - 30px);
}

.output-line {
  margin-bottom: 2px;
  word-wrap: break-word;
}

.output-line.input {
  color: #ffffff;
}

.output-line.output {
  color: #e6e6e6;
}

.output-line.error {
  color: #f56c6c;
}

.output-line.info {
  color: #409eff;
}

.line-prefix {
  user-select: none;
}

.line-content {
  white-space: pre-wrap;
}

.terminal-input-line {
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.input-prefix {
  user-select: none;
  margin-right: 5px;
}

.terminal-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.cursor {
  margin-left: 2px;
  opacity: 1;
}

.cursor.blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.help-content {
  max-height: 60vh;
  overflow-y: auto;
}

.help-content h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #303133;
}

.help-content h4:first-child {
  margin-top: 0;
}

.shortcut-list,
.command-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.shortcut-list li,
.command-list li {
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
}

.shortcut-list li:last-child,
.command-list li:last-child {
  border-bottom: none;
}

kbd {
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #606266;
}

code {
  background-color: #f5f7fa;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #e6a23c;
}

.dialog-footer {
  text-align: right;
}

@media (max-width: 768px) {
  .terminal-tool {
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
  
  .terminal-toolbar {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .terminal-display {
    padding: 10px;
    font-size: 12px;
  }
}
</style>