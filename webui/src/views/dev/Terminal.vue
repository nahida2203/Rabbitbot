<template>
  <div class="dev-terminal">
    
    <div class="page-header">
      <h2>终端</h2>
      <p>在线终端工具，支持多标签页和命令历史</p>
    </div>

    
    <el-card class="terminal-container">
      <template #header>
        <div class="terminal-header">
          <el-tabs 
            v-model="activeTab" 
            type="card" 
            closable 
            @tab-remove="removeTab"
            @tab-click="switchTab"
          >
            <el-tab-pane
              v-for="tab in terminalTabs"
              :key="tab.id"
              :label="tab.name"
              :name="tab.id"
            >
            </el-tab-pane>
          </el-tabs>
          
          <div class="terminal-actions">
            <el-button size="small" @click="addTab">
              <el-icon><Plus /></el-icon>
              新建终端
            </el-button>
            <el-button size="small" @click="clearTerminal">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
            <el-button size="small" @click="showSettings">
              <el-icon><Setting /></el-icon>
              设置
            </el-button>
          </div>
        </div>
      </template>
      
      
      <div class="terminal-content">
        <div 
          v-for="tab in terminalTabs" 
          :key="tab.id" 
          v-show="activeTab === tab.id"
          class="terminal-tab"
        >
          
          <div 
            ref="terminalOutput"
            class="terminal-output"
            :style="{
              backgroundColor: terminalSettings.backgroundColor,
              color: terminalSettings.textColor,
              fontSize: terminalSettings.fontSize + 'px',
              fontFamily: terminalSettings.fontFamily
            }"
          >
            <div 
              v-for="(line, index) in tab.history" 
              :key="index" 
              class="terminal-line"
              :class="{
                'command-line': line.type === 'command',
                'output-line': line.type === 'output',
                'error-line': line.type === 'error'
              }"
            >
              <span v-if="line.type === 'command'" class="prompt">{{ getPrompt() }}</span>
              <span class="line-content" v-html="formatLine(line.content)"></span>
            </div>
            
            
            <div class="terminal-line command-line current-line">
              <span class="prompt">{{ getPrompt() }}</span>
              <input 
                ref="commandInput"
                v-model="tab.currentCommand"
                class="command-input"
                :style="{
                  backgroundColor: 'transparent',
                  color: terminalSettings.textColor,
                  fontSize: terminalSettings.fontSize + 'px',
                  fontFamily: terminalSettings.fontFamily
                }"
                @keydown="handleKeyDown"
                @keyup="handleKeyUp"
                autocomplete="off"
                spellcheck="false"
              />
              <span class="cursor" :class="{ 'blink': cursorBlink }">█</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    
    <el-drawer v-model="showHistory" title="命令历史" size="400px">
      <div class="history-content">
        <div class="history-search">
          <el-input
            v-model="historySearch"
            placeholder="搜索命令历史"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <div class="history-list">
          <div 
            v-for="(cmd, index) in filteredHistory" 
            :key="index" 
            class="history-item"
            @click="useHistoryCommand(cmd)"
          >
            <div class="history-command">{{ cmd.command }}</div>
            <div class="history-time">{{ cmd.timestamp }}</div>
          </div>
        </div>
        
        <div class="history-actions">
          <el-button @click="clearHistory">清空历史</el-button>
          <el-button @click="exportHistory">导出历史</el-button>
        </div>
      </div>
    </el-drawer>

    
    <el-dialog v-model="showSettingsDialog" title="终端设置" width="500px">
      <el-form :model="terminalSettings" label-width="120px">
        <el-form-item label="字体大小">
          <el-slider 
            v-model="terminalSettings.fontSize" 
            :min="12" 
            :max="24" 
            :step="1"
            show-input
          />
        </el-form-item>
        
        <el-form-item label="字体">
          <el-select v-model="terminalSettings.fontFamily" style="width: 100%;">
            <el-option label="Consolas" value="Consolas, monospace" />
            <el-option label="Monaco" value="Monaco, monospace" />
            <el-option label="Courier New" value="'Courier New', monospace" />
            <el-option label="Source Code Pro" value="'Source Code Pro', monospace" />
            <el-option label="Fira Code" value="'Fira Code', monospace" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="主题">
          <el-select v-model="currentTheme" @change="applyTheme" style="width: 100%;">
            <el-option 
              v-for="theme in themes" 
              :key="theme.name" 
              :label="theme.name" 
              :value="theme.name"
            />
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
        
        <el-form-item label="自动滚动">
          <el-switch v-model="terminalSettings.autoScroll" />
        </el-form-item>
        
        <el-form-item label="历史记录数">
          <el-input-number 
            v-model="terminalSettings.historyLimit" 
            :min="100" 
            :max="10000" 
            :step="100"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSettingsDialog = false">取消</el-button>
          <el-button @click="resetSettings">重置</el-button>
          <el-button type="primary" @click="saveSettings">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-drawer v-model="showHelp" title="快捷键帮助" size="350px">
      <div class="help-content">
        <div class="help-section">
          <h4>基本操作</h4>
          <div class="help-item">
            <kbd>Ctrl + C</kbd>
            <span>中断当前命令</span>
          </div>
          <div class="help-item">
            <kbd>Ctrl + L</kbd>
            <span>清空终端</span>
          </div>
          <div class="help-item">
            <kbd>Ctrl + D</kbd>
            <span>退出终端</span>
          </div>
        </div>
        
        <div class="help-section">
          <h4>历史记录</h4>
          <div class="help-item">
            <kbd>↑</kbd>
            <span>上一条命令</span>
          </div>
          <div class="help-item">
            <kbd>↓</kbd>
            <span>下一条命令</span>
          </div>
          <div class="help-item">
            <kbd>Ctrl + R</kbd>
            <span>搜索历史</span>
          </div>
        </div>
        
        <div class="help-section">
          <h4>标签页</h4>
          <div class="help-item">
            <kbd>Ctrl + T</kbd>
            <span>新建标签页</span>
          </div>
          <div class="help-item">
            <kbd>Ctrl + W</kbd>
            <span>关闭标签页</span>
          </div>
          <div class="help-item">
            <kbd>Ctrl + Tab</kbd>
            <span>切换标签页</span>
          </div>
        </div>
      </div>
    </el-drawer>

    
    <div class="floating-actions">
      <el-button 
        type="primary" 
        circle 
        @click="showHistory = true"
        title="命令历史"
      >
        <el-icon><Clock /></el-icon>
      </el-button>
      
      <el-button 
        type="info" 
        circle 
        @click="showHelp = true"
        title="快捷键帮助"
      >
        <el-icon><QuestionFilled /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Plus, Delete, Setting, Search, Clock, QuestionFilled 
} from '@element-plus/icons-vue'

