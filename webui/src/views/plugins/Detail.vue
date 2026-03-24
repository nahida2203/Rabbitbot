<template>
  <div class="plugin-detail">
    
    <div class="back-section">
      <el-button @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回插件列表
      </el-button>
    </div>

    
    <div class="plugin-header">
      <el-card shadow="hover">
        <div class="header-content">
          <div class="plugin-icon">
            <img v-if="plugin.icon" :src="plugin.icon" :alt="plugin.name" />
            <el-icon v-else :size="64"><Box /></el-icon>
          </div>
          <div class="plugin-info">
            <h1 class="plugin-name">{{ plugin.name }}</h1>
            <p class="plugin-description">{{ plugin.description }}</p>
            <div class="plugin-meta">
              <el-tag :type="getStatusType(plugin.status)" size="large">
                {{ getStatusText(plugin.status) }}
              </el-tag>
              <span class="version">v{{ plugin.version }}</span>
              <span class="author">by {{ plugin.author }}</span>
            </div>
          </div>
          <div class="plugin-actions">
            <el-button
              v-if="plugin.status === 'disabled'"
              type="success"
              size="large"
              @click="enablePlugin"
            >
              启用插件
            </el-button>
            <el-button
              v-if="plugin.status === 'enabled'"
              type="warning"
              size="large"
              @click="disablePlugin"
            >
              禁用插件
            </el-button>
            <el-button
              v-if="plugin.status === 'uninstalled'"
              type="primary"
              size="large"
              @click="installPlugin"
            >
              安装插件
            </el-button>
            <el-button size="large" @click="configurePlugin">
              <el-icon><Setting /></el-icon>
              配置
            </el-button>
            <el-dropdown trigger="click">
              <el-button size="large">
                更多操作
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="updatePlugin">
                    <el-icon><Upload /></el-icon>
                    更新插件
                  </el-dropdown-item>
                  <el-dropdown-item @click="exportPlugin">
                    <el-icon><Download /></el-icon>
                    导出插件
                  </el-dropdown-item>
                  <el-dropdown-item @click="sharePlugin">
                    <el-icon><Share /></el-icon>
                    分享插件
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="plugin.status !== 'uninstalled'"
                    @click="uninstallPlugin"
                    divided
                  >
                    <el-icon><Delete /></el-icon>
                    卸载插件
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-card>
    </div>

    
    <div class="detail-tabs">
      <el-tabs v-model="activeTab" type="card">
        
        <el-tab-pane label="概览" name="overview">
          <el-row :gutter="20">
            <el-col :xs="24" :lg="16">
              <el-card class="overview-card" shadow="hover">
                <template #header>
                  <span>插件介绍</span>
                </template>
                <div class="plugin-readme" v-html="plugin.readme"></div>
              </el-card>
            </el-col>
            <el-col :xs="24" :lg="8">
              <div class="sidebar-info">
                
                <el-card class="stats-card" shadow="hover">
                  <template #header>
                    <span>统计信息</span>
                  </template>
                  <div class="stats-list">
                    <div class="stat-item">
                      <span class="stat-label">下载量</span>
                      <span class="stat-value">{{ plugin.downloads }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">评分</span>
                      <span class="stat-value">
                        <el-rate v-model="plugin.rating" disabled show-score />
                      </span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">大小</span>
                      <span class="stat-value">{{ plugin.size }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">更新时间</span>
                      <span class="stat-value">{{ formatDate(plugin.updateTime) }}</span>
                    </div>
                  </div>
                </el-card>

                
                <el-card class="dependencies-card" shadow="hover">
                  <template #header>
                    <span>依赖信息</span>
                  </template>
                  <div class="dependencies-list">
                    <div
                      v-for="dep in plugin.dependencies"
                      :key="dep.name"
                      class="dependency-item"
                    >
                      <span class="dep-name">{{ dep.name }}</span>
                      <span class="dep-version">{{ dep.version }}</span>
                    </div>
                  </div>
                </el-card>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

        
        <el-tab-pane label="配置" name="config">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>插件配置</span>
                <el-button type="primary" @click="saveConfig">
                  <el-icon><DocumentCopy /></el-icon>
                  保存配置
                </el-button>
              </div>
            </template>
            <el-form :model="pluginConfig" label-width="120px">
              <el-form-item
                v-for="config in plugin.configSchema"
                :key="config.key"
                :label="config.label"
              >
                <el-input
                  v-if="config.type === 'string'"
                  v-model="pluginConfig[config.key]"
                  :placeholder="config.placeholder"
                />
                <el-input-number
                  v-else-if="config.type === 'number'"
                  v-model="pluginConfig[config.key]"
                  :min="config.min"
                  :max="config.max"
                />
                <el-switch
                  v-else-if="config.type === 'boolean'"
                  v-model="pluginConfig[config.key]"
                />
                <el-select
                  v-else-if="config.type === 'select'"
                  v-model="pluginConfig[config.key]"
                  style="width: 100%"
                >
                  <el-option
                    v-for="option in config.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <template #append v-if="config.description">
                  <el-tooltip :content="config.description" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>

        
        <el-tab-pane label="日志" name="logs">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>运行日志</span>
                <div class="log-actions">
                  <el-select v-model="logLevel" size="small" style="width: 100px">
                    <el-option label="全部" value="all" />
                    <el-option label="错误" value="error" />
                    <el-option label="警告" value="warn" />
                    <el-option label="信息" value="info" />
                  </el-select>
                  <el-button size="small" @click="refreshLogs">
                    <el-icon><Refresh /></el-icon>
                  </el-button>
                  <el-button size="small" @click="clearLogs">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </template>
            <div class="logs-container">
              <div
                v-for="log in filteredLogs"
                :key="log.id"
                :class="['log-item', `log-${log.level}`]"
              >
                <span class="log-time">{{ log.time }}</span>
                <span class="log-level">{{ log.level.toUpperCase() }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        
        <el-tab-pane label="版本历史" name="versions">
          <el-card shadow="hover">
            <el-timeline>
              <el-timeline-item
                v-for="version in plugin.versions"
                :key="version.version"
                :timestamp="version.date"
                :type="version.type"
              >
                <div class="version-content">
                  <div class="version-header">
                    <h4>v{{ version.version }}</h4>
                    <el-tag :type="version.type" size="small">{{ version.status }}</el-tag>
                  </div>
                  <div class="version-changes">
                    <ul>
                      <li v-for="change in version.changes" :key="change">
                        {{ change }}
                      </li>
                    </ul>
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import {
  ArrowLeft,
  Box,
  Setting,
  ArrowDown,
  Upload,
  Download,
  Share,
  Delete,
  DocumentCopy,
  QuestionFilled,
  Refresh
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

// 响应式数据
const activeTab = ref('overview')
const logLevel = ref('all')
const pluginConfig = ref({})

// 模拟插件详细数据
const plugin = ref({
  id: 1,
  name: '签到插件',
  version: '1.2.0',
  description: '提供每日签到功能，支持多种签到奖励机制，包括连续签到奖励、随机奖励等',
  author: 'Yunzai Team',
  status: 'enabled',
  updateTime: '2024-01-15',
  downloads: 1234,
  rating: 4.5,
  size: '2.3 MB',
  icon: null,
  readme: `
    <h2>功能介绍</h2>
    <p>这是一个功能强大的签到插件，为用户提供每日签到功能。</p>
    <h3>主要特性</h3>
    <ul>
      <li>每日签到奖励</li>
      <li>连续签到额外奖励</li>
      <li>随机奖励机制</li>
      <li>签到统计功能</li>
      <li>自定义奖励配置</li>
    </ul>
    <h3>使用方法</h3>
    <p>发送 <code>#签到</code> 即可进行每日签到。</p>
  `,
  dependencies: [
    { name: 'yunzai-core', version: '^4.0.0' },
    { name: 'moment', version: '^2.29.0' },
    { name: 'lodash', version: '^4.17.0' }
  ],
  configSchema: [
    {
      key: 'enabled',
      label: '启用插件',
      type: 'boolean',
      description: '是否启用此插件'
    },
    {
      key: 'dailyReward',
      label: '每日奖励',
      type: 'number',
      min: 1,
      max: 1000,
      placeholder: '输入每日签到奖励数量'
    },
    {
      key: 'rewardType',
      label: '奖励类型',
      type: 'select',
      options: [
        { label: '金币', value: 'coin' },
        { label: '经验', value: 'exp' },
        { label: '积分', value: 'point' }
      ]
    },
    {
      key: 'welcomeMessage',
      label: '欢迎消息',
      type: 'string',
      placeholder: '输入签到成功后的欢迎消息'
    }
  ],
  versions: [
    {
      version: '1.2.0',
      date: '2024-01-15',
      type: 'success',
      status: '当前版本',
      changes: [
        '新增连续签到奖励功能',
        '优化签到统计界面',
        '修复已知bug'
      ]
    },
    {
      version: '1.1.0',
      date: '2024-01-01',
      type: 'primary',
      status: '历史版本',
      changes: [
        '新增随机奖励机制',
        '支持自定义奖励配置',
        '改进用户体验'
      ]
    },
    {
      version: '1.0.0',
      date: '2023-12-15',
      type: 'info',
      status: '初始版本',
      changes: [
        '基础签到功能',
        '每日奖励系统',
        '签到记录统计'
      ]
    }
  ]
})

// 日志数据（真实数据）
const logs = ref<Array<{ id: string; time: string; level: string; message: string }>>([])

// 计算属性
const filteredLogs = computed(() => {
  if (logLevel.value === 'all') {
    return logs.value
  }
  return logs.value.filter(log => log.level === logLevel.value)
})

// 方法
const getStatusType = (status: string) => {
  switch (status) {
    case 'enabled': return 'success'
    case 'disabled': return 'warning'
    case 'uninstalled': return 'info'
    default: return 'info'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'enabled': return '已启用'
    case 'disabled': return '已禁用'
    case 'uninstalled': return '未安装'
    default: return '未知'
  }
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD')
}

const goBack = () => {
  router.push('/plugins/list')
}

const enablePlugin = () => {
  plugin.value.status = 'enabled'
  ElMessage.success('插件已启用')
}

const disablePlugin = () => {
  plugin.value.status = 'disabled'
  ElMessage.success('插件已禁用')
}

const installPlugin = () => {
  plugin.value.status = 'enabled'
  ElMessage.success('插件安装成功')
}

const uninstallPlugin = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要卸载插件 "${plugin.value.name}" 吗？`,
      '确认卸载',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    plugin.value.status = 'uninstalled'
    ElMessage.success('插件已卸载')
  } catch {
    // 用户取消
  }
}

const configurePlugin = () => {
  activeTab.value = 'config'
}

const updatePlugin = () => {
  ElMessage.info('更新插件功能开发中...')
}

const exportPlugin = () => {
  ElMessage.info('导出插件功能开发中...')
}

const sharePlugin = () => {
  ElMessage.info('分享插件功能开发中...')
}

const saveConfig = () => {
  ElMessage.success('配置已保存')
}

// 从后端获取插件日志（复杂逻辑：数据映射与参数处理）
const refreshLogs = async () => {
  try {
    const pluginId = String(route.params.id || '')
    const res = await api.plugin.getPluginLogs(pluginId, {
      level: logLevel.value === 'all' ? undefined : logLevel.value,
      limit: 200,
      offset: 0
    })
    const list = (res?.data?.data || []) as Array<{ logger: string; level: string; message: string; timestamp: number }>
    // 将后端日志结构映射为前端展示结构（id/time/level/message）
    logs.value = list.map((x, idx) => ({
      id: `${x.timestamp}-${idx}`,
      time: dayjs(x.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      level: (x.level || 'info').toLowerCase(),
      message: typeof x.message === 'string' ? x.message : Array.isArray(x.message) ? x.message.join(' ') : String(x.message ?? '')
    }))
    ElMessage.success('日志已刷新')
  } catch (e: any) {
    ElMessage.error(e?.message || '获取日志失败')
  }
}

// 清空后端日志
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

// 初始化配置
const initConfig = () => {
  const config: any = {}
  plugin.value.configSchema.forEach(item => {
    switch (item.key) {
      case 'enabled':
        config[item.key] = true
        break
      case 'dailyReward':
        config[item.key] = 100
        break
      case 'rewardType':
        config[item.key] = 'coin'
        break
      case 'welcomeMessage':
        config[item.key] = '签到成功！'
        break
      default:
        config[item.key] = ''
    }
  })
  pluginConfig.value = config
}

onMounted(() => {
  // 根据路由参数加载插件详情
  const pluginId = route.params.id
  // 这里可以根据 pluginId 加载具体的插件数据
  
  initConfig()
  // 初始化拉取真实日志数据
  refreshLogs()
})
</script>

<style lang="scss" scoped>
.plugin-detail {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}

.back-section {
  margin-bottom: 20px;
}

.plugin-header {
  margin-bottom: 20px;
  
  :deep(.el-card__body) {
    padding: 30px;
  }
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
}

.plugin-icon {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  img {
    width: 64px;
    height: 64px;
    border-radius: 8px;
  }
}

.plugin-info {
  flex: 1;
  
  .plugin-name {
    margin: 0 0 10px 0;
    font-size: 28px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  .plugin-description {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
  }
  
  .plugin-meta {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
    
    .version,
    .author {
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }
  }
}

.plugin-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }
}

.detail-tabs {
  :deep(.el-tabs__content) {
    padding-top: 20px;
  }
}

.overview-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.plugin-readme {
  line-height: 1.6;
  
  h2, h3 {
    color: var(--el-text-color-primary);
    margin-top: 20px;
    margin-bottom: 10px;
  }
  
  ul {
    padding-left: 20px;
  }
  
  code {
    background-color: var(--el-fill-color-light);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
  }
}

.sidebar-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-card,
.dependencies-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .stat-label {
    color: var(--el-text-color-regular);
  }
  
  .stat-value {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.dependencies-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dependency-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 6px;
  
  .dep-name {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  .dep-version {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-family: 'Consolas', 'Monaco', monospace;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 15px;
}

.log-item {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  
  &.log-info {
    color: var(--el-color-info);
  }
  
  &.log-warn {
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

.log-level {
  flex: 0 0 auto;
  width: 50px;
  font-weight: 600;
}

.log-message {
  flex: 1;
}

.version-content {
  .version-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    
    h4 {
      margin: 0;
      color: var(--el-text-color-primary);
    }
  }
  
  .version-changes {
    ul {
      margin: 0;
      padding-left: 20px;
      
      li {
        margin-bottom: 5px;
        color: var(--el-text-color-regular);
      }
    }
  }
}

@media (max-width: 768px) {
  .plugin-detail {
    padding: 10px;
  }
  
  .sidebar-info {
    margin-top: 20px;
  }
}
</style>