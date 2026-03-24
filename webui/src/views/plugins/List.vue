<template>
  <div class="plugin-list">
    
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">插件管理</h1>
          <p class="page-description">管理和配置 Yunzai 插件</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showInstallDialog">
            <el-icon><Plus /></el-icon>
            安装插件
          </el-button>
          <el-button @click="refreshPlugins">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </div>

    
    <div class="filter-section">
      <el-card shadow="never">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8">
            <el-input
              v-model="searchQuery"
              placeholder="搜索插件名称或描述"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-select v-model="statusFilter" placeholder="状态筛选" clearable>
              <el-option label="全部" value="" />
              <el-option label="已启用" value="enabled" />
              <el-option label="已禁用" value="disabled" />
              <el-option label="未安装" value="uninstalled" />
            </el-select>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-select v-model="categoryFilter" placeholder="分类筛选" clearable>
              <el-option label="全部" value="" />
              <el-option label="娱乐" value="entertainment" />
              <el-option label="工具" value="utility" />
              <el-option label="管理" value="admin" />
              <el-option label="游戏" value="game" />
            </el-select>
          </el-col>
          <el-col :xs="24" :sm="12" :md="4">
            <el-button type="primary" @click="applyFilters">筛选</el-button>
          </el-col>
        </el-row>
      </el-card>
    </div>

    
    <div class="plugin-grid">
      <el-row :gutter="20">
        <el-col
          :xs="24"
          :sm="12"
          :lg="8"
          :xl="6"
          v-for="plugin in filteredPlugins"
          :key="plugin.id"
        >
          <el-card class="plugin-card" shadow="hover">
            <div class="plugin-header">
              <div class="plugin-icon">
                <img v-if="plugin.icon" :src="plugin.icon" :alt="plugin.name" />
                <el-icon v-else :size="32"><Box /></el-icon>
              </div>
              <div class="plugin-info">
                <h3 class="plugin-name">{{ plugin.name }}</h3>
                <p class="plugin-version">v{{ plugin.version }}</p>
              </div>
              <div class="plugin-status">
                <el-tag
                  :type="getStatusType(plugin.status)"
                  size="small"
                >
                  {{ getStatusText(plugin.status) }}
                </el-tag>
              </div>
            </div>
            
            <div class="plugin-description">
              <p>{{ plugin.description }}</p>
            </div>
            
            <div class="plugin-meta">
              <div class="meta-item">
                <el-icon><User /></el-icon>
                <span>{{ plugin.author }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(plugin.updateTime) }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Download /></el-icon>
                <span>{{ plugin.downloads }}</span>
              </div>
            </div>
            
            <div class="plugin-actions">
              <el-button
                v-if="plugin.status === 'disabled'"
                type="success"
                size="small"
                @click="enablePlugin(plugin)"
              >
                启用
              </el-button>
              <el-button
                v-if="plugin.status === 'enabled'"
                type="warning"
                size="small"
                @click="disablePlugin(plugin)"
              >
                禁用
              </el-button>
              <el-button
                v-if="plugin.status === 'uninstalled'"
                type="primary"
                size="small"
                @click="installPlugin(plugin)"
              >
                安装
              </el-button>
              <el-button
                size="small"
                @click="configurePlugin(plugin)"
              >
                配置
              </el-button>
              <el-dropdown trigger="click">
                <el-button size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="viewDetails(plugin)">
                      <el-icon><View /></el-icon>
                      查看详情
                    </el-dropdown-item>
                    <el-dropdown-item @click="updatePlugin(plugin)">
                      <el-icon><Upload /></el-icon>
                      更新
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="plugin.status !== 'uninstalled'"
                      @click="uninstallPlugin(plugin)"
                      divided
                    >
                      <el-icon><Delete /></el-icon>
                      卸载
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 48, 96]"
        :total="totalPlugins"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    
    <el-dialog
      v-model="installDialogVisible"
      title="安装插件"
      width="600px"
      @close="resetInstallForm"
    >
      <el-form :model="installForm" label-width="100px">
        <el-form-item label="安装方式">
          <el-radio-group v-model="installForm.method">
            <el-radio label="git">Git 仓库</el-radio>
            <el-radio label="npm">NPM 包</el-radio>
            <el-radio label="local">本地文件</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="installForm.method === 'git'"
          label="仓库地址"
        >
          <el-input
            v-model="installForm.gitUrl"
            placeholder="https://github.com/user/plugin.git"
          />
        </el-form-item>
        <el-form-item
          v-if="installForm.method === 'npm'"
          label="包名"
        >
          <el-input
            v-model="installForm.npmPackage"
            placeholder="@yunzai/plugin-name"
          />
        </el-form-item>
        <el-form-item
          v-if="installForm.method === 'local'"
          label="本地路径"
        >
          <el-input
            v-model="installForm.localPath"
            placeholder="/path/to/plugin"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="installDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInstall" :loading="installing">
          安装
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Search,
  Box,
  User,
  Calendar,
  Download,
  MoreFilled,
  View,
  Upload,
  Delete
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// 响应式数据
const searchQuery = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(12)
const installDialogVisible = ref(false)
const installing = ref(false)

// 安装表单
const installForm = ref({
  method: 'git',
  gitUrl: '',
  npmPackage: '',
  localPath: ''
})