// 终端标签页数据
interface TerminalTab {
  id: string
  name: string
  history: Array<{
    type: 'command' | 'output' | 'error'
    content: string
    timestamp: string
  }>
  currentCommand: string
  historyIndex: number
}

// 终端标签页
const terminalTabs = ref<TerminalTab[]>([
  {
    id: 'terminal-1',
    name: '终端 1',
    history: [
      {
        type: 'output',
        content: 'Welcome to Yunzai WebUI Terminal',
        timestamp: new Date().toLocaleString()
      },
      {
        type: 'output',
        content: 'Type "help" for available commands',
        timestamp: new Date().toLocaleString()
      }
    ],
    currentCommand: '',
    historyIndex: -1
  }
])

const activeTab = ref('terminal-1')
const tabCounter = ref(1)

// 对话框状态
const showHistory = ref(false)
const showSettingsDialog = ref(false)
const showHelp = ref(false)

// 命令历史
const commandHistory = ref<Array<{
  command: string
  timestamp: string
  tab: string
}>>([])

const historySearch = ref('')

// 光标闪烁
const cursorBlink = ref(true)
let cursorTimer: NodeJS.Timeout | null = null

// 终端设置
const terminalSettings = reactive({
  fontSize: 14,
  fontFamily: 'Consolas, monospace',
  backgroundColor: '#1e1e1e',
  textColor: '#ffffff',
  cursorBlink: true,
  autoScroll: true,
  historyLimit: 1000
})

// 主题
const themes = [
  {
    name: '深色主题',
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff'
  },
  {
    name: '浅色主题',
    backgroundColor: '#ffffff',
    textColor: '#000000'
  },
  {
    name: 'Monokai',
    backgroundColor: '#272822',
    textColor: '#f8f8f2'
  },
  {
    name: 'Solarized Dark',
    backgroundColor: '#002b36',
    textColor: '#839496'
  },
  {
    name: 'Dracula',
    backgroundColor: '#282a36',
    textColor: '#f8f8f2'
  }
]

const currentTheme = ref('深色主题')

// 引用
const commandInput = ref<HTMLInputElement[]>([])
const terminalOutput = ref<HTMLElement[]>([])

// 计算属性
const currentTab = computed(() => {
  return terminalTabs.value.find(tab => tab.id === activeTab.value)
})

