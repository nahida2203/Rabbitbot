<template>
  <div class="bot-config">
    <div class="config-header">
      <h1>机器人配置</h1>
      <p>管理机器人账号和相关功能配置</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="16">
        <div class="config-sections">
          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Avatar /></el-icon>
                <span>账号配置</span>
                <el-button type="primary" size="small" @click="addAccount">
                  <el-icon><Plus /></el-icon>
                  添加账号
                </el-button>
              </div>
            </template>
            <div class="accounts-list">
              <div
                v-for="account in accounts"
                :key="account.id"
                class="account-item"
              >
                <div class="account-info">
                  <div class="account-avatar">
                    <img v-if="account.avatar" :src="account.avatar" :alt="account.nickname" />
                    <el-icon v-else :size="40"><Avatar /></el-icon>
                  </div>
                  <div class="account-details">
                    <div class="account-name">{{ account.nickname }}</div>
                    <div class="account-id">{{ account.uin }}</div>
                    <div class="account-platform">
                      <el-tag :type="getPlatformType(account.platform)" size="small">
                        {{ account.platform }}
                      </el-tag>
                      <el-tag :type="getStatusType(account.status)" size="small">
                        {{ getStatusText(account.status) }}
                      </el-tag>
                    </div>
                  </div>
                </div>
                <div class="account-actions">
                  <el-button
                    v-if="account.status === 'offline'"
                    type="success"
                    size="small"
                    @click="connectAccount(account.id)"
                  >
                    连接
                  </el-button>
                  <el-button
                    v-if="account.status === 'online'"
                    type="warning"
                    size="small"
                    @click="disconnectAccount(account.id)"
                  >
                    断开
                  </el-button>
                  <el-button size="small" @click="editAccount(account)">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    @click="deleteAccount(account.id)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>

          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Setting /></el-icon>
                <span>功能配置</span>
              </div>
            </template>
            <el-form :model="botConfig" label-width="120px">
              <el-form-item label="自动接受好友">
                <el-switch
                  v-model="botConfig.autoAcceptFriend"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="自动接受群邀请">
                <el-switch
                  v-model="botConfig.autoAcceptGroup"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="主人QQ">
                <el-input
                  v-model="botConfig.masterQQ"
                  placeholder="请输入主人QQ号，多个用逗号分隔"
                />
              </el-form-item>
              <el-form-item label="命令前缀">
                <el-input
                  v-model="botConfig.commandPrefix"
                  placeholder="请输入命令前缀"
                  style="width: 200px"
                />
              </el-form-item>
              <el-form-item label="响应模式">
                <el-radio-group v-model="botConfig.responseMode">
                  <el-radio label="all">响应所有消息</el-radio>
                  <el-radio label="at">仅响应@消息</el-radio>
                  <el-radio label="prefix">仅响应前缀消息</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="消息撤回时间">
                <el-input-number
                  v-model="botConfig.recallTime"
                  :min="0"
                  :max="120"
                  style="width: 200px"
                />
                <template #append>秒 (0为不撤回)</template>
              </el-form-item>
            </el-form>
          </el-card>

          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Lock /></el-icon>
                <span>权限配置</span>
              </div>
            </template>
            <el-form :model="permissionConfig" label-width="120px">
              <el-form-item label="默认权限级别">
                <el-select v-model="permissionConfig.defaultLevel" style="width: 200px">
                  <el-option label="游客 (0)" :value="0" />
                  <el-option label="普通用户 (1)" :value="1" />
                  <el-option label="群管理 (2)" :value="2" />
                  <el-option label="群主 (3)" :value="3" />
                  <el-option label="主人 (4)" :value="4" />
                </el-select>
              </el-form-item>
              <el-form-item label="群聊权限检查">
                <el-switch
                  v-model="permissionConfig.enableGroupCheck"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="私聊权限检查">
                <el-switch
                  v-model="permissionConfig.enablePrivateCheck"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="黑名单用户">
                <el-input
                  v-model="permissionConfig.blacklistUsers"
                  type="textarea"
                  :rows="3"
                  placeholder="每行一个QQ号"
                />
              </el-form-item>
              <el-form-item label="黑名单群组">
                <el-input
                  v-model="permissionConfig.blacklistGroups"
                  type="textarea"
                  :rows="3"
                  placeholder="每行一个群号"
                />
              </el-form-item>
            </el-form>
          </el-card>

          
          <el-card class="config-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><ChatDotRound /></el-icon>
                <span>消息配置</span>
              </div>
            </template>
            <el-form :model="messageConfig" label-width="120px">
              <el-form-item label="消息日志">
                <el-switch
                  v-model="messageConfig.enableLog"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="转发消息">
                <el-switch
                  v-model="messageConfig.enableForward"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="消息去重">
                <el-switch
                  v-model="messageConfig.enableDedup"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="最大消息长度">
                <el-input-number
                  v-model="messageConfig.maxLength"
                  :min="100"
                  :max="10000"
                  style="width: 200px"
                />
              </el-form-item>
              <el-form-item label="图片压缩">
                <el-switch
                  v-model="messageConfig.compressImage"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              <el-form-item label="图片质量">
                <el-slider
                  v-model="messageConfig.imageQuality"
                  :min="10"
                  :max="100"
                  :step="10"
                  show-stops
                  show-input
                  style="width: 300px"
                />
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </el-col>

      <el-col :xs="24" :lg="8">
        <div class="sidebar">
          
          <el-card class="status-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Connection /></el-icon>
                <span>在线状态</span>
              </div>
            </template>
            <div class="status-overview">
              <div class="status-item">
                <span class="status-label">总账号数</span>
                <span class="status-value">{{ accounts.length }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">在线账号</span>
                <span class="status-value online">{{ onlineCount }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">离线账号</span>
                <span class="status-value offline">{{ offlineCount }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">今日消息</span>
                <span class="status-value">{{ todayMessages }}</span>
              </div>
            </div>
          </el-card>

          
          <el-card class="actions-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Operation /></el-icon>
                <span>快捷操作</span>
              </div>
            </template>
            <div class="actions-list">
              <el-button type="primary" @click="saveConfig" :loading="saving">
                <el-icon><DocumentCopy /></el-icon>
                保存配置
              </el-button>
              <el-button @click="connectAllAccounts">
                <el-icon><Connection /></el-icon>
                连接所有账号
              </el-button>
              <el-button @click="disconnectAllAccounts">
                <el-icon><SwitchButton /></el-icon>
                断开所有账号
              </el-button>
              <el-button @click="clearLogs">
                <el-icon><Delete /></el-icon>
                清空日志
              </el-button>
              <el-button type="warning" @click="restartBot">
                <el-icon><RefreshRight /></el-icon>
                重启机器人
              </el-button>
            </div>
          </el-card>

          
          <el-card class="logs-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <el-icon><Document /></el-icon>
                <span>最近日志</span>
              </div>
            </template>
            <div class="logs-list">
              <div
                v-for="log in recentLogs"
                :key="log.id"
                :class="['log-item', `log-${log.level}`]"
              >
                <div class="log-time">{{ log.time }}</div>
                <div class="log-message">{{ log.message }}</div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>

    
    <el-dialog
      v-model="accountDialogVisible"
      :title="isEditMode ? '编辑账号' : '添加账号'"
      width="500px"
    >
      <el-form :model="currentAccount" label-width="80px">
        <el-form-item label="平台">
          <el-select v-model="currentAccount.platform" style="width: 100%">
            <el-option label="QQ" value="qq" />
            <el-option label="微信" value="wechat" />
            <el-option label="Telegram" value="telegram" />
            <el-option label="Discord" value="discord" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号">
          <el-input
            v-model="currentAccount.uin"
            placeholder="请输入账号"
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="currentAccount.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input
            v-model="currentAccount.nickname"
            placeholder="请输入昵称"
          />
        </el-form-item>
        <el-form-item label="协议">
          <el-select v-model="currentAccount.protocol" style="width: 100%">
            <el-option label="Android Phone" value="1" />
            <el-option label="Android Pad" value="2" />
            <el-option label="Android Watch" value="3" />
            <el-option label="MacOS" value="4" />
            <el-option label="iPad" value="5" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accountDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAccount">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Avatar,
  Plus,
  Edit,
  Delete,
  Setting,
  Lock,
  ChatDotRound,
  Connection,
  Operation,
  DocumentCopy,
  SwitchButton,
  RefreshRight,
  Document
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// 响应式数据
const saving = ref(false)
const accountDialogVisible = ref(false)
const isEditMode = ref(false)
const currentAccount = ref({
  id: 0,
  platform: 'qq',
  uin: '',
  password: '',
  nickname: '',
  protocol: '1',
  status: 'offline',
  avatar: ''
})

// 账号列表
const accounts = ref([
  {
    id: 1,
    platform: 'qq',
    uin: '123456789',
    nickname: 'Yunzai机器人',
    status: 'online',
    avatar: null
  },
  {
    id: 2,
    platform: 'qq',
    uin: '987654321',
    nickname: '测试机器人',
    status: 'offline',
    avatar: null
  }
])

// 机器人配置
const botConfig = ref({
  autoAcceptFriend: true,
  autoAcceptGroup: false,
  masterQQ: '123456789',
  commandPrefix: '#',
  responseMode: 'all',
  recallTime: 0
})

// 权限配置
const permissionConfig = ref({
  defaultLevel: 1,
  enableGroupCheck: true,
  enablePrivateCheck: false,
  blacklistUsers: '',
  blacklistGroups: ''
})

// 消息配置
const messageConfig = ref({
  enableLog: true,
  enableForward: false,
  enableDedup: true,
  maxLength: 5000,
  compressImage: true,
  imageQuality: 80
})

// 最近日志
const recentLogs = ref([
  {
    id: 1,
    time: dayjs().format('HH:mm:ss'),
    level: 'info',
    message: '机器人启动成功'
  },
  {
    id: 2,
    time: dayjs().subtract(5, 'minute').format('HH:mm:ss'),
    level: 'info',
    message: '收到群消息: 你好'
  },
  {
    id: 3,
    time: dayjs().subtract(10, 'minute').format('HH:mm:ss'),
    level: 'warn',
    message: '账号登录异常'
  }
])

// 计算属性
const onlineCount = computed(() => {
  return accounts.value.filter(account => account.status === 'online').length
})

const offlineCount = computed(() => {
  return accounts.value.filter(account => account.status === 'offline').length
})

const todayMessages = computed(() => {
  return 1234 // 模拟数据
})

// 方法
const getPlatformType = (platform: string) => {
  switch (platform) {
    case 'qq': return 'primary'
    case 'wechat': return 'success'
    case 'telegram': return 'info'
    case 'discord': return 'warning'
    default: return 'info'
  }
}

const getStatusType = (status: string) => {
  return status === 'online' ? 'success' : 'danger'
}

const getStatusText = (status: string) => {
  return status === 'online' ? '在线' : '离线'
}

const addAccount = () => {
  isEditMode.value = false
  currentAccount.value = {
    id: 0,
    platform: 'qq',
    uin: '',
    password: '',
    nickname: '',
    protocol: '1',
    status: 'offline',
    avatar: ''
  }
  accountDialogVisible.value = true
}

const editAccount = (account: any) => {
  isEditMode.value = true
  currentAccount.value = { ...account }
  accountDialogVisible.value = true
}

const saveAccount = () => {
  if (!currentAccount.value.uin || !currentAccount.value.nickname) {
    ElMessage.error('请填写完整信息')
    return
  }
  
  if (isEditMode.value) {
    const index = accounts.value.findIndex(account => account.id === currentAccount.value.id)
    if (index !== -1) {
      accounts.value[index] = { ...currentAccount.value }
    }
    ElMessage.success('账号更新成功')
  } else {
    currentAccount.value.id = Date.now()
    accounts.value.push({ ...currentAccount.value })
    ElMessage.success('账号添加成功')
  }
  
  accountDialogVisible.value = false
}

const deleteAccount = async (accountId: number) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个账号吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const index = accounts.value.findIndex(account => account.id === accountId)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      ElMessage.success('账号删除成功')
    }
  } catch {
    // 用户取消
  }
}

