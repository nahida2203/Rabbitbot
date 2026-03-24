<template>
  <div class="user-list">
    
    <div class="page-header">
      <div class="header-left">
        <h2>用户列表</h2>
        <p>管理系统用户，包括用户信息、权限和状态</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
        <el-button @click="exportUsers">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button @click="importUsers">
          <el-icon><Upload /></el-icon>
          导入
        </el-button>
      </div>
    </div>

    
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索用户名、邮箱或昵称"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="searchForm.status"
            placeholder="用户状态"
            clearable
            @change="handleSearch"
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
            <el-option label="待激活" value="pending" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="searchForm.role"
            placeholder="用户角色"
            clearable
            @change="handleSearch"
          >
            <el-option label="全部" value="" />
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
            <el-option label="访客" value="guest" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleSearch"
          />
        </el-col>
        <el-col :span="4">
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-col>
      </el-row>
    </div>

    
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.total }}</div>
                <div class="stat-label">总用户数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon active">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.active }}</div>
                <div class="stat-label">活跃用户</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon disabled">
                <el-icon><CircleClose /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.disabled }}</div>
                <div class="stat-label">禁用用户</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon online">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.online }}</div>
                <div class="stat-label">在线用户</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <div class="table-section">
      <el-table
        :data="userList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="avatar" label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :size="40">
              <el-icon><User /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>
        
        <el-table-column prop="username" label="用户名" width="120" sortable />
        
        <el-table-column prop="nickname" label="昵称" width="120" />
        
        <el-table-column prop="email" label="邮箱" width="200" />
        
        <el-table-column prop="phone" label="手机号" width="130" />
        
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="lastLogin" label="最后登录" width="160">
          <template #default="{ row }">
            <div v-if="row.lastLogin">
              <div>{{ formatDate(row.lastLogin) }}</div>
              <div class="text-gray">{{ formatTime(row.lastLogin) }}</div>
            </div>
            <span v-else class="text-gray">从未登录</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="createdAt" label="创建时间" width="160" sortable>
          <template #default="{ row }">
            <div>{{ formatDate(row.createdAt) }}</div>
            <div class="text-gray">{{ formatTime(row.createdAt) }}</div>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewUser(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button size="small" type="primary" @click="editUser(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-dropdown @command="handleCommand($event, row)">
              <el-button size="small">
                更多
                <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="resetPassword">
                    <el-icon><Key /></el-icon>
                    重置密码
                  </el-dropdown-item>
                  <el-dropdown-item command="toggleStatus">
                    <el-icon><Switch /></el-icon>
                    {{ row.status === 'active' ? '禁用' : '启用' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      
      <div class="batch-actions" v-if="selectedUsers.length > 0">
        <div class="batch-info">
          已选择 {{ selectedUsers.length }} 个用户
        </div>
        <div class="batch-buttons">
          <el-button size="small" @click="batchEnable">
            <el-icon><CircleCheck /></el-icon>
            批量启用
          </el-button>
          <el-button size="small" @click="batchDisable">
            <el-icon><CircleClose /></el-icon>
            批量禁用
          </el-button>
          <el-button size="small" type="danger" @click="batchDelete">
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
        </div>
      </div>

      
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="userForm.username" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="userForm.nickname" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="userForm.email" type="email" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="userForm.phone" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" v-if="!isEdit">
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="userForm.password" type="password" show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="userForm.confirmPassword" type="password" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色" prop="role">
              <el-select v-model="userForm.role" style="width: 100%">
                <el-option label="管理员" value="admin" />
                <el-option label="普通用户" value="user" />
                <el-option label="访客" value="guest" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="userForm.status" style="width: 100%">
                <el-option label="正常" value="active" />
                <el-option label="禁用" value="disabled" />
                <el-option label="待激活" value="pending" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handleAvatarChange"
            accept="image/*"
          >
            <img v-if="userForm.avatar" :src="userForm.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input
            v-model="userForm.remark"
            type="textarea"
            :rows="3"
            placeholder="输入备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="detailDialogVisible" title="用户详情" width="800px">
      <div class="user-detail" v-if="currentUser">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="user-avatar-section">
              <el-avatar :src="currentUser.avatar" :size="120">
                <el-icon><User /></el-icon>
              </el-avatar>
              <h3>{{ currentUser.nickname || currentUser.username }}</h3>
              <el-tag :type="getStatusType(currentUser.status)">
                {{ getStatusLabel(currentUser.status) }}
              </el-tag>
            </div>
          </el-col>
          <el-col :span="16">
            <div class="user-info-section">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="用户名">{{ currentUser.username }}</el-descriptions-item>
                <el-descriptions-item label="昵称">{{ currentUser.nickname }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{ currentUser.email }}</el-descriptions-item>
                <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
                <el-descriptions-item label="角色">
                  <el-tag :type="getRoleType(currentUser.role)">
                    {{ getRoleLabel(currentUser.role) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="getStatusType(currentUser.status)">
                    {{ getStatusLabel(currentUser.status) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="创建时间">{{ formatDateTime(currentUser.createdAt) }}</el-descriptions-item>
                <el-descriptions-item label="最后登录">
                  {{ currentUser.lastLogin ? formatDateTime(currentUser.lastLogin) : '从未登录' }}
                </el-descriptions-item>
                <el-descriptions-item label="备注" :span="2">{{ currentUser.remark || '无' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-dialog>

    
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls,.csv"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Plus,
  Download,
  Upload,
  Search,
  Refresh,
  User,
  CircleCheck,
  CircleClose,
  Connection,
  View,
  Edit,
  ArrowDown,
  Key,
  Switch,
  Delete
} from '@element-plus/icons-vue'

interface UserInfo {
  id: string
  username: string
  nickname: string
  email: string
  phone: string
  avatar: string
  role: 'admin' | 'user' | 'guest'
  status: 'active' | 'disabled' | 'pending'
  lastLogin: string | null
  createdAt: string
  remark: string
}

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const userFormRef = ref<FormInstance>()
const fileInput = ref()

const searchForm = reactive({
  keyword: '',
  status: '',
  role: '',
  dateRange: null as [string, string] | null
})

const userForm = reactive({
  id: '',
  username: '',
  nickname: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  avatar: '',
  role: 'user' as 'admin' | 'user' | 'guest',
  status: 'active' as 'active' | 'disabled' | 'pending',
  remark: ''
})

const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

const stats = reactive({
  total: 0,
  active: 0,
  disabled: 0,
  online: 0
})

const userList = ref<UserInfo[]>([])
const selectedUsers = ref<UserInfo[]>([])
const currentUser = ref<UserInfo | null>(null)


const userRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== userForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}


const dialogTitle = computed(() => {
  return isEdit.value ? '编辑用户' : '添加用户'
})


const getRoleType = (role: string) => {
  const types: Record<string, string> = {
    admin: 'danger',
    user: 'primary',
    guest: 'info'
  }
  return types[role] || 'info'
}


const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: '管理员',
    user: '普通用户',
    guest: '访客'
  }
  return labels[role] || '未知'
}


const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'success',
    disabled: 'danger',
    pending: 'warning'
  }
  return types[status] || 'info'
}


const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: '正常',
    disabled: '禁用',
    pending: '待激活'
  }
  return labels[status] || '未知'
}


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}


