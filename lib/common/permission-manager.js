


export const PermissionType = {
  
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOG: 'system:log',
  SYSTEM_MONITOR: 'system:monitor',
  
  
  PLUGIN_MANAGE: 'plugin:manage',
  PLUGIN_INSTALL: 'plugin:install',
  PLUGIN_UNINSTALL: 'plugin:uninstall',
  PLUGIN_CONFIG: 'plugin:config',
  
  
  USER_MANAGE: 'user:manage',
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  
  
  GROUP_MANAGE: 'group:manage',
  GROUP_JOIN: 'group:join',
  GROUP_LEAVE: 'group:leave',
  GROUP_ADMIN: 'group:admin',
  
  
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECALL: 'message:recall',
  MESSAGE_FORWARD: 'message:forward',
  MESSAGE_AT: 'message:at',
  
  
  API_ACCESS: 'api:access',
  API_ADMIN: 'api:admin',
  API_READ: 'api:read',
  API_WRITE: 'api:write',
  
  
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_UPLOAD: 'file:upload'
}




export const RoleType = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
  BOT: 'bot'
}




export const PermissionLevel = {
  DENY: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
  SUPER: 4
}




export class Permission {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.name = data.name || ''
    this.type = data.type || ''
    this.description = data.description || ''
    this.level = data.level || PermissionLevel.READ
    this.resource = data.resource || '*'
    this.conditions = data.conditions || []
    this.enabled = data.enabled !== false
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  


  generateId() {
    return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  


  matches(permission, resource = '*') {
    if (!this.enabled) return false
    
    
    if (this.type !== permission && this.type !== '*') return false
    
    
    if (this.resource !== '*' && this.resource !== resource) {
      
      const regex = new RegExp(this.resource.replace(/\*/g, '.*'))
      if (!regex.test(resource)) return false
    }
    
    return true
  }

  


  checkConditions(context = {}) {
    for (const condition of this.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false
      }
    }
    return true
  }

  


  evaluateCondition(condition, context) {
    const { field, operator, value } = condition
    const contextValue = this.getNestedValue(context, field)
    
    switch (operator) {
      case 'eq': return contextValue === value
      case 'ne': return contextValue !== value
      case 'gt': return contextValue > value
      case 'gte': return contextValue >= value
      case 'lt': return contextValue < value
      case 'lte': return contextValue <= value
      case 'in': return Array.isArray(value) && value.includes(contextValue)
      case 'nin': return Array.isArray(value) && !value.includes(contextValue)
      case 'regex': return new RegExp(value).test(contextValue)
      default: return true
    }
  }

  


  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  


  update(data) {
    Object.assign(this, data)
    this.updatedAt = new Date()
  }

  


  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      level: this.level,
      resource: this.resource,
      conditions: this.conditions,
      enabled: this.enabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  


  toJSON() {
    return this.getInfo()
  }
}




export class Role {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.name = data.name || ''
    this.type = data.type || RoleType.USER
    this.description = data.description || ''
    this.permissions = new Set(data.permissions || [])
    this.inheritFrom = new Set(data.inheritFrom || [])
    this.priority = data.priority || 0
    this.enabled = data.enabled !== false
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  


