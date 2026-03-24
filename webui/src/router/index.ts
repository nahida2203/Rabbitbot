import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import NProgress from 'nprogress'


const Layout = () => import('@/layouts/MainLayout.vue')
const AuthLayout = () => import('@/layouts/AuthLayout.vue')


export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/views/auth/Login.vue'),
        meta: {
          title: '登录',
          hidden: true
        }
      }
    ]
  },
  {
    path: '/register',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Register',
        component: () => import('@/views/auth/Register.vue'),
        meta: {
          title: '注册',
          hidden: true
        }
      }
    ]
  },
  {
    path: '/forgot-password',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'ForgotPassword',
        component: () => import('@/views/auth/ForgotPassword.vue'),
        meta: {
          title: '忘记密码',
          hidden: true
        }
      }
    ]
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: {
      title: '页面不存在',
      hidden: true
    }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: {
      title: '访问被拒绝',
      hidden: true
    }
  },
  {
    path: '/500',
    name: 'ServerError',
    component: () => import('@/views/error/500.vue'),
    meta: {
      title: '服务器错误',
      hidden: true
    }
  }
]


export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '仪表盘',
          icon: 'Dashboard',
          affix: true,
          keepAlive: true
        }
      }
    ]
  },
  {
    path: '/plugins',
    component: Layout,
    redirect: '/plugins/list',
    meta: {
      title: '插件管理',
      icon: 'Grid',
      roles: ['admin', 'plugin_manager']
    },
    children: [
      {
        path: 'list',
        name: 'PluginList',
        component: () => import('@/views/plugins/List.vue'),
        meta: {
          title: '插件列表',
          icon: 'List',
          keepAlive: true
        }
      },
      {
        path: 'store',
        name: 'PluginStore',
        component: () => import('@/views/plugins/Store.vue'),
        meta: {
          title: '插件商店',
          icon: 'Shop'
        }
      },
      {
        path: 'develop',
        name: 'PluginDevelop',
        component: () => import('@/views/plugins/Develop.vue'),
        meta: {
          title: '插件开发',
          icon: 'EditPen',
          roles: ['admin', 'developer']
        }
      },
      {
        path: 'detail/:id',
        name: 'PluginDetail',
        component: () => import('@/views/plugins/Detail.vue'),
        meta: {
          title: '插件详情',
          hidden: true,
          activeMenu: '/plugins/list'
        }
      }
    ]
  },
  {
    path: '/config',
    component: Layout,
    redirect: '/config/system',
    meta: {
      title: '配置管理',
      icon: 'Setting',
      roles: ['admin', 'config_manager']
    },
    children: [
      {
        path: 'system',
        name: 'SystemConfig',
        component: () => import('@/views/config/System.vue'),
        meta: {
          title: '系统配置',
          icon: 'Tools'
        }
      },
      {
        path: 'bot',
        name: 'BotConfig',
        component: () => import('@/views/config/Bot.vue'),
        meta: {
          title: '机器人配置',
          icon: 'Robot'
        }
      },
      {
        path: 'adapter',
        name: 'AdapterConfig',
        component: () => import('@/views/config/Adapter.vue'),
        meta: {
          title: '适配器配置',
          icon: 'Connection'
        }
      },
      {
        path: 'security',
        name: 'SecurityConfig',
        component: () => import('@/views/config/Security.vue'),
        meta: {
          title: '安全配置',
          icon: 'Lock',
          roles: ['admin']
        }
      }
    ]
  },
  {
    path: '/logs',
    component: Layout,
    redirect: '/logs/system',
    meta: {
      title: '日志管理',
      icon: 'Document',
      roles: ['admin', 'log_viewer']
    },
    children: [
      {
        path: 'system',
        name: 'SystemLogs',
        component: () => import('@/views/logs/System.vue'),
        meta: {
          title: '系统日志',
          icon: 'Monitor'
        }
      },
      {
        path: 'error',
        name: 'ErrorLogs',
        component: () => import('@/views/logs/Error.vue'),
        meta: {
          title: '错误日志',
          icon: 'Warning'
        }
      },
      {
        path: 'access',
        name: 'AccessLogs',
        component: () => import('@/views/logs/Access.vue'),
        meta: {
          title: '访问日志',
          icon: 'View'
        }
      },
      {
        path: 'audit',
        name: 'AuditLogs',
        component: () => import('@/views/logs/Audit.vue'),
        meta: {
          title: '审计日志',
          icon: 'Notebook',
          roles: ['admin']
        }
      }
    ]
  },
  {
    path: '/monitor',
    component: Layout,
    redirect: '/monitor/system',
    meta: {
      title: '系统监控',
      icon: 'Monitor',
      roles: ['admin', 'monitor_viewer']
    },
    children: [
      {
        path: 'system',
        name: 'SystemMonitor',
        component: () => import('@/views/monitor/System.vue'),
        meta: {
          title: '系统监控',
          icon: 'Cpu',
          keepAlive: true
        }
      },
      {
        path: 'performance',
        name: 'PerformanceMonitor',
        component: () => import('@/views/monitor/Performance.vue'),
        meta: {
          title: '性能监控',
          icon: 'TrendCharts',
          keepAlive: true
        }
      },
      {
        path: 'network',
        name: 'NetworkMonitor',
        component: () => import('@/views/monitor/Network.vue'),
        meta: {
          title: '网络监控',
          icon: 'Connection'
        }
      },
      {
        path: 'alerts',
        name: 'AlertsMonitor',
        component: () => import('@/views/monitor/Alerts.vue'),
        meta: {
          title: '告警管理',
          icon: 'Bell'
        }
      }
    ]
  },
  {
    path: '/users',
    component: Layout,
    redirect: '/users/list',
    meta: {
      title: '用户管理',
      icon: 'User',
      roles: ['admin', 'user_manager']
    },
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/views/users/List.vue'),
        meta: {
          title: '用户列表',
          icon: 'UserFilled'
        }
      },
      {
        path: 'roles',
        name: 'RoleList',
        component: () => import('@/views/users/Roles.vue'),
        meta: {
          title: '角色管理',
          icon: 'Avatar'
        }
      },
      {
        path: 'permissions',
        name: 'PermissionList',
        component: () => import('@/views/users/Permissions.vue'),
        meta: {
          title: '权限管理',
          icon: 'Key',
          roles: ['admin']
        }
      },
      {
        path: 'profile/:id?',
        name: 'UserProfile',
        component: () => import('@/views/users/Profile.vue'),
        meta: {
          title: '用户资料',
          hidden: true,
          activeMenu: '/users/list'
        }
      }
    ]
  },
  {
    path: '/ai',
    component: Layout,
    redirect: '/ai/chat',
    meta: {
      title: 'AI助手',
      icon: 'ChatDotRound',
      roles: ['admin', 'ai_user']
    },
    children: [
      {
        path: 'chat',
        name: 'AIChat',
        component: () => import('@/views/ai/Chat.vue'),
        meta: {
          title: 'AI对话',
          icon: 'ChatLineRound',
          keepAlive: true
        }
      },
      {
        path: 'models',
        name: 'AIModels',
        component: () => import('@/views/ai/Models.vue'),
        meta: {
          title: '模型管理',
          icon: 'Cpu'
        }
      },
      {
        path: 'training',
        name: 'AITraining',
        component: () => import('@/views/ai/Training.vue'),
        meta: {
          title: '模型训练',
          icon: 'DataAnalysis',
          roles: ['admin']
        }
      }
    ]
  },
  {
    path: '/tools',
    component: Layout,
    redirect: '/tools/terminal',
    meta: {
      title: '开发工具',
      icon: 'Tools',
      roles: ['admin', 'developer']
    },
    children: [
      {
        path: 'terminal',
        name: 'Terminal',
        component: () => import('@/views/tools/Terminal.vue'),
        meta: {
          title: '终端',
          icon: 'Monitor'
        }
      },
      {
        path: 'editor',
        name: 'CodeEditor',
        component: () => import('@/views/tools/Editor.vue'),
        meta: {
          title: '代码编辑器',
          icon: 'EditPen'
        }
      },
      {
        path: 'api-test',
        name: 'APITest',
        component: () => import('@/views/tools/APITest.vue'),
        meta: {
          title: 'API测试',
          icon: 'Connection'
        }
      },
      {
        path: 'database',
        name: 'DatabaseTool',
        component: () => import('@/views/tools/Database.vue'),
        meta: {
          title: '数据库工具',
          icon: 'Coin'
        }
      }
    ]
  },
  {
    path: '/system',
    component: Layout,
    redirect: '/system/info',
    meta: {
      title: '系统管理',
      icon: 'Setting',
      roles: ['admin']
    },
    children: [
      {
        path: 'info',
        name: 'SystemInfo',
        component: () => import('@/views/system/Info.vue'),
        meta: {
          title: '系统信息',
          icon: 'InfoFilled'
        }
      },
      {
        path: 'backup',
        name: 'SystemBackup',
        component: () => import('@/views/system/Backup.vue'),
        meta: {
          title: '备份管理',
          icon: 'FolderAdd'
        }
      },
      {
        path: 'update',
        name: 'SystemUpdate',
        component: () => import('@/views/system/Update.vue'),
        meta: {
          title: '系统更新',
          icon: 'Refresh'
        }
      },
      {
        path: 'maintenance',
        name: 'SystemMaintenance',
        component: () => import('@/views/system/Maintenance.vue'),
        meta: {
          title: '系统维护',
          icon: 'Tools'
        }
      }
    ]
  },
  {
    path: '/settings',
    component: Layout,
    meta: {
      title: '个性化设置',
      icon: 'Operation'
    },
    children: [
      {
        path: '',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: {
          title: '个性化设置'
        }
      }
    ]
  },
  
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true }
  }
]


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...constantRoutes, ...asyncRoutes],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})