const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString()
}


const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}


const loadUserList = async () => {
  loading.value = true
  try {
    
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      status: searchForm.status,
      role: searchForm.role,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1]
    }
    
    const response = await api.getUsers(params)
    
    if (response.data) {
      userList.value = response.data.list || []
      pagination.total = response.data.total || 0
      
      
      stats.total = response.data.total || 0
      stats.active = response.data.activeCount || 0
      stats.disabled = response.data.disabledCount || 0
      stats.online = response.data.onlineCount || 0
    } else {
      userList.value = []
      pagination.total = 0
      stats.total = 0
      stats.active = 0
      stats.disabled = 0
      stats.online = 0
    }
    
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
    userList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}


const handleSearch = () => {
  pagination.page = 1
  loadUserList()
}


const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
    role: '',
    dateRange: null
  })
  handleSearch()
}


const handlePageChange = (page: number) => {
  pagination.page = page
  loadUserList()
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadUserList()
}


const handleSelectionChange = (selection: UserInfo[]) => {
  selectedUsers.value = selection
}


const showAddDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
  resetForm()
}


const viewUser = (user: UserInfo) => {
  currentUser.value = user
  detailDialogVisible.value = true
}


const editUser = (user: UserInfo) => {
  isEdit.value = true
  Object.assign(userForm, {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    password: '',
    confirmPassword: '',
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    remark: user.remark
  })
  dialogVisible.value = true
}


const handleCommand = async (command: string, user: UserInfo) => {
  switch (command) {
    case 'resetPassword':
      await resetUserPassword(user)
      break
    case 'toggleStatus':
      await toggleUserStatus(user)
      break
    case 'delete':
      await deleteUser(user)
      break
  }
}


