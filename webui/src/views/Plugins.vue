<template>
  <div class="plugins-container">
    
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">插件管理</h1>
        <p class="page-description">管理和配置 Yunzai 插件</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showInstallDialog = true">
          <el-icon><Plus /></el-icon>
          安装插件
        </el-button>
        <el-button @click="refreshPlugins">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    
    <el-card class="search-card" shadow="never">
      <div class="search-container">
        <div class="search-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索插件名称、描述或作者"
            prefix-icon="Search"
            clearable
            @input="handleSearch"
            class="search-input"
          />
        </div>
        <div class="search-right">
          <el-select
            v-model="filterStatus"
            placeholder="状态筛选"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="已启用" value="active" />
            <el-option label="已禁用" value="inactive" />
            <el-option label="错误" value="error" />
          </el-select>
          <el-select
            v-model="filterCategory"
            placeholder="分类筛选"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="category in categories"
              :key="category.name"
              :label="category.name"
              :value="category.name"
            />
          </el-select>
        </div>
      </div>
    </el-card>
    
    
    <div class="plugins-grid">
      <el-card
        v-for="plugin in filteredPlugins"
        :key="plugin.id"
        class="plugin-card"
        shadow="hover"
        :class="{
          'plugin-active': plugin.status === 'active',
          'plugin-inactive': plugin.status === 'inactive',
          'plugin-error': plugin.status === 'error',
          'plugin-loading': plugin.status === 'loading'
        }"
      >
        
        <div class="plugin-header">
          <div class="plugin-icon">
            <img v-if="plugin.icon" :src="plugin.icon" :alt="plugin.name" />
            <el-icon v-else size="32"><Grid /></el-icon>
          </div>
          <div class="plugin-info">
            <h3 class="plugin-name">{{ plugin.displayName || plugin.name }}</h3>
            <p class="plugin-author">by {{ plugin.author }}</p>
          </div>
          <div class="plugin-actions">
            <el-dropdown trigger="click" @command="handlePluginAction">
              <el-button circle size="small">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'toggle', plugin }">
                    {{ plugin.enabled ? '禁用' : '启用' }}
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'config', plugin }">
                    配置
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'restart', plugin }">
                    重启
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'update', plugin }" divided>
                    更新
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'uninstall', plugin }" class="danger">
                    卸载
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        
        <div class="plugin-description">
          <p>{{ plugin.description }}</p>
        </div>
        
        
        <div class="plugin-tags">
          <el-tag
            v-for="keyword in plugin.keywords.slice(0, 3)"
            :key="keyword"
            size="small"
            type="info"
          >
            {{ keyword }}
          </el-tag>
          <el-tag v-if="plugin.keywords.length > 3" size="small" type="info">
            +{{ plugin.keywords.length - 3 }}
          </el-tag>
        </div>
        
        
        <div class="plugin-status">
          <div class="status-left">
            <el-tag
              :type="getStatusType(plugin.status)"
              size="small"
            >
              {{ getStatusText(plugin.status) }}
            </el-tag>
            <span class="plugin-version">v{{ plugin.version }}</span>
          </div>
          <div class="status-right">
            <el-switch
              v-model="plugin.enabled"
              :loading="plugin.status === 'loading'"
              @change="togglePlugin(plugin)"
            />
          </div>
        </div>
        
        
        <div class="plugin-stats">
          <div class="stat-item">
            <el-icon><Download /></el-icon>
            <span>{{ formatNumber(plugin.downloadCount || 0) }}</span>
          </div>
          <div class="stat-item">
            <el-icon><Star /></el-icon>
            <span>{{ plugin.rating || 0 }}</span>
          </div>
          <div class="stat-item">
            <el-icon><Clock /></el-icon>
            <span>{{ formatTime(plugin.updateTime || plugin.createdAt) }}</span>
          </div>
        </div>
      </el-card>
    </div>
    
    
    <el-empty
      v-if="filteredPlugins.length === 0 && !loading"
      description="暂无插件"
      class="empty-state"
    >
      <el-button type="primary" @click="showInstallDialog = true">
        安装第一个插件
      </el-button>
    </el-empty>
    
    
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="6" animated />
    </div>
    
    
    <el-dialog
      v-model="showInstallDialog"
      title="安装插件"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-tabs v-model="installTab" class="install-tabs">
        
        <el-tab-pane label="插件市场" name="market">
          <div class="market-search">
            <el-input
              v-model="marketSearch"
              placeholder="搜索插件市场"
              prefix-icon="Search"
              clearable
              @input="searchMarket"
            />
          </div>
          <div class="market-plugins">
            <div
              v-for="plugin in marketPlugins"
              :key="plugin.id"
              class="market-plugin"
              @click="selectMarketPlugin(plugin)"
            >
              <div class="market-plugin-info">
                <h4>{{ plugin.displayName || plugin.name }}</h4>
                <p>{{ plugin.description }}</p>
                <div class="market-plugin-meta">
                  <span>{{ plugin.author }}</span>
                  <span>v{{ plugin.version }}</span>
                  <el-rate
                    v-model="plugin.rating"
                    disabled
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                  />
                </div>
              </div>
              <el-button type="primary" size="small">
                安装
              </el-button>
            </div>
          </div>
        </el-tab-pane>
        
        
        <el-tab-pane label="从URL安装" name="url">
          <el-form :model="installForm" label-width="80px">
            <el-form-item label="插件URL">
              <el-input
                v-model="installForm.url"
                placeholder="https://github.com/user/plugin.git"
                clearable
              />
            </el-form-item>
            <el-form-item label="版本">
              <el-input
                v-model="installForm.version"
                placeholder="留空安装最新版本"
                clearable
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        
        <el-tab-pane label="上传文件" name="file">
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".zip,.tar.gz,.tgz"
            @change="handleFileChange"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将插件文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 zip、tar.gz 格式的插件包
              </div>
            </template>
          </el-upload>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showInstallDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="installing"
            @click="installPlugin"
          >
            {{ installing ? '安装中...' : '安装' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    
    <el-dialog
      v-model="showConfigDialog"
      :title="`配置 ${currentPlugin?.displayName || currentPlugin?.name}`"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentPlugin" class="plugin-config">
        <el-form
          ref="configFormRef"
          :model="pluginConfig"
          label-width="120px"
        >
          <el-form-item
            v-for="(value, key) in pluginConfig"
            :key="key"
            :label="key"
          >
            <el-input
              v-if="typeof value === 'string'"
              v-model="pluginConfig[key]"
            />
            <el-input-number
              v-else-if="typeof value === 'number'"
              v-model="pluginConfig[key]"
              style="width: 100%"
            />
            <el-switch
              v-else-if="typeof value === 'boolean'"
              v-model="pluginConfig[key]"
            />
            <el-input
              v-else
              v-model="pluginConfig[key]"
              type="textarea"
              :rows="3"
            />
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showConfigDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="savingConfig"
            @click="savePluginConfig"
          >
            {{ savingConfig ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Search,
  Grid,
  MoreFilled,
  Download,
  Star,
  Clock,
  UploadFilled
} from '@element-plus/icons-vue'
import api from '@/api'
import { formatNumber, formatTime, debounce } from '@/utils'
import type { Plugin } from '@/types'

// 响应式数据
const plugins = ref<Plugin[]>([])
const marketPlugins = ref<Plugin[]>([])
const categories = ref<Array<{ name: string; count: number }>>([])
const loading = ref(false)
const installing = ref(false)
const savingConfig = ref(false)

// 搜索和筛选
const searchKeyword = ref('')
const filterStatus = ref('')
const filterCategory = ref('')
const marketSearch = ref('')

// 对话框状态
const showInstallDialog = ref(false)
const showConfigDialog = ref(false)
const installTab = ref('market')

// 当前操作的插件
const currentPlugin = ref<Plugin | null>(null)
const pluginConfig = ref<Record<string, any>>({})

// 安装表单
const installForm = reactive({
  url: '',
  version: '',
  file: null as File | null
})

// 计算属性
const filteredPlugins = computed(() => {
  let result = plugins.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(plugin => 
      plugin.name.toLowerCase().includes(keyword) ||
      plugin.displayName?.toLowerCase().includes(keyword) ||
      plugin.description.toLowerCase().includes(keyword) ||
      plugin.author.toLowerCase().includes(keyword)
    )
  }
  
  // 状态筛选
  if (filterStatus.value) {
    result = result.filter(plugin => plugin.status === filterStatus.value)
  }
  
  // 分类筛选
  if (filterCategory.value) {
    result = result.filter(plugin => 
      plugin.keywords.includes(filterCategory.value)
    )
  }
  
  return result
})

// 获取状态类型
function getStatusType(status: string) {
  const types: Record<string, string> = {
    active: 'success',
    inactive: 'info',
    error: 'danger',
    loading: 'warning'
  }
  return types[status] || 'info'
}

// 获取状态文本
function getStatusText(status: string) {
  const texts: Record<string, string> = {
    active: '运行中',
    inactive: '已停止',
    error: '错误',
    loading: '加载中'
  }
  return texts[status] || '未知'
}

// 加载插件列表
async function loadPlugins() {
  loading.value = true
  try {
    const [pluginsRes, categoriesRes] = await Promise.all([
      api.plugin.getPlugins(),
      api.plugin.getPluginCategories()
    ])
    
    plugins.value = pluginsRes.data.data
    categories.value = categoriesRes.data.data
  } catch (error) {
    console.error('加载插件列表失败:', error)
    ElMessage.error('加载插件列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新插件列表
function refreshPlugins() {
  loadPlugins()
}

// 搜索处理
const handleSearch = debounce(() => {
  // 搜索逻辑已在计算属性中处理
}, 300)

// 筛选处理
function handleFilter() {
  // 筛选逻辑已在计算属性中处理
}

// 切换插件状态
async function togglePlugin(plugin: Plugin) {
  try {
    plugin.status = 'loading'
    await api.plugin.togglePlugin(plugin.id, plugin.enabled)
    
    plugin.status = plugin.enabled ? 'active' : 'inactive'
    ElMessage.success(`插件已${plugin.enabled ? '启用' : '禁用'}`)
  } catch (error) {
    console.error('切换插件状态失败:', error)
    plugin.enabled = !plugin.enabled // 回滚状态
    plugin.status = 'error'
    ElMessage.error('切换插件状态失败')
  }
}

// 处理插件操作
async function handlePluginAction(command: { action: string; plugin: Plugin }) {
  const { action, plugin } = command
  
  switch (action) {
    case 'toggle':
      plugin.enabled = !plugin.enabled
      await togglePlugin(plugin)
      break
      
    case 'config':
      await openPluginConfig(plugin)
      break
      
    case 'restart':
      await restartPlugin(plugin)
      break
      
    case 'update':
      await updatePlugin(plugin)
      break
      
    case 'uninstall':
      await uninstallPlugin(plugin)
      break
  }
}

// 打开插件配置
async function openPluginConfig(plugin: Plugin) {
  try {
    currentPlugin.value = plugin
    const res = await api.plugin.getPluginConfig(plugin.id)
    pluginConfig.value = res.data.data
    showConfigDialog.value = true
  } catch (error) {
    console.error('获取插件配置失败:', error)
    ElMessage.error('获取插件配置失败')
  }
}

// 保存插件配置
async function savePluginConfig() {
  if (!currentPlugin.value) return
  
  savingConfig.value = true
  try {
    await api.plugin.updatePluginConfig({
      id: currentPlugin.value.id,
      config: pluginConfig.value
    })
    
    ElMessage.success('配置保存成功')
    showConfigDialog.value = false
  } catch (error) {
    console.error('保存插件配置失败:', error)
    ElMessage.error('保存插件配置失败')
  } finally {
    savingConfig.value = false
  }
}

// 重启插件
async function restartPlugin(plugin: Plugin) {
  try {
    await ElMessageBox.confirm(
      `确定要重启插件 "${plugin.displayName || plugin.name}" 吗？`,
      '重启插件',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    plugin.status = 'loading'
    await api.plugin.restartPlugin(plugin.id)
    
    plugin.status = 'active'
    ElMessage.success('插件重启成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重启插件失败:', error)
      plugin.status = 'error'
      ElMessage.error('重启插件失败')
    }
  }
}

// 更新插件
async function updatePlugin(plugin: Plugin) {
  try {
    await ElMessageBox.confirm(
      `确定要更新插件 "${plugin.displayName || plugin.name}" 吗？`,
      '更新插件',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    plugin.status = 'updating'
    await api.plugin.updatePlugin({ id: plugin.id })
    
    ElMessage.success('插件更新成功')
    await loadPlugins() // 重新加载插件列表
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新插件失败:', error)
      plugin.status = 'error'
      ElMessage.error('更新插件失败')
    }
  }
}

// 卸载插件
async function uninstallPlugin(plugin: Plugin) {
  try {
    await ElMessageBox.confirm(
      `确定要卸载插件 "${plugin.displayName || plugin.name}" 吗？此操作不可恢复。`,
      '卸载插件',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.plugin.uninstallPlugin(plugin.id)
    
    ElMessage.success('插件卸载成功')
    await loadPlugins() // 重新加载插件列表
  } catch (error) {
    if (error !== 'cancel') {
      console.error('卸载插件失败:', error)
      ElMessage.error('卸载插件失败')
    }
  }
}

// 搜索插件市场
const searchMarket = debounce(async () => {
  try {
    const res = await api.plugin.getMarketPlugins({
      keyword: marketSearch.value
    })
    marketPlugins.value = res.data.data.items
  } catch (error) {
    console.error('搜索插件市场失败:', error)
  }
}, 300)

// 选择市场插件
function selectMarketPlugin(plugin: Plugin) {
  installForm.url = plugin.repository || ''
  installForm.version = plugin.version
  installTab.value = 'url'
}

// 处理文件上传
function handleFileChange(file: any) {
  installForm.file = file.raw
}

// 安装插件
async function installPlugin() {
  installing.value = true
  try {
    let installData: any = {}
    
    switch (installTab.value) {
      case 'market':
        // 从市场安装的逻辑
        ElMessage.info('请选择要安装的插件')
        return
        
      case 'url':
        if (!installForm.url) {
          ElMessage.error('请输入插件URL')
          return
        }
        installData = {
          url: installForm.url,
          version: installForm.version
        }
        break
        
      case 'file':
        if (!installForm.file) {
          ElMessage.error('请选择插件文件')
          return
        }
        installData = {
          file: installForm.file
        }
        break
    }
    
    await api.plugin.installPlugin(installData)
    
    ElMessage.success('插件安装成功')
    showInstallDialog.value = false
    await loadPlugins() // 重新加载插件列表
    
    // 重置表单
    installForm.url = ''
    installForm.version = ''
    installForm.file = null
  } catch (error) {
    console.error('安装插件失败:', error)
    ElMessage.error('安装插件失败')
  } finally {
    installing.value = false
  }
}

// 页面加载
onMounted(() => {
  loadPlugins()
  searchMarket() // 加载市场插件
})
</script>

<style scoped>
.plugins-container {
  padding: 20px;
  background: var(--el-bg-color-page);
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.page-description {
  color: var(--el-text-color-regular);
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.search-card {
  margin-bottom: 20px;
  border: none;
}

.search-container {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-left {
  flex: 1;
}

.search-input {
  max-width: 400px;
}

.search-right {
  display: flex;
  gap: 12px;
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.plugin-card {
  border: none;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.plugin-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.plugin-card.plugin-active {
  border-left: 4px solid var(--el-color-success);
}

.plugin-card.plugin-inactive {
  border-left: 4px solid var(--el-color-info);
}

.plugin-card.plugin-error {
  border-left: 4px solid var(--el-color-danger);
}

.plugin-card.plugin-loading {
  border-left: 4px solid var(--el-color-warning);
}

.plugin-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.plugin-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  overflow: hidden;
}

.plugin-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plugin-info {
  flex: 1;
}

.plugin-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 4px 0;
  line-height: 1.4;
}

.plugin-author {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin: 0;
}

.plugin-actions {
  margin-left: 12px;
}

.plugin-description {
  margin-bottom: 16px;
}

.plugin-description p {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plugin-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.plugin-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plugin-version {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.plugin-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.empty-state {
  margin: 60px 0;
}

.loading-state {
  padding: 20px;
}

.install-tabs {
  margin-bottom: 20px;
}

.market-search {
  margin-bottom: 16px;
}

.market-plugins {
  max-height: 400px;
  overflow-y: auto;
}

.market-plugin {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.market-plugin:hover {
  border-color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.market-plugin-info {
  flex: 1;
}

.market-plugin-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.market-plugin-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
}

.market-plugin-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.upload-demo {
  width: 100%;
}

.plugin-config {
  max-height: 400px;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.danger {
  color: var(--el-color-danger) !important;
}

@media (max-width: 768px) {
  .plugins-container {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-end;
  }
  
  .search-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-right {
    justify-content: space-between;
  }
  
  .plugins-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .plugin-card {
    padding: 16px;
  }
  
  .plugin-header {
    margin-bottom: 12px;
  }
  
  .plugin-icon {
    width: 40px;
    height: 40px;
  }
  
  .plugin-name {
    font-size: 15px;
  }
}
</style>