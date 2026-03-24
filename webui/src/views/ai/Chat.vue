<template>
  <div class="ai-chat">
    
    <div class="chat-header">
      <div class="header-left">
        <h2>AI助手</h2>
        <el-tag type="success" size="small">在线</el-tag>
      </div>
      <div class="header-right">
        <el-select v-model="selectedModel" placeholder="选择模型" style="width: 200px;">
          <el-option
            v-for="model in availableModels"
            :key="model.id"
            :label="model.name"
            :value="model.id"
          >
            <div class="model-option">
              <span class="model-name">{{ model.name }}</span>
              <el-tag :type="model.status === 'online' ? 'success' : 'danger'" size="small">
                {{ model.status === 'online' ? '在线' : '离线' }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
        
        <el-button @click="clearChat" size="small">
          <el-icon><Delete /></el-icon>
          清空对话
        </el-button>
        
        <el-button @click="showSettings = true" size="small">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
      </div>
    </div>

    
    <div class="chat-container">
      
      <div class="chat-sidebar">
        <div class="sidebar-header">
          <h3>对话历史</h3>
          <el-button type="primary" size="small" @click="newChat">
            <el-icon><Plus /></el-icon>
            新对话
          </el-button>
        </div>
        
        <div class="chat-list">
          <div 
            v-for="chat in chatHistory" 
            :key="chat.id" 
            :class="['chat-item', { active: chat.id === currentChatId }]"
            @click="switchChat(chat.id)"
          >
            <div class="chat-info">
              <div class="chat-title">{{ chat.title }}</div>
              <div class="chat-time">{{ chat.updatedAt }}</div>
            </div>
            <div class="chat-actions">
              <el-dropdown @command="(command) => handleChatAction(command, chat)">
                <el-button type="text" size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="export">导出</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>

      
      <div class="chat-main">
        
        <div class="messages-container" ref="messagesContainer">
          <div v-if="currentMessages.length === 0" class="empty-chat">
            <div class="empty-icon">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <h3>开始与AI助手对话</h3>
            <p>您可以询问任何问题，AI助手将为您提供帮助</p>
            
            
            <div class="quick-prompts">
              <h4>试试这些问题：</h4>
              <div class="prompt-buttons">
                <el-button 
                  v-for="prompt in quickPrompts" 
                  :key="prompt"
                  size="small"
                  @click="sendQuickPrompt(prompt)"
                >
                  {{ prompt }}
                </el-button>
              </div>
            </div>
          </div>
          
          <div v-else class="messages-list">
            <div 
              v-for="message in currentMessages" 
              :key="message.id" 
              :class="['message', message.role]"
            >
              <div class="message-avatar">
                <el-avatar v-if="message.role === 'user'" :size="32">
                  <el-icon><UserFilled /></el-icon>
                </el-avatar>
                <el-avatar v-else :size="32" class="ai-avatar">
                  <el-icon><Robot /></el-icon>
                </el-avatar>
              </div>
              
              <div class="message-content">
                <div class="message-header">
                  <span class="message-sender">
                    {{ message.role === 'user' ? '您' : 'AI助手' }}
                  </span>
                  <span class="message-time">{{ message.timestamp }}</span>
                </div>
                
                <div class="message-body">
                  <div v-if="message.role === 'assistant' && message.isTyping" class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div v-else class="message-text" v-html="formatMessage(message.content)"></div>
                </div>
                
                <div v-if="message.role === 'assistant' && !message.isTyping" class="message-actions">
                  <el-button type="text" size="small" @click="copyMessage(message.content)">
                    <el-icon><DocumentCopy /></el-icon>
                    复制
                  </el-button>
                  <el-button type="text" size="small" @click="regenerateResponse(message)">
                    <el-icon><Refresh /></el-icon>
                    重新生成
                  </el-button>
                  <el-button type="text" size="small" @click="rateMessage(message, 'like')">
                    <el-icon><Like /></el-icon>
                    {{ message.rating === 'like' ? '已赞' : '赞' }}
                  </el-button>
                  <el-button type="text" size="small" @click="rateMessage(message, 'dislike')">
                    <el-icon><DisLike /></el-icon>
                    {{ message.rating === 'dislike' ? '已踩' : '踩' }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        
        <div class="input-container">
          <div class="input-wrapper">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="输入您的问题..."
              :disabled="isLoading"
              @keydown.ctrl.enter="sendMessage"
              resize="none"
            />
            
            <div class="input-actions">
              <div class="input-tools">
                <el-button type="text" size="small" @click="showFileUpload = true">
                  <el-icon><Paperclip /></el-icon>
                  附件
                </el-button>
                <el-button type="text" size="small" @click="insertTemplate">
                  <el-icon><Document /></el-icon>
                  模板
                </el-button>
              </div>
              
              <div class="send-area">
                <span class="input-tip">Ctrl + Enter 发送</span>
                <el-button 
                  type="primary" 
                  @click="sendMessage" 
                  :loading="isLoading"
                  :disabled="!inputMessage.trim()"
                >
                  <el-icon><Promotion /></el-icon>
                  发送
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    
    <el-dialog v-model="showSettings" title="AI助手设置" width="600px">
      <el-form :model="chatSettings" label-width="120px">
        <el-form-item label="默认模型">
          <el-select v-model="chatSettings.defaultModel" style="width: 100%;">
            <el-option
              v-for="model in availableModels"
              :key="model.id"
              :label="model.name"
              :value="model.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="温度参数">
          <el-slider 
            v-model="chatSettings.temperature" 
            :min="0" 
            :max="2" 
            :step="0.1" 
            show-input
          />
          <div class="setting-desc">控制回答的创造性，值越高越有创意</div>
        </el-form-item>
        
        <el-form-item label="最大长度">
          <el-input-number 
            v-model="chatSettings.maxTokens" 
            :min="100" 
            :max="4000" 
            :step="100"
            style="width: 100%;"
          />
          <div class="setting-desc">单次回答的最大字符数</div>
        </el-form-item>
        
        <el-form-item label="系统提示">
          <el-input 
            v-model="chatSettings.systemPrompt" 
            type="textarea" 
            :rows="4" 
            placeholder="设置AI助手的角色和行为"
          />
        </el-form-item>
        
        <el-form-item label="自动保存">
          <el-switch v-model="chatSettings.autoSave" />
          <div class="setting-desc">自动保存对话历史</div>
        </el-form-item>
        
        <el-form-item label="显示时间">
          <el-switch v-model="chatSettings.showTimestamp" />
          <div class="setting-desc">在消息中显示时间戳</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSettings = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="showRenameDialog" title="重命名对话" width="400px">
      <el-input v-model="newChatTitle" placeholder="请输入新的对话标题" />
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRenameDialog = false">取消</el-button>
          <el-button type="primary" @click="renameChat">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Delete, Setting, Plus, MoreFilled, ChatDotRound, UserFilled, 
  Robot, DocumentCopy, Refresh, Like, DisLike, Paperclip, 
  Document, Promotion 
} from '@element-plus/icons-vue'

// 可用模型
const availableModels = ref([
  { id: 'gpt-4', name: 'GPT-4', status: 'online' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', status: 'online' },
  { id: 'claude-3', name: 'Claude 3', status: 'online' },
  { id: 'gemini-pro', name: 'Gemini Pro', status: 'offline' }
])

// 当前选中的模型
const selectedModel = ref('gpt-4')

// 对话历史
const chatHistory = ref([
  {
    id: 1,
    title: '关于Vue.js的问题',
    updatedAt: '2024-01-15 14:30',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'Vue.js 3.0 有哪些新特性？',
        timestamp: '14:30:15'
      },
      {
        id: 2,
        role: 'assistant',
        content: 'Vue.js 3.0 引入了许多重要的新特性：\n\n1. **Composition API** - 提供了更灵活的组件逻辑组织方式\n2. **更好的TypeScript支持** - 原生TypeScript支持\n3. **性能提升** - 更小的包体积和更快的渲染速度\n4. **Fragment支持** - 组件可以有多个根节点\n5. **Teleport** - 可以将组件渲染到DOM的任意位置',
        timestamp: '14:30:18',
        rating: null
      }
    ]
  },
  {
    id: 2,
    title: '系统架构设计',
    updatedAt: '2024-01-15 10:20',
    messages: []
  }
])

