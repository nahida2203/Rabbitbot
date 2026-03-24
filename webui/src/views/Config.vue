<template>
  <div class="config-container">
    
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">系统配置</h1>
        <p class="page-description">管理 Yunzai 系统配置</p>
      </div>
      <div class="header-right">
        <el-button @click="exportConfig">
          <el-icon><Download /></el-icon>
          导出配置
        </el-button>
        <el-button @click="importConfig">
          <el-icon><Upload /></el-icon>
          导入配置
        </el-button>
        <el-button type="primary" @click="saveAllConfig" :loading="saving">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>
    
    
    <div class="config-nav">
      <el-card shadow="never" class="nav-card">
        <el-menu
          :default-active="activeCategory"
          mode="horizontal"
          @select="handleCategorySelect"
          class="category-menu"
        >
          <el-menu-item
            v-for="category in categories"
            :key="category.key"
            :index="category.key"
          >
            <el-icon><component :is="category.icon" /></el-icon>
            <span>{{ category.name }}</span>
            <el-badge
              v-if="getChangedCount(category.key) > 0"
              :value="getChangedCount(category.key)"
              class="category-badge"
            />
          </el-menu-item>
        </el-menu>
      </el-card>
    </div>
    
    
    <div class="config-content">
      <el-card shadow="never" class="content-card">
        
        <div class="search-container">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索配置项"
            prefix-icon="Search"
            clearable
            @input="handleSearch"
            class="search-input"
          />
        </div>
        
        
        <div v-if="currentCategory" class="config-form">
          <div class="category-header">
            <h2 class="category-title">
              <el-icon><component :is="currentCategory.icon" /></el-icon>
              {{ currentCategory.name }}
            </h2>
            <p class="category-description">{{ currentCategory.description }}</p>
          </div>
          
          <el-form
            ref="configFormRef"
            :model="configData"
            label-width="150px"
            class="config-form-content"
          >
            <div
              v-for="group in filteredConfigGroups"
              :key="group.key"
              class="config-group"
            >
              <div class="group-header">
                <h3 class="group-title">{{ group.name }}</h3>
                <p v-if="group.description" class="group-description">
                  {{ group.description }}
                </p>
              </div>
              
              <div class="group-items">
                <el-form-item
                  v-for="item in group.items"
                  :key="item.key"
                  :label="item.name"
                  :prop="item.key"
                  class="config-item"
                  :class="{
                    'item-changed': isConfigChanged(item.key),
                    'item-required': item.required
                  }"
                >
                  <template #label>
                    <div class="item-label">
                      <span class="label-text">{{ item.name }}</span>
                      <el-tooltip
                        v-if="item.description"
                        :content="item.description"
                        placement="top"
                      >
                        <el-icon class="label-help"><QuestionFilled /></el-icon>
                      </el-tooltip>
                      <el-tag
                        v-if="item.required"
                        type="danger"
                        size="small"
                        class="label-required"
                      >
                        必填
                      </el-tag>
                    </div>
                  </template>
                  
                  
                  <el-input
                    v-if="item.type === 'string'"
                    v-model="configData[item.key]"
                    :placeholder="item.placeholder || item.default"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                  />
                  
                  
                  <el-input-number
                    v-else-if="item.type === 'number'"
                    v-model="configData[item.key]"
                    :min="item.min"
                    :max="item.max"
                    :step="item.step || 1"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                    style="width: 100%"
                  />
                  
                  
                  <el-switch
                    v-else-if="item.type === 'boolean'"
                    v-model="configData[item.key]"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                  />
                  
                  
                  <el-select
                    v-else-if="item.type === 'select'"
                    v-model="configData[item.key]"
                    :placeholder="item.placeholder"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="option in item.options"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                  
                  
                  <el-select
                    v-else-if="item.type === 'multiselect'"
                    v-model="configData[item.key]"
                    multiple
                    :placeholder="item.placeholder"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="option in item.options"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                  
                  
                  <el-input
                    v-else-if="item.type === 'textarea'"
                    v-model="configData[item.key]"
                    type="textarea"
                    :rows="item.rows || 3"
                    :placeholder="item.placeholder"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                  />
                  
                  
                  <div v-else-if="item.type === 'json'" class="json-editor">
                    <el-input
                      v-model="configData[item.key]"
                      type="textarea"
                      :rows="item.rows || 6"
                      :placeholder="item.placeholder"
                      :disabled="item.readonly"
                      @change="markConfigChanged(item.key)"
                    />
                    <div class="json-actions">
                      <el-button
                        size="small"
                        @click="formatJson(item.key)"
                        :disabled="item.readonly"
                      >
                        格式化
                      </el-button>
                      <el-button
                        size="small"
                        @click="validateJson(item.key)"
                      >
                        验证
                      </el-button>
                    </div>
                  </div>
                  
                  
                  <div v-else-if="item.type === 'file'" class="file-input">
                    <el-input
                      v-model="configData[item.key]"
                      :placeholder="item.placeholder"
                      :disabled="item.readonly"
                      @change="markConfigChanged(item.key)"
                    >
                      <template #append>
                        <el-button
                          @click="selectFile(item.key)"
                          :disabled="item.readonly"
                        >
                          选择文件
                        </el-button>
                      </template>
                    </el-input>
                  </div>
                  
                  
                  <el-color-picker
                    v-else-if="item.type === 'color'"
                    v-model="configData[item.key]"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                  />
                  
                  
                  <el-date-picker
                    v-else-if="item.type === 'datetime'"
                    v-model="configData[item.key]"
                    type="datetime"
                    :placeholder="item.placeholder"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                    style="width: 100%"
                  />
                  
                  
                  <el-input
                    v-else
                    v-model="configData[item.key]"
                    :placeholder="item.placeholder || item.default"
                    :disabled="item.readonly"
                    @change="markConfigChanged(item.key)"
                  />
                  
                  
                  <div class="item-actions">
                    <el-button
                      v-if="isConfigChanged(item.key)"
                      size="small"
                      type="warning"
                      text
                      @click="resetConfigItem(item.key)"
                    >
                      重置
                    </el-button>
                    <el-button
                      v-if="item.default !== undefined"
                      size="small"
                      text
                      @click="setDefaultValue(item.key, item.default)"
                    >
                      默认值
                    </el-button>
                  </div>
                </el-form-item>
              </div>
            </div>
          </el-form>
        </div>
        
        
        <el-empty
          v-if="!currentCategory"
          description="请选择配置分类"
          class="empty-state"
        />
      </el-card>
    </div>
    
    
    <el-dialog
      v-model="showImportDialog"
      title="导入配置"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-upload
        ref="uploadRef"
        class="upload-demo"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".json"
        @change="handleImportFile"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将配置文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 JSON 格式的配置文件
          </div>
        </template>
      </el-upload>
      
      <div v-if="importPreview" class="import-preview">
        <h4>配置预览</h4>
        <el-scrollbar height="200px">
          <pre class="preview-content">{{ importPreview }}</pre>
        </el-scrollbar>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="importing"
            :disabled="!importPreview"
            @click="confirmImport"
          >
            {{ importing ? '导入中...' : '确认导入' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Upload,
  Check,
  Search,
  QuestionFilled,
  UploadFilled,
  Setting,
  User,
  ChatDotRound,
  Monitor,
  Shield,
  Bell,
  Folder,
  Connection
} from '@element-plus/icons-vue'
import api from '@/api'
import { debounce } from '@/utils'
import type { Config, ConfigCategory } from '@/types'

// 响应式数据
const categories = ref<ConfigCategory[]>([])
const configData = ref<Record<string, any>>({})
const originalConfigData = ref<Record<string, any>>({})
const changedKeys = ref<Set<string>>(new Set())
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)

