<template>
  <div class="users-container">
    
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户管理</h1>
        <p class="page-description">管理系统用户和权限</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
        <el-button @click="refreshUsers">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    
    <div class="stats-grid">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon total">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon active">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.activeUsers }}</div>
            <div class="stat-label">活跃用户</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon admin">
            <el-icon><Crown /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.adminUsers }}</div>
            <div class="stat-label">管理员</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon online">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.onlineUsers }}</div>
            <div class="stat-label">在线用户</div>
          </div>
        </div>
      </el-card>
    </div>
    
    
    <el-card class="filter-card" shadow="never">
      <div class="filter-container">
        <div class="filter-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索用户名、邮箱或昵称"
            prefix-icon="Search"
            clearable
            @input="handleSearch"
            class="search-input"
          />
        </div>
        <div class="filter-right">
          <el-select
            v-model="filterRole"
            placeholder="角色筛选"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
          
          <el-select
            v-model="filterStatus"
            placeholder="状态筛选"
            clearable
            @change="handleFilter"
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
            <el-option label="锁定" value="locked" />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="注册开始时间"
            end-placeholder="注册结束时间"
            @change="handleFilter"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </div>
      </div>
    </el-card>
    
    
    <el-card class="table-card" shadow="never">
      <el-table
        :data="paginatedUsers"
        stripe
        :loading="loading"
        @selection-change="handleSelectionChange"
        class="users-table"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="用户信息" min-width="200">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar
                :src="row.avatar"
                :size="40"
                class="user-avatar"
              >
                {{ row.nickname?.charAt(0) || row.username?.charAt(0) }}
              </el-avatar>
              <div class="user-details">
                <div class="user-name">{{ row.nickname || row.username }}</div>
                <div class="user-email">{{ row.email }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="username" label="用户名" width="120" sortable />
        
        <el-table-column label="角色" width="120" sortable>
          <template #default="{ row }">
            <el-tag
              :type="getRoleType(row.role)"
              size="small"
            >
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100" sortable>
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="在线状态" width="100">
          <template #default="{ row }">
            <div class="online-status">
              <div
                class="status-dot"
                :class="{ online: row.isOnline }"
              ></div>
              <span>{{ row.isOnline ? '在线' : '离线' }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="lastLoginTime" label="最后登录" width="150" sortable>
          <template #default="{ row }">
            {{ row.lastLoginTime ? formatTime(row.lastLoginTime) : '从未登录' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="createdAt" label="注册时间" width="150" sortable>
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button
                size="small"
                text
                @click="viewUser(row)"
              >
                查看
              </el-button>
              <el-button
                size="small"
                type="primary"
                text
                @click="editUser(row)"
              >
                编辑
              </el-button>
              <el-dropdown trigger="click" @command="handleUserAction">
                <el-button size="small" text>
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'resetPassword', user: row }">
                      重置密码
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'toggleStatus', user: row }">
                      {{ row.status === 'active' ? '禁用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'changeRole', user: row }" divided>
                      修改角色
                    </el-dropdown-item>
                    <el-dropdown-item
                      :command="{ action: 'delete', user: row }"
                      class="danger"
                      :disabled="row.id === currentUserId"
                    >
                      删除用户
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      
      <div v-if="selectedUsers.length > 0" class="batch-actions">
        <div class="batch-info">
          已选择 {{ selectedUsers.length }} 个用户
        </div>
        <div class="batch-buttons">
          <el-button size="small" @click="batchToggleStatus">
            批量启用/禁用
          </el-button>
          <el-button size="small" @click="batchChangeRole">
            批量修改角色
          </el-button>
          <el-button size="small" type="danger" @click="batchDelete">
            批量删除
          </el-button>
        </div>
      </div>
      
      
      <div class="table-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredUsers.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    
    <el-dialog
      v-model="showCreateDialog"
      :title="editingUser ? '编辑用户' : '创建用户'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="userForm.username"
            placeholder="请输入用户名"
            :disabled="!!editingUser"
          />
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="userForm.email"
            placeholder="请输入邮箱"
            type="email"
          />
        </el-form-item>
        
        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="userForm.nickname"
            placeholder="请输入昵称"
          />
        </el-form-item>
        
        <el-form-item v-if="!editingUser" label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            placeholder="请输入密码"
            type="password"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
            <el-option label="超级管理员" value="super_admin" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" placeholder="请选择状态">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
            <el-option label="锁定" value="locked" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
          >
            <img v-if="userForm.avatar" :src="userForm.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="saving"
            @click="saveUser"
          >
            {{ saving ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    
    <el-dialog
      v-model="showDetailDialog"
      title="用户详情"
      width="700px"
    >
      <div v-if="currentUser" class="user-detail">
        <div class="detail-header">
          <el-avatar
            :src="currentUser.avatar"
            :size="80"
            class="detail-avatar"
          >
            {{ currentUser.nickname?.charAt(0) || currentUser.username?.charAt(0) }}
          </el-avatar>
          <div class="detail-info">
            <h3>{{ currentUser.nickname || currentUser.username }}</h3>
            <p>{{ currentUser.email }}</p>
            <div class="detail-tags">
              <el-tag :type="getRoleType(currentUser.role)">
                {{ getRoleText(currentUser.role) }}
              </el-tag>
              <el-tag :type="getStatusType(currentUser.status)">
                {{ getStatusText(currentUser.status) }}
              </el-tag>
              <el-tag v-if="currentUser.isOnline" type="success">
                在线
              </el-tag>
            </div>
          </div>
        </div>
        
        <el-descriptions :column="2" border class="detail-descriptions">
          <el-descriptions-item label="用户ID">
            {{ currentUser.id }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ currentUser.username }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ currentUser.email }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ currentUser.phone || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatTime(currentUser.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后登录">
            {{ currentUser.lastLoginTime ? formatTime(currentUser.lastLoginTime) : '从未登录' }}
          </el-descriptions-item>
          <el-descriptions-item label="登录次数">
            {{ currentUser.loginCount || 0 }} 次
          </el-descriptions-item>
          <el-descriptions-item label="最后登录IP">
            {{ currentUser.lastLoginIp || '未知' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="currentUser.permissions?.length" class="detail-permissions">
          <h4>用户权限</h4>
          <div class="permissions-list">
            <el-tag
              v-for="permission in currentUser.permissions"
              :key="permission"
              size="small"
              class="permission-tag"
            >
              {{ permission }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-dialog>
    
    
    <el-dialog
      v-model="showRoleDialog"
      title="修改角色"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="用户">
          <span>{{ roleChangeUser?.nickname || roleChangeUser?.username }}</span>
        </el-form-item>
        <el-form-item label="新角色">
          <el-select v-model="newRole" placeholder="请选择角色">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
            <el-option label="超级管理员" value="super_admin" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRoleDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="changingRole"
            @click="confirmChangeRole"
          >
            {{ changingRole ? '修改中...' : '确认修改' }}
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
  User,
  CircleCheck,
  Crown,
  Connection,
  ArrowDown
} from '@element-plus/icons-vue'
import api from '@/api'
import { formatTime, debounce } from '@/utils'
import { useUserStore } from '@/stores/user'
import type { User as UserType } from '@/types'

const userStore = useUserStore()


const users = ref<UserType[]>([])
const selectedUsers = ref<UserType[]>([])
const loading = ref(false)
const saving = ref(false)
const changingRole = ref(false)


const searchKeyword = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const dateRange = ref<[string, string] | null>(null)


const currentPage = ref(1)
const pageSize = ref(20)


const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showRoleDialog = ref(false)


const currentUser = ref<UserType | null>(null)
const editingUser = ref<UserType | null>(null)
const roleChangeUser = ref<UserType | null>(null)
const newRole = ref('')


const currentUserId = computed(() => userStore.user?.id)


const stats = reactive({
  totalUsers: 0,
  activeUsers: 0,
  adminUsers: 0,
  onlineUsers: 0
})


const userForm = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  role: 'user',
  status: 'active',
  avatar: ''
})


const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}


const userFormRef = ref()


const uploadUrl = computed(() => api.defaults.baseURL + '/upload/avatar')
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))


const filteredUsers = computed(() => {
  let result = users.value
  
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(user => 
      user.username.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      (user.nickname && user.nickname.toLowerCase().includes(keyword))
    )
  }
  
  
  if (filterRole.value) {
    result = result.filter(user => user.role === filterRole.value)
  }
  
  
  if (filterStatus.value) {
    result = result.filter(user => user.status === filterStatus.value)
  }
  
  
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    result = result.filter(user => {
      const userDate = new Date(user.createdAt).toISOString().split('T')[0]
      return userDate >= start && userDate <= end
    })
  }
  
  return result
})

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredUsers.value.slice(start, end)
})


