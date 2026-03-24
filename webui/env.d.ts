

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_API_BASE_URL: string
  readonly VITE_APP_WS_URL: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_BUILD_TIME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


declare global {
  interface Window {
    __YUNZAI_CONFIG__: any
    __YUNZAI_VERSION__: string
  }
}

export {}