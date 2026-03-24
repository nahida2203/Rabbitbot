<template>
  <div class="api-test">
    
    <div class="page-header">
      <h2>API 测试工具</h2>
      <p>强大的 API 接口测试工具，支持多种请求方式和参数配置</p>
    </div>

    
    <el-card class="toolbar">
      <div class="toolbar-content">
        <div class="left-actions">
          <el-button type="primary" @click="sendRequest" :loading="loading">
            <el-icon><Position /></el-icon>
            发送请求
          </el-button>
          <el-button @click="saveRequest">
            <el-icon><Document /></el-icon>
            保存
          </el-button>
          <el-button @click="loadRequest">
            <el-icon><FolderOpened /></el-icon>
            加载
          </el-button>
          <el-button @click="clearRequest">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>
        
        <div class="right-actions">
          <el-button @click="showHistory">
            <el-icon><Clock /></el-icon>
            历史记录
          </el-button>
          <el-button @click="showEnvironments">
            <el-icon><Setting /></el-icon>
            环境变量
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
    </el-card>

    
    <el-row :gutter="20" class="main-content">
      
      <el-col :span="12">
        <el-card class="request-config">
          <template #header>
            <div class="card-header">
              <span>请求配置</span>
              <el-button size="small" text @click="toggleRequestCollapse">
                <el-icon><ArrowDown v-if="!requestCollapsed" /><ArrowRight v-else /></el-icon>
              </el-button>
            </div>
          </template>
          
          <el-collapse-transition>
            <div v-show="!requestCollapsed">
              
              <div class="request-basic">
                <el-form :model="request" label-width="80px">
                  <el-form-item label="请求方法">
                    <el-select v-model="request.method" style="width: 120px;">
                      <el-option
                        v-for="method in httpMethods"
                        :key="method.value"
                        :label="method.label"
                        :value="method.value"
                        :class="'method-' + method.value.toLowerCase()"
                      />
                    </el-select>
                  </el-form-item>
                  
                  <el-form-item label="请求URL">
                    <el-input 
                      v-model="request.url" 
                      placeholder="https://api.example.com/endpoint"
                      clearable
                    >
                      <template #prepend>
                        <el-select v-model="selectedEnvironment" style="width: 120px;">
                          <el-option label="无环境" value="" />
                          <el-option
                            v-for="env in environments"
                            :key="env.name"
                            :label="env.name"
                            :value="env.name"
                          />
                        </el-select>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-form>
              </div>

              
              <el-tabs v-model="activeRequestTab" type="card">
                
                <el-tab-pane label="Headers" name="headers">
                  <div class="headers-section">
                    <div class="section-header">
                      <span>请求头</span>
                      <el-button size="small" @click="addHeader">
                        <el-icon><Plus /></el-icon>
                        添加
                      </el-button>
                    </div>
                    
                    <div class="headers-list">
                      <div 
                        v-for="(header, index) in request.headers" 
                        :key="index" 
                        class="header-item"
                      >
                        <el-checkbox v-model="header.enabled" />
                        <el-input 
                          v-model="header.key" 
                          placeholder="Header Name"
                          size="small"
                          style="width: 200px; margin: 0 8px;"
                        />
                        <el-input 
                          v-model="header.value" 
                          placeholder="Header Value"
                          size="small"
                          style="flex: 1; margin-right: 8px;"
                        />
                        <el-button 
                          size="small" 
                          text 
                          @click="removeHeader(index)"
                        >
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>
                
                
                <el-tab-pane label="Params" name="params">
                  <div class="params-section">
                    <div class="section-header">
                      <span>查询参数</span>
                      <el-button size="small" @click="addParam">
                        <el-icon><Plus /></el-icon>
                        添加
                      </el-button>
                    </div>
                    
                    <div class="params-list">
                      <div 
                        v-for="(param, index) in request.params" 
                        :key="index" 
                        class="param-item"
                      >
                        <el-checkbox v-model="param.enabled" />
                        <el-input 
                          v-model="param.key" 
                          placeholder="Parameter Name"
                          size="small"
                          style="width: 200px; margin: 0 8px;"
                        />
                        <el-input 
                          v-model="param.value" 
                          placeholder="Parameter Value"
                          size="small"
                          style="flex: 1; margin-right: 8px;"
                        />
                        <el-button 
                          size="small" 
                          text 
                          @click="removeParam(index)"
                        >
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>
                
                
                <el-tab-pane label="Body" name="body">
                  <div class="body-section">
                    <div class="body-type-selector">
                      <el-radio-group v-model="request.bodyType">
                        <el-radio label="none">无</el-radio>
                        <el-radio label="json">JSON</el-radio>
                        <el-radio label="form">Form Data</el-radio>
                        <el-radio label="urlencoded">URL Encoded</el-radio>
                        <el-radio label="raw">Raw</el-radio>
                        <el-radio label="binary">Binary</el-radio>
                      </el-radio-group>
                    </div>
                    
                    
                    <div v-if="request.bodyType === 'json'" class="json-editor">
                      <el-input
                        v-model="request.body.json"
                        type="textarea"
                        :rows="10"
                        placeholder="{\n  \"key\": \"value\"\n}"
                      />
                      <div class="json-actions">
                        <el-button size="small" @click="formatJson">
                          <el-icon><Magic /></el-icon>
                          格式化
                        </el-button>
                        <el-button size="small" @click="validateJson">
                          <el-icon><CircleCheck /></el-icon>
                          验证
                        </el-button>
                      </div>
                    </div>
                    
                    
                    <div v-else-if="request.bodyType === 'form'" class="form-data">
                      <div class="section-header">
                        <span>表单数据</span>
                        <el-button size="small" @click="addFormData">
                          <el-icon><Plus /></el-icon>
                          添加
                        </el-button>
                      </div>
                      
                      <div class="form-data-list">
                        <div 
                          v-for="(item, index) in request.body.formData" 
                          :key="index" 
                          class="form-data-item"
                        >
                          <el-checkbox v-model="item.enabled" />
                          <el-select v-model="item.type" size="small" style="width: 80px; margin: 0 8px;">
                            <el-option label="Text" value="text" />
                            <el-option label="File" value="file" />
                          </el-select>
                          <el-input 
                            v-model="item.key" 
                            placeholder="Key"
                            size="small"
                            style="width: 150px; margin-right: 8px;"
                          />
                          <el-input 
                            v-if="item.type === 'text'"
                            v-model="item.value" 
                            placeholder="Value"
                            size="small"
                            style="flex: 1; margin-right: 8px;"
                          />
                          <el-upload 
                            v-else
                            class="file-upload"
                            :auto-upload="false"
                            :show-file-list="false"
                            :on-change="(file) => handleFileSelect(file, item)"
                          >
                            <el-button size="small" style="flex: 1; margin-right: 8px;">
                              {{ item.file ? item.file.name : '选择文件' }}
                            </el-button>
                          </el-upload>
                          <el-button 
                            size="small" 
                            text 
                            @click="removeFormData(index)"
                          >
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                      </div>
                    </div>
                    
                    
                    <div v-else-if="request.bodyType === 'urlencoded'" class="url-encoded">
                      <div class="section-header">
                        <span>URL 编码数据</span>
                        <el-button size="small" @click="addUrlEncoded">
                          <el-icon><Plus /></el-icon>
                          添加
                        </el-button>
                      </div>
                      
                      <div class="url-encoded-list">
                        <div 
                          v-for="(item, index) in request.body.urlencoded" 
                          :key="index" 
                          class="url-encoded-item"
                        >
                          <el-checkbox v-model="item.enabled" />
                          <el-input 
                            v-model="item.key" 
                            placeholder="Key"
                            size="small"
                            style="width: 200px; margin: 0 8px;"
                          />
                          <el-input 
                            v-model="item.value" 
                            placeholder="Value"
                            size="small"
                            style="flex: 1; margin-right: 8px;"
                          />
                          <el-button 
                            size="small" 
                            text 
                            @click="removeUrlEncoded(index)"
                          >
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </div>
                      </div>
                    </div>
                    
                    
                    <div v-else-if="request.bodyType === 'raw'" class="raw-body">
                      <div class="raw-type-selector">
                        <el-select v-model="request.body.rawType" size="small" style="width: 120px;">
                          <el-option label="Text" value="text" />
                          <el-option label="JavaScript" value="javascript" />
                          <el-option label="JSON" value="json" />
                          <el-option label="HTML" value="html" />
                          <el-option label="XML" value="xml" />
                        </el-select>
                      </div>
                      <el-input
                        v-model="request.body.raw"
                        type="textarea"
                        :rows="10"
                        placeholder="输入原始数据..."
                      />
                    </div>
                    
                    
                    <div v-else-if="request.bodyType === 'binary'" class="binary-body">
                      <el-upload
                        class="binary-upload"
                        drag
                        :auto-upload="false"
                        :show-file-list="false"
                        :on-change="handleBinaryFileSelect"
                      >
                        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                        <div class="el-upload__text">
                          {{ request.body.binary ? request.body.binary.name : '拖拽文件到此处或点击上传' }}
                        </div>
                      </el-upload>
                    </div>
                  </div>
                </el-tab-pane>
                
                
                <el-tab-pane label="Auth" name="auth">
                  <div class="auth-section">
                    <el-form :model="request.auth" label-width="100px">
                      <el-form-item label="认证类型">
                        <el-select v-model="request.auth.type" style="width: 200px;">
                          <el-option label="无认证" value="none" />
                          <el-option label="Bearer Token" value="bearer" />
                          <el-option label="Basic Auth" value="basic" />
                          <el-option label="API Key" value="apikey" />
                          <el-option label="OAuth 2.0" value="oauth2" />
                        </el-select>
                      </el-form-item>
                      
                      
                      <template v-if="request.auth.type === 'bearer'">
                        <el-form-item label="Token">
                          <el-input 
                            v-model="request.auth.bearer.token" 
                            placeholder="输入 Bearer Token"
                            type="password"
                            show-password
                          />
                        </el-form-item>
                      </template>
                      
                      
                      <template v-if="request.auth.type === 'basic'">
                        <el-form-item label="用户名">
                          <el-input v-model="request.auth.basic.username" placeholder="用户名" />
                        </el-form-item>
                        <el-form-item label="密码">
                          <el-input 
                            v-model="request.auth.basic.password" 
                            placeholder="密码"
                            type="password"
                            show-password
                          />
                        </el-form-item>
                      </template>
                      
                      
                      <template v-if="request.auth.type === 'apikey'">
                        <el-form-item label="Key">
                          <el-input v-model="request.auth.apikey.key" placeholder="API Key 名称" />
                        </el-form-item>
                        <el-form-item label="Value">
                          <el-input 
                            v-model="request.auth.apikey.value" 
                            placeholder="API Key 值"
                            type="password"
                            show-password
                          />
                        </el-form-item>
                        <el-form-item label="添加到">
                          <el-radio-group v-model="request.auth.apikey.in">
                            <el-radio label="header">Header</el-radio>
                            <el-radio label="query">Query Params</el-radio>
                          </el-radio-group>
                        </el-form-item>
                      </template>
                    </el-form>
                  </div>
                </el-tab-pane>
                
                
                <el-tab-pane label="Settings" name="settings">
                  <div class="settings-section">
                    <el-form :model="request.settings" label-width="120px">
                      <el-form-item label="请求超时">
                        <el-input-number 
                          v-model="request.settings.timeout" 
                          :min="1000" 
                          :max="300000" 
                          :step="1000"
                          style="width: 200px;"
                        />
                        <span style="margin-left: 8px; color: #909399;">毫秒</span>
                      </el-form-item>
                      
                      <el-form-item label="跟随重定向">
                        <el-switch v-model="request.settings.followRedirects" />
                      </el-form-item>
                      
                      <el-form-item label="SSL 验证">
                        <el-switch v-model="request.settings.verifySsl" />
                      </el-form-item>
                      
                      <el-form-item label="代理设置">
                        <el-input 
                          v-model="request.settings.proxy" 
                          placeholder="http://proxy.example.com:8080"
                        />
                      </el-form-item>
                    </el-form>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-collapse-transition>
        </el-card>
      </el-col>
      
      
      <el-col :span="12">
        <el-card class="response-result">
          <template #header>
            <div class="card-header">
              <span>响应结果</span>
              <div class="response-actions">
                <el-button size="small" @click="copyResponse" :disabled="!response.data">
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
                <el-button size="small" @click="downloadResponse" :disabled="!response.data">
                  <el-icon><Download /></el-icon>
                  下载
                </el-button>
                <el-button size="small" text @click="toggleResponseCollapse">
                  <el-icon><ArrowDown v-if="!responseCollapsed" /><ArrowRight v-else /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          
          <el-collapse-transition>
            <div v-show="!responseCollapsed">
              
              <div v-if="response.status" class="response-status">
                <div class="status-info">
                  <el-tag 
                    :type="getStatusType(response.status)"
                    size="large"
                  >
                    {{ response.status }} {{ response.statusText }}
                  </el-tag>
                  <span class="response-time">{{ response.time }}ms</span>
                  <span class="response-size">{{ formatSize(response.size) }}</span>
                </div>
              </div>
              
              
              <el-tabs v-model="activeResponseTab" type="card">
                
                <el-tab-pane label="Body" name="body">
                  <div class="response-body">
                    <div v-if="loading" class="loading-state">
                      <el-skeleton :rows="8" animated />
                    </div>
                    
                    <div v-else-if="response.data" class="response-content">
                      <div class="response-toolbar">
                        <el-radio-group v-model="responseViewMode" size="small">
                          <el-radio-button label="pretty">Pretty</el-radio-button>
                          <el-radio-button label="raw">Raw</el-radio-button>
                          <el-radio-button label="preview">Preview</el-radio-button>
                        </el-radio-group>
                        
                        <div class="response-info">
                          <span>{{ response.contentType }}</span>
                        </div>
                      </div>
                      
                      
                      <div v-if="responseViewMode === 'pretty'" class="pretty-view">
                        <pre class="json-pretty">{{ formatResponseData(response.data) }}</pre>
                      </div>
                      
                      
                      <div v-else-if="responseViewMode === 'raw'" class="raw-view">
                        <el-input
                          :model-value="response.data"
                          type="textarea"
                          :rows="15"
                          readonly
                        />
                      </div>
                      
                      
                      <div v-else class="preview-view">
                        <iframe 
                          v-if="isHtmlResponse()"
                          :srcdoc="response.data"
                          class="html-preview"
                        ></iframe>
                        <img 
                          v-else-if="isImageResponse()"
                          :src="getImageDataUrl()"
                          class="image-preview"
                          alt="Response Image"
                        />
                        <div v-else class="no-preview">
                          <el-empty description="无法预览此类型的响应" />
                        </div>
                      </div>
                    </div>
                    
                    <div v-else-if="response.error" class="error-state">
                      <el-alert
                        :title="response.error.message"
                        type="error"
                        :description="response.error.details"
                        show-icon
                        :closable="false"
                      />
                    </div>
                    
                    <div v-else class="empty-state">
                      <el-empty description="点击发送请求按钮开始测试" />
                    </div>
                  </div>
                </el-tab-pane>
                
                
                <el-tab-pane label="Headers" name="headers">
                  <div class="response-headers">
                    <div v-if="response.headers" class="headers-list">
                      <div 
                        v-for="(value, key) in response.headers" 
                        :key="key" 
                        class="header-item"
                      >
                        <span class="header-key">{{ key }}:</span>
                        <span class="header-value">{{ value }}</span>
                      </div>
                    </div>
                    <div v-else class="empty-headers">
                      <el-empty description="暂无响应头信息" />
                    </div>
                  </div>
                </el-tab-pane>
                
                
                <el-tab-pane label="Cookies" name="cookies">
                  <div class="response-cookies">
                    <div v-if="response.cookies && response.cookies.length" class="cookies-list">
                      <div 
                        v-for="(cookie, index) in response.cookies" 
                        :key="index" 
                        class="cookie-item"
                      >
                        <div class="cookie-name">{{ cookie.name }}</div>
                        <div class="cookie-value">{{ cookie.value }}</div>
                        <div class="cookie-details">
                          <span v-if="cookie.domain">Domain: {{ cookie.domain }}</span>
                          <span v-if="cookie.path">Path: {{ cookie.path }}</span>
                          <span v-if="cookie.expires">Expires: {{ cookie.expires }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-else class="empty-cookies">
                      <el-empty description="暂无 Cookie 信息" />
                    </div>
                  </div>
                </el-tab-pane>
                
                
                <el-tab-pane label="Tests" name="tests">
                  <div class="test-results">
                    <div class="test-summary">
                      <el-statistic title="测试通过" :value="testResults.passed" suffix="项" />
                      <el-statistic title="测试失败" :value="testResults.failed" suffix="项" />
                      <el-statistic title="总耗时" :value="testResults.duration" suffix="ms" />
                    </div>
                    
                    <div class="test-list">
                      <div 
                        v-for="(test, index) in testResults.tests" 
                        :key="index" 
                        class="test-item"
                        :class="{ 'test-passed': test.passed, 'test-failed': !test.passed }"
                      >
                        <el-icon>
                          <CircleCheck v-if="test.passed" />
                          <CircleClose v-else />
                        </el-icon>
                        <span class="test-name">{{ test.name }}</span>
                        <span v-if="!test.passed" class="test-error">{{ test.error }}</span>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-collapse-transition>
        </el-card>
      </el-col>
    </el-row>

    
    <el-dialog v-model="showHistoryDialog" title="请求历史" width="80%">
      <div class="history-content">
        <div class="history-toolbar">
          <el-input 
            v-model="historySearch" 
            placeholder="搜索历史记录..."
            style="width: 300px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <div class="history-actions">
            <el-button @click="clearHistory">
              <el-icon><Delete /></el-icon>
              清空历史
            </el-button>
            <el-button @click="exportHistory">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>
        
        <el-table :data="filteredHistory" style="width: 100%; margin-top: 20px;">
          <el-table-column prop="method" label="方法" width="80">
            <template #default="{ row }">
              <el-tag :type="getMethodType(row.method)" size="small">
                {{ row.method }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="url" label="URL" min-width="300" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="耗时" width="80">
            <template #default="{ row }">
              {{ row.time }}ms
            </template>
          </el-table-column>
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" @click="loadHistoryRequest(row)">
                加载
              </el-button>
              <el-button size="small" text @click="deleteHistoryItem(row.id)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    
    <el-dialog v-model="showEnvironmentDialog" title="环境变量管理" width="60%">
      <div class="environment-content">
        <div class="environment-toolbar">
          <el-select v-model="currentEnvironment" style="width: 200px;">
            <el-option label="选择环境" value="" />
            <el-option
              v-for="env in environments"
              :key="env.name"
              :label="env.name"
              :value="env.name"
            />
          </el-select>
          
          <div class="environment-actions">
            <el-button @click="addEnvironment">
              <el-icon><Plus /></el-icon>
              新建环境
            </el-button>
            <el-button @click="duplicateEnvironment" :disabled="!currentEnvironment">
              <el-icon><DocumentCopy /></el-icon>
              复制环境
            </el-button>
            <el-button @click="deleteEnvironment" :disabled="!currentEnvironment">
              <el-icon><Delete /></el-icon>
              删除环境
            </el-button>
          </div>
        </div>
        
        <div v-if="currentEnvironment" class="environment-variables">
          <div class="variables-header">
            <span>环境变量</span>
            <el-button size="small" @click="addVariable">
              <el-icon><Plus /></el-icon>
              添加变量
            </el-button>
          </div>
          
          <el-table :data="getCurrentEnvironmentVariables()" style="width: 100%;">
            <el-table-column prop="key" label="变量名" width="200">
              <template #default="{ row, $index }">
                <el-input v-model="row.key" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="value" label="初始值">
              <template #default="{ row, $index }">
                <el-input v-model="row.value" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="currentValue" label="当前值">
              <template #default="{ row, $index }">
                <el-input v-model="row.currentValue" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row, $index }">
                <el-button size="small" text @click="removeVariable($index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Position, Document, FolderOpened, Delete, Clock, Setting, Upload, Download,
  ArrowDown, ArrowRight, Plus, Magic, CircleCheck, UploadFilled, DocumentCopy,
  Search, CircleClose
} from '@element-plus/icons-vue'