const resetUserPassword = async (user: UserInfo) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户 "${user.username}" 的密码吗？`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    await api.resetUserPassword({ userId: user.id })
    
    ElMessage.success('密码重置成功，新密码已发送到用户邮箱')
  } catch {
    
  }
}


const toggleUserStatus = async (user: UserInfo) => {
  const action = user.status === 'active' ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 "${user.username}" 吗？`,
      `${action}用户`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    const newStatus = user.status === 'active' ? 'disabled' : 'active'
    await api.updateUserStatus({ userId: user.id, status: newStatus })
    
    user.status = newStatus
    ElMessage.success(`用户${action}成功`)
    
    
    loadUserList()
  } catch {
    
  }
}


const deleteUser = async (user: UserInfo) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
      '删除用户',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    await api.deleteUser(user.id)
    
    ElMessage.success('用户删除成功')
    loadUserList()
  } catch {
    
  }
}


const batchEnable = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedUsers.value.length} 个用户吗？`,
      '批量启用',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    const userIds = selectedUsers.value.map(user => user.id)
    await api.batchUpdateUserStatus({ userIds, status: 'active' })
    
    ElMessage.success('批量启用成功')
    selectedUsers.value = []
    loadUserList()
  } catch {
    
  }
}


const batchDisable = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${selectedUsers.value.length} 个用户吗？`,
      '批量禁用',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    const userIds = selectedUsers.value.map(user => user.id)
    await api.batchUpdateUserStatus({ userIds, status: 'disabled' })
    
    ElMessage.success('批量禁用成功')
    selectedUsers.value = []
    loadUserList()
  } catch {
    
  }
}


const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可恢复！`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    
    const userIds = selectedUsers.value.map(user => user.id)
    await api.batchDeleteUsers({ userIds })
    
    ElMessage.success('批量删除成功')
    selectedUsers.value = []
    loadUserList()
  } catch {
    
  }
}


const submitForm = async () => {
  if (!userFormRef.value) return
  
  try {
    await userFormRef.value.validate()
    
    submitting.value = true
    
    
    if (isEdit.value) {
      await api.updateUser(userForm.id, userForm)
    } else {
      await api.createUser(userForm)
    }
    
    ElMessage.success(isEdit.value ? '用户更新成功' : '用户创建成功')
    dialogVisible.value = false
    loadUserList()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}


const resetForm = () => {
  Object.assign(userForm, {
    id: '',
    username: '',
    nickname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    avatar: '',
    role: 'user',
    status: 'active',
    remark: ''
  })
  
  if (userFormRef.value) {
    userFormRef.value.clearValidate()
  }
}


const handleAvatarChange = (file: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    userForm.avatar = e.target?.result as string
  }
  reader.readAsDataURL(file.raw)
}


const exportUsers = () => {
  
  const data = userList.value.map(user => ({
    用户名: user.username,
    昵称: user.nickname,
    邮箱: user.email,
    手机号: user.phone,
    角色: getRoleLabel(user.role),
    状态: getStatusLabel(user.status),
    创建时间: formatDateTime(user.createdAt),
    最后登录: user.lastLogin ? formatDateTime(user.lastLogin) : '从未登录',
    备注: user.remark
  }))
  
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('用户数据已导出')
}


const importUsers = () => {
  fileInput.value?.click()
}


const handleFileImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  
  ElMessage.success('用户数据导入功能开发中')
  
  
  ;(event.target as HTMLInputElement).value = ''
}

onMounted(() => {
  loadUserList()
})
</script>

<style scoped>
.user-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

.search-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  overflow: hidden;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 24px;
  color: #ffffff;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.disabled {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.online {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.table-section {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.text-gray {
  color: #909399;
  font-size: 12px;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 6px;
}

.batch-info {
  color: #606266;
  font-size: 14px;
}

.batch-buttons {
  display: flex;
  gap: 10px;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.user-detail {
  padding: 20px 0;
}

.user-avatar-section {
  text-align: center;
}

.user-avatar-section h3 {
  margin: 15px 0 10px 0;
  color: #303133;
}

.user-info-section {
  padding-left: 20px;
}

.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  line-height: 100px;
  text-align: center;
}

.avatar {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: cover;
}

.dialog-footer {
  text-align: right;
}

@media (max-width: 768px) {
  .user-list {
    padding: 10px;
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
  
  .search-section .el-row {
    flex-direction: column;
  }
  
  .search-section .el-col {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .stats-section .el-row {
    flex-direction: column;
  }
  
  .stats-section .el-col {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .batch-actions {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .batch-buttons {
    width: 100%;
    justify-content: flex-start;
  }
  
  .user-detail .el-row {
    flex-direction: column;
  }
  
  .user-info-section {
    padding-left: 0;
    margin-top: 20px;
  }
}
</style>