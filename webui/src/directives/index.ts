import type { App } from 'vue'
import { setupPermissionDirective } from './permission'
import { setupLoadingDirective } from './loading'
import { setupCopyDirective } from './copy'
import { setupClickOutsideDirective } from './clickOutside'
import { setupLazyDirective } from './lazy'





export function setupDirectives(app: App) {
  setupPermissionDirective(app)
  setupLoadingDirective(app)
  setupCopyDirective(app)
  setupClickOutsideDirective(app)
  setupLazyDirective(app)
}

export * from './permission'
export * from './loading'
export * from './copy'
export * from './clickOutside'
export * from './lazy'