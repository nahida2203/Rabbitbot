<template>
  <div class="api-test">
    
    <div class="page-header">
      <div class="header-left">
        <h2>API 测试工具</h2>
        <p>在线 API 接口测试工具，支持多种请求方法</p>
      </div>
      <div class="header-right">
        <el-button @click="newRequest">
          <el-icon><Plus /></el-icon>
          新建请求
        </el-button>
        <el-button @click="importCollection">
          <el-icon><Upload /></el-icon>
          导入集合
        </el-button>
        <el-button @click="exportCollection">
          <el-icon><Download /></el-icon>
          导出集合
        </el-button>
      </div>
    </div>

    <div class="api-container">
      
      <div class="sidebar">
        
        <div class="collections">
          <div class="section-header">
            <h4>请求集合</h4>
            <el-button size="small" text @click="newCollection">
              <el-icon><FolderAdd /></el-icon>
            </el-button>
          </div>
          
          <el-tree
            :data="collections"
            :props="treeProps"
            node-key="id"
            :expand-on-click-node="false"
            @node-click="handleNodeClick"
            class="collection-tree"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <el-icon v-if="data.type === 'collection'">
                  <Folder v-if="!node.expanded" />
                  <FolderOpened v-else />
                </el-icon>
                <el-icon v-else class="method-icon" :class="data.method?.toLowerCase()">
                  <Connection />
                </el-icon>
                <span class="node-label">{{ data.name }}</span>
                <span v-if="data.method" class="method-tag" :class="data.method.toLowerCase()">
                  {{ data.method }}
                </span>
              </div>
            </template>
          </el-tree>
        </div>

        
        <div class="history">
          <div class="section-header">
            <h4>历史记录</h4>
            <el-button size="small" text @click="clearHistory">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          
          <div class="history-list">
            <div
              v-for="item in history"
              :key="item.id"
              class="history-item"
              @click="loadFromHistory(item)"
            >
              <div class="history-method" :class="item.method.toLowerCase()">
                {{ item.method }}
              </div>
              <div class="history-url">{{ item.url }}</div>
              <div class="history-time">{{ formatTime(item.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>

      
      <div class="main-content">
        
        <div class="request-config">
          <div class="request-line">
            <el-select v-model="currentRequest.method" style="width: 120px">
              <el-option
                v-for="method in httpMethods"
                :key="method"
                :label="method"
                :value="method"
              />
            </el-select>
            
            <el-input
              v-model="currentRequest.url"
              placeholder="输入请求 URL"
              class="url-input"
            >
              <template #prepend>
                <el-select v-model="currentRequest.protocol" style="width: 80px">
                  <el-option label="HTTP" value="http" />
                  <el-option label="HTTPS" value="https" />
                </el-select>
              </template>
            </el-input>
            
            <el-button
              type="primary"
              @click="sendRequest"
              :loading="loading"
              :disabled="!currentRequest.url"
            >
              <el-icon><Position /></el-icon>
              发送
            </el-button>
          </div>

          
          <el-tabs v-model="activeTab" class="request-tabs">
            
            <el-tab-pane label="参数" name="params">
              <div class="params-section">
                <div class="section-title">
                  <span>Query 参数</span>
                  <el-button size="small" text @click="addParam">
                    <el-icon><Plus /></el-icon>
                    添加
                  </el-button>
                </div>
                
                <div class="params-table">
                  <div class="table-header">
                    <div class="col-checkbox"></div>
                    <div class="col-key">键</div>
                    <div class="col-value">值</div>
                    <div class="col-description">描述</div>
                    <div class="col-actions">操作</div>
                  </div>
                  
                  <div
                    v-for="(param, index) in currentRequest.params"
                    :key="index"
                    class="table-row"
                  >
                    <div class="col-checkbox">
                      <el-checkbox v-model="param.enabled" />
                    </div>
                    <div class="col-key">
                      <el-input v-model="param.key" placeholder="参数名" size="small" />
                    </div>
                    <div class="col-value">
                      <el-input v-model="param.value" placeholder="参数值" size="small" />
                    </div>
                    <div class="col-description">
                      <el-input v-model="param.description" placeholder="描述" size="small" />
                    </div>
                    <div class="col-actions">
                      <el-button size="small" text @click="removeParam(index)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            
            <el-tab-pane label="请求头" name="headers">
              <div class="headers-section">
                <div class="section-title">
                  <span>请求头</span>
                  <el-button size="small" text @click="addHeader">
                    <el-icon><Plus /></el-icon>
                    添加
                  </el-button>
                </div>
                
                <div class="headers-table">
                  <div class="table-header">
                    <div class="col-checkbox"></div>
                    <div class="col-key">键</div>
                    <div class="col-value">值</div>
                    <div class="col-description">描述</div>
                    <div class="col-actions">操作</div>
                  </div>
                  
                  <div
                    v-for="(header, index) in currentRequest.headers"
                    :key="index"
                    class="table-row"
                  >
                    <div class="col-checkbox">
                      <el-checkbox v-model="header.enabled" />
                    </div>
                    <div class="col-key">
                      <el-input v-model="header.key" placeholder="请求头名" size="small" />
                    </div>
                    <div class="col-value">
                      <el-input v-model="header.value" placeholder="请求头值" size="small" />
                    </div>
                    <div class="col-description">
                      <el-input v-model="header.description" placeholder="描述" size="small" />
                    </div>
                    <div class="col-actions">
                      <el-button size="small" text @click="removeHeader(index)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            
            <el-tab-pane label="请求体" name="body" v-if="hasBody">
              <div class="body-section">
                <div class="body-type">
                  <el-radio-group v-model="currentRequest.bodyType">
                    <el-radio label="none">无</el-radio>
                    <el-radio label="form-data">form-data</el-radio>
                    <el-radio label="x-www-form-urlencoded">x-www-form-urlencoded</el-radio>
                    <el-radio label="raw">raw</el-radio>
                    <el-radio label="binary">binary</el-radio>
                  </el-radio-group>
                </div>

                
                <div v-if="currentRequest.bodyType === 'form-data'" class="form-data">
                  <div class="section-title">
                    <span>Form Data</span>
                    <el-button size="small" text @click="addFormData">
                      <el-icon><Plus /></el-icon>
                      添加
                    </el-button>
                  </div>
                  
                  <div class="form-data-table">
                    <div class="table-header">
                      <div class="col-checkbox"></div>
                      <div class="col-key">键</div>
                      <div class="col-value">值</div>
                      <div class="col-type">类型</div>
                      <div class="col-actions">操作</div>
                    </div>
                    
                    <div
                      v-for="(item, index) in currentRequest.formData"
                      :key="index"
                      class="table-row"
                    >
                      <div class="col-checkbox">
                        <el-checkbox v-model="item.enabled" />
                      </div>
                      <div class="col-key">
                        <el-input v-model="item.key" placeholder="键" size="small" />
                      </div>
                      <div class="col-value">
                        <el-input
                          v-if="item.type === 'text'"
                          v-model="item.value"
                          placeholder="值"
                          size="small"
                        />
                        <el-upload
                          v-else
                          :auto-upload="false"
                          :show-file-list="false"
                          @change="handleFileChange($event, item)"
                        >
                          <el-button size="small">选择文件</el-button>
                        </el-upload>
                      </div>
                      <div class="col-type">
                        <el-select v-model="item.type" size="small">
                          <el-option label="文本" value="text" />
                          <el-option label="文件" value="file" />
                        </el-select>
                      </div>
                      <div class="col-actions">
                        <el-button size="small" text @click="removeFormData(index)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>

                
                <div v-if="currentRequest.bodyType === 'raw'" class="raw-body">
                  <div class="raw-header">
                    <el-select v-model="currentRequest.rawType" style="width: 150px">
                      <el-option label="Text" value="text" />
                      <el-option label="JSON" value="json" />
                      <el-option label="XML" value="xml" />
                      <el-option label="HTML" value="html" />
                      <el-option label="JavaScript" value="javascript" />
                    </el-select>
                  </div>
                  
                  <el-input
                    v-model="currentRequest.rawBody"
                    type="textarea"
                    :rows="10"
                    placeholder="输入请求体内容"
                    class="raw-textarea"
                  />
                </div>
              </div>
            </el-tab-pane>

            
            <el-tab-pane label="认证" name="auth">
              <div class="auth-section">
                <el-radio-group v-model="currentRequest.authType">
                  <el-radio label="none">无认证</el-radio>
                  <el-radio label="basic">Basic Auth</el-radio>
                  <el-radio label="bearer">Bearer Token</el-radio>
                  <el-radio label="api-key">API Key</el-radio>
                </el-radio-group>

                
                <div v-if="currentRequest.authType === 'basic'" class="auth-basic">
                  <el-form :model="currentRequest.auth.basic" label-width="80px">
                    <el-form-item label="用户名">
                      <el-input v-model="currentRequest.auth.basic.username" />
                    </el-form-item>
                    <el-form-item label="密码">
                      <el-input v-model="currentRequest.auth.basic.password" type="password" show-password />
                    </el-form-item>
                  </el-form>
                </div>

                
                <div v-if="currentRequest.authType === 'bearer'" class="auth-bearer">
                  <el-form :model="currentRequest.auth.bearer" label-width="80px">
                    <el-form-item label="Token">
                      <el-input v-model="currentRequest.auth.bearer.token" type="textarea" :rows="3" />
                    </el-form-item>
                  </el-form>
                </div>

                
                <div v-if="currentRequest.authType === 'api-key'" class="auth-api-key">
                  <el-form :model="currentRequest.auth.apiKey" label-width="80px">
                    <el-form-item label="Key">
                      <el-input v-model="currentRequest.auth.apiKey.key" />
                    </el-form-item>
                    <el-form-item label="Value">
                      <el-input v-model="currentRequest.auth.apiKey.value" />
                    </el-form-item>
                    <el-form-item label="位置">
                      <el-select v-model="currentRequest.auth.apiKey.in">
                        <el-option label="Header" value="header" />
                        <el-option label="Query" value="query" />
                      </el-select>
                    </el-form-item>
                  </el-form>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        
        <div class="response-section" v-if="response">
          <div class="response-header">
            <h4>响应结果</h4>
            <div class="response-info">
              <el-tag
                :type="getStatusType(response.status)"
                class="status-tag"
              >
                {{ response.status }} {{ response.statusText }}
              </el-tag>
              <span class="response-time">{{ response.time }}ms</span>
              <span class="response-size">{{ formatSize(response.size) }}</span>
            </div>
          </div>

          <el-tabs v-model="responseTab" class="response-tabs">
            
            <el-tab-pane label="响应体" name="body">
              <div class="response-body">
                <div class="response-toolbar">
                  <el-button size="small" @click="formatResponse">
                    <el-icon><Magic /></el-icon>
                    格式化
                  </el-button>
                  <el-button size="small" @click="copyResponse">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                  <el-button size="small" @click="downloadResponse">
                    <el-icon><Download /></el-icon>
                    下载
                  </el-button>
                </div>
                
                <pre class="response-content">{{ response.body }}</pre>
              </div>
            </el-tab-pane>

            
            <el-tab-pane label="响应头" name="headers">
              <div class="response-headers">
                <div
                  v-for="(value, key) in response.headers"
                  :key="key"
                  class="header-item"
                >
                  <span class="header-key">{{ key }}:</span>
                  <span class="header-value">{{ value }}</span>
                </div>
              </div>
            </el-tab-pane>

            
            <el-tab-pane label="Cookies" name="cookies">
              <div class="response-cookies">
                <div
                  v-for="cookie in response.cookies"
                  :key="cookie.name"
                  class="cookie-item"
                >
                  <span class="cookie-name">{{ cookie.name }}:</span>
                  <span class="cookie-value">{{ cookie.value }}</span>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    
    <el-dialog v-model="saveDialogVisible" title="保存请求" width="40%">
      <el-form :model="saveForm" label-width="100px">
        <el-form-item label="请求名称">
          <el-input v-model="saveForm.name" placeholder="输入请求名称" />
        </el-form-item>
        <el-form-item label="选择集合">
          <el-select v-model="saveForm.collectionId" placeholder="选择或创建集合">
            <el-option
              v-for="collection in collections.filter(c => c.type === 'collection')"
              :key="collection.id"
              :label="collection.name"
              :value="collection.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="saveForm.description"
            type="textarea"
            :rows="3"
            placeholder="输入请求描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="saveDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRequest">保存</el-button>
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
  Upload,
  Download,
  FolderAdd,
  Folder,
  FolderOpened,
  Connection,
  Delete,
  Position,
  Magic,
  CopyDocument
} from '@element-plus/icons-vue'

interface RequestParam {
  key: string
  value: string
  description: string
  enabled: boolean
}

interface RequestHeader {
  key: string
  value: string
  description: string
  enabled: boolean
}

interface FormDataItem {
  key: string
  value: string | File
  type: 'text' | 'file'
  enabled: boolean
}

interface ApiRequest {
  id?: string
  name?: string
  method: string
  protocol: string
  url: string
  params: RequestParam[]
  headers: RequestHeader[]
  bodyType: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary'
  formData: FormDataItem[]
  rawBody: string
  rawType: string
  authType: 'none' | 'basic' | 'bearer' | 'api-key'
  auth: {
    basic: { username: string; password: string }
    bearer: { token: string }
    apiKey: { key: string; value: string; in: 'header' | 'query' }
  }
}

interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: number
  cookies: Array<{ name: string; value: string }>
}

interface HistoryItem {
  id: string
  method: string
  url: string
  timestamp: number
  request: ApiRequest
  response?: ApiResponse
}

interface CollectionItem {
  id: string
  name: string
  type: 'collection' | 'request'
  method?: string
  children?: CollectionItem[]
  request?: ApiRequest
}

const loading = ref(false)
const activeTab = ref('params')
const responseTab = ref('body')
const saveDialogVisible = ref(false)

const currentRequest = reactive<ApiRequest>({
  method: 'GET',
  protocol: 'https',
  url: '',
  params: [],
  headers: [
    { key: 'Content-Type', value: 'application/json', description: '', enabled: true }
  ],
  bodyType: 'none',
  formData: [],
  rawBody: '',
  rawType: 'json',
  authType: 'none',
  auth: {
    basic: { username: '', password: '' },
    bearer: { token: '' },
    apiKey: { key: '', value: '', in: 'header' }
  }
})

const response = ref<ApiResponse | null>(null)

const saveForm = reactive({
  name: '',
  collectionId: '',
  description: ''
})

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const collections = ref<CollectionItem[]>([
  {
    id: '1',
    name: '用户管理',
    type: 'collection',
    children: [
      {
        id: '1-1',
        name: '获取用户列表',
        type: 'request',
        method: 'GET'
      },
      {
        id: '1-2',
        name: '创建用户',
        type: 'request',
        method: 'POST'
      }
    ]
  },
  {
    id: '2',
    name: '插件管理',
    type: 'collection',
    children: [
      {
        id: '2-1',
        name: '获取插件列表',
        type: 'request',
        method: 'GET'
      }
    ]
  }
])

const history = ref<HistoryItem[]>([
  {
    id: '1',
    method: 'GET',
    url: 'https:
    timestamp: Date.now() - 3600000,
    request: { ...currentRequest }
  },
  {
    id: '2',
    method: 'POST',
    url: 'https://api.example.com/users',
    timestamp: Date.now() - 7200000,
    request: { ...currentRequest }
  }
])

const treeProps = {
  children: 'children',
  label: 'name'
}


const hasBody = computed(() => {
  return ['POST', 'PUT', 'PATCH'].includes(currentRequest.method)
})


const addParam = () => {
  currentRequest.params.push({
    key: '',
    value: '',
    description: '',
    enabled: true
  })
}


const removeParam = (index: number) => {
  currentRequest.params.splice(index, 1)
}


const addHeader = () => {
  currentRequest.headers.push({
    key: '',
    value: '',
    description: '',
    enabled: true
  })
}


const removeHeader = (index: number) => {
  currentRequest.headers.splice(index, 1)
}


const addFormData = () => {
  currentRequest.formData.push({
    key: '',
    value: '',
    type: 'text',
    enabled: true
  })
}


const removeFormData = (index: number) => {
  currentRequest.formData.splice(index, 1)
}


const handleFileChange = (file: any, item: FormDataItem) => {
  item.value = file.raw
}


const sendRequest = async () => {
  if (!currentRequest.url) {
    ElMessage.warning('请输入请求 URL')
    return
  }

  loading.value = true
  const startTime = Date.now()

  try {
    
    const fullUrl = `${currentRequest.protocol}://${currentRequest.url}`
    const url = new URL(fullUrl)

    
    currentRequest.params
      .filter(p => p.enabled && p.key)
      .forEach(p => {
        url.searchParams.append(p.key, p.value)
      })

    
    const headers: Record<string, string> = {}
    currentRequest.headers
      .filter(h => h.enabled && h.key)
      .forEach(h => {
        headers[h.key] = h.value
      })

    
    if (currentRequest.authType === 'basic') {
      const { username, password } = currentRequest.auth.basic
      headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`
    } else if (currentRequest.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${currentRequest.auth.bearer.token}`
    } else if (currentRequest.authType === 'api-key') {
      const { key, value, in: location } = currentRequest.auth.apiKey
      if (location === 'header') {
        headers[key] = value
      } else {
        url.searchParams.append(key, value)
      }
    }

    
    let body: any = undefined
    if (hasBody.value && currentRequest.bodyType !== 'none') {
      if (currentRequest.bodyType === 'raw') {
        body = currentRequest.rawBody
        if (currentRequest.rawType === 'json') {
          headers['Content-Type'] = 'application/json'
        }
      } else if (currentRequest.bodyType === 'form-data') {
        const formData = new FormData()
        currentRequest.formData
          .filter(f => f.enabled && f.key)
          .forEach(f => {
            formData.append(f.key, f.value as string | File)
          })
        body = formData
      } else if (currentRequest.bodyType === 'x-www-form-urlencoded') {
        const params = new URLSearchParams()
        currentRequest.formData
          .filter(f => f.enabled && f.key)
          .forEach(f => {
            params.append(f.key, f.value as string)
          })
        body = params
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    }

    
    const mockResponse: ApiResponse = {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '1234',
        'Date': new Date().toUTCString(),
        'Server': 'nginx/1.18.0'
      },
      body: JSON.stringify({
        success: true,
        message: '请求成功',
        data: {
          id: 1,
          name: '测试用户',
          email: 'test@example.com',
          created_at: new Date().toISOString()
        }
      }, null, 2),
      time: Date.now() - startTime,
      size: 1234,
      cookies: [
        { name: 'session_id', value: 'abc123' },
        { name: 'csrf_token', value: 'xyz789' }
      ]
    }

    response.value = mockResponse

    
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      method: currentRequest.method,
      url: fullUrl,
      timestamp: Date.now(),
      request: { ...currentRequest },
      response: mockResponse
    }
    history.value.unshift(historyItem)

    
    if (history.value.length > 50) {
      history.value = history.value.slice(0, 50)
    }

    ElMessage.success('请求发送成功')
  } catch (error) {
    console.error('请求失败:', error)
    ElMessage.error('请求发送失败')
  } finally {
    loading.value = false
  }
}