const connectAccount = (accountId: number) => {
  const account = accounts.value.find(account => account.id === accountId)
  if (account) {
    account.status = 'online'
    ElMessage.success(`账号 ${account.nickname} 连接成功`)
  }
}

const disconnectAccount = (accountId: number) => {
  const account = accounts.value.find(account => account.id === accountId)
  if (account) {
    account.status = 'offline'
    ElMessage.success(`账号 ${account.nickname} 已断开连接`)
  }
}

const connectAllAccounts = () => {
  accounts.value.forEach(account => {
    account.status = 'online'
  })
  ElMessage.success('所有账号连接成功')
}

const disconnectAllAccounts = () => {
  accounts.value.forEach(account => {
    account.status = 'offline'
  })
  ElMessage.success('所有账号已断开连接')
}

const saveConfig = async () => {
  saving.value = true
  try {
    // 模拟保存配置
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('配置保存成功')
  } catch {
    ElMessage.error('配置保存失败')
  } finally {
    saving.value = false
  }
}

const clearLogs = () => {
  recentLogs.value = []
  ElMessage.success('日志已清空')
}

const restartBot = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重启机器人吗？重启后所有连接将断开。',
      '确认重启',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.info('机器人正在重启...')
    // 这里应该调用实际的重启API
  } catch {
    // 用户取消
  }
}