interface RequestHeader {
  key: string
  value: string
  enabled: boolean
}

interface RequestParam {
  key: string
  value: string
  enabled: boolean
}

interface FormDataItem {
  key: string
  value: string
  type: 'text' | 'file'
  file?: File
  enabled: boolean
}

interface UrlEncodedItem {
  key: string
  value: string
  enabled: boolean
}

interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2'
  bearer: {
    token: string
  }
  basic: {
    username: string
    password: string
  }
  apikey: {
    key: string
    value: string
    in: 'header' | 'query'
  }
}

interface RequestSettings {
  timeout: number
  followRedirects: boolean
  verifySsl: boolean
  proxy: string
}

interface ApiRequest {
  method: string
  url: string
  headers: RequestHeader[]
  params: RequestParam[]
  bodyType: 'none' | 'json' | 'form' | 'urlencoded' | 'raw' | 'binary'
  body: {
    json: string
    formData: FormDataItem[]
    urlencoded: UrlEncodedItem[]
    raw: string
    rawType: string
    binary?: File
  }
  auth: AuthConfig
  settings: RequestSettings
}

interface ApiResponse {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  data?: string
  contentType?: string
  time?: number
  size?: number
  cookies?: Array<{
    name: string
    value: string
    domain?: string
    path?: string
    expires?: string
  }>
  error?: {
    message: string
    details: string
  }
}