function getRoleType(role: string) {
  const types: Record<string, string> = {
    super_admin: 'danger',
    admin: 'warning',
    user: 'info'
  }
  return types[role] || 'info'
}


function getRoleText(role: string) {
  const texts: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    user: '普通用户'
  }
  return texts[role] || role
}


function getStatusType(status: string) {
  const types: Record<string, string> = {
    active: 'success',
    disabled: 'warning',
    locked: 'danger'
  }
  return types[status] || 'info'
}


function getStatusText(status: string) {
  const texts: Record<string, string> = {
    active: '正常',
    disabled: '禁用',
    locked: '锁定'
  }
  return texts[status] || status
}


const handleSearch = debounce(() => {
  currentPage.value = 1
}, 300)


function handleFilter() {
  currentPage.value = 1
}


function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
}

function handleCurrentChange(page: number) {
  currentPage.value = page
}


function handleSelectionChange(selection: UserType[]) {
  selectedUsers.value = selection
}


async function loadUsers() {
  loading.value = true
  try {
    const [usersRes, statsRes] = await Promise.all([
      api.user.getUsers({ page: 1, pageSize: 1000 }),
      api.user.getUserStats()
    ])
    
    users.value = usersRes.data.data.items
    
    
    const statsData = statsRes.data.data
    stats.totalUsers = statsData.total
    stats.activeUsers = statsData.active
    stats.adminUsers = statsData.admin
    stats.onlineUsers = statsData.online
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}


function refreshUsers() {
  loadUsers()
}


function viewUser(user: UserType) {
  currentUser.value = user
  showDetailDialog.value = true
}


function editUser(user: UserType) {
  editingUser.value = user
  Object.assign(userForm, {
    username: user.username,
    email: user.email,
    nickname: user.nickname || '',
    password: '',
    role: user.role,
    status: user.status,
    avatar: user.avatar || ''
  })
  showCreateDialog.value = true
}


function resetUserForm() {
  Object.assign(userForm, {
    username: '',
    email: '',
    nickname: '',
    password: '',
    role: 'user',
    status: 'active',
    avatar: ''
  })
  editingUser.value = null
  userFormRef.value?.clearValidate()
}


async function saveUser() {
  try {
    await userFormRef.value.validate()
    
    saving.value = true
    
    if (editingUser.value) {
      
      await api.user.updateUser({
        id: editingUser.value.id,
        ...userForm
      })
      ElMessage.success('用户更新成功')
    } else {
      
      await api.user.createUser(userForm)
      ElMessage.success('用户创建成功')
    }
    
    showCreateDialog.value = false
    resetUserForm()
    await loadUsers()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error('保存用户失败')
  } finally {
    saving.value = false
  }
}


async function handleUserAction(command: { action: string; user: UserType }) {
  const { action, user } = command
  
  switch (action) {
    case 'resetPassword':
      await resetUserPassword(user)
      break
    case 'toggleStatus':
      await toggleUserStatus(user)
      break
    case 'changeRole':
      openChangeRoleDialog(user)
      break
    case 'delete':
      await deleteUser(user)
      break
  }
}


async function resetUserPassword(user: UserType) {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户 "${user.nickname || user.username}" 的密码吗？`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await api.user.resetUserPassword(user.id)
    const newPassword = res.data.data.password
    
    await ElMessageBox.alert(
      `新密码：${newPassword}\n请妥善保管并及时通知用户修改密码。`,
      '密码重置成功',
      {
        confirmButtonText: '确定',
        type: 'success'
      }
    )
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error('重置密码失败')
    }
  }
}


async function toggleUserStatus(user: UserType) {
  try {
    const newStatus = user.status === 'active' ? 'disabled' : 'active'
    const action = newStatus === 'active' ? '启用' : '禁用'
    
    await ElMessageBox.confirm(
      `确定要${action}用户 "${user.nickname || user.username}" 吗？`,
      `${action}用户`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.user.updateUser({
      id: user.id,
      status: newStatus
    })
    
    user.status = newStatus
    ElMessage.success(`用户已${action}`)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换用户状态失败:', error)
      ElMessage.error('切换用户状态失败')
    }
  }
}


function openChangeRoleDialog(user: UserType) {
  roleChangeUser.value = user
  newRole.value = user.role
  showRoleDialog.value = true
}


async function confirmChangeRole() {
  if (!roleChangeUser.value || !newRole.value) return
  
  changingRole.value = true
  try {
    await api.user.updateUser({
      id: roleChangeUser.value.id,
      role: newRole.value
    })
    
    roleChangeUser.value.role = newRole.value
    ElMessage.success('角色修改成功')
    showRoleDialog.value = false
  } catch (error) {
    console.error('修改角色失败:', error)
    ElMessage.error('修改角色失败')
  } finally {
    changingRole.value = false
  }
}


async function deleteUser(user: UserType) {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.nickname || user.username}" 吗？此操作不可恢复。`,
      '删除用户',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await api.user.deleteUser(user.id)
    
    ElMessage.success('用户删除成功')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error('删除用户失败')
    }
  }
}