// 模拟实时更新日志
const addRandomLog = () => {
  const messages = [
    '收到私聊消息',
    '收到群消息',
    '发送消息成功',
    '插件执行完成',
    '定时任务执行'
  ]
  
  const levels = ['info', 'warn', 'error']
  
  recentLogs.value.unshift({
    id: Date.now(),
    time: dayjs().format('HH:mm:ss'),
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)]
  })
  
  // 保持最多10条日志
  if (recentLogs.value.length > 10) {
    recentLogs.value = recentLogs.value.slice(0, 10)
  }
}

onMounted(() => {
  // 每10秒添加一条随机日志
  setInterval(addRandomLog, 10000)
})
</script>

<style lang="scss" scoped>
.bot-config {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}

.config-header {
  margin-bottom: 30px;
  
  h1 {
    margin: 0 0 10px 0;
    font-size: 28px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  p {
    margin: 0;
    font-size: 16px;
    color: var(--el-text-color-regular);
  }
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-card {
  :deep(.el-card__body) {
    padding: 25px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  
  > div {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  
  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.account-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.account-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--el-fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.account-details {
  flex: 1;
  
  .account-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }
  
  .account-id {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin-bottom: 6px;
  }
  
  .account-platform {
    display: flex;
    gap: 8px;
  }
}

.account-actions {
  display: flex;
  gap: 8px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  @media (max-width: 992px) {
    margin-top: 20px;
  }
}

.status-card,
.actions-card,
.logs-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.status-overview {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .status-label {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }
  
  .status-value {
    font-weight: 600;
    color: var(--el-text-color-primary);
    font-size: 16px;
    
    &.online {
      color: var(--el-color-success);
    }
    
    &.offline {
      color: var(--el-color-danger);
    }
  }
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  .el-button {
    justify-content: flex-start;
  }
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  padding: 8px 10px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 4px;
  border-left: 3px solid var(--el-color-info);
  
  &.log-info {
    border-left-color: var(--el-color-info);
  }
  
  &.log-warn {
    border-left-color: var(--el-color-warning);
  }
  
  &.log-error {
    border-left-color: var(--el-color-danger);
  }
  
  .log-time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 2px;
  }
  
  .log-message {
    font-size: 13px;
    color: var(--el-text-color-primary);
  }
}

@media (max-width: 768px) {
  .bot-config {
    padding: 10px;
  }
  
  .config-header {
    margin-bottom: 20px;
    
    h1 {
      font-size: 24px;
    }
  }
  
  .account-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
    
    .account-actions {
      align-self: stretch;
      justify-content: flex-end;
    }
  }
}
</style>