interface HistoryItem {
  id: string
  method: string
  url: string
  status: number
  time: number
  timestamp: number
  request: ApiRequest
  response: ApiResponse
}

interface Environment {
  name: string
  variables: Array<{
    key: string
    value: string
    currentValue: string
  }>
}

interface TestResult {
  name: string
  passed: boolean
  error?: string
}


const httpMethods = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'HEAD', value: 'HEAD' },
  { label: 'OPTIONS', value: 'OPTIONS' }
]


const loading = ref(false)
const requestCollapsed = ref(false)
const responseCollapsed = ref(false)
const activeRequestTab = ref('headers')
const activeResponseTab = ref('body')
const responseViewMode = ref('pretty')


const showHistoryDialog = ref(false)
const showEnvironmentDialog = ref(false)


const request = reactive<ApiRequest>({
  method: 'GET',
  url: '',
  headers: [
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'User-Agent', value: 'API-Test-Tool/1.0', enabled: true }
  ],
  params: [],
  bodyType: 'none',
  body: {
    json: '{\n  "key": "value"\n}',
    formData: [],
    urlencoded: [],
    raw: '',
    rawType: 'text',
    binary: undefined
  },
  auth: {
    type: 'none',
    bearer: { token: '' },
    basic: { username: '', password: '' },
    apikey: { key: '', value: '', in: 'header' }
  },
  settings: {
    timeout: 30000,
    followRedirects: true,
    verifySsl: true,
    proxy: ''
  }
})


