<template>
  <div class="adapter-config">
    
    <div class="page-header">
      <h2>适配器配置</h2>
      <p>管理和配置各种适配器连接</p>
    </div>

    
    <el-card class="adapter-list">
      <template #header>
        <div class="card-header">
          <span>适配器列表</span>
          <el-button type="primary" @click="showAddDialog = true">
            <el-icon><Plus /></el-icon>
            添加适配器
          </el-button>
        </div>
      </template>

      <el-table :data="adapters" style="width: 100%">
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="endpoint" label="连接地址" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'connected' ? 'success' : 'danger'">
              {{ row.status === 'connected' ? '已连接' : '未连接' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row, $index }">
            <el-button
              v-if="row.status === 'disconnected'"
              type="success"
              size="small"
              @click="connectAdapter(row)"
            >
              连接
            </el-button>
            <el-button
              v-else
              type="warning"
              size="small"
              @click="disconnectAdapter(row)"
            >
              断开
            </el-button>
            <el-button type="primary" size="small" @click="editAdapter(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="deleteAdapter($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    
    <el-dialog
      v-model="showAddDialog"
      :title="editingAdapter ? '编辑适配器' : '添加适配器'"
      width="500px"
    >
      <el-form :model="adapterForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="adapterForm.name" placeholder="请输入适配器名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="adapterForm.type" placeholder="请选择适配器类型">
            <el-option label="QQ" value="qq" />
            <el-option label="微信" value="wechat" />
            <el-option label="Telegram" value="telegram" />
            <el-option label="Discord" value="discord" />
            <el-option label="钉钉" value="dingtalk" />
            <el-option label="飞书" value="feishu" />
          </el-select>
        </el-form-item>
        <el-form-item label="连接地址">
          <el-input v-model="adapterForm.endpoint" placeholder="请输入连接地址" />
        </el-form-item>
        <el-form-item label="Token">
          <el-input
            v-model="adapterForm.token"
            type="password"
            placeholder="请输入访问Token"
            show-password
          />
        </el-form-item>
        <el-form-item label="自动重连">
          <el-switch v-model="adapterForm.autoReconnect" />
        </el-form-item>
        <el-form-item label="心跳间隔">
          <el-input-number
            v-model="adapterForm.heartbeatInterval"
            :min="1000"
            :max="60000"
            :step="1000"
            controls-position="right"
          />
          <span style="margin-left: 8px; color: #999;">毫秒</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAdapter">保存</el-button>
      </template>
    </el-dialog>

    
    <el-card class="connection-test" style="margin-top: 20px;">
      <template #header>
        <span>连接测试</span>
      </template>
      <el-form :model="testForm" inline>
        <el-form-item label="测试地址">
          <el-input v-model="testForm.endpoint" placeholder="请输入测试地址" style="width: 300px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="testConnection" :loading="testing">
            测试连接
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="testResult" class="test-result">
        <el-alert
          :title="testResult.success ? '连接成功' : '连接失败'"
          :type="testResult.success ? 'success' : 'error'"
          :description="testResult.message"
          show-icon
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'


const adapters = ref([
  {
    name: 'QQ Bot 1',
    type: 'qq',
    endpoint: 'ws://localhost:8080',
    status: 'connected',
    token: '***',
    autoReconnect: true,
    heartbeatInterval: 30000
  },
  {
    name: 'WeChat Bot',
    type: 'wechat',
    endpoint: 'ws://localhost:8081',
    status: 'disconnected',
    token: '***',
    autoReconnect: false,
    heartbeatInterval: 30000
  }
])


const showAddDialog = ref(false)
const editingAdapter = ref(null)


const adapterForm = reactive({
  name: '',
  type: '',
  endpoint: '',
  token: '',
  autoReconnect: true,
  heartbeatInterval: 30000
})


const testForm = reactive({
  endpoint: ''
})
const testing = ref(false)
const testResult = ref(null)


const getTypeTagType = (type: string) => {
  const typeMap = {
    qq: 'primary',
    wechat: 'success',
    telegram: 'info',
    discord: 'warning',
    dingtalk: 'danger',
    feishu: ''
  }
  return typeMap[type] || ''
}


const connectAdapter = async (adapter: any) => {
  try {
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    adapter.status = 'connected'
    ElMessage.success(`${adapter.name} 连接成功`)
  } catch (error) {
    ElMessage.error(`${adapter.name} 连接失败`)
  }
}


const disconnectAdapter = async (adapter: any) => {
  try {
    adapter.status = 'disconnected'
    ElMessage.success(`${adapter.name} 已断开连接`)
  } catch (error) {
    ElMessage.error(`${adapter.name} 断开连接失败`)
  }
}


const editAdapter = (adapter: any) => {
  editingAdapter.value = adapter
  Object.assign(adapterForm, adapter)
  showAddDialog.value = true
}


const deleteAdapter = async (index: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个适配器吗？', '确认删除', {
      type: 'warning'
    })
    adapters.value.splice(index, 1)
    ElMessage.success('删除成功')
  } catch {
    
  }
}


const saveAdapter = () => {
  if (!adapterForm.name || !adapterForm.type || !adapterForm.endpoint) {
    ElMessage.error('请填写完整信息')
    return
  }

  if (editingAdapter.value) {
    
    Object.assign(editingAdapter.value, adapterForm)
    ElMessage.success('适配器更新成功')
  } else {
    
    adapters.value.push({
      ...adapterForm,
      status: 'disconnected'
    })
    ElMessage.success('适配器添加成功')
  }

  
  Object.assign(adapterForm, {
    name: '',
    type: '',
    endpoint: '',
    token: '',
    autoReconnect: true,
    heartbeatInterval: 30000
  })
  editingAdapter.value = null
  showAddDialog.value = false
}


const testConnection = async () => {
  if (!testForm.endpoint) {
    ElMessage.error('请输入测试地址')
    return
  }

  testing.value = true
  try {
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    const success = Math.random() > 0.3 
    testResult.value = {
      success,
      message: success ? '连接测试成功，适配器可正常使用' : '连接测试失败，请检查地址和网络'
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: '连接测试异常，请稍后重试'
    }
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.adapter-config {
  padding: 20px;
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-result {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .adapter-config {
    padding: 10px;
  }
  
  .el-table {
    font-size: 12px;
  }
}
</style>