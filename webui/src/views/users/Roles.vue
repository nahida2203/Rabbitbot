<template>
  <div class="roles-management">
    
    <div class="page-header">
      <h2>角色管理</h2>
      <p>管理系统角色和权限配置</p>
    </div>

    
    <el-card class="toolbar">
      <div class="toolbar-content">
        <div class="search-group">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索角色名称或描述"
            style="width: 300px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <div class="action-group">
          <el-button type="primary" @click="showAddRoleDialog">
            <el-icon><Plus /></el-icon>
            添加角色
          </el-button>
          <el-button @click="refreshRoles">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    
    <el-row :gutter="20">
      <el-col :span="8" v-for="role in filteredRoles" :key="role.id">
        <el-card class="role-card" :class="{ 'system-role': role.isSystem }">
          <template #header>
            <div class="role-header">
              <div class="role-info">
                <h3 class="role-name">{{ role.name }}</h3>
                <el-tag v-if="role.isSystem" type="info" size="small">系统角色</el-tag>
              </div>
              <div class="role-actions">
                <el-dropdown @command="(command) => handleRoleAction(command, role)">
                  <el-button type="text" size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="view">查看详情</el-dropdown-item>
                      <el-dropdown-item command="edit" :disabled="role.isSystem">编辑</el-dropdown-item>
                      <el-dropdown-item command="copy">复制角色</el-dropdown-item>
                      <el-dropdown-item command="delete" :disabled="role.isSystem" divided>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </template>
          
          <div class="role-content">
            <p class="role-description">{{ role.description }}</p>
            
            <div class="role-stats">
              <div class="stat-item">
                <span class="stat-label">用户数量：</span>
                <span class="stat-value">{{ role.userCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">权限数量：</span>
                <span class="stat-value">{{ role.permissions.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">创建时间：</span>
                <span class="stat-value">{{ role.createdAt }}</span>
              </div>
            </div>
            
            <div class="role-permissions">
              <h4>主要权限</h4>
              <div class="permission-tags">
                <el-tag
                  v-for="permission in role.permissions.slice(0, 6)"
                  :key="permission"
                  size="small"
                  class="permission-tag"
                >
                  {{ getPermissionText(permission) }}
                </el-tag>
                <el-tag v-if="role.permissions.length > 6" size="small" type="info">
                  +{{ role.permissions.length - 6 }} 更多
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    
    <el-dialog v-model="showRoleDialog" :title="dialogTitle" width="800px">
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>
        
        <el-form-item label="角色描述" prop="description">
          <el-input 
            v-model="roleForm.description" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入角色描述"
          />
        </el-form-item>
        
        <el-form-item label="权限配置">
          <div class="permissions-config">
            <div v-for="group in permissionGroups" :key="group.key" class="permission-group">
              <div class="group-header">
                <el-checkbox
                  :model-value="isGroupAllSelected(group)"
                  :indeterminate="isGroupIndeterminate(group)"
                  @change="handleGroupChange(group, $event)"
                >
                  {{ group.name }}
                </el-checkbox>
              </div>
              <div class="group-permissions">
                <el-checkbox-group v-model="roleForm.permissions">
                  <el-checkbox
                    v-for="permission in group.permissions"
                    :key="permission.key"
                    :label="permission.key"
                    class="permission-checkbox"
                  >
                    {{ permission.name }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRoleDialog = false">取消</el-button>
          <el-button type="primary" @click="saveRole">保存</el-button>
        </div>
      </template>
    </el-dialog>

    
    <el-dialog v-model="showViewDialog" title="角色详情" width="600px">
      <div v-if="selectedRole" class="role-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="角色名称">{{ selectedRole.name }}</el-descriptions-item>
          <el-descriptions-item label="角色类型">
            <el-tag :type="selectedRole.isSystem ? 'info' : 'primary'">
              {{ selectedRole.isSystem ? '系统角色' : '自定义角色' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户数量">{{ selectedRole.userCount }}</el-descriptions-item>
          <el-descriptions-item label="权限数量">{{ selectedRole.permissions.length }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedRole.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ selectedRole.updatedAt }}</el-descriptions-item>
          <el-descriptions-item label="角色描述" :span="2">
            {{ selectedRole.description }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="role-permissions-detail">
          <h4>权限列表</h4>
          <div class="permissions-list">
            <div v-for="group in permissionGroups" :key="group.key" class="permission-group-detail">
              <h5 class="group-title">{{ group.name }}</h5>
              <div class="group-permissions-detail">
                <el-tag
                  v-for="permission in group.permissions"
                  :key="permission.key"
                  :type="selectedRole.permissions.includes(permission.key) ? 'success' : 'info'"
                  size="small"
                  class="permission-tag-detail"
                >
                  {{ permission.name }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, MoreFilled } from '@element-plus/icons-vue'


const permissionGroups = [
  {
    key: 'user',
    name: '用户管理',
    permissions: [
      { key: 'user.read', name: '查看用户' },
      { key: 'user.write', name: '编辑用户' },
      { key: 'user.delete', name: '删除用户' },
      { key: 'user.role', name: '分配角色' }
    ]
  },
  {
    key: 'plugin',
    name: '插件管理',
    permissions: [
      { key: 'plugin.read', name: '查看插件' },
      { key: 'plugin.write', name: '管理插件' },
      { key: 'plugin.install', name: '安装插件' },
      { key: 'plugin.config', name: '配置插件' }
    ]
  },
  {
    key: 'config',
    name: '配置管理',
    permissions: [
      { key: 'config.read', name: '查看配置' },
      { key: 'config.write', name: '编辑配置' },
      { key: 'config.system', name: '系统配置' },
      { key: 'config.security', name: '安全配置' }
    ]
  },
  {
    key: 'system',
    name: '系统管理',
    permissions: [
      { key: 'system.read', name: '查看系统' },
      { key: 'system.write', name: '系统管理' },
      { key: 'system.monitor', name: '系统监控' },
      { key: 'system.backup', name: '系统备份' }
    ]
  },
  {
    key: 'log',
    name: '日志管理',
    permissions: [
      { key: 'log.read', name: '查看日志' },
      { key: 'log.export', name: '导出日志' },
      { key: 'log.clear', name: '清理日志' },
      { key: 'log.audit', name: '审计日志' }
    ]
  }
]


const roles = ref([
  {
    id: 1,
    name: '超级管理员',
    description: '拥有系统所有权限的最高管理员角色',
    isSystem: true,
    userCount: 1,
    permissions: [
      'user.read', 'user.write', 'user.delete', 'user.role',
      'plugin.read', 'plugin.write', 'plugin.install', 'plugin.config',
      'config.read', 'config.write', 'config.system', 'config.security',
      'system.read', 'system.write', 'system.monitor', 'system.backup',
      'log.read', 'log.export', 'log.clear', 'log.audit'
    ],
    createdAt: '2024-01-01 00:00:00',
    updatedAt: '2024-01-01 00:00:00'
  },
  {
    id: 2,
    name: '系统管理员',
    description: '负责系统运维和配置管理的管理员角色',
    isSystem: true,
    userCount: 2,
    permissions: [
      'user.read', 'plugin.read', 'plugin.write', 'plugin.config',
      'config.read', 'config.write', 'system.read', 'system.write',
      'system.monitor', 'log.read', 'log.export'
    ],
    createdAt: '2024-01-01 00:00:00',
    updatedAt: '2024-01-01 00:00:00'
  },
  {
    id: 3,
    name: '普通用户',
    description: '基础用户角色，只能查看基本信息',
    isSystem: true,
    userCount: 15,
    permissions: [
      'user.read', 'plugin.read', 'config.read', 'log.read'
    ],
    createdAt: '2024-01-01 00:00:00',
    updatedAt: '2024-01-01 00:00:00'
  },
  {
    id: 4,
    name: '插件开发者',
    description: '专门负责插件开发和管理的角色',
    isSystem: false,
    userCount: 3,
    permissions: [
      'plugin.read', 'plugin.write', 'plugin.install', 'plugin.config',
      'config.read', 'log.read'
    ],
    createdAt: '2024-01-05 10:30:00',
    updatedAt: '2024-01-10 14:20:00'
  }
])


const searchKeyword = ref('')


const showRoleDialog = ref(false)
const showViewDialog = ref(false)
const isEditMode = ref(false)
const selectedRole = ref(null)


const roleForm = reactive({
  name: '',
  description: '',
  permissions: []
})


const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 20, message: '角色名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入角色描述', trigger: 'blur' }
  ]
}

const roleFormRef = ref()


const filteredRoles = computed(() => {
  if (!searchKeyword.value) {
    return roles.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return roles.value.filter(role => 
    role.name.toLowerCase().includes(keyword) ||
    role.description.toLowerCase().includes(keyword)
  )
})


const dialogTitle = computed(() => {
  return isEditMode.value ? '编辑角色' : '添加角色'
})


const getPermissionText = (permissionKey: string) => {
  for (const group of permissionGroups) {
    const permission = group.permissions.find(p => p.key === permissionKey)
    if (permission) {
      return permission.name
    }
  }
  return permissionKey
}


const isGroupAllSelected = (group: any) => {
  return group.permissions.every(p => roleForm.permissions.includes(p.key))
}


const isGroupIndeterminate = (group: any) => {
  const selectedCount = group.permissions.filter(p => roleForm.permissions.includes(p.key)).length
  return selectedCount > 0 && selectedCount < group.permissions.length
}


const handleGroupChange = (group: any, checked: boolean) => {
  if (checked) {
    
    group.permissions.forEach(p => {
      if (!roleForm.permissions.includes(p.key)) {
        roleForm.permissions.push(p.key)
      }
    })
  } else {
    
    group.permissions.forEach(p => {
      const index = roleForm.permissions.indexOf(p.key)
      if (index > -1) {
        roleForm.permissions.splice(index, 1)
      }
    })
  }
}


const showAddRoleDialog = () => {
  isEditMode.value = false
  resetRoleForm()
  showRoleDialog.value = true
}


const handleRoleAction = (command: string, role: any) => {
  switch (command) {
    case 'view':
      viewRole(role)
      break
    case 'edit':
      editRole(role)
      break
    case 'copy':
      copyRole(role)
      break
    case 'delete':
      deleteRole(role)
      break
  }
}


const viewRole = (role: any) => {
  selectedRole.value = role
  showViewDialog.value = true
}


const editRole = (role: any) => {
  if (role.isSystem) {
    ElMessage.warning('系统角色不允许编辑')
    return
  }
  
  isEditMode.value = true
  Object.assign(roleForm, {
    name: role.name,
    description: role.description,
    permissions: [...role.permissions]
  })
  showRoleDialog.value = true
}


const copyRole = (role: any) => {
  isEditMode.value = false
  Object.assign(roleForm, {
    name: `${role.name} - 副本`,
    description: role.description,
    permissions: [...role.permissions]
  })
  showRoleDialog.value = true
}


const deleteRole = async (role: any) => {
  if (role.isSystem) {
    ElMessage.warning('系统角色不允许删除')
    return
  }
  
  if (role.userCount > 0) {
    ElMessage.warning('该角色下还有用户，无法删除')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确定要删除角色 "${role.name}" 吗？此操作不可恢复！`, '确认删除', {
      type: 'warning'
    })
    
    const index = roles.value.indexOf(role)
    if (index > -1) {
      roles.value.splice(index, 1)
      ElMessage.success(`角色 "${role.name}" 删除成功`)
    }
  } catch {
    
  }
}


const resetRoleForm = () => {
  Object.assign(roleForm, {
    name: '',
    description: '',
    permissions: []
  })
}


const saveRole = async () => {
  try {
    await roleFormRef.value.validate()
    
    if (roleForm.permissions.length === 0) {
      ElMessage.error('请至少选择一个权限')
      return
    }
    
    if (isEditMode.value) {
      
      const role = roles.value.find(r => r.name === roleForm.name)
      if (role) {
        Object.assign(role, {
          description: roleForm.description,
          permissions: [...roleForm.permissions],
          updatedAt: new Date().toLocaleString()
        })
        ElMessage.success('角色更新成功')
      }
    } else {
      
      
      if (roles.value.some(r => r.name === roleForm.name)) {
        ElMessage.error('角色名称已存在')
        return
      }
      
      const newRole = {
        id: Date.now(),
        name: roleForm.name,
        description: roleForm.description,
        isSystem: false,
        userCount: 0,
        permissions: [...roleForm.permissions],
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      }
      
      roles.value.push(newRole)
      ElMessage.success('角色添加成功')
    }
    
    showRoleDialog.value = false
    resetRoleForm()
  } catch (error) {
    ElMessage.error('请检查表单输入')
  }
}


const refreshRoles = async () => {
  try {
    
    ElMessage.success('角色列表已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}
</script>

<style scoped>
.roles-management {
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
}

.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.role-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.role-card.system-role {
  border-left: 4px solid #909399;
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.role-content {
  padding: 0;
}

.role-description {
  margin: 0 0 16px 0;
  color: #606266;
  line-height: 1.5;
}

.role-stats {
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}

.stat-label {
  color: #909399;
}

.stat-value {
  color: #303133;
  font-weight: 500;
}

.role-permissions h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-tag {
  margin: 0;
}

.permissions-config {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
}

.permission-group {
  margin-bottom: 20px;
}

.permission-group:last-child {
  margin-bottom: 0;
}

.group-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.group-header .el-checkbox {
  font-weight: 600;
  color: #303133;
}

.group-permissions {
  padding-left: 20px;
}

.permission-checkbox {
  display: block;
  margin-bottom: 8px;
}

.role-detail {
  max-height: 600px;
  overflow-y: auto;
}

.role-permissions-detail {
  margin-top: 20px;
}

.role-permissions-detail h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.permission-group-detail {
  margin-bottom: 16px;
}

.group-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.group-permissions-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-tag-detail {
  margin: 0;
}

@media (max-width: 768px) {
  .roles-management {
    padding: 10px;
  }
  
  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-group {
    margin-bottom: 12px;
  }
  
  .role-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .permission-tags {
    gap: 4px;
  }
  
  .permissions-config {
    max-height: 300px;
  }
}
</style>