const response = reactive<ApiResponse>({})


const testResults = reactive({
  passed: 0,
  failed: 0,
  duration: 0,
  tests: [] as TestResult[]
})


const history = ref<HistoryItem[]>([])
const historySearch = ref('')


const environments = ref<Environment[]>([
  {
    name: '开发环境',
    variables: [
      { key: 'baseUrl', value: 'http://localhost:3000', currentValue: 'http://localhost:3000' },
      { key: 'apiKey', value: 'dev-api-key', currentValue: 'dev-api-key' }
    ]
  },
  {
    name: '测试环境',
    variables: [
      { key: 'baseUrl', value: 'https://test-api.example.com', currentValue: 'https://test-api.example.com' },
      { key: 'apiKey', value: 'test-api-key', currentValue: 'test-api-key' }
    ]
  },
  {
    name: '生产环境',
    variables: [
      { key: 'baseUrl', value: 'https://api.example.com', currentValue: 'https://api.example.com' },
      { key: 'apiKey', value: 'prod-api-key', currentValue: 'prod-api-key' }
    ]
  }
])

const selectedEnvironment = ref('')
const currentEnvironment = ref('')


const filteredHistory = computed(() => {
  if (!historySearch.value) return history.value
  
  const search = historySearch.value.toLowerCase()
  return history.value.filter(item => 
    item.url.toLowerCase().includes(search) ||
    item.method.toLowerCase().includes(search)
  )
})


