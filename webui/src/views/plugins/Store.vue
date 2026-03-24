<template>
  <div class="plugin-store">
    <div class="store-header">
      <h1>插件商店</h1>
      <p>发现和安装优质的Yunzai插件</p>
    </div>

    
    <div class="search-section">
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
        <el-col :xs="24" :sm="12" :md="4">
          <el-select v-model="selectedCategory" placeholder="分类" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="娱乐" value="entertainment" />
            <el-option label="工具" value="utility" />
            <el-option label="管理" value="management" />
            <el-option label="信息" value="information" />
            <el-option label="游戏" value="game" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="4">
          <el-select v-model="sortBy" placeholder="排序" @change="handleSort">
            <el-option label="最新" value="latest" />
            <el-option label="最热" value="popular" />
            <el-option label="评分" value="rating" />
            <el-option label="下载量" value="downloads" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="4">
          <el-button type="primary" @click="refreshStore">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
        <el-col :xs="24" :sm="12" :md="4">
          <el-button @click="showUploadDialog">
            <el-icon><Upload /></el-icon>
            上传插件
          </el-button>
        </el-col>
      </el-row>
    </div>

    
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="6">
          <el-statistic title="总插件数" :value="totalPlugins" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="本月新增" :value="monthlyNew" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="总下载量" :value="totalDownloads" suffix="次" />
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-statistic title="活跃开发者" :value="activeDevelopers" suffix="人" />
        </el-col>
      </el-row>
    </div>

    
    <div class="plugins-section">
      <el-row :gutter="20">
        <el-col
          v-for="plugin in filteredPlugins"
          :key="plugin.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card class="plugin-card" shadow="hover" @click="viewPlugin(plugin)">
            <div class="plugin-header">
              <div class="plugin-icon">
                <img v-if="plugin.icon" :src="plugin.icon" :alt="plugin.name" />
                <el-icon v-else :size="40"><Box /></el-icon>
              </div>
              <div class="plugin-info">
                <h3 class="plugin-name">{{ plugin.name }}</h3>
                <p class="plugin-author">by {{ plugin.author }}</p>
              </div>
            </div>
            
            <div class="plugin-description">
              <p>{{ plugin.description }}</p>
            </div>
            
            <div class="plugin-meta">
              <div class="meta-row">
                <el-tag :type="getCategoryType(plugin.category)" size="small">
                  {{ getCategoryText(plugin.category) }}
                </el-tag>
                <span class="version">v{{ plugin.version }}</span>
              </div>
              <div class="meta-row">
                <div class="rating">
                  <el-rate v-model="plugin.rating" disabled size="small" />
                  <span class="rating-text">({{ plugin.reviews }})</span>
                </div>
              </div>
              <div class="meta-row">
                <span class="downloads">
                  <el-icon><Download /></el-icon>
                  {{ formatNumber(plugin.downloads) }}
                </span>
                <span class="update-time">{{ formatDate(plugin.updateTime) }}</span>
              </div>
            </div>
            
            <div class="plugin-actions" @click.stop>
              <el-button
                v-if="!plugin.installed"
                type="primary"
                size="small"
                @click="installPlugin(plugin)"
                :loading="plugin.installing"
              >
                <el-icon><Download /></el-icon>
                安装
              </el-button>
              <el-button
                v-else
                type="success"
                size="small"
                disabled
              >
                <el-icon><Check /></el-icon>
                已安装
              </el-button>
              <el-button size="small" @click="viewPlugin(plugin)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
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
      v-model="uploadDialogVisible"
      title="上传插件"
      width="600px"
    >
      <el-form :model="uploadForm" label-width="100px">
        <el-form-item label="插件文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".zip,.tar.gz"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .zip 或 .tar.gz 格式，文件大小不超过 50MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="插件名称">
          <el-input v-model="uploadForm.name" placeholder="请输入插件名称" />
        </el-form-item>
        <el-form-item label="插件描述">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入插件描述"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="uploadForm.category" placeholder="请选择分类">
            <el-option label="娱乐" value="entertainment" />
            <el-option label="工具" value="utility" />
            <el-option label="管理" value="management" />
            <el-option label="信息" value="information" />
            <el-option label="游戏" value="game" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号">
          <el-input v-model="uploadForm.version" placeholder="如: 1.0.0" />
        </el-form-item>
        <el-form-item label="开源协议">
          <el-select v-model="uploadForm.license" placeholder="请选择开源协议">
            <el-option label="MIT" value="MIT" />
            <el-option label="Apache 2.0" value="Apache-2.0" />
            <el-option label="GPL v3" value="GPL-3.0" />
            <el-option label="BSD 3-Clause" value="BSD-3-Clause" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload" :loading="uploading">
          上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Upload,
  Box,
  Download,
  Check,
  View,
  UploadFilled
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const selectedCategory = ref('')
const sortBy = ref('latest')
const currentPage = ref(1)
const pageSize = ref(12)
const uploadDialogVisible = ref(false)
const uploading = ref(false)

// 统计数据
const totalPlugins = ref(0)
const monthlyNew = ref(0)
const totalDownloads = ref(0)
const activeDevelopers = ref(0)

// 上传表单
const uploadForm = ref({
  name: '',
  description: '',
  category: '',
  version: '',
  license: ''
})