// 模拟插件数据
const plugins = ref([
  {
    id: 1,
    name: '签到插件',
    version: '1.2.0',
    description: '提供每日签到功能，支持多种签到奖励',
    author: 'Yunzai Team',
    category: 'utility',
    status: 'enabled',
    updateTime: '2024-01-15',
    downloads: 1234,
    icon: null
  },
  {
    id: 2,
    name: '抽卡模拟器',
    version: '2.1.5',
    description: '模拟各种游戏的抽卡系统',
    author: 'Game Dev',
    category: 'game',
    status: 'enabled',
    updateTime: '2024-01-10',
    downloads: 2567,
    icon: null
  },
  {
    id: 3,
    name: '天气查询',
    version: '1.0.3',
    description: '查询全国各地天气信息',
    author: 'Weather Team',
    category: 'utility',
    status: 'disabled',
    updateTime: '2024-01-08',
    downloads: 890,
    icon: null
  },
  {
    id: 4,
    name: '音乐点播',
    version: '3.0.1',
    description: '支持多平台音乐搜索和播放',
    author: 'Music Lover',
    category: 'entertainment',
    status: 'enabled',
    updateTime: '2024-01-12',
    downloads: 3456,
    icon: null
  },
  {
    id: 5,
    name: '群管助手',
    version: '1.5.2',
    description: '提供群组管理功能',
    author: 'Admin Tools',
    category: 'admin',
    status: 'uninstalled',
    updateTime: '2024-01-05',
    downloads: 1789,
    icon: null
  }
])

// 计算属性
const filteredPlugins = computed(() => {
  let result = plugins.value
  
  if (searchQuery.value) {
    result = result.filter(plugin => 
      plugin.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(plugin => plugin.status === statusFilter.value)
  }
  
  if (categoryFilter.value) {
    result = result.filter(plugin => plugin.category === categoryFilter.value)
  }
  
  return result
})

const totalPlugins = computed(() => filteredPlugins.value.length)

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
  return dayjs(date).format('MM-DD')
}

const handleSearch = () => {
  currentPage.value = 1
}

const applyFilters = () => {
  currentPage.value = 1
  ElMessage.success('筛选条件已应用')
}

const refreshPlugins = () => {
  ElMessage.success('插件列表已刷新')
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const enablePlugin = async (plugin: any) => {
  try {
    plugin.status = 'enabled'
    ElMessage.success(`${plugin.name} 已启用`)
  } catch (error) {
    ElMessage.error('启用插件失败')
  }
}

const disablePlugin = async (plugin: any) => {
  try {
    plugin.status = 'disabled'
    ElMessage.success(`${plugin.name} 已禁用`)
  } catch (error) {
    ElMessage.error('禁用插件失败')
  }
}

const installPlugin = async (plugin: any) => {
  try {
    plugin.status = 'enabled'
    ElMessage.success(`${plugin.name} 安装成功`)
  } catch (error) {
    ElMessage.error('安装插件失败')
  }
}

const uninstallPlugin = async (plugin: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要卸载插件 "${plugin.name}" 吗？`,
      '确认卸载',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    plugin.status = 'uninstalled'
    ElMessage.success(`${plugin.name} 已卸载`)
  } catch {
    // 用户取消
  }
}

const configurePlugin = (plugin: any) => {
  ElMessage.info(`配置 ${plugin.name} 功能开发中...`)
}

const viewDetails = (plugin: any) => {
  ElMessage.info(`查看 ${plugin.name} 详情功能开发中...`)
}

const updatePlugin = (plugin: any) => {
  ElMessage.info(`更新 ${plugin.name} 功能开发中...`)
}

const showInstallDialog = () => {
  installDialogVisible.value = true
}

const resetInstallForm = () => {
  installForm.value = {
    method: 'git',
    gitUrl: '',
    npmPackage: '',
    localPath: ''
  }
}

const confirmInstall = async () => {
  installing.value = true
  try {
    // 模拟安装过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('插件安装成功')
    installDialogVisible.value = false
    resetInstallForm()
  } catch (error) {
    ElMessage.error('插件安装失败')
  } finally {
    installing.value = false
  }
}

onMounted(() => {
  // 初始化数据
})
</script>

<style lang="scss" scoped>
.plugin-list {
  padding: 20px;
  background-color: var(--el-bg-color-page);
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
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-end;
  }
}

.filter-section {
  margin-bottom: 20px;
  
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.plugin-grid {
  margin-bottom: 20px;
}

.plugin-card {
  height: 100%;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  :deep(.el-card__body) {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.plugin-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 15px;
}

.plugin-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  
  img {
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }
}

.plugin-info {
  flex: 1;
  
  .plugin-name {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  .plugin-version {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.plugin-status {
  margin-left: 10px;
}

.plugin-description {
  flex: 1;
  margin-bottom: 15px;
  
  p {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-regular);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.plugin-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.meta-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-regular);
  
  .el-icon {
    margin-right: 4px;
  }
}

.plugin-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

@media (max-width: 768px) {
  .plugin-list {
    padding: 10px;
  }
  
  .plugin-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .plugin-actions {
    justify-content: space-between;
    
    .el-button {
      flex: 1;
      margin: 0;
    }
  }
}
</style>