import type { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/stores/user'





const permission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  }
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding) {
  const { value } = binding
  const userStore = useUserStore()
  const { roles, permissions } = userStore

  if (value && value instanceof Array && value.length > 0) {
    const requiredPermissions = value
    
    
    if (roles.includes('admin') || permissions.includes('*')) {
      return
    }
    
    
    const hasPermission = requiredPermissions.some(permission => {
      return roles.includes(permission) || permissions.includes(permission)
    })

    if (!hasPermission) {
      el.style.display = 'none'
      
      
    } else {
      el.style.display = ''
    }
  } else {
    console.error('权限指令需要传入权限数组，如：v-permission="["admin", "user"]"')
  }
}





const role: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkRole(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkRole(el, binding)
  }
}

function checkRole(el: HTMLElement, binding: DirectiveBinding) {
  const { value } = binding
  const userStore = useUserStore()
  const { roles } = userStore

  if (value && value instanceof Array && value.length > 0) {
    const requiredRoles = value
    
    const hasRole = requiredRoles.some(role => roles.includes(role))

    if (!hasRole) {
      el.style.display = 'none'
    } else {
      el.style.display = ''
    }
  } else {
    console.error('角色指令需要传入角色数组，如：v-role="["admin", "user"]"')
  }
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', permission)
  app.directive('role', role)
}

export { permission, role }