const sendRequest = async () => {
  if (!request.url.trim()) {
    ElMessage.warning('请输入请求 URL')
    return
  }
  
  loading.value = true
  const startTime = Date.now()
  
  try {
    
    Object.assign(response, {})
    
    
    const requestConfig = buildRequestConfig()
    
    
    const apiResponse = await fetch('/api/proxy/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestConfig)
    })
    
    if (!apiResponse.ok) {
      throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`)
    }
    
    const result = await apiResponse.json()
    
    if (!result.success) {
      throw new Error(result.message || '请求失败')
    }
    
    
    const requestTime = Date.now() - startTime
    
    
    Object.assign(response, {
      status: result.data.status,
      statusText: result.data.statusText,
      headers: result.data.headers,
      data: result.data.body,
      contentType: result.data.headers['content-type'] || result.data.headers['Content-Type'],
      time: requestTime,
      size: result.data.size || (result.data.body ? result.data.body.length : 0),
      cookies: result.data.cookies || []
    })
    
    
    runTests()
    
    
    addToHistory()
    
    ElMessage.success('请求发送成功')
    
  } catch (error) {
    console.error('API请求失败:', error)
    
    Object.assign(response, {
      error: {
        message: '请求失败',
        details: error.message
      },
      time: Date.now() - startTime
    })
    
    ElMessage.error(`请求发送失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const buildRequestConfig = () => {
  
  let url = request.url
  if (selectedEnvironment.value) {
    const env = environments.value.find(e => e.name === selectedEnvironment.value)
    if (env) {
      env.variables.forEach(variable => {
        url = url.replace(new RegExp(`{{${variable.key}}}`, 'g'), variable.currentValue)
      })
    }
  }
  
  
  const headers: Record<string, string> = {}
  request.headers.forEach(header => {
    if (header.enabled && header.key && header.value) {
      headers[header.key] = header.value
    }
  })
  
  
  if (request.auth.type === 'bearer' && request.auth.bearer.token) {
    headers['Authorization'] = `Bearer ${request.auth.bearer.token}`
  } else if (request.auth.type === 'basic' && request.auth.basic.username) {
    const credentials = btoa(`${request.auth.basic.username}:${request.auth.basic.password}`)
    headers['Authorization'] = `Basic ${credentials}`
  } else if (request.auth.type === 'apikey' && request.auth.apikey.key && request.auth.apikey.value) {
    if (request.auth.apikey.in === 'header') {
      headers[request.auth.apikey.key] = request.auth.apikey.value
    }
  }
  
  
  const params: Record<string, string> = {}
  request.params.forEach(param => {
    if (param.enabled && param.key && param.value) {
      params[param.key] = param.value
    }
  })
  
  
  let body: any = null
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    switch (request.bodyType) {
      case 'json':
        body = request.body.json
        break
      case 'form-data':
        const formData = new FormData()
        request.body.formData.forEach(item => {
          if (item.enabled && item.key) {
            if (item.type === 'file' && item.file) {
              formData.append(item.key, item.file)
            } else {
              formData.append(item.key, item.value)
            }
          }
        })
        body = formData
        break
      case 'x-www-form-urlencoded':
        const urlencoded = new URLSearchParams()
        request.body.urlencoded.forEach(item => {
          if (item.enabled && item.key) {
            urlencoded.append(item.key, item.value)
          }
        })
        body = urlencoded.toString()
        break
      case 'raw':
        body = request.body.raw
        break
      case 'binary':
        body = request.body.binary
        break
    }
  }
  
  return {
    method: request.method,
    url,
    headers,
    params,
    body,
    settings: request.settings
  }
}

const getStatusText = (status: number): string => {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error'
  }
  return statusTexts[status] || 'Unknown'
}