const filteredHistory = computed(() => {
  if (!historySearch.value) {
    return commandHistory.value.slice().reverse()
  }
  
  return commandHistory.value
    .filter(item => item.command.toLowerCase().includes(historySearch.value.toLowerCase()))
    .slice()
    .reverse()
})

// 内置命令
const builtinCommands = {
  help: () => {
    return [
      'Available commands:',
      '  help          - Show this help message',
      '  clear         - Clear the terminal',
      '  history       - Show command history',
      '  date          - Show current date and time',
      '  echo <text>   - Echo the text',
      '  pwd           - Show current directory',
      '  ls            - List directory contents',
      '  whoami        - Show current user',
      '  uname         - Show system information',
      '  ps            - Show running processes',
      '  top           - Show system resources',
      '  ping <host>   - Ping a host',
      '  curl <url>    - Make HTTP request',
      '  exit          - Exit terminal'
    ]
  },
  
  clear: () => {
    if (currentTab.value) {
      currentTab.value.history = []
    }
    return []
  },
  
  history: () => {
    return commandHistory.value.map((item, index) => 
      `${index + 1}  ${item.command}`
    )
  },
  
  date: () => {
    return [new Date().toString()]
  },
  
  echo: (args: string[]) => {
    return [args.join(' ')]
  },
  
  pwd: () => {
    return ['/home/yunzai']
  },
  
  ls: () => {
    return [
      'total 8',
      'drwxr-xr-x  2 yunzai yunzai 4096 Jan 15 14:30 plugins',
      'drwxr-xr-x  2 yunzai yunzai 4096 Jan 15 14:30 data',
      '-rw-r--r--  1 yunzai yunzai 1024 Jan 15 14:30 config.yaml',
      '-rw-r--r--  1 yunzai yunzai  512 Jan 15 14:30 package.json'
    ]
  },
  
  whoami: () => {
    return ['yunzai']
  },
  
  uname: () => {
    return ['Linux yunzai-server 5.15.0 #1 SMP x86_64 GNU/Linux']
  },
  
  ps: () => {
    return [
      'PID    PPID   CMD',
      '1      0      /sbin/init',
      '123    1      node app.js',
      '456    123    redis-server',
      '789    123    nginx'
    ]
  },
  
  top: () => {
    return [
      'Tasks: 4 total, 1 running, 3 sleeping',
      'CPU usage: 15.2%',
      'Memory usage: 45.8%',
      'Load average: 0.25, 0.18, 0.12'
    ]
  },
  
  ping: (args: string[]) => {
    const host = args[0] || 'localhost'
    return [
      `PING ${host} (127.0.0.1): 56 data bytes`,
      `64 bytes from 127.0.0.1: icmp_seq=0 time=0.123ms`,
      `64 bytes from 127.0.0.1: icmp_seq=1 time=0.089ms`,
      `64 bytes from 127.0.0.1: icmp_seq=2 time=0.095ms`
    ]
  },
  
  curl: (args: string[]) => {
    const url = args[0] || 'http:
    return [
      `Connecting to ${url}...`,
      'HTTP/1.1 200 OK',
      'Content-Type: application/json',
      'Content-Length: 42',
      '',
      '{"status": "ok", "message": "Hello World"}'
    ]
  },
  
  exit: () => {
    ElMessage.info('Terminal session ended')
    return ['Goodbye!']
  }
}


const getPrompt = () => {
  return 'yunzai@server:~$ '
}

const formatLine = (content: string) => {
  
  return content
    .replace(/(https?:\/\/[^\s]+)/g, '<span style="color: #4fc3f7;">$1</span>')
    .replace(/\b(\d+)\b/g, '<span style="color: #ffb74d;">$1</span>')
    .replace(/\b(true|false|null)\b/g, '<span style="color: #81c784;">$1</span>')
}

const addTab = () => {
  tabCounter.value++
  const newTab: TerminalTab = {
    id: `terminal-${tabCounter.value}`,
    name: `终端 ${tabCounter.value}`,
    history: [
      {
        type: 'output',
        content: `Terminal ${tabCounter.value} initialized`,
        timestamp: new Date().toLocaleString()
      }
    ],
    currentCommand: '',
    historyIndex: -1
  }
  
  terminalTabs.value.push(newTab)
  activeTab.value = newTab.id
  
  nextTick(() => {
    focusInput()
  })
}