// 当前对话ID
const currentChatId = ref(1)

// 当前消息列表
const currentMessages = computed(() => {
  const chat = chatHistory.value.find(c => c.id === currentChatId.value)
  return chat ? chat.messages : []
})

// 输入消息
const inputMessage = ref('')

// 加载状态
const isLoading = ref(false)

// 对话框状态
const showSettings = ref(false)
const showRenameDialog = ref(false)
const showFileUpload = ref(false)

// 重命名相关
const renamingChat = ref(null)
const newChatTitle = ref('')

// 消息容器引用
const messagesContainer = ref()

// 快捷提示
const quickPrompts = [
  '帮我写一个Vue组件',
  '解释一下JavaScript闭包',
  '如何优化网站性能？',
  '推荐一些前端开发工具'
]

// 聊天设置
const chatSettings = reactive({
  defaultModel: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: '你是一个专业的AI助手，请用简洁明了的语言回答用户的问题。',
  autoSave: true,
  showTimestamp: true
})

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: inputMessage.value.trim(),
    timestamp: new Date().toLocaleTimeString()
  }
  
  // 添加用户消息
  const currentChat = chatHistory.value.find(c => c.id === currentChatId.value)
  if (currentChat) {
    currentChat.messages.push(userMessage)
    currentChat.updatedAt = new Date().toLocaleString()
  }
  
  // 清空输入
  const message = inputMessage.value
  inputMessage.value = ''
  
  // 添加AI回复占位符
  const aiMessage = {
    id: Date.now() + 1,
    role: 'assistant',
    content: '',
    timestamp: new Date().toLocaleTimeString(),
    isTyping: true,
    rating: null
  }
  
  if (currentChat) {
    currentChat.messages.push(aiMessage)
  }
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()
  
  // 模拟AI回复
  isLoading.value = true
  
  try {
    // 这里应该调用AI API
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 模拟回复内容
    const responses = [
      '这是一个很好的问题！让我来为您详细解答...',
      '根据您的问题，我建议您可以从以下几个方面考虑：\n\n1. 首先...\n2. 其次...\n3. 最后...',
      '我理解您的需求。这个问题涉及到多个方面，让我逐一为您分析。',
      '很高兴为您解答这个问题。基于我的知识，我可以提供以下信息...'
    ]
    
    aiMessage.content = responses[Math.floor(Math.random() * responses.length)]
    aiMessage.isTyping = false
    
  } catch (error) {
    aiMessage.content = '抱歉，我遇到了一些问题，请稍后再试。'
    aiMessage.isTyping = false
    ElMessage.error('发送消息失败')
  } finally {
    isLoading.value = false
    await nextTick()
    scrollToBottom()
  }
}