const newRequest = () => {
  Object.assign(currentRequest, {
    method: 'GET',
    protocol: 'https',
    url: '',
    params: [],
    headers: [
      { key: 'Content-Type', value: 'application/json', description: '', enabled: true }
    ],
    bodyType: 'none',
    formData: [],
    rawBody: '',
    rawType: 'json',
    authType: 'none',
    auth: {
      basic: { username: '', password: '' },
      bearer: { token: '' },
      apiKey: { key: '', value: '', in: 'header' }
    }
  })
  response.value = null
  ElMessage.success('新请求已创建')
}


const newCollection = async () => {
  try {
    const { value: name } = await ElMessageBox.prompt('请输入集合名称', '新建集合', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    
    if (name) {
      const newCollection: CollectionItem = {
        id: Date.now().toString(),
        name,
        type: 'collection',
        children: []
      }
      collections.value.push(newCollection)
      ElMessage.success('集合创建成功')
    }
  } catch {
    
  }
}


const handleNodeClick = (data: CollectionItem) => {
  if (data.type === 'request' && data.request) {
    Object.assign(currentRequest, data.request)
    response.value = null
    ElMessage.success(`已加载请求: ${data.name}`)
  }
}


const loadFromHistory = (item: HistoryItem) => {
  Object.assign(currentRequest, item.request)
  response.value = item.response || null
  ElMessage.success('已从历史记录加载请求')
}


const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有历史记录吗？', '确认清空', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    history.value = []
    ElMessage.success('历史记录已清空')
  } catch {
    
  }
}


