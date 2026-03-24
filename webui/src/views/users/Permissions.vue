<template>
  <div class="permissions-management">
    
    <div class="page-header">
      <h2>权限管理</h2>
      <p>管理系统权限和访问控制</p>
    </div>

    
    <el-card class="toolbar">
      <div class="toolbar-content">
        <div class="search-group">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索权限名称或描述"
            style="width: 300px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select v-model="selectedGroup" placeholder="选择权限组" style="width: 150px;" clearable>
            <el-option label="全部" value="" />
            <el-option
              v-for="group in permissionGroups"
              :key="group.key"
              :label="group.name"
              :value="group.key"
            />
          </el-select>
        </div>
        
        <div class="action-group">
          <el-button type="primary" @click="showAddPermissionDialog">
            <el-icon><Plus /></el-icon>
            添加权限
          </el-button>
          <el-button @click="refreshPermissions">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button @click="exportPermissions">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </div>
      </div>
    </el-card>

    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#409eff"><Key /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalPermissions }}</div>
              <div class="stat-label">总权限数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#67c23a"><Collection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ permissionGroups.length }}</div>
              <div class="stat-label">权限组数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#e6a23c"><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ assignedPermissions }}</div>
              <div class="stat-label">已分配权限</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon color="#f56c6c"><Lock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ systemPermissions }}</div>
              <div class="stat-label">系统权限</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-card class="permissions-table">
      <template #header>
        <div class="table-header">
          <span>权限列表</span>
          <div class="table-actions">
            <el-button size="small" @click="expandAll">展开全部</el-button>
            <el-button size="small" @click="collapseAll">收起全部</el-button>
          </div>
        </div>
      </template>
      
      <el-table
        :data="filteredPermissions"
        row-key="key"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :expand-row-keys="expandedKeys"
        @expand-change="handleExpandChange"
      >
        <el-table-column prop="name" label="权限名称" min-width="200">
          <template #default="{ row }">
            <div class="permission-name">
              <el-icon v-if="row.isGroup" class="group-icon"><Folder /></el-icon>
              <el-icon v-else class="permission-icon"><Key /></el-icon>
              <span>{{ row.name }}</span>
              <el-tag v-if="row.isSystem" type="info" size="small">系统</el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="key" label="权限标识" width="200" />
        
        <el-table-column prop="description" label="描述" min-width="250" />
        
        <el-table-column label="分配状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="!row.isGroup" :type="row.isAssigned ? 'success' : 'info'" size="small">
              {{ row.isAssigned ? '已分配' : '未分配' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            <span v-if="!row.isGroup">{{ row.createdAt }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div v-if="!row.isGroup" class="action-buttons">
              <el-button type="text" size="small" @click="viewPermission(row)">
                查看
              </el-button>
              <el-button 
                type="text" 
                size="small" 
                @click="editPermission(row)"
                :disabled="row.isSystem"
              >
                编辑
              </el-button>
              <el-button 
                type="text" 
                size="small" 
                @click="viewRoles(row)"
              >
                角色
              </el-button>
              <el-button 
                type="text" 
                size="small" 
                @click="deletePermission(row)"
                :disabled="row.isSystem"
                style="color: #f56c6c;"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    
    <el-dialog v-model="showPermissionDialog" :title="dialogTitle" width="600px">
      <el-form :model="permissionForm" :rules="permissionRules" ref="permissionFormRef" label-width="100px">
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="permissionForm.name" placeholder="请输入权限名称" />
        </el-form-item>
        
        <el-form-item label="权限标识" prop="key">
          <el-input v-model="permissionForm.key" placeholder="请输入权限标识，如：user.read" />
        </el-form-item>
        
        <el-form-item label="权限组" prop="group">
          <el-select v-model="permissionForm.group" placeholder="选择权限组" style="width: 100%;">
            <el-option
              v-for="group in permissionGroups"
              :key="group.key"
              :label="group.name"
              :value="group.key"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="权限描述" prop="description">
          <el-input 
            v-model="permissionForm.description" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入权限描述"
          />
        </el-form-item>
        
        <el-form-item label="权限级别" prop="level">
          <el-select v-model="permissionForm.level" placeholder="选择权限级别" style="width: 100%;">
            <el-option label="只读" value="read" />
            <el-option label="读写" value="write" />
            <el-option label="管理" value="admin" />
            <el-option label="超级" value="super" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="资源路径">
          <el-input v-model="permissionForm.resource" placeholder="可选，如：/api/users" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showPermissionDialog = false">取消</el-button>
          <el-button type="primary" @click="savePermission">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="showViewDialog" title="权限详情" width="600px">
      <div v-if="selectedPermission" class="permission-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="权限名称">{{ selectedPermission.name }}</el-descriptions-item>
          <el-descriptions-item label="权限标识">{{ selectedPermission.key }}</el-descriptions-item>
          <el-descriptions-item label="权限组">{{ getGroupName(selectedPermission.group) }}</el-descriptions-item>
          <el-descriptions-item label="权限级别">
            <el-tag :type="getLevelType(selectedPermission.level)">{{ getLevelText(selectedPermission.level) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="权限类型">
            <el-tag :type="selectedPermission.isSystem ? 'info' : 'primary'">
              {{ selectedPermission.isSystem ? '系统权限' : '自定义权限' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分配状态">
            <el-tag :type="selectedPermission.isAssigned ? 'success' : 'info'">
              {{ selectedPermission.isAssigned ? '已分配' : '未分配' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资源路径">{{ selectedPermission.resource || '无' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedPermission.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="权限描述" :span="2">
            {{ selectedPermission.description }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    
    <el-dialog v-model="showRolesDialog" title="权限角色分配" width="500px">
      <div v-if="selectedPermission" class="roles-assignment">
        <p class="assignment-info">权限：{{ selectedPermission.name }}</p>
        <el-divider />
        
        <div class="roles-list">
          <div v-for="role in allRoles" :key="role.id" class="role-item">
            <el-checkbox
              :model-value="role.permissions.includes(selectedPermission.key)"
              @change="toggleRolePermission(role, selectedPermission.key, $event)"
              :disabled="role.isSystem && !role.permissions.includes(selectedPermission.key)"
            >
              <div class="role-info">
                <span class="role-name">{{ role.name }}</span>
                <el-tag v-if="role.isSystem" type="info" size="small">系统角色</el-tag>
              </div>
            </el-checkbox>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRolesDialog = false">关闭</el-button>
          <el-button type="primary" @click="saveRoleAssignment">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Plus, Refresh, Download, Key, Collection, 
  UserFilled, Lock, Folder 
} from '@element-plus/icons-vue'

// 权限组配置
const permissionGroups = [
  { key: 'user', name: '用户管理' },
  { key: 'plugin', name: '插件管理' },
  { key: 'config', name: '配置管理' },
  { key: 'system', name: '系统管理' },
  { key: 'log', name: '日志管理' },
  { key: 'ai', name: 'AI助手' },
  { key: 'dev', name: '开发工具' }
]

// 权限数据（树形结构）
const permissions = ref([
  {
    key: 'user',
    name: '用户管理',
    isGroup: true,
    children: [
      {
        key: 'user.read',
        name: '查看用户',
        group: 'user',
        description: '查看用户列表和用户详细信息',
        level: 'read',
        resource: '/api/users',
        isSystem: true,
        isAssigned: true,
        createdAt: '2024-01-01 00:00:00'
      },
      {
        key: 'user.write',
        name: '编辑用户',
        group: 'user',
        description: '创建、编辑和更新用户信息',
        level: 'write',
        resource: '/api/users',
        isSystem: true,
        isAssigned: true,
        createdAt: '2024-01-01 00:00:00'
      },
      {
        key: 'user.delete',
        name: '删除用户',
        group: 'user',
        description: '删除用户账户',
        level: 'admin',
        resource: '/api/users',
        isSystem: true,
        isAssigned: false,
        createdAt: '2024-01-01 00:00:00'
      },
      {
        key: 'user.role',
        name: '分配角色',
        group: 'user',
        description: '为用户分配和管理角色',
        level: 'admin',
        resource: '/api/users/roles',
        isSystem: true,
        isAssigned: true,
        createdAt: '2024-01-01 00:00:00'
      }
    ]
  },
  {
    key: 'plugin',
    name: '插件管理',
    isGroup: true,
    children: [
      {
        key: 'plugin.read',
        name: '查看插件',
        group: 'plugin',
        description: '查看插件列表和插件信息',
        level: 'read',
        resource: '/api/plugins',
        isSystem: true,
        isAssigned: true,
        createdAt: '2024-01-01 00:00:00'
      },
      {
        key: 'plugin.write',
        name: '管理插件',
        group: 'plugin',
        description: '启用、禁用和配置插件',
        level: 'write',
        resource: '/api/plugins',
        isSystem: true,
        isAssigned: false,
        createdAt: '2024-01-01 00:00:00'
      },
      {
        key: 'plugin.install',
        name: '安装插件',
        group: 'plugin',
        description: '安装和卸载插件',
        level: 'admin',
        resource: '/api/plugins/install',
        isSystem: true,
        isAssigned: false,
        createdAt: '2024-01-01 00:00:00'
      }
    ]
  },
  {
    key: 'system',
    name: '系统管理',
    isGroup: true,
    children: [
      {
        key: 'system.read',
        name: '查看系统',
        group: 'system',
        description: '查看系统状态和信息',
        level: 'read',
        resource: '/api/system',
        isSystem: true,
        isAssigned: true,
        createdAt: '2024-01-01 00:00:00'
      },
      {
        key: 'system.write',
        name: '系统管理',
        group: 'system',
        description: '管理系统设置和配置',
        level: 'admin',
        resource: '/api/system',
        isSystem: true,
        isAssigned: false,
        createdAt: '2024-01-01 00:00:00'
      },
      {
        key: 'system.backup',
        name: '系统备份',
        group: 'system',
        description: '创建和管理系统备份',
        level: 'super',
        resource: '/api/system/backup',
        isSystem: true,
        isAssigned: false,
        createdAt: '2024-01-01 00:00:00'
      }
    ]
  }
])

// 角色数据（用于权限分配）
const allRoles = ref([
  {
    id: 1,
    name: '超级管理员',
    isSystem: true,
    permissions: ['user.read', 'user.write', 'user.delete', 'user.role', 'plugin.read', 'plugin.write', 'plugin.install', 'system.read', 'system.write', 'system.backup']
  },
  {
    id: 2,
    name: '系统管理员',
    isSystem: true,
    permissions: ['user.read', 'plugin.read', 'plugin.write', 'system.read', 'system.write']
  },
  {
    id: 3,
    name: '普通用户',
    isSystem: true,
    permissions: ['user.read', 'plugin.read', 'system.read']
  }
])

// 搜索和过滤
const searchKeyword = ref('')
const selectedGroup = ref('')

// 对话框状态
const showPermissionDialog = ref(false)
const showViewDialog = ref(false)
const showRolesDialog = ref(false)
const isEditMode = ref(false)
const selectedPermission = ref(null)

// 表格展开状态
const expandedKeys = ref(['user', 'plugin', 'system'])

// 权限表单
const permissionForm = reactive({
  name: '',
  key: '',
  group: '',
  description: '',
  level: 'read',
  resource: ''
})

// 表单验证规则
const permissionRules = {
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' }
  ],
  key: [
    { required: true, message: '请输入权限标识', trigger: 'blur' },
    { pattern: /^[a-z]+\.[a-z]+$/, message: '权限标识格式：组名.操作名', trigger: 'blur' }
  ],
  group: [
    { required: true, message: '请选择权限组', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入权限描述', trigger: 'blur' }
  ],
  level: [
    { required: true, message: '请选择权限级别', trigger: 'change' }
  ]
}

const permissionFormRef = ref()

// 计算属性
const totalPermissions = computed(() => {
  return permissions.value.reduce((total, group) => {
    return total + (group.children ? group.children.length : 0)
  }, 0)
})

const assignedPermissions = computed(() => {
  let count = 0
  permissions.value.forEach(group => {
    if (group.children) {
      count += group.children.filter(p => p.isAssigned).length
    }
  })
  return count
})

const systemPermissions = computed(() => {
  let count = 0
  permissions.value.forEach(group => {
    if (group.children) {
      count += group.children.filter(p => p.isSystem).length
    }
  })
  return count
})

const filteredPermissions = computed(() => {
  let result = [...permissions.value]
  
  // 按权限组过滤
  if (selectedGroup.value) {
    result = result.filter(group => group.key === selectedGroup.value)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.map(group => {
      if (group.children) {
        const filteredChildren = group.children.filter(permission => 
          permission.name.toLowerCase().includes(keyword) ||
          permission.key.toLowerCase().includes(keyword) ||
          permission.description.toLowerCase().includes(keyword)
        )
        
        if (filteredChildren.length > 0) {
          return { ...group, children: filteredChildren }
        }
      }
      return null
    }).filter(Boolean)
  }
  
  return result
})

const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑权限' : '添加权限'
})

// 方法
const getGroupName = (groupKey: string) => {
  const group = permissionGroups.find(g => g.key === groupKey)
  return group ? group.name : groupKey
}

const getLevelText = (level: string) => {
  const levelMap = {
    read: '只读',
    write: '读写',
    admin: '管理',
    super: '超级'
  }
  return levelMap[level] || level
}

const getLevelType = (level: string) => {
  const typeMap = {
    read: 'info',
    write: 'primary',
    admin: 'warning',
    super: 'danger'
  }
  return typeMap[level] || 'info'
}

const handleExpandChange = (row: any, expandedRows: any[]) => {
  if (expandedRows.includes(row)) {
    if (!expandedKeys.value.includes(row.key)) {
      expandedKeys.value.push(row.key)
    }
  } else {
    const index = expandedKeys.value.indexOf(row.key)
    if (index > -1) {
      expandedKeys.value.splice(index, 1)
    }
  }
}

const expandAll = () => {
  expandedKeys.value = permissions.value.map(group => group.key)
}

const collapseAll = () => {
  expandedKeys.value = []
}

const showAddPermissionDialog = () => {
  isEditMode.value = false
  resetPermissionForm()
  showPermissionDialog.value = true
}

const viewPermission = (permission: any) => {
  selectedPermission.value = permission
  showViewDialog.value = true
}

const editPermission = (permission: any) => {
  if (permission.isSystem) {
    ElMessage.warning('系统权限不允许编辑')
    return
  }
  
  isEditMode.value = true
  Object.assign(permissionForm, {
    name: permission.name,
    key: permission.key,
    group: permission.group,
    description: permission.description,
    level: permission.level,
    resource: permission.resource || ''
  })
  showPermissionDialog.value = true
}

const viewRoles = (permission: any) => {
  selectedPermission.value = permission
  showRolesDialog.value = true
}

const deletePermission = async (permission: any) => {
  if (permission.isSystem) {
    ElMessage.warning('系统权限不允许删除')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确定要删除权限 "${permission.name}" 吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    // 从权限树中删除
    permissions.value.forEach(group => {
      if (group.children) {
        const index = group.children.indexOf(permission)
        if (index > -1) {
          group.children.splice(index, 1)
          ElMessage.success(`权限 "${permission.name}" 删除成功`)
        }
      }
    })
  } catch {
    // 用户取消删除
  }
}

const resetPermissionForm = () => {
  Object.assign(permissionForm, {
    name: '',
    key: '',
    group: '',
    description: '',
    level: 'read',
    resource: ''
  })
}

const savePermission = async () => {
  try {
    await permissionFormRef.value.validate()
    
    // 检查权限标识是否重复
    const exists = permissions.value.some(group => 
      group.children && group.children.some(p => p.key === permissionForm.key)
    )
    
    if (exists && !isEditMode.value) {
      ElMessage.error('权限标识已存在')
      return
    }
    
    if (isEditMode.value) {
      // 编辑模式
      permissions.value.forEach(group => {
        if (group.children) {
          const permission = group.children.find(p => p.key === permissionForm.key)
          if (permission) {
            Object.assign(permission, {
              name: permissionForm.name,
              description: permissionForm.description,
              level: permissionForm.level,
              resource: permissionForm.resource
            })
          }
        }
      })
      ElMessage.success('权限更新成功')
    } else {
      // 新增模式
      const targetGroup = permissions.value.find(g => g.key === permissionForm.group)
      if (targetGroup && targetGroup.children) {
        const newPermission = {
          key: permissionForm.key,
          name: permissionForm.name,
          group: permissionForm.group,
          description: permissionForm.description,
          level: permissionForm.level,
          resource: permissionForm.resource,
          isSystem: false,
          isAssigned: false,
          createdAt: new Date().toLocaleString()
        }
        
        targetGroup.children.push(newPermission)
        ElMessage.success('权限添加成功')
      }
    }
    
    showPermissionDialog.value = false
    resetPermissionForm()
  } catch (error) {
    ElMessage.error('请检查表单输入')
  }
}

const toggleRolePermission = (role: any, permissionKey: string, checked: boolean) => {
  if (checked) {
    if (!role.permissions.includes(permissionKey)) {
      role.permissions.push(permissionKey)
    }
  } else {
    const index = role.permissions.indexOf(permissionKey)
    if (index > -1) {
      role.permissions.splice(index, 1)
    }
  }
}

const saveRoleAssignment = () => {
  ElMessage.success('角色权限分配已保存')
  showRolesDialog.value = false
  
  // 更新权限的分配状态
  if (selectedPermission.value) {
    const isAssigned = allRoles.value.some(role => 
      role.permissions.includes(selectedPermission.value.key)
    )
    selectedPermission.value.isAssigned = isAssigned
  }
}

const refreshPermissions = async () => {
  try {
    // 这里应该调用API获取最新权限数据
    ElMessage.success('权限列表已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

const exportPermissions = () => {
  // 导出权限数据
  const data = JSON.stringify(permissions.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'permissions.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('权限数据导出成功')
}
</script>

<style scoped>
.permissions-management {
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
  gap: 12px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.permissions-table {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.permission-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-icon,
.permission-icon {
  font-size: 16px;
}

.group-icon {
  color: #409eff;
}

.permission-icon {
  color: #67c23a;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.permission-detail {
  max-height: 500px;
  overflow-y: auto;
}

.roles-assignment {
  max-height: 400px;
  overflow-y: auto;
}

.assignment-info {
  margin: 0 0 16px 0;
  font-weight: 600;
  color: #303133;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.3s;
}

.role-item:hover {
  border-color: #409eff;
  background-color: #f8f9fa;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-name {
  font-weight: 500;
  color: #303133;
}

@media (max-width: 768px) {
  .permissions-management {
    padding: 10px;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-group {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .action-group {
    justify-content: center;
  }
  
  .stats-row .el-col {
    margin-bottom: 12px;
  }
  
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
}
</style>