async function batchToggleStatus() {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请选择要操作的用户')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要批量切换 ${selectedUsers.value.length} 个用户的状态吗？`,
      '批量操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const userIds = selectedUsers.value.map(user => user.id)
    await api.user.batchUpdateUsers({
      userIds,
      action: 'toggleStatus'
    })
    
    ElMessage.success('批量操作成功')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量操作失败:', error)
      ElMessage.error('批量操作失败')
    }
  }
}

async function batchChangeRole() {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请选择要操作的用户')
    return
  }
  
  try {
    const { value: role } = await ElMessageBox.prompt(
      `请选择要设置的角色（${selectedUsers.value.length} 个用户）`,
      '批量修改角色',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'select',
        inputOptions: {
          user: '普通用户',
          admin: '管理员',
          super_admin: '超级管理员'
        }
      }
    )
    
    const userIds = selectedUsers.value.map(user => user.id)
    await api.user.batchUpdateUsers({
      userIds,
      action: 'changeRole',
      data: { role }
    })
    
    ElMessage.success('批量修改角色成功')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量修改角色失败:', error)
      ElMessage.error('批量修改角色失败')
    }
  }
}

async function batchDelete() {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请选择要删除的用户')
    return
  }
  
  
  const hasCurrentUser = selectedUsers.value.some(user => user.id === currentUserId.value)
  if (hasCurrentUser) {
    ElMessage.error('不能删除当前登录用户')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${selectedUsers.value.length} 个用户吗？此操作不可恢复。`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const userIds = selectedUsers.value.map(user => user.id)
    await api.user.batchDeleteUsers(userIds)
    
    ElMessage.success('批量删除成功')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}


function handleAvatarSuccess(response: any) {
  userForm.avatar = response.data.url
}

function beforeAvatarUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}


onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-container {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.total {
  background: var(--el-color-primary);
}

.stat-icon.active {
  background: var(--el-color-success);
}

.stat-icon.admin {
  background: var(--el-color-warning);
}

.stat-icon.online {
  background: var(--el-color-info);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.filter-card {
  margin-bottom: 20px;
  border: none;
}

.filter-container {
  display: flex;
  gap: 16px;
  align-items: center;
}

.filter-left {
  flex: 1;
}

.search-input {
  max-width: 400px;
}

.filter-right {
  display: flex;
  gap: 12px;
}

.table-card {
  border: none;
}

.users-table {
  margin-bottom: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.user-email {
  font-size: 12px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.online-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-info);
}

.status-dot.online {
  background: var(--el-color-success);
}

.table-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  margin-bottom: 16px;
}

.batch-info {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

.table-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.user-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-avatar {
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
}

.detail-info h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-info p {
  margin: 0 0 12px 0;
  color: var(--el-text-color-regular);
}

.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-descriptions {
  margin-bottom: 24px;
}

.detail-permissions h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  margin: 0;
}

.avatar-uploader {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader:hover {
  border-color: var(--el-color-primary);
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 80px;
  height: 80px;
  text-align: center;
  line-height: 80px;
}

.avatar {
  width: 80px;
  height: 80px;
  display: block;
  object-fit: cover;
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
  .users-container {
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
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-right {
    justify-content: space-between;
  }
  
  .batch-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .batch-buttons {
    justify-content: space-between;
  }
  
  .detail-header {
    flex-direction: column;
    text-align: center;
  }
  
  .table-actions {
    flex-direction: column;
    gap: 4px;
  }
}
</style>