const importCollection = () => {
  ElMessage.info('导入功能开发中')
}


const exportCollection = () => {
  const data = {
    collections: collections.value,
    history: history.value,
    exportTime: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `api-collections-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('集合已导出')
}


const saveRequest = () => {
  if (!saveForm.name) {
    ElMessage.warning('请输入请求名称')
    return
  }
  
  const newRequest: CollectionItem = {
    id: Date.now().toString(),
    name: saveForm.name,
    type: 'request',
    method: currentRequest.method,
    request: { ...currentRequest }
  }
  
  if (saveForm.collectionId) {
    const collection = collections.value.find(c => c.id === saveForm.collectionId)
    if (collection && collection.children) {
      collection.children.push(newRequest)
    }
  } else {
    collections.value.push(newRequest)
  }
  
  saveDialogVisible.value = false
  Object.assign(saveForm, { name: '', collectionId: '', description: '' })
  ElMessage.success('请求已保存')
}


const formatResponse = () => {
  if (response.value) {
    try {
      const parsed = JSON.parse(response.value.body)
      response.value.body = JSON.stringify(parsed, null, 2)
      ElMessage.success('响应已格式化')
    } catch {
      ElMessage.warning('响应内容不是有效的 JSON 格式')
    }
  }
}


const copyResponse = () => {
  if (response.value) {
    navigator.clipboard.writeText(response.value.body).then(() => {
      ElMessage.success('响应内容已复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败')
    })
  }
}


const downloadResponse = () => {
  if (response.value) {
    const blob = new Blob([response.value.body], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `response-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('响应已下载')
  }
}