// 当前状态
const activeCategory = ref('')
const searchKeyword = ref('')
const showImportDialog = ref(false)
const importPreview = ref('')
const importFile = ref<File | null>(null)

// 表单引用
const configFormRef = ref()
const uploadRef = ref()

// 配置分类图标映射
const categoryIcons: Record<string, any> = {
  basic: Setting,
  user: User,
  bot: ChatDotRound,
  system: Monitor,
  security: Shield,
  notification: Bell,
  plugin: Folder,
  network: Connection
}

// 计算属性
const currentCategory = computed(() => {
  return categories.value.find(cat => cat.key === activeCategory.value)
})

const filteredConfigGroups = computed(() => {
  if (!currentCategory.value) return []
  
  let groups = currentCategory.value.groups || []
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    groups = groups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.name.toLowerCase().includes(keyword) ||
        item.key.toLowerCase().includes(keyword) ||
        (item.description && item.description.toLowerCase().includes(keyword))
      )
    })).filter(group => group.items.length > 0)
  }
  
  return groups
})

// 获取分类变更数量
function getChangedCount(categoryKey: string) {
  const category = categories.value.find(cat => cat.key === categoryKey)
  if (!category) return 0
  
  let count = 0
  category.groups?.forEach(group => {
    group.items.forEach(item => {
      if (changedKeys.value.has(item.key)) {
        count++
      }
    })
  })
  
  return count
}