// 插件数据
const plugins = ref([])

// 计算属性
const filteredPlugins = computed(() => {
  let result = plugins.value
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(plugin => 
      plugin.name.toLowerCase().includes(query) ||
      plugin.description.toLowerCase().includes(query) ||
      plugin.author.toLowerCase().includes(query)
    )
  }
  
  // 分类过滤
  if (selectedCategory.value) {
    result = result.filter(plugin => plugin.category === selectedCategory.value)
  }
  
  // 排序
  switch (sortBy.value) {
    case 'popular':
      result.sort((a, b) => b.downloads - a.downloads)
      break
    case 'rating':
      result.sort((a, b) => b.rating - a.rating)
      break
    case 'downloads':
      result.sort((a, b) => b.downloads - a.downloads)
      break
    case 'latest':
    default:
      result.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime())
      break
  }
  
  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return result.slice(start, end)
})

// 加载插件商店数据
const loadPluginStore = async () => {
  try {
    const response = await fetch('/api/plugins/store', {
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
      throw new Error(result.message || '获取插件商店数据失败')
    }
    
    // 更新插件列表
    plugins.value = result.data.plugins || []
    
    // 更新统计数据
    totalPlugins.value = result.data.statistics?.totalPlugins || 0
    monthlyNew.value = result.data.statistics?.monthlyNew || 0
    totalDownloads.value = result.data.statistics?.totalDownloads || 0
    activeDevelopers.value = result.data.statistics?.activeDevelopers || 0
    
  } catch (error) {
    console.error('加载插件商店数据失败:', error)
    ElMessage.error(`加载插件商店数据失败: ${error.message}`)
  }
}

// 方法
const getCategoryType = (category: string) => {
  switch (category) {
    case 'entertainment': return 'success'
    case 'utility': return 'primary'
    case 'management': return 'warning'
    case 'information': return 'info'
    case 'game': return 'danger'
    default: return 'info'
  }
}

const getCategoryText = (category: string) => {
  switch (category) {
    case 'entertainment': return '娱乐'
    case 'utility': return '工具'
    case 'management': return '管理'
    case 'information': return '信息'
    case 'game': return '游戏'
    default: return '其他'
  }
}

const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const formatDate = (date: string) => {
  return dayjs(date).format('MM-DD')
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleFilter = () => {
  currentPage.value = 1
}

const handleSort = () => {
  currentPage.value = 1
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const refreshStore = async () => {
  try {
    await loadPluginStore()
    ElMessage.success('商店数据已刷新')
  } catch (error) {
    console.error('刷新商店数据失败:', error)
    ElMessage.error('刷新商店数据失败')
  }
}

const installPlugin = async (plugin: any) => {
  try {
    plugin.installing = true
    
    const response = await fetch('/api/plugins/install', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pluginId: plugin.id,
        name: plugin.name,
        version: plugin.version
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '安装失败')
    }
    
    plugin.installed = true
    plugin.downloads += 1
    ElMessage.success(`插件 "${plugin.name}" 安装成功`)
    
  } catch (error) {
    console.error('插件安装失败:', error)
    ElMessage.error(`插件 "${plugin.name}" 安装失败: ${error.message}`)
  } finally {
    plugin.installing = false
  }
}

const viewPlugin = (plugin: any) => {
  router.push(`/plugins/detail/${plugin.id}`)
}

const showUploadDialog = () => {
  uploadForm.value = {
    name: '',
    description: '',
    category: '',
    version: '',
    license: ''
  }
  uploadDialogVisible.value = true
}

const submitUpload = async () => {
  if (!uploadForm.value.name || !uploadForm.value.description) {
    ElMessage.error('请填写完整信息')
    return
  }
  
  uploading.value = true
  try {
    const response = await fetch('/api/plugins/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(uploadForm.value)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || '上传失败')
    }
    
    ElMessage.success('插件上传成功，等待审核')
    uploadDialogVisible.value = false
    
  } catch (error) {
    console.error('插件上传失败:', error)
    ElMessage.error(`插件上传失败: ${error.message}`)
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  // 加载插件商店数据
  loadPluginStore()
})
</script>

<style lang="scss" scoped>
.plugin-store {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}

.store-header {
  margin-bottom: 30px;
  text-align: center;
  
  h1 {
    margin: 0 0 10px 0;
    font-size: 32px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  p {
    margin: 0;
    font-size: 16px;
    color: var(--el-text-color-regular);
  }
}

.search-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}

.stats-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}

.plugins-section {
  margin-bottom: 30px;
}

.plugin-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--el-box-shadow);
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
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.plugin-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  img {
    width: 40px;
    height: 40px;
    border-radius: 6px;
  }
}

.plugin-info {
  flex: 1;
  min-width: 0;
  
  .plugin-name {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .plugin-author {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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
  margin-bottom: 15px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .version {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-family: 'Consolas', 'Monaco', monospace;
  }
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  
  .rating-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.downloads,
.update-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.plugin-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

@media (max-width: 768px) {
  .plugin-store {
    padding: 10px;
  }
  
  .store-header {
    margin-bottom: 20px;
    
    h1 {
      font-size: 24px;
    }
  }
  
  .search-section,
  .stats-section {
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .plugin-card {
    margin-bottom: 15px;
  }
}
</style>