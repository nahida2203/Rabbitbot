import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useUserStore } from './user'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WebSocketMessage {
  id: string
  type: string
  data: any
  timestamp: number
}

export interface SystemEvent {
  type: 'system:health' | 'plugin:status' | 'config:update' | 'log:new' | 'monitor:alert'
  data: any
  timestamp: number
}

export const useWebSocketStore = defineStore('websocket', () => {
  
  const socket = ref<Socket | null>(null)
  const status = ref<ConnectionStatus>('disconnected')
  const lastConnectedTime = ref<number | null>(null)
  const lastDisconnectedTime = ref<number | null>(null)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = ref(5)
  const reconnectInterval = ref(5000)
  const subscriptions = ref<Set<string>>(new Set())
  const messageHistory = ref<WebSocketMessage[]>([])
  const systemEvents = ref<SystemEvent[]>([])
  
  
  const isConnected = computed(() => status.value === 'connected')
  const isConnecting = computed(() => status.value === 'connecting')
  const isDisconnected = computed(() => status.value === 'disconnected')
  const hasError = computed(() => status.value === 'error')
  
  const connectionInfo = computed(() => ({
    status: status.value,
    lastConnectedTime: lastConnectedTime.value,
    lastDisconnectedTime: lastDisconnectedTime.value,
    reconnectAttempts: reconnectAttempts.value,
    subscriptions: Array.from(subscriptions.value)
  }))
  
  
  async function connect(url?: string) {
    if (socket.value?.connected) {
      console.warn('WebSocket已连接')
      return
    }
    
    try {
      status.value = 'connecting'
      
      const userStore = useUserStore()
      const token = userStore.token || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '')
      const socketUrl = url || (import.meta.env.VITE_APP_WS_URL || (typeof window !== 'undefined' ? window.location.origin : ''))
      
      socket.value = io(socketUrl, {
        path: '/ws',
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts.value,
        reconnectionDelay: reconnectInterval.value
      })
      
      setupEventListeners()
      
    } catch (error) {
      console.error('WebSocket连接失败:', error)
      status.value = 'error'
      throw error
    }
  }
  
  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    status.value = 'disconnected'
    lastDisconnectedTime.value = Date.now()
    subscriptions.value.clear()
  }
  
  function setupEventListeners() {
    if (!socket.value) return
    
    
    socket.value.on('connect', () => {
      console.log('WebSocket连接成功')
      status.value = 'connected'
      lastConnectedTime.value = Date.now()
      reconnectAttempts.value = 0
      
      
      subscriptions.value.forEach(subscription => {
        subscribe(subscription, false)
      })
      
      ElMessage.success('实时连接已建立')
    })
    
    
    socket.value.on('connect_error', (error) => {
      console.error('WebSocket连接错误:', error)
      status.value = 'error'
      reconnectAttempts.value++
      
      if (reconnectAttempts.value >= maxReconnectAttempts.value) {
        ElMessage.error('实时连接失败，请检查网络或刷新页面')
      }
    })
    
    
    socket.value.on('disconnect', (reason) => {
      console.log('WebSocket断开连接:', reason)
      status.value = 'disconnected'
      lastDisconnectedTime.value = Date.now()
      
      if (reason === 'io server disconnect') {
        
        setTimeout(() => {
          if (status.value === 'disconnected') {
            connect()
          }
        }, reconnectInterval.value)
      }
    })
    
    
    socket.value.on('auth:success', (data) => {
      console.log('WebSocket认证成功:', data)
    })
    
    
    socket.value.on('auth:error', (error) => {
      console.error('WebSocket认证失败:', error)
      ElMessage.error('实时连接认证失败')
      disconnect()
    })
    
    
    socket.value.on('subscribe:success', (data) => {
      console.log('订阅成功:', data)
    })
    
    
    socket.value.on('subscribe:error', (error) => {
      console.error('订阅失败:', error)
    })
    
    
    socket.value.on('system:health', (data) => {
      addSystemEvent('system:health', data)
    })
    
    
    socket.value.on('plugin:status', (data) => {
      addSystemEvent('plugin:status', data)
      
      
      if (data.type === 'loaded') {
        ElNotification({
          title: '插件状态',
          message: `插件 ${data.name} 已加载`,
          type: 'success',
          duration: 3000
        })
      } else if (data.type === 'unloaded') {
        ElNotification({
          title: '插件状态',
          message: `插件 ${data.name} 已卸载`,
          type: 'warning',
          duration: 3000
        })
      }
    })
    
    
    socket.value.on('config:update', (data) => {
      addSystemEvent('config:update', data)
      
      ElNotification({
        title: '配置更新',
        message: `配置 ${data.type} 已更新`,
        type: 'info',
        duration: 3000
      })
    })
    
    
    socket.value.on('log:new', (data) => {
      addSystemEvent('log:new', data)
      
      
      if (data.level === 'error') {
        ElNotification({
          title: '系统错误',
          message: data.message,
          type: 'error',
          duration: 5000
        })
      }
    })
    
    
    socket.value.on('monitor:alert', (data) => {
      addSystemEvent('monitor:alert', data)
      
      ElNotification({
        title: '系统告警',
        message: data.message,
        type: data.level === 'critical' ? 'error' : 'warning',
        duration: 0 
      })
    })
    
    
    socket.value.onAny((event, data) => {
      addMessage({
        id: generateId(),
        type: event,
        data,
        timestamp: Date.now()
      })
    })
  }
  
  function subscribe(channel: string, showMessage = true) {
    if (!socket.value?.connected) {
      console.warn('WebSocket未连接，无法订阅')
      return false
    }
    
    socket.value.emit('subscribe', channel)
    subscriptions.value.add(channel)
    
    if (showMessage) {
      console.log(`已订阅频道: ${channel}`)
    }
    
    return true
  }
  
  function unsubscribe(channel: string) {
    if (!socket.value?.connected) {
      console.warn('WebSocket未连接，无法取消订阅')
      return false
    }
    
    socket.value.emit('unsubscribe', channel)
    subscriptions.value.delete(channel)
    
    if (typeof window !== 'undefined') {
      ElMessage.info(`已取消订阅: ${channel}`)
    }
    
    return true
  }
  
  function publish(channel: string, data: any) {
    if (!socket.value?.connected) {
      console.warn('WebSocket未连接，无法发布')
      return false
    }
    socket.value.emit(channel, data)
    return true
  }
  
  function addMessage(message: WebSocketMessage) {
    messageHistory.value.push(message)
    if (messageHistory.value.length > 200) {
      messageHistory.value.shift()
    }
  }
  
  function addSystemEvent(type: SystemEvent['type'], data: any) {
    systemEvents.value.push({ type, data, timestamp: Date.now() })
    if (systemEvents.value.length > 200) {
      systemEvents.value.shift()
    }
  }
  
  function generateId(): string {
    return Math.random().toString(36).substring(2, 10)
  }
  
  return {
    socket,
    status,
    lastConnectedTime,
    lastDisconnectedTime,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    subscriptions,
    messageHistory,
    systemEvents,
    isConnected,
    isConnecting,
    isDisconnected,
    hasError,
    connectionInfo,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish
  }
})


function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}