// 发送快捷提示
const sendQuickPrompt = (prompt: string) => {
  inputMessage.value = prompt
  sendMessage()
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 新建对话
const newChat = () => {
  const newChatId = Date.now()
  const newChatItem = {
    id: newChatId,
    title: `新对话 ${chatHistory.value.length + 1}`,
    updatedAt: new Date().toLocaleString(),
    messages: []
  }
  
  chatHistory.value.unshift(newChatItem)
  currentChatId.value = newChatId
}

// 切换对话
const switchChat = (chatId: number) => {
  currentChatId.value = chatId
  nextTick(() => {
    scrollToBottom()
  })
}

// 清空对话
const clearChat = async () => {
  try {
    await ElMessageBox.confirm('确定要清空当前对话吗？此操作不可恢复！', '确认清空', {
      type: 'warning'
    })
    
    const currentChat = chatHistory.value.find(c => c.id === currentChatId.value)
    if (currentChat) {
      currentChat.messages = []
      currentChat.updatedAt = new Date().toLocaleString()
    }
    
    ElMessage.success('对话已清空')
  } catch {
    // 用户取消
  }
}

// 处理对话操作
const handleChatAction = (command: string, chat: any) => {
  switch (command) {
    case 'rename':
      renamingChat.value = chat
      newChatTitle.value = chat.title
      showRenameDialog.value = true
      break
    case 'export':
      exportChat(chat)
      break
    case 'delete':
      deleteChat(chat)
      break
  }
}

// 重命名对话
const renameChat = () => {
  if (renamingChat.value && newChatTitle.value.trim()) {
    renamingChat.value.title = newChatTitle.value.trim()
    showRenameDialog.value = false
    ElMessage.success('对话重命名成功')
  }
}

// 导出对话
const exportChat = (chat: any) => {
  const content = chat.messages.map(msg => 
    `${msg.role === 'user' ? '用户' : 'AI助手'} (${msg.timestamp}):\n${msg.content}\n`
  ).join('\n')
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${chat.title}.txt`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('对话导出成功')
}

// 删除对话
const deleteChat = async (chat: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除对话 "${chat.title}" 吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    const index = chatHistory.value.indexOf(chat)
    if (index > -1) {
      chatHistory.value.splice(index, 1)
      
      // 如果删除的是当前对话，切换到第一个对话
      if (chat.id === currentChatId.value && chatHistory.value.length > 0) {
        currentChatId.value = chatHistory.value[0].id
      }
      
      ElMessage.success('对话删除成功')
    }
  } catch {
    // 用户取消
  }
}

// 格式化消息
const formatMessage = (content: string) => {
  // 简单的Markdown渲染
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}


const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('消息已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}


const regenerateResponse = async (message: any) => {
  message.isTyping = true
  message.content = ''
  
  try {
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    message.content = '这是重新生成的回复内容。我会尽力为您提供更好的答案。'
    message.isTyping = false
  } catch {
    message.content = '重新生成失败，请稍后再试。'
    message.isTyping = false
  }
}


const rateMessage = (message: any, rating: string) => {
  message.rating = message.rating === rating ? null : rating
  ElMessage.success(rating === 'like' ? '感谢您的反馈！' : '我们会努力改进')
}


const insertTemplate = () => {
  const templates = [
    '请帮我分析一下...',
    '我想了解关于...的信息',
    '能否为我推荐一些...？',
    '请解释一下...的概念'
  ]
  
  ElMessageBox.prompt('选择或输入模板', '插入模板', {
    inputValue: templates[0],
    inputType: 'textarea'
  }).then(({ value }) => {
    inputMessage.value = value
  }).catch(() => {})
}


const saveSettings = () => {
  ElMessage.success('设置保存成功')
  showSettings.value = false
}


onMounted(() => {
  nextTick(() => {
    scrollToBottom()
  })
})
</script>

<style scoped>
.ai-chat {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.chat-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f8f9fa;
  transition: background-color 0.3s;
}

.chat-item:hover {
  background-color: #f8f9fa;
}

.chat-item.active {
  background-color: #e6f7ff;
  border-right: 3px solid #409eff;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-time {
  font-size: 12px;
  color: #909399;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.empty-chat h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.empty-chat p {
  margin: 0 0 24px 0;
  color: #909399;
}

.quick-prompts {
  max-width: 500px;
}

.quick-prompts h4 {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.prompt-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message {
  display: flex;
  gap: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message.user .message-content {
  text-align: right;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.message.user .message-header {
  flex-direction: row-reverse;
}

.message-sender {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.message-time {
  font-size: 12px;
  color: #c0c4cc;
}

.message-body {
  background: #f8f9fa;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
}

.message.user .message-body {
  background: #409eff;
  color: white;
}

.message-text {
  word-wrap: break-word;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.message:hover .message-actions {
  opacity: 1;
}

.input-container {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
}

.input-wrapper {
  background: white;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  overflow: hidden;
}

.input-wrapper:focus-within {
  border-color: #409eff;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #f0f0f0;
}

.input-tools {
  display: flex;
  gap: 8px;
}

.send-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-tip {
  font-size: 12px;
  color: #909399;
}

.setting-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
  }
  
  .chat-sidebar {
    width: 100%;
    height: 200px;
  }
  
  .header-right {
    flex-direction: column;
    gap: 8px;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .input-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .send-area {
    justify-content: space-between;
  }
}
</style>