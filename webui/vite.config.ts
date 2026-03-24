import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'



export default defineConfig(({ mode }) => {
  
  const env = loadEnv(mode, process.cwd(), '')
  
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:2536'
  
  const wsTarget = env.VITE_WS_TARGET || proxyTarget

  return {
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: [
        'vue',
        'vue-router',
        'pinia',
        {
          'axios': ['AxiosResponse', 'AxiosError'],
          'lodash-es': ['debounce', 'throttle', 'cloneDeep', 'merge']
        }
      ],
      dts: true
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~': resolve(__dirname, 'src'),
      '#': resolve(__dirname, 'types')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
        
        silenceDeprecations: ['legacy-js-api']
      },
      sass: {
        
        silenceDeprecations: ['legacy-js-api']
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5170,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        
        target: proxyTarget.replace('localhost', '127.0.0.1'),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
        ws: true
      },
      '/ws': {
        target: wsTarget.replace('http', 'ws').replace('localhost', '127.0.0.1'),
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '/ws')
      }
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      'element-plus',
      '@element-plus/icons-vue',
      'echarts',
      'vue-echarts',
      'dayjs',
      'lodash-es',
      'socket.io-client'
    ]
  }
}
})