const removeTab = (tabId: string) => {
  const index = terminalTabs.value.findIndex(tab => tab.id === tabId)
  if (index > -1) {
    terminalTabs.value.splice(index, 1)
    
    
    if (activeTab.value === tabId) {
      if (terminalTabs.value.length > 0) {
        activeTab.value = terminalTabs.value[Math.max(0, index - 1)].id
      }
    }
    
    
    if (terminalTabs.value.length === 0) {
      addTab()
    }
  }
}

const switchTab = () => {
  nextTick(() => {
    focusInput()
  })
}

const clearTerminal = () => {
  if (currentTab.value) {
    currentTab.value.history = []
  }
}

const focusInput = () => {
  const input = commandInput.value[0]
  if (input) {
    input.focus()
  }
}

const scrollToBottom = () => {
  if (terminalSettings.autoScroll) {
    nextTick(() => {
      const output = terminalOutput.value[0]
      if (output) {
        output.scrollTop = output.scrollHeight
      }
    })
  }
}

const executeCommand = async (command: string) => {
  if (!currentTab.value || !command.trim()) return
  
  const tab = currentTab.value
  const timestamp = new Date().toLocaleString()
  
  
  tab.history.push({
    type: 'command',
    content: command,
    timestamp
  })
  
  
  commandHistory.value.push({
    command,
    timestamp,
    tab: tab.id
  })
  
  
  if (commandHistory.value.length > terminalSettings.historyLimit) {
    commandHistory.value.shift()
  }
  
  
  const parts = command.trim().split(/\s+/)
  const cmd = parts[0]
  const args = parts.slice(1)
  
  try {
    let output: string[] = []
    
    
    if (builtinCommands[cmd]) {
      output = builtinCommands[cmd](args)
    } else {
      
      output = await simulateCommand(cmd, args)
    }
    
    
    output.forEach(line => {
      tab.history.push({
        type: 'output',
        content: line,
        timestamp: new Date().toLocaleString()
      })
    })
  } catch (error) {
    
    tab.history.push({
      type: 'error',
      content: `Error: ${error.message}`,
      timestamp: new Date().toLocaleString()
    })
  }
  
  
  tab.currentCommand = ''
  tab.historyIndex = -1
  
  scrollToBottom()
}

const simulateCommand = async (cmd: string, args: string[]): Promise<string[]> => {
  
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100))
  
  
  switch (cmd) {
    case 'npm':
      if (args[0] === 'install') {
        return [
          'npm WARN deprecated package@1.0.0',
          'added 42 packages in 3.2s'
        ]
      }
      break
      
    case 'git':
      if (args[0] === 'status') {
        return [
          'On branch main',
          'Your branch is up to date with \'origin/main\'.',
          'nothing to commit, working tree clean'
        ]
      }
      break
      
    case 'node':
      if (args[0] === '--version') {
        return ['v18.17.0']
      }
      break
      
    case 'python':
      if (args[0] === '--version') {
        return ['Python 3.9.7']
      }
      break
  }
  
  
  throw new Error(`Command not found: ${cmd}`)
}

const handleKeyDown = (event: KeyboardEvent) => {
  const tab = currentTab.value
  if (!tab) return
  
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      executeCommand(tab.currentCommand)
      break
      
    case 'ArrowUp':
      event.preventDefault()
      navigateHistory('up')
      break
      
    case 'ArrowDown':
      event.preventDefault()
      navigateHistory('down')
      break
      
    case 'Tab':
      event.preventDefault()
      
      autoComplete()
      break
      
    case 'c':
      if (event.ctrlKey) {
        event.preventDefault()
        tab.currentCommand = ''
        tab.history.push({
          type: 'output',
          content: '^C',
          timestamp: new Date().toLocaleString()
        })
      }
      break
      
    case 'l':
      if (event.ctrlKey) {
        event.preventDefault()
        clearTerminal()
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
        if (terminalTabs.value.length > 1) {
          removeTab(activeTab.value)
        }
      }
      break
  }
}

const handleKeyUp = (event: KeyboardEvent) => {
  
}

const navigateHistory = (direction: 'up' | 'down') => {
  const tab = currentTab.value
  if (!tab) return
  
  const tabHistory = commandHistory.value
    .filter(item => item.tab === tab.id)
    .map(item => item.command)
  
  if (tabHistory.length === 0) return
  
  if (direction === 'up') {
    if (tab.historyIndex < tabHistory.length - 1) {
      tab.historyIndex++
      tab.currentCommand = tabHistory[tabHistory.length - 1 - tab.historyIndex]
    }
  } else {
    if (tab.historyIndex > 0) {
      tab.historyIndex--
      tab.currentCommand = tabHistory[tabHistory.length - 1 - tab.historyIndex]
    } else if (tab.historyIndex === 0) {
      tab.historyIndex = -1
      tab.currentCommand = ''
    }
  }
}