const runTests = () => {
  const tests: TestResult[] = [
    {
      name: '状态码为 2xx',
      passed: response.status! >= 200 && response.status! < 300
    },
    {
      name: '响应时间小于 3000ms',
      passed: response.time! < 3000
    },
    {
      name: '响应包含 Content-Type',
      passed: !!response.headers?.['Content-Type']
    }
  ]
  
  const passed = tests.filter(t => t.passed).length
  const failed = tests.filter(t => !t.passed).length
  
  Object.assign(testResults, {
    passed,
    failed,
    duration: response.time || 0,
    tests
  })
}

const addToHistory = () => {
  const historyItem: HistoryItem = {
    id: Date.now().toString(),
    method: request.method,
    url: request.url,
    status: response.status!,
    time: response.time!,
    timestamp: Date.now(),
    request: JSON.parse(JSON.stringify(request)),
    response: JSON.parse(JSON.stringify(response))
  }
  
  history.value.unshift(historyItem)
  
  
  if (history.value.length > 100) {
    history.value = history.value.slice(0, 100)
  }
}

const saveRequest = () => {
  const requestData = JSON.stringify(request, null, 2)
  const blob = new Blob([requestData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `api-request-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('请求配置已保存')
}

const loadRequest = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          Object.assign(request, data)
          ElMessage.success('请求配置已加载')
        } catch (error) {
          ElMessage.error('文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const clearRequest = () => {
  ElMessageBox.confirm('确定要清空当前请求配置吗？', '确认清空', {
    type: 'warning'
  }).then(() => {
    
    Object.assign(request, {
      method: 'GET',
      url: '',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'User-Agent', value: 'API-Test-Tool/1.0', enabled: true }
      ],
      params: [],
      bodyType: 'none',
      body: {
        json: '{\n  "key": "value"\n}',
        formData: [],
        urlencoded: [],
        raw: '',
        rawType: 'text',
        binary: undefined
      },
      auth: {
        type: 'none',
        bearer: { token: '' },
        basic: { username: '', password: '' },
        apikey: { key: '', value: '', in: 'header' }
      },
      settings: {
        timeout: 30000,
        followRedirects: true,
        verifySsl: true,
        proxy: ''
      }
    })
    
    
    Object.assign(response, {})
    
    ElMessage.success('请求配置已清空')
  })
}

const addHeader = () => {
  request.headers.push({ key: '', value: '', enabled: true })
}

const removeHeader = (index: number) => {
  request.headers.splice(index, 1)
}

const addParam = () => {
  request.params.push({ key: '', value: '', enabled: true })
}

const removeParam = (index: number) => {
  request.params.splice(index, 1)
}

const addFormData = () => {
  request.body.formData.push({ key: '', value: '', type: 'text', enabled: true })
}

const removeFormData = (index: number) => {
  request.body.formData.splice(index, 1)
}

const addUrlEncoded = () => {
  request.body.urlencoded.push({ key: '', value: '', enabled: true })
}

const removeUrlEncoded = (index: number) => {
  request.body.urlencoded.splice(index, 1)
}

const handleFileSelect = (file: any, item: FormDataItem) => {
  item.file = file.raw
}

const handleBinaryFileSelect = (file: any) => {
  request.body.binary = file.raw
}

const formatJson = () => {
  try {
    const parsed = JSON.parse(request.body.json)
    request.body.json = JSON.stringify(parsed, null, 2)
    ElMessage.success('JSON 格式化成功')
  } catch (error) {
    ElMessage.error('JSON 格式错误')
  }
}

const validateJson = () => {
  try {
    JSON.parse(request.body.json)
    ElMessage.success('JSON 格式正确')
  } catch (error) {
    ElMessage.error('JSON 格式错误')
  }
}

const toggleRequestCollapse = () => {
  requestCollapsed.value = !requestCollapsed.value
}

const toggleResponseCollapse = () => {
  responseCollapsed.value = !responseCollapsed.value
}

const getStatusType = (status: number) => {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400 && status < 500) return 'danger'
  if (status >= 500) return 'danger'
  return 'info'
}

const getMethodType = (method: string) => {
  const types: Record<string, string> = {
    'GET': 'success',
    'POST': 'primary',
    'PUT': 'warning',
    'DELETE': 'danger',
    'PATCH': 'info',
    'HEAD': 'info',
    'OPTIONS': 'info'
  }
  return types[method] || 'info'
}

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const formatResponseData = (data: string) => {
  try {
    return JSON.stringify(JSON.parse(data), null, 2)
  } catch {
    return data
  }
}

const isHtmlResponse = () => {
  return response.contentType?.includes('text/html')
}

const isImageResponse = () => {
  return response.contentType?.startsWith('image/')
}

const getImageDataUrl = () => {
  
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}

const copyResponse = () => {
  if (response.data) {
    navigator.clipboard.writeText(response.data)
    ElMessage.success('响应内容已复制到剪贴板')
  }
}

const downloadResponse = () => {
  if (response.data) {
    const blob = new Blob([response.data], { type: response.contentType || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `response-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('响应内容已下载')
  }
}

const showHistory = () => {
  showHistoryDialog.value = true
}

const showEnvironments = () => {
  showEnvironmentDialog.value = true
}

const clearHistory = () => {
  ElMessageBox.confirm('确定要清空所有历史记录吗？', '确认清空', {
    type: 'warning'
  }).then(() => {
    history.value = []
    ElMessage.success('历史记录已清空')
  })
}

const exportHistory = () => {
  const data = JSON.stringify(history.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `api-history-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('历史记录已导出')
}

const loadHistoryRequest = (item: HistoryItem) => {
  Object.assign(request, item.request)
  showHistoryDialog.value = false
  ElMessage.success('历史请求已加载')
}

const deleteHistoryItem = (id: string) => {
  const index = history.value.findIndex(item => item.id === id)
  if (index !== -1) {
    history.value.splice(index, 1)
    ElMessage.success('历史记录已删除')
  }
}

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const importCollection = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          
          ElMessage.success('集合导入成功')
        } catch (error) {
          ElMessage.error('文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const exportCollection = () => {
  const collection = {
    name: 'API Collection',
    requests: [request],
    environments: environments.value
  }
  
  const data = JSON.stringify(collection, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `api-collection-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('集合已导出')
}

const addEnvironment = () => {
  ElMessageBox.prompt('请输入环境名称', '新建环境', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(({ value }) => {
    if (value) {
      environments.value.push({
        name: value,
        variables: []
      })
      currentEnvironment.value = value
      ElMessage.success('环境创建成功')
    }
  })
}

const duplicateEnvironment = () => {
  if (!currentEnvironment.value) return
  
  const env = environments.value.find(e => e.name === currentEnvironment.value)
  if (env) {
    ElMessageBox.prompt('请输入新环境名称', '复制环境', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: `${env.name} Copy`
    }).then(({ value }) => {
      if (value) {
        environments.value.push({
          name: value,
          variables: JSON.parse(JSON.stringify(env.variables))
        })
        currentEnvironment.value = value
        ElMessage.success('环境复制成功')
      }
    })
  }
}

const deleteEnvironment = () => {
  if (!currentEnvironment.value) return
  
  ElMessageBox.confirm(`确定要删除环境 "${currentEnvironment.value}" 吗？`, '确认删除', {
    type: 'warning'
  }).then(() => {
    const index = environments.value.findIndex(e => e.name === currentEnvironment.value)
    if (index !== -1) {
      environments.value.splice(index, 1)
      currentEnvironment.value = ''
      ElMessage.success('环境删除成功')
    }
  })
}

const getCurrentEnvironmentVariables = () => {
  const env = environments.value.find(e => e.name === currentEnvironment.value)
  return env ? env.variables : []
}

const addVariable = () => {
  const env = environments.value.find(e => e.name === currentEnvironment.value)
  if (env) {
    env.variables.push({
      key: '',
      value: '',
      currentValue: ''
    })
  }
}

const removeVariable = (index: number) => {
  const env = environments.value.find(e => e.name === currentEnvironment.value)
  if (env) {
    env.variables.splice(index, 1)
  }
}


onMounted(() => {
  
  const savedHistory = localStorage.getItem('api-test-history')
  if (savedHistory) {
    try {
      history.value = JSON.parse(savedHistory)
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }
  
  const savedEnvironments = localStorage.getItem('api-test-environments')
  if (savedEnvironments) {
    try {
      environments.value = JSON.parse(savedEnvironments)
    } catch (error) {
      console.error('Failed to load environments:', error)
    }
  }
})


watch(history, (newHistory) => {
  localStorage.setItem('api-test-history', JSON.stringify(newHistory))
}, { deep: true })

watch(environments, (newEnvironments) => {
  localStorage.setItem('api-test-environments', JSON.stringify(newEnvironments))
}, { deep: true })
</script>

<style scoped>
.api-test {
  padding: 20px;
  height: calc(100vh - 120px);
  overflow-y: auto;
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

.toolbar {
  margin-bottom: 20px;
}

.toolbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.left-actions,
.right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-content {
  min-height: 600px;
}

.request-config,
.response-result {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.request-basic {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.headers-list,
.params-list,
.form-data-list,
.url-encoded-list {
  max-height: 300px;
  overflow-y: auto;
}

.header-item,
.param-item,
.form-data-item,
.url-encoded-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.body-type-selector {
  margin-bottom: 16px;
}

.json-editor {
  position: relative;
}

.json-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.file-upload {
  flex: 1;
  margin-right: 8px;
}

.raw-type-selector {
  margin-bottom: 12px;
}

.binary-upload {
  width: 100%;
}

.response-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.response-status {
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.response-time,
.response-size {
  color: #909399;
  font-size: 14px;
}

.response-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.response-info {
  color: #909399;
  font-size: 14px;
}

.pretty-view,
.raw-view {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.json-pretty {
  background: #f8f9fa;
  padding: 16px;
  margin: 0;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

.html-preview,
.image-preview {
  width: 100%;
  height: 400px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.loading-state,
.error-state,
.empty-state {
  padding: 20px;
  text-align: center;
}

.response-headers {
  max-height: 300px;
  overflow-y: auto;
}

.header-item {
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header-key {
  font-weight: 600;
  margin-right: 8px;
  min-width: 150px;
  color: #409eff;
}

.header-value {
  flex: 1;
  word-break: break-all;
}

.response-cookies {
  max-height: 300px;
  overflow-y: auto;
}

.cookie-item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.cookie-name {
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.cookie-value {
  margin-bottom: 8px;
  word-break: break-all;
}

.cookie-details {
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 16px;
}

.test-results {
  padding: 16px;
}

.test-summary {
  display: flex;
  gap: 32px;
  margin-bottom: 24px;
}

.test-list {
  max-height: 300px;
  overflow-y: auto;
}

.test-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
}

.test-passed {
  color: #67c23a;
}

.test-failed {
  color: #f56c6c;
}

.test-name {
  flex: 1;
}

.test-error {
  font-size: 12px;
  color: #f56c6c;
}

.history-content {
  max-height: 60vh;
  overflow-y: auto;
}

.history-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.history-actions {
  display: flex;
  gap: 8px;
}

.environment-content {
  max-height: 60vh;
  overflow-y: auto;
}

.environment-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.environment-actions {
  display: flex;
  gap: 8px;
}

.environment-variables {
  margin-top: 20px;
}

.variables-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 600;
}


.method-get {
  color: #67c23a;
}

.method-post {
  color: #409eff;
}

.method-put {
  color: #e6a23c;
}

.method-delete {
  color: #f56c6c;
}

.method-patch {
  color: #909399;
}

.method-head,
.method-options {
  color: #909399;
}

@media (max-width: 768px) {
  .api-test {
    padding: 10px;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .left-actions,
  .right-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .main-content .el-col {
    margin-bottom: 20px;
  }
  
  .response-toolbar {
    flex-direction: column;
    gap: 12px;
  }
  
  .status-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .test-summary {
    flex-direction: column;
    gap: 16px;
  }
  
  .history-toolbar,
  .environment-toolbar {
    flex-direction: column;
    gap: 12px;
  }
}
</style>