const getStatusType = (status: number) => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400) return 'danger'
  return 'info'
}


const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}


const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  
  const savedCollections = localStorage.getItem('api-collections')
  if (savedCollections) {
    collections.value = JSON.parse(savedCollections)
  }
  
  const savedHistory = localStorage.getItem('api-history')
  if (savedHistory) {
    history.value = JSON.parse(savedHistory)
  }
})


const saveToLocalStorage = () => {
  localStorage.setItem('api-collections', JSON.stringify(collections.value))
  localStorage.setItem('api-history', JSON.stringify(history.value))
}


setInterval(saveToLocalStorage, 5000)
</script>

<style scoped>
.api-test {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
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

.api-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background-color: #ffffff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.collections {
  flex: 1;
  border-bottom: 1px solid #e4e7ed;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.section-header h4 {
  margin: 0;
  color: #303133;
  font-size: 14px;
}

.collection-tree {
  padding: 10px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.node-label {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

.method-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 2px;
  color: #ffffff;
  font-weight: bold;
}

.method-tag.get { background-color: #67c23a; }
.method-tag.post { background-color: #409eff; }
.method-tag.put { background-color: #e6a23c; }
.method-tag.delete { background-color: #f56c6c; }
.method-tag.patch { background-color: #909399; }
.method-tag.head { background-color: #909399; }
.method-tag.options { background-color: #909399; }

.history {
  height: 200px;
  overflow-y: auto;
}

.history-list {
  padding: 5px;
}

.history-item {
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background-color 0.2s;
}

.history-item:hover {
  background-color: #f5f7fa;
}

.history-method {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 2px;
  color: #ffffff;
  font-weight: bold;
  display: inline-block;
  margin-bottom: 4px;
}

.history-method.get { background-color: #67c23a; }
.history-method.post { background-color: #409eff; }
.history-method.put { background-color: #e6a23c; }
.history-method.delete { background-color: #f56c6c; }
.history-method.patch { background-color: #909399; }
.history-method.head { background-color: #909399; }
.history-method.options { background-color: #909399; }

.history-url {
  font-size: 12px;
  color: #606266;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 10px;
  color: #909399;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.request-config {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.request-line {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}

.url-input {
  flex: 1;
}

.request-tabs {
  margin-top: 20px;
}

.params-section,
.headers-section {
  padding: 20px 0;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-weight: bold;
  color: #303133;
}

.params-table,
.headers-table,
.form-data-table {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.table-header {
  display: flex;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-weight: bold;
  color: #606266;
  font-size: 12px;
}

.table-row {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
}

.table-row:last-child {
  border-bottom: none;
}

.col-checkbox {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-right: 1px solid #e4e7ed;
}

.col-key {
  width: 200px;
  padding: 8px;
  border-right: 1px solid #e4e7ed;
}

.col-value {
  flex: 1;
  padding: 8px;
  border-right: 1px solid #e4e7ed;
}

.col-description {
  width: 200px;
  padding: 8px;
  border-right: 1px solid #e4e7ed;
}

.col-type {
  width: 100px;
  padding: 8px;
  border-right: 1px solid #e4e7ed;
}

.col-actions {
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.body-section {
  padding: 20px 0;
}

.body-type {
  margin-bottom: 20px;
}

.raw-header {
  margin-bottom: 10px;
}

.raw-textarea {
  font-family: 'Consolas', monospace;
}

.auth-section {
  padding: 20px 0;
}

.auth-basic,
.auth-bearer,
.auth-api-key {
  margin-top: 20px;
}

.response-section {
  border-top: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.response-header h4 {
  margin: 0;
  color: #303133;
}

.response-info {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 12px;
  color: #909399;
}

.status-tag {
  font-weight: bold;
}

.response-tabs {
  background-color: #ffffff;
}

.response-body {
  padding: 20px;
}

.response-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.response-content {
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.response-headers,
.response-cookies {
  padding: 20px;
}

.header-item,
.cookie-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.header-item:last-child,
.cookie-item:last-child {
  border-bottom: none;
}

.header-key,
.cookie-name {
  width: 200px;
  font-weight: bold;
  color: #606266;
  margin-right: 15px;
}

.header-value,
.cookie-value {
  flex: 1;
  color: #303133;
  word-break: break-all;
}

.dialog-footer {
  text-align: right;
}

@media (max-width: 768px) {
  .api-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: 300px;
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
  
  .request-line {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-header,
  .table-row {
    flex-direction: column;
  }
  
  .col-checkbox,
  .col-key,
  .col-value,
  .col-description,
  .col-type,
  .col-actions {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .response-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>