router.beforeEach(async (to, from, next) => {
  
  NProgress.start()
  
  const userStore = useUserStore()
  const appStore = useAppStore()
  
  
  if (to.meta?.title) {
    document.title = `${to.meta.title} - ${appStore.appTitle}`
  }
  
  const publicPages = ['/login', '/register', '/forgot-password', '/404', '/403', '/500']
  const authRequired = !publicPages.includes(to.path)

  console.log('🚀 路由守卫检查:', {
    toPath: to.path,
    fromPath: from.path,
    authRequired,
    isLoggedIn: userStore.isLoggedIn,
    userRoles: userStore.roles,
    routeRoles: to.meta?.roles
  })

  if (authRequired && !userStore.isLoggedIn) {
    console.log('🚀 未登录，跳转到登录页')
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else if (userStore.isLoggedIn && to.path === '/login') {
    console.log('🚀 已登录，从登录页跳转到首页')
    next('/')
  } else {
    
    if (
      userStore.isLoggedIn &&
      userStore.roles.length === 0 &&
      userStore.permissions.length === 0 &&
      typeof userStore.getUserInfo === 'function'
    ) {
      try {
        await userStore.getUserInfo()
      } catch (e) {
        
      }
    }

    
    if (to.meta?.roles && Array.isArray(to.meta.roles)) {
      const isPrivileged = userStore.roles.includes('admin') || userStore.roles.includes('super_admin')
      const hasWildcardPermission = userStore.permissions.includes('*')
      const hasPermission =
        isPrivileged ||
        hasWildcardPermission ||
        to.meta.roles.some(role => userStore.roles.includes(role) || userStore.permissions.includes(role))
      
      console.log('🚀 权限检查:', {
        requiredRoles: to.meta.roles,
        userRoles: userStore.roles,
        hasPermission
      })
      
      if (!hasPermission) {
        
        console.log('🚀 无权限，跳转到403页面')
        next('/403')
        return
      }
    }
    console.log('🚀 路由守卫通过，继续导航')
    next()
  }
})

router.afterEach((to) => {
  
  NProgress.done()
  
  
  const appStore = useAppStore()
  appStore.addVisitedView(to)
})


router.onError((error) => {
  console.error('路由错误:', error)
  NProgress.done()
})

export default router