  generateId() {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  


  addPermission(permissionId) {
    this.permissions.add(permissionId)
    this.updatedAt = new Date()
  }

  


  removePermission(permissionId) {
    this.permissions.delete(permissionId)
    this.updatedAt = new Date()
  }

  


  hasPermission(permissionId) {
    return this.permissions.has(permissionId)
  }

  


  addInheritance(roleId) {
    this.inheritFrom.add(roleId)
    this.updatedAt = new Date()
  }

  


  removeInheritance(roleId) {
    this.inheritFrom.delete(roleId)
    this.updatedAt = new Date()
  }

  


  getAllPermissions(roleManager) {
    const allPermissions = new Set(this.permissions)
    
    
    for (const parentRoleId of this.inheritFrom) {
      const parentRole = roleManager.getRole(parentRoleId)
      if (parentRole) {
        const parentPermissions = parentRole.getAllPermissions(roleManager)
        for (const perm of parentPermissions) {
          allPermissions.add(perm)
        }
      }
    }
    
    return allPermissions
  }

  


  update(data) {
    Object.assign(this, data)
    if (data.permissions) {
      this.permissions = new Set(data.permissions)
    }
    if (data.inheritFrom) {
      this.inheritFrom = new Set(data.inheritFrom)
    }
    this.updatedAt = new Date()
  }

  


  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      permissions: Array.from(this.permissions),
      inheritFrom: Array.from(this.inheritFrom),
      priority: this.priority,
      enabled: this.enabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  


  toJSON() {
    return this.getInfo()
  }
}




export class UserPermission {
  constructor(data = {}) {
    this.userId = data.userId || ''
    this.roles = new Set(data.roles || [])
    this.permissions = new Set(data.permissions || [])
    this.deniedPermissions = new Set(data.deniedPermissions || [])
    this.groups = new Set(data.groups || [])
    this.metadata = data.metadata || {}
    this.expiresAt = data.expiresAt || null
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  


  addRole(roleId) {
    this.roles.add(roleId)
    this.updatedAt = new Date()
  }

  


  removeRole(roleId) {
    this.roles.delete(roleId)
    this.updatedAt = new Date()
  }

  


  addPermission(permissionId) {
    this.permissions.add(permissionId)
    this.deniedPermissions.delete(permissionId) 
    this.updatedAt = new Date()
  }

  


  removePermission(permissionId) {
    this.permissions.delete(permissionId)
    this.updatedAt = new Date()
  }

  


  denyPermission(permissionId) {
    this.deniedPermissions.add(permissionId)
    this.permissions.delete(permissionId) 
    this.updatedAt = new Date()
  }

  


  undenyPermission(permissionId) {
    this.deniedPermissions.delete(permissionId)
    this.updatedAt = new Date()
  }

  


  isExpired() {
    return this.expiresAt && new Date() > this.expiresAt
  }

  


  update(data) {
    Object.assign(this, data)
    if (data.roles) {
      this.roles = new Set(data.roles)
    }
    if (data.permissions) {
      this.permissions = new Set(data.permissions)
    }
    if (data.deniedPermissions) {
      this.deniedPermissions = new Set(data.deniedPermissions)
    }
    if (data.groups) {
      this.groups = new Set(data.groups)
    }
    this.updatedAt = new Date()
  }

  


  getInfo() {
    return {
      userId: this.userId,
      roles: Array.from(this.roles),
      permissions: Array.from(this.permissions),
      deniedPermissions: Array.from(this.deniedPermissions),
      groups: Array.from(this.groups),
      metadata: this.metadata,
      expiresAt: this.expiresAt,
      isExpired: this.isExpired(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  


  toJSON() {
    return this.getInfo()
  }
}




export class PermissionManager {
  constructor() {
    this.permissions = new Map() 
    this.roles = new Map() 
    this.userPermissions = new Map() 
    this.cache = new Map() 
    this.cacheTimeout = 5 * 60 * 1000 
    this.stats = {
      totalPermissions: 0,
      totalRoles: 0,
      totalUsers: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    this.initialized = false
  }

  


  async initialize() {
    if (this.initialized) return

    try {
      
      await this.createDefaultPermissions()
      
      
      await this.createDefaultRoles()
      
      
      this.startCacheCleanup()
      
      this.initialized = true
    } catch (error) {
      throw error
    }
  }

  


  async createDefaultPermissions() {
    const defaultPermissions = [
      {
        name: '系统管理',
        type: PermissionType.SYSTEM_ADMIN,
        description: '系统管理员权限',
        level: PermissionLevel.SUPER
      },
      {
        name: '插件管理',
        type: PermissionType.PLUGIN_MANAGE,
        description: '插件管理权限',
        level: PermissionLevel.ADMIN
      },
      {
        name: '用户管理',
        type: PermissionType.USER_MANAGE,
        description: '用户管理权限',
        level: PermissionLevel.ADMIN
      },
      {
        name: '消息发送',
        type: PermissionType.MESSAGE_SEND,
        description: '发送消息权限',
        level: PermissionLevel.WRITE
      },
      {
        name: 'API访问',
        type: PermissionType.API_ACCESS,
        description: 'API访问权限',
        level: PermissionLevel.read
      }
    ]

    for (const permData of defaultPermissions) {
      const permission = new Permission(permData)
      this.permissions.set(permission.id, permission)
      this.stats.totalPermissions++
    }
  }

  


  async createDefaultRoles() {
    const systemAdminPerms = Array.from(this.permissions.values())
      .filter(p => p.level >= PermissionLevel.ADMIN)
      .map(p => p.id)
    
    const userPerms = Array.from(this.permissions.values())
      .filter(p => p.level <= PermissionLevel.WRITE)
      .map(p => p.id)

    const defaultRoles = [
      {
        name: '超级管理员',
        type: RoleType.SUPER_ADMIN,
        description: '拥有所有权限的超级管理员',
        permissions: Array.from(this.permissions.keys()),
        priority: 1000
      },
      {
        name: '管理员',
        type: RoleType.ADMIN,
        description: '系统管理员',
        permissions: systemAdminPerms,
        priority: 800
      },
      {
        name: '普通用户',
        type: RoleType.USER,
        description: '普通用户角色',
        permissions: userPerms,
        priority: 100
      },
      {
        name: '访客',
        type: RoleType.GUEST,
        description: '访客角色',
        permissions: [],
        priority: 0
      }
    ]

    for (const roleData of defaultRoles) {
      const role = new Role(roleData)
      this.roles.set(role.id, role)
      this.stats.totalRoles++
    }
  }

  


  createPermission(data) {
    const permission = new Permission(data)
    this.permissions.set(permission.id, permission)
    this.stats.totalPermissions++
    this.clearCache()
    return permission
  }

  


  getPermission(id) {
    return this.permissions.get(id)
  }

  


  updatePermission(id, data) {
    const permission = this.permissions.get(id)
    if (!permission) {
      throw new Error(`Permission not found: ${id}`)
    }
    
    permission.update(data)
    this.clearCache()
    return permission
  }

  


  deletePermission(id) {
    const deleted = this.permissions.delete(id)
    if (deleted) {
      this.stats.totalPermissions--
      this.clearCache()
      
      
      for (const role of this.roles.values()) {
        role.removePermission(id)
      }
      
      
      for (const userPerm of this.userPermissions.values()) {
        userPerm.removePermission(id)
        userPerm.undenyPermission(id)
      }
    }
    return deleted
  }

  


  createRole(data) {
    const role = new Role(data)
    this.roles.set(role.id, role)
    this.stats.totalRoles++
    this.clearCache()
    return role
  }

  


  getRole(id) {
    return this.roles.get(id)
  }

  


  updateRole(id, data) {
    const role = this.roles.get(id)
    if (!role) {
      throw new Error(`Role not found: ${id}`)
    }
    
    role.update(data)
    this.clearCache()
    return role
  }

  


  deleteRole(id) {
    const deleted = this.roles.delete(id)
    if (deleted) {
      this.stats.totalRoles--
      this.clearCache()
      
      
      for (const userPerm of this.userPermissions.values()) {
        userPerm.removeRole(id)
      }
      
      
      for (const role of this.roles.values()) {
        role.removeInheritance(id)
      }
    }
    return deleted
  }

  


  getUserPermission(userId) {
    let userPerm = this.userPermissions.get(userId)
    if (!userPerm) {
      userPerm = new UserPermission({ userId })
      this.userPermissions.set(userId, userPerm)
      this.stats.totalUsers++
    }
    return userPerm
  }

  


  assignRole(userId, roleId) {
    const role = this.roles.get(roleId)
    if (!role) {
      throw new Error(`Role not found: ${roleId}`)
    }
    
    const userPerm = this.getUserPermission(userId)
    userPerm.addRole(roleId)
    this.clearUserCache(userId)
    return userPerm
  }

  


  removeRole(userId, roleId) {
    const userPerm = this.userPermissions.get(userId)
    if (userPerm) {
      userPerm.removeRole(roleId)
      this.clearUserCache(userId)
    }
    return userPerm
  }

  


  grantPermission(userId, permissionId) {
    const permission = this.permissions.get(permissionId)
    if (!permission) {
      throw new Error(`Permission not found: ${permissionId}`)
    }
    
    const userPerm = this.getUserPermission(userId)
    userPerm.addPermission(permissionId)
    this.clearUserCache(userId)
    return userPerm
  }

  


  revokePermission(userId, permissionId) {
    const userPerm = this.userPermissions.get(userId)
    if (userPerm) {
      userPerm.removePermission(permissionId)
      this.clearUserCache(userId)
    }
    return userPerm
  }

  


  denyPermission(userId, permissionId) {
    const permission = this.permissions.get(permissionId)
    if (!permission) {
      throw new Error(`Permission not found: ${permissionId}`)
    }
    
    const userPerm = this.getUserPermission(userId)
    userPerm.denyPermission(permissionId)
    this.clearUserCache(userId)
    return userPerm
  }

  


  async checkPermission(userId, permissionType, resource = '*', context = {}) {
    if (!this.initialized) {
      throw new Error('PermissionManager not initialized')
    }

    
    const cacheKey = `${userId}:${permissionType}:${resource}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.stats.cacheHits++
      return cached.result
    }
    
    this.stats.cacheMisses++
    
    try {
      const userPerm = this.userPermissions.get(userId)
      if (!userPerm || userPerm.isExpired()) {
        return this.cacheResult(cacheKey, false)
      }
      
      
      for (const deniedPermId of userPerm.deniedPermissions) {
        const permission = this.permissions.get(deniedPermId)
        if (permission && permission.matches(permissionType, resource)) {
          return this.cacheResult(cacheKey, false)
        }
      }
      
      
      for (const permId of userPerm.permissions) {
        const permission = this.permissions.get(permId)
        if (permission && permission.matches(permissionType, resource) && 
            permission.checkConditions(context)) {
          return this.cacheResult(cacheKey, true)
        }
      }
      
      
      for (const roleId of userPerm.roles) {
        const role = this.roles.get(roleId)
        if (role && role.enabled) {
          const allPermissions = role.getAllPermissions(this)
          for (const permId of allPermissions) {
            const permission = this.permissions.get(permId)
            if (permission && permission.matches(permissionType, resource) && 
                permission.checkConditions(context)) {
              return this.cacheResult(cacheKey, true)
            }
          }
        }
      }
      
      return this.cacheResult(cacheKey, false)
    } catch (error) {
      console.error(`Error checking permission for user ${userId}:`, error)
      return false
    }
  }

  


  cacheResult(cacheKey, result) {
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    })
    return result
  }

  


  clearCache() {
    this.cache.clear()
  }

  


  clearUserCache(userId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key)
      }
    }
  }

  


  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.delete(key)
        }
      }
    }, this.cacheTimeout)
  }

  


  getUserPermissions(userId) {
    const userPerm = this.userPermissions.get(userId)
    if (!userPerm || userPerm.isExpired()) {
      return []
    }
    
    const allPermissions = new Set()
    
    
    for (const permId of userPerm.permissions) {
      allPermissions.add(permId)
    }
    
    
    for (const roleId of userPerm.roles) {
      const role = this.roles.get(roleId)
      if (role && role.enabled) {
        const rolePermissions = role.getAllPermissions(this)
        for (const permId of rolePermissions) {
          allPermissions.add(permId)
        }
      }
    }
    
    
    for (const deniedPermId of userPerm.deniedPermissions) {
      allPermissions.delete(deniedPermId)
    }
    
    return Array.from(allPermissions).map(id => this.permissions.get(id)).filter(Boolean)
  }

  


  getUserRoles(userId) {
    const userPerm = this.userPermissions.get(userId)
    if (!userPerm || userPerm.isExpired()) {
      return []
    }
    
    return Array.from(userPerm.roles).map(id => this.roles.get(id)).filter(Boolean)
  }

  


  getAllPermissions() {
    return Array.from(this.permissions.values()).map(p => p.getInfo())
  }

  


  getAllRoles() {
    return Array.from(this.roles.values()).map(r => r.getInfo())
  }

  


  getAllUserPermissions() {
    return Array.from(this.userPermissions.values()).map(up => up.getInfo())
  }

  


  createMiddleware(requiredPermission, resource = '*') {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id || req.userId
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
        
        const hasPermission = await this.checkPermission(
          userId, 
          requiredPermission, 
          resource, 
          { req, res }
        )
        
        if (!hasPermission) {
          return res.status(403).json({ error: 'Forbidden' })
        }
        
        next()
      } catch (error) {
        console.error('Permission middleware error:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }

  


  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 ? 
        Math.round((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 10000) / 100 : 0
    }
  }

  


  getHealth() {
    const stats = this.getStats()
    
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      totalPermissions: stats.totalPermissions,
      totalRoles: stats.totalRoles,
      totalUsers: stats.totalUsers,
      cacheSize: stats.cacheSize,
      cacheHitRate: stats.cacheHitRate,
      memoryUsage: process.memoryUsage().heapUsed
    }
  }

  


  async destroy() {
    try {
      this.permissions.clear()
      this.roles.clear()
      this.userPermissions.clear()
      this.clearCache()
      
      this.initialized = false
    } catch (error) {
      throw error
    }
  }
}


const permissionManager = new PermissionManager()


export default permissionManager
export const { checkPermission, assignRole, grantPermission, createMiddleware } = permissionManager