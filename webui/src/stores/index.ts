import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

const pinia = createPinia()


pinia.use(
  createPersistedState({
    storage: localStorage,
    key: (id) => `yunzai-${id}`,
    auto: true
  })
)

export default pinia


export * from './user'
export * from './settings'
export * from './tabs'
export * from './app'