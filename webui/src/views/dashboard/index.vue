<template>
  <div class="dashboard">
    
    <div class="welcome-section">
      <el-card class="welcome-card" shadow="hover">
        <div class="welcome-content">
          <div class="welcome-text">
            <h1>欢迎回来，{{ userStore.userInfo?.nickname || '管理员' }}！</h1>
            <p>今天是 {{ currentDate }}，祝您工作愉快！</p>
          </div>
          <div class="welcome-avatar">
            <el-avatar :size="80" :src="userStore.userInfo?.avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
          </div>
        </div>
      </el-card>
    </div>

    
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" v-for="stat in stats" :key="stat.title">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" :style="{ backgroundColor: stat.color }">
                <el-icon :size="24">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-title">{{ stat.title }}</div>
                <div class="stat-change" :class="stat.trend">
                  <el-icon><component :is="stat.trend === 'up' ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
                  {{ stat.change }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>消息统计</span>
                <el-button type="text" @click="refreshMessageChart">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="chart-container" ref="messageChartRef"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card class="chart-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>用户活跃度</span>
                <el-button type="text" @click="refreshUserChart">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </template>
            <div class="chart-container" ref="userChartRef"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    
    <div class="actions-section">
      <el-card class="actions-card" shadow="hover">
        <template #header>
          <span>快捷操作</span>
        </template>
        <div class="actions-grid">
          <div class="action-item" v-for="action in quickActions" :key="action.title" @click="handleAction(action.action)">
            <div class="action-icon" :style="{ backgroundColor: action.color }">
              <el-icon :size="20">
                <component :is="action.icon" />
              </el-icon>
            </div>
            <div class="action-title">{{ action.title }}</div>
          </div>
        </div>
      </el-card>
    </div>

    
    <div class="activity-section">
      <el-card class="activity-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>最近活动</span>
            <el-button type="text" @click="refreshActivity">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="activity in recentActivities"
            :key="activity.id"
            :timestamp="activity.time"
            :type="activity.type"
          >
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-description">{{ activity.description }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  User,
  Message,
  UserFilled,
  Setting,
  DataAnalysis,
  Refresh,
  ArrowUp,
  ArrowDown,
  Plus,
  Edit,
  View,
  Download
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { systemApi } from '@/api'
import dayjs from 'dayjs'

const router = useRouter();
const userStore = useUserStore();

// 当前日期
const currentDate = computed(() => {
  return dayjs().format('YYYY-MM-DD dddd');
});

// 统计数据
const stats = ref([
  {
    title: '今日请求',
    value: '-',
    change: '-',
    trend: 'up',
    color: '#409EFF',
    icon: 'Message'
  },
  {
    title: '活跃会话',
    value: '-',
    change: '-',
    trend: 'up',
    color: '#67C23A',
    icon: 'UserFilled'
  },
  {
    title: '内存占用',
    value: '- MB',
    change: '-',
    trend: 'down',
    color: '#E6A23C',
    icon: 'DataAnalysis'
  },
  {
    title: '请求错误',
    value: '-',
    change: '-',
    trend: 'down',
    color: '#F56C6C',
    icon: 'Setting'
  }
])

let timer: any = null

const fetchStats = async () => {
  try {
    const res = await systemApi.getStats();
    if (res.success) {
      const data = res.data;
      
      // 更新统计卡片
      stats.value[0].value = (data.webui?.requests || 0).toLocaleString();
      stats.value[1].value = (data.securityEngine?.sessions || 0).toLocaleString();
      
      const memMb = Math.round((data.system?.memory?.rss || 0) / 1024 / 1024);
      stats.value[2].value = `${memMb} MB`;
      
      stats.value[3].value = (data.webui?.errors || 0).toLocaleString();
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
};

onMounted(() => {
  fetchStats()
  timer = setInterval(fetchStats, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 快捷操作
const quickActions = ref([
  {
    title: '系统信息',
    icon: 'View',
    color: '#303133',
    action: 'viewInfo'
  },
  {
    title: '用户管理',
    icon: 'UserFilled',
    color: '#67C23A',
    action: 'manageUsers'
  },
  {
    title: '系统设置',
    icon: 'Setting',
    color: '#E6A23C',
    action: 'systemSettings'
  },
  {
    title: '查看日志',
    icon: 'View',
    color: '#303133',
    action: 'viewLogs'
  }
])

// 最近活动
const recentActivities = ref<any[]>([])

// 图表引用
const messageChartRef = ref()
const userChartRef = ref()

// 处理快捷操作
const handleAction = (action: string) => {
  switch (action) {
    case 'viewInfo':
      router.push('/system/info')
      break
    case 'manageUsers':
      router.push('/users/list')
      break
    case 'systemSettings':
      router.push('/config/system')
      break
    case 'viewLogs':
      router.push('/logs/system')
      break
    default:
      ElMessage.info('功能开发中...')
  }
}

// 刷新图表
const refreshMessageChart = () => {
  ElMessage.success('消息统计已刷新')
}

const refreshUserChart = () => {
  ElMessage.success('用户活跃度已刷新')
}

// 刷新活动
const refreshActivity = () => {
  ElMessage.success('活动列表已刷新')
}

// 初始化图表（模拟）
const initCharts = () => {
  if (messageChartRef.value) {
    messageChartRef.value.innerHTML = '<div style="height: 200px; display: flex; align-items: center; justify-content: center; color: #909399;">图表加载中...</div>'
  }
  if (userChartRef.value) {
    userChartRef.value.innerHTML = '<div style="height: 200px; display: flex; align-items: center; justify-content: center; color: #909399;">图表加载中...</div>'
  }
}

onMounted(() => {
  initCharts()
})
</script>

<style lang="scss" scoped>
.dashboard {
  padding: 20px;
  background-color: var(--el-bg-color-page);
  min-height: calc(100vh - 60px);
}

.welcome-section {
  margin-bottom: 20px;
}

.welcome-card {
  background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
  color: white;
  
  :deep(.el-card__body) {
    padding: 30px;
  }
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text {
  h1 {
    margin: 0 0 10px 0;
    font-size: 28px;
    font-weight: 600;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    opacity: 0.9;
  }
}

.welcome-avatar {
  :deep(.el-avatar) {
    border: 3px solid rgba(255, 255, 255, 0.3);
  }
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
  
  :deep(.el-card__body) {
    padding: 20px;
    height: 100%;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 15px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 5px;
}

.stat-title {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 5px;
}

.stat-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  
  &.up {
    color: var(--el-color-success);
  }
  
  &.down {
    color: var(--el-color-danger);
  }
  
  .el-icon {
    margin-right: 2px;
  }
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 300px;
  
  :deep(.el-card__body) {
    padding: 20px;
    height: calc(100% - 60px);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 100%;
  width: 100%;
}

.actions-section {
  margin-bottom: 20px;
}

.actions-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: var(--el-fill-color-light);
    transform: translateY(-2px);
  }
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 8px;
}

.action-title {
  font-size: 12px;
  color: var(--el-text-color-regular);
  text-align: center;
}

.activity-section {
  margin-bottom: 20px;
}

.activity-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.activity-content {
  .activity-title {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 5px;
  }
  
  .activity-description {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 10px;
  }
  
  .welcome-content {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .actions-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
  }
  
  .stat-content {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .stat-icon {
    margin-right: 0;
  }
}
</style>