// 检查配置是否已更改
function isConfigChanged(key: string) {
  return changedKeys.value.has(key)
}

// 标记配置已更改
function markConfigChanged(key: string) {
  if (configData.value[key] !== originalConfigData.value[key]) {
    changedKeys.value.add(key)
  } else {
    changedKeys.value.delete(key)
  }
}

// 重置单个配置项
function resetConfigItem(key: string) {
  configData.value[key] = originalConfigData.value[key]
  changedKeys.value.delete(key)
}

// 设置默认值
function setDefaultValue(key: string, defaultValue: any) {
  configData.value[key] = defaultValue
  markConfigChanged(key)
}

// 格式化 JSON
function formatJson(key: string) {
  try {
    const value = configData.value[key]
    if (typeof value === 'string') {
      const parsed = JSON.parse(value)
      configData.value[key] = JSON.stringify(parsed, null, 2)
      markConfigChanged(key)
    }
  } catch (error) {
    ElMessage.error('JSON 格式错误')
  }
}

// 验证 JSON
function validateJson(key: string) {
  try {
    const value = configData.value[key]
    if (typeof value === 'string') {
      JSON.parse(value)
      ElMessage.success('JSON 格式正确')
    }
  } catch (error) {
    ElMessage.error('JSON 格式错误')
  }
}

// 选择文件
function selectFile(key: string) {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    if (file) {
      configData.value[key] = file.path || file.name
      markConfigChanged(key)
    }
  }
  input.click()
}

// 处理分类选择
function handleCategorySelect(key: string) {
  activeCategory.value = key
  loadCategoryConfig(key)
}

// 搜索处理
const handleSearch = debounce(() => {
  // 搜索逻辑已在计算属性中处理
}, 300)

// 加载配置分类
async function loadCategories() {
  try {
    const res = await api.config.getConfigCategories()
    categories.value = res.data.data.map(cat => ({
      ...cat,
      icon: categoryIcons[cat.key] || Setting
    }))
    
    if (categories.value.length > 0 && !activeCategory.value) {
      activeCategory.value = categories.value[0].key
      await loadCategoryConfig(activeCategory.value)
    }
  } catch (error) {
    console.error('加载配置分类失败:', error)
    ElMessage.error('加载配置分类失败')
  }
}