const autoComplete = () => {
  const tab = currentTab.value
  if (!tab) return
  
  const command = tab.currentCommand
  const commands = Object.keys(builtinCommands)
  
  const matches = commands.filter(cmd => cmd.startsWith(command))
  
  if (matches.length === 1) {
    tab.currentCommand = matches[0]
  } else if (matches.length > 1) {
    tab.history.push({
      type: 'output',
      content: matches.join('  '),
      timestamp: new Date().toLocaleString()
    })
    scrollToBottom()
  }
}

const useHistoryCommand = (historyItem: any) => {
  const tab = currentTab.value
  if (tab) {
    tab.currentCommand = historyItem.command
    showHistory.value = false
    focusInput()
  }
}

const clearHistory = () => {
  commandHistory.value = []
  ElMessage.success('命令历史已清空')
}

const exportHistory = () => {
  const historyText = commandHistory.value
    .map(item => `[${item.timestamp}] ${item.command}`)
    .join('\n')
  
  const blob = new Blob([historyText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `terminal-history-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('命令历史导出成功')
}

const showSettings = () => {
  showSettingsDialog.value = true
}

const applyTheme = (themeName: string) => {
  const theme = themes.find(t => t.name === themeName)
  if (theme) {
    terminalSettings.backgroundColor = theme.backgroundColor
    terminalSettings.textColor = theme.textColor
  }
}

const resetSettings = () => {
  Object.assign(terminalSettings, {
    fontSize: 14,
    fontFamily: 'Consolas, monospace',
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    cursorBlink: true,
    autoScroll: true,
    historyLimit: 1000
  })
  currentTheme.value = '深色主题'
}

const saveSettings = () => {
  
  localStorage.setItem('terminal-settings', JSON.stringify(terminalSettings))
  showSettingsDialog.value = false
  ElMessage.success('设置已保存')
}

const loadSettings = () => {
  const saved = localStorage.getItem('terminal-settings')
  if (saved) {
    try {
      Object.assign(terminalSettings, JSON.parse(saved))
    } catch (error) {
      console.error('Failed to load terminal settings:', error)
    }
  }
}

const startCursorBlink = () => {
  if (cursorTimer) {
    clearInterval(cursorTimer)
  }
  
  cursorTimer = setInterval(() => {
    if (terminalSettings.cursorBlink) {
      cursorBlink.value = !cursorBlink.value
    } else {
      cursorBlink.value = true
    }
  }, 500)
}

const stopCursorBlink = () => {
  if (cursorTimer) {
    clearInterval(cursorTimer)
    cursorTimer = null
  }
}


onMounted(() => {
  loadSettings()
  startCursorBlink()
  focusInput()
})

onUnmounted(() => {
  stopCursorBlink()
})
</script>

<style scoped>
.dev-terminal {
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

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.terminal-actions {
  display: flex;
  gap: 8px;
}

.terminal-content {
  flex: 1;
  min-height: 0;
}

.terminal-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.terminal-output {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 2px;
}

.command-line {
  color: #ffffff;
}

.output-line {
  color: #cccccc;
}

.error-line {
  color: #ff6b6b;
}

.current-line {
  position: relative;
}

.prompt {
  color: #4fc3f7;
  margin-right: 8px;
  flex-shrink: 0;
}

.line-content {
  flex: 1;
  word-break: break-word;
}

.command-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  caret-color: transparent;
}

.cursor {
  position: absolute;
  right: 0;
  top: 0;
  width: 8px;
  height: 1.2em;
  background: currentColor;
  opacity: 1;
}

.cursor.blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.history-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.history-search {
  margin-bottom: 16px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.history-item:hover {
  background-color: #f5f7fa;
}

.history-command {
  font-family: 'Consolas', monospace;
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.history-time {
  font-size: 12px;
  color: #909399;
}

.history-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.help-content {
  padding: 16px 0;
}

.help-section {
  margin-bottom: 24px;
}

.help-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
}

.help-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 0;
}

kbd {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #606266;
}

.floating-actions {
  position: fixed;
  right: 30px;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
}

@media (max-width: 768px) {
  .dev-terminal {
    padding: 10px;
  }
  
  .terminal-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .terminal-actions {
    justify-content: center;
  }
  
  .terminal-output {
    padding: 12px;
    font-size: 12px;
  }
  
  .floating-actions {
    right: 20px;
    bottom: 20px;
  }
}
</style>