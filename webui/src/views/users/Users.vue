<template>
  <div class="users-management">
    
    <div class="page-header">
      <h2>用户管理</h2>
      <p>管理系统用户账户和权限</p>
    </div>

    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ userStats.total }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ userStats.online }}</div>
            <div class="stat-label">在线用户</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ userStats.active }}</div>
            <div class="stat-label">活跃用户</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ userStats.blocked }}</div>
            <div class="stat-label">被封用户</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-card class="toolbar">
      <div class="toolbar-content">
        <div class="search-group">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索用户名、邮箱或昵称"
            style="width: 300px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select v-model="filterRole" placeholder="角色" style="width: 120px; margin-left: 12px;">
            <el-option label="全部" value="" />
            <el-option label="管理员" value="admin" />
            <el-option label="操作员" value="operator" />
            <el-option label="普通用户" value="user" />
          </el-select>
          
          <el-select v-model="filterStatus" placeholder="状态" style="width: 120px; margin-left: 12px;">
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
            <el-option label="封禁" value="blocked" />
          </el-select>
        </div>
        
        <div class="action-group">
          <el-button type="primary" @click="showAddUserDialog">
            <el-icon><Plus /></el-icon>
            添加用户
          </el-button>
          <el-button @click="exportUsers">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button @click="refreshUsers">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    
    <el-card class="user-list">
      <el-table 
        :data="filteredUsers" 
        style="width: 100%" 
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :alt="row.username">
              {{ row.username.charAt(0).toUpperCase() }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLogin" label="最后登录" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="viewUser(row)">
              查看
            </el-button>
            <el-button type="text" size="small" @click="editUser(row)">
              编辑
            </el-button>
            <el-dropdown @command="(command) => handleUserAction(command, row)">
              <el-button type="text" size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="resetPassword">重置密码</el-dropdown-item>
                  <el-dropdown-item command="changeRole">修改角色</el-dropdown-item>
                  <el-dropdown-item 
                    :command="row.status === 'active' ? 'disable' : 'enable'"
                  >
                    {{ row.status === 'active' ? '禁用' : '启用' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      
      
      <div v-if="selectedUsers.length > 0" class="batch-actions">
        <span class="selected-info">已选择 {{ selectedUsers.length }} 个用户</span>
        <el-button size="small" @click="batchEnable">批量启用</el-button>
        <el-button size="small" @click="batchDisable">批量禁用</el-button>
        <el-button size="small" type="danger" @click="batchDelete">批量删除</el-button>
      </div>
      
      
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalUsers"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    
    <el-dialog v-model="showUserDialog" :title="dialogTitle" width="800px">
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="userForm.username" :disabled="isEditMode" />
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
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色" prop="role">
              <el-select v-model="userForm.role" style="width: 100%;">
                <el-option label="管理员" value="admin" />
                <el-option label="操作员" value="operator" />
                <el-option label="普通用户" value="user" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="userForm.status" style="width: 100%;">
                <el-option label="正常" value="active" />
                <el-option label="禁用" value="disabled" />
                <el-option label="封禁" value="blocked" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item v-if="!isEditMode" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input v-model="userForm.remark" type="textarea" :rows="3" />
        </el-form-item>
        
        <el-form-item label="权限">
          <el-checkbox-group v-model="userForm.permissions">
            <el-checkbox label="user.read">用户查看</el-checkbox>
            <el-checkbox label="user.write">用户编辑</el-checkbox>
            <el-checkbox label="plugin.read">插件查看</el-checkbox>
            <el-checkbox label="plugin.write">插件管理</el-checkbox>
            <el-checkbox label="config.read">配置查看</el-checkbox>
            <el-checkbox label="config.write">配置编辑</el-checkbox>
            <el-checkbox label="system.read">系统查看</el-checkbox>
            <el-checkbox label="system.write">系统管理</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showUserDialog = false">取消</el-button>
          <el-button type="primary" @click="saveUser">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="showViewDialog" title="用户详情" width="600px">
      <div v-if="selectedUser" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="头像">
            <el-avatar :src="selectedUser.avatar" :size="60">
              {{ selectedUser.username.charAt(0).toUpperCase() }}
            </el-avatar>
          </el-descriptions-item>
          <el-descriptions-item label="在线状态">
            <el-tag :type="selectedUser.online ? 'success' : 'info'" size="small">
              {{ selectedUser.online ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户名">{{ selectedUser.username }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ selectedUser.nickname }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ selectedUser.email }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ selectedUser.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleTagType(selectedUser.role)">
              {{ getRoleText(selectedUser.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedUser.status)">
              {{ getStatusText(selectedUser.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedUser.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ selectedUser.lastLogin }}</el-descriptions-item>
          <el-descriptions-item label="登录次数">{{ selectedUser.loginCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="最后IP">{{ selectedUser.lastIP || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ selectedUser.remark || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Download, Refresh, ArrowDown } from '@element-plus/icons-vue'

// 用户数据
const users = ref([
  {
    id: 1,
    username: 'admin',
    nickname: '系统管理员',
    email: 'admin@example.com',
    phone: '13800138000',
    role: 'admin',
    status: 'active',
    avatar: '',
    online: true,
    lastLogin: '2024-01-15 14:30:25',
    createdAt: '2024-01-01 00:00:00',
    loginCount: 156,
    lastIP: '192.168.1.100',
    remark: '系统默认管理员账户',
    permissions: ['user.read', 'user.write', 'plugin.read', 'plugin.write', 'config.read', 'config.write', 'system.read', 'system.write']
  },
  {
    id: 2,
    username: 'operator',
    nickname: '运维人员',
    email: 'operator@example.com',
    phone: '13800138001',
    role: 'operator',
    status: 'active',
    avatar: '',
    online: false,
    lastLogin: '2024-01-15 10:20:15',
    createdAt: '2024-01-02 09:00:00',
    loginCount: 89,
    lastIP: '192.168.1.101',
    remark: '负责系统运维工作',
    permissions: ['plugin.read', 'plugin.write', 'config.read', 'system.read']
  },
  {
    id: 3,
    username: 'user001',
    nickname: '普通用户',
    email: 'user001@example.com',
    phone: '',
    role: 'user',
    status: 'disabled',
    avatar: '',
    online: false,
    lastLogin: '2024-01-10 16:45:30',
    createdAt: '2024-01-05 14:30:00',
    loginCount: 23,
    lastIP: '192.168.1.102',
    remark: '',
    permissions: ['user.read', 'plugin.read']
  }
])

// 搜索和过滤
const searchKeyword = ref('')
const filterRole = ref('')
const filterStatus = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const totalUsers = computed(() => filteredUsers.value.length)

// 选中的用户
const selectedUsers = ref([])

// 对话框
const showUserDialog = ref(false)
const showViewDialog = ref(false)
const isEditMode = ref(false)
const selectedUser = ref(null)

// 用户表单
const userForm = reactive({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  role: 'user',
  status: 'active',
  password: '',
  remark: '',
  permissions: []
})

// 表单验证规则
const userRules = {
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
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const userFormRef = ref()

// 用户统计
const userStats = computed(() => {
  const stats = {
    total: users.value.length,
    online: users.value.filter(user => user.online).length,
    active: users.value.filter(user => user.status === 'active').length,
    blocked: users.value.filter(user => user.status === 'blocked').length
  }
  return stats
})

// 过滤后的用户
const filteredUsers = computed(() => {
  let filtered = users.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(user => 
      user.username.toLowerCase().includes(keyword) ||
      user.nickname.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword)
    )
  }
  
  // 角色过滤
  if (filterRole.value) {
    filtered = filtered.filter(user => user.role === filterRole.value)
  }
  
  // 状态过滤
  if (filterStatus.value) {
    filtered = filtered.filter(user => user.status === filterStatus.value)
  }
  
  // 分页
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filtered.slice(startIndex, endIndex)
})

// 对话框标题
const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑用户' : '添加用户'
})

// 获取角色标签类型
const getRoleTagType = (role: string) => {
  const typeMap = {
    admin: 'danger',
    operator: 'warning',
    user: ''
  }
  return typeMap[role] || ''
}

// 获取角色文本
const getRoleText = (role: string) => {
  const textMap = {
    admin: '管理员',
    operator: '操作员',
    user: '普通用户'
  }
  return textMap[role] || role
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap = {
    active: 'success',
    disabled: 'warning',
    blocked: 'danger'
  }
  return typeMap[status] || ''
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap = {
    active: '正常',
    disabled: '禁用',
    blocked: '封禁'
  }
  return textMap[status] || status
}

// 显示添加用户对话框
const showAddUserDialog = () => {
  isEditMode.value = false
  resetUserForm()
  showUserDialog.value = true
}

// 查看用户
const viewUser = (user: any) => {
  selectedUser.value = user
  showViewDialog.value = true
}

// 编辑用户
const editUser = (user: any) => {
  isEditMode.value = true
  Object.assign(userForm, user)
  showUserDialog.value = true
}

// 重置用户表单
const resetUserForm = () => {
  Object.assign(userForm, {
    username: '',
    nickname: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'active',
    password: '',
    remark: '',
    permissions: []
  })
}

// 保存用户
const saveUser = async () => {
  try {
    await userFormRef.value.validate()
    
    if (isEditMode.value) {
      // 编辑模式
      const index = users.value.findIndex(user => user.username === userForm.username)
      if (index > -1) {
        Object.assign(users.value[index], userForm)
        ElMessage.success('用户更新成功')
      }
    } else {
      // 新增模式
      const newUser = {
        ...userForm,
        id: Date.now(),
        avatar: '',
        online: false,
        lastLogin: '-',
        createdAt: new Date().toLocaleString(),
        loginCount: 0,
        lastIP: '-'
      }
      users.value.push(newUser)
      ElMessage.success('用户添加成功')
    }
    
    showUserDialog.value = false
    resetUserForm()
  } catch (error) {
    ElMessage.error('请检查表单输入')
  }
}

// 处理用户操作
const handleUserAction = async (command: string, user: any) => {
  switch (command) {
    case 'resetPassword':
      await resetUserPassword(user)
      break
    case 'changeRole':
      await changeUserRole(user)
      break
    case 'enable':
      user.status = 'active'
      ElMessage.success(`用户 ${user.username} 已启用`)
      break
    case 'disable':
      user.status = 'disabled'
      ElMessage.success(`用户 ${user.username} 已禁用`)
      break
    case 'delete':
      await deleteUser(user)
      break
  }
}

// 重置用户密码
const resetUserPassword = async (user: any) => {
  try {
    await ElMessageBox.confirm(`确定要重置用户 ${user.username} 的密码吗？`, '确认重置', {
      type: 'warning'
    })
    
    // 这里应该调用API重置密码
    ElMessage.success(`用户 ${user.username} 密码重置成功，新密码已发送到邮箱`)
  } catch {
    // 用户取消重置
  }
}

// 修改用户角色
const changeUserRole = async (user: any) => {
  try {
    const { value: newRole } = await ElMessageBox.prompt('请选择新角色', '修改角色', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'select',
      inputOptions: {
        admin: '管理员',
        operator: '操作员',
        user: '普通用户'
      },
      inputValue: user.role
    })
    
    user.role = newRole
    ElMessage.success(`用户 ${user.username} 角色修改成功`)
  } catch {
    // 用户取消修改
  }
}

// 删除用户
const deleteUser = async (user: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 ${user.username} 吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    const index = users.value.indexOf(user)
    if (index > -1) {
      users.value.splice(index, 1)
      ElMessage.success(`用户 ${user.username} 删除成功`)
    }
  } catch {
    // 用户取消删除
  }
}

// 处理选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedUsers.value = selection
}

// 批量启用
const batchEnable = async () => {
  try {
    await ElMessageBox.confirm(`确定要启用选中的 ${selectedUsers.value.length} 个用户吗？`, '确认启用', {
      type: 'warning'
    })
    
    selectedUsers.value.forEach(user => {
      user.status = 'active'
    })
    
    ElMessage.success(`已启用 ${selectedUsers.value.length} 个用户`)
    selectedUsers.value = []
  } catch {
    // 用户取消启用
  }
}

// 批量禁用
const batchDisable = async () => {
  try {
    await ElMessageBox.confirm(`确定要禁用选中的 ${selectedUsers.value.length} 个用户吗？`, '确认禁用', {
      type: 'warning'
    })
    
    selectedUsers.value.forEach(user => {
      user.status = 'disabled'
    })
    
    ElMessage.success(`已禁用 ${selectedUsers.value.length} 个用户`)
    selectedUsers.value = []
  } catch {
    // 用户取消禁用
  }
}

// 批量删除
const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    selectedUsers.value.forEach(user => {
      const index = users.value.indexOf(user)
      if (index > -1) {
        users.value.splice(index, 1)
      }
    })
    
    ElMessage.success(`已删除 ${selectedUsers.value.length} 个用户`)
    selectedUsers.value = []
  } catch {
    // 用户取消删除
  }
}

// 导出用户
const exportUsers = () => {
  const userData = users.value.map(user => {
    return `${user.username}\t${user.nickname}\t${user.email}\t${user.role}\t${user.status}\t${user.createdAt}`
  }).join('\n')
  
  const headers = 'Username\tNickname\tEmail\tRole\tStatus\tCreated At\n'
  const csvContent = headers + userData
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('用户数据导出成功')
}

// 刷新用户列表
const refreshUsers = async () => {
  try {
    // 这里应该调用API获取最新用户数据
    ElMessage.success('用户列表已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}
</script>

<style scoped>
.users-management {
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

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  border-left: 4px solid #409eff;
}

.stat-content {
  padding: 10px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
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

.search-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-list {
  margin-bottom: 20px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid #ebeef5;
  margin-top: 12px;
}

.selected-info {
  color: #409eff;
  font-size: 14px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.user-detail {
  max-height: 600px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .users-management {
    padding: 10px;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-group {
    margin-bottom: 12px;
  }
  
  .el-table {
    font-size: 12px;
  }
  
  .batch-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>