// 加载分类配置
async function loadCategoryConfig(categoryKey: string) {
  loading.value = true
  try {
    const res = await api.config.getConfigs({ category: categoryKey })
    const configs = res.data.data
    
    // 构建配置数据
    const newConfigData: Record<string, any> = {}
    configs.forEach((config: Config) => {
      newConfigData[config.key] = config.value
    })
    
    configData.value = { ...configData.value, ...newConfigData }
    originalConfigData.value = { ...originalConfigData.value, ...newConfigData }
    
    // 清除该分类的变更标记
    const category = categories.value.find(cat => cat.key === categoryKey)
    if (category) {
      category.groups?.forEach(group => {
        group.items.forEach(item => {
          changedKeys.value.delete(item.key)
        })
      })
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

// 保存所有配置
async function saveAllConfig() {
  if (changedKeys.value.size === 0) {
    ElMessage.info('没有配置需要保存')
    return
  }
  
  saving.value = true
  try {
    const updates: Array<{ key: string; value: any }> = []
    changedKeys.value.forEach(key => {
      updates.push({
        key,
        value: configData.value[key]
      })
    })
    
    await api.config.updateConfigs({ configs: updates })
    
    // 更新原始数据
    updates.forEach(update => {
      originalConfigData.value[update.key] = update.value
    })
    
    // 清除变更标记
    changedKeys.value.clear()
    
    ElMessage.success('配置保存成功')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// 导出配置
async function exportConfig() {
  try {
    const res = await api.config.exportConfigs()
    const blob = new Blob([JSON.stringify(res.data.data, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yunzai-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('配置导出成功')
  } catch (error) {
    console.error('导出配置失败:', error)
    ElMessage.error('导出配置失败')
  }
}

// 导入配置
function importConfig() {
  showImportDialog.value = true
  importPreview.value = ''
  importFile.value = null
}

// 处理导入文件
function handleImportFile(file: any) {
  importFile.value = file.raw
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const parsed = JSON.parse(content)
      importPreview.value = JSON.stringify(parsed, null, 2)
    } catch (error) {
      ElMessage.error('文件格式错误')
      importPreview.value = ''
    }
  }
  reader.readAsText(importFile.value)
}

// 确认导入
async function confirmImport() {
  if (!importFile.value || !importPreview.value) {
    ElMessage.error('请选择有效的配置文件')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '导入配置将覆盖现有配置，确定要继续吗？',
      '确认导入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    importing.value = true
    
    const formData = new FormData()
    formData.append('file', importFile.value)
    
    await api.config.importConfigs(formData)
    
    ElMessage.success('配置导入成功')
    showImportDialog.value = false
    
    // 重新加载配置
    await loadCategories()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导入配置失败:', error)
      ElMessage.error('导入配置失败')
    }
  } finally {
    importing.value = false
  }
}

// 页面加载
onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.config-container {
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

.config-nav {
  margin-bottom: 20px;
}

.nav-card {
  border: none;
  padding: 0;
}

.category-menu {
  border-bottom: none;
}

.category-menu .el-menu-item {
  position: relative;
  padding: 0 20px;
  height: 50px;
  line-height: 50px;
}

.category-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

.config-content {
  min-height: 600px;
}

.content-card {
  border: none;
  padding: 20px;
}

.search-container {
  margin-bottom: 24px;
}

.search-input {
  max-width: 400px;
}

.category-header {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.category-description {
  color: var(--el-text-color-regular);
  margin: 0;
  line-height: 1.5;
}

.config-group {
  margin-bottom: 40px;
}

.group-header {
  margin-bottom: 20px;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
}

.group-description {
  color: var(--el-text-color-regular);
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.group-items {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 20px;
}

.config-item {
  position: relative;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-item.item-changed {
  border-color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.config-item.item-required .item-label .label-text::after {
  content: ' *';
  color: var(--el-color-danger);
}

.item-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.label-text {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.label-help {
  color: var(--el-text-color-placeholder);
  cursor: help;
}

.label-required {
  margin-left: auto;
}

.item-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.json-editor {
  width: 100%;
}

.json-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.file-input {
  width: 100%;
}

.empty-state {
  margin: 60px 0;
}

.upload-demo {
  width: 100%;
  margin-bottom: 20px;
}

.import-preview {
  margin-top: 20px;
}

.import-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.preview-content {
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-regular);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .config-container {
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
  
  .category-menu {
    overflow-x: auto;
  }
  
  .category-menu .el-menu-item {
    white-space: nowrap;
    min-width: 120px;
  }
  
  .content-card {
    padding: 16px;
  }
  
  .config-form-content {
    --el-form-label-width: 100px;
  }
  
  .group-items {
    padding: 16px;
  }
  
  .config-item {
    padding: 12px;
  }
  
  .item-label {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .label-required {
    margin-left: 0;
  }
}
</style>