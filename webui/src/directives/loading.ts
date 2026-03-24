import type { App, Directive, DirectiveBinding } from 'vue'
import { ElLoading } from 'element-plus'

interface LoadingElement extends HTMLElement {
  loadingInstance?: any
}





const loading: Directive = {
  mounted(el: LoadingElement, binding: DirectiveBinding) {
    updateLoading(el, binding)
  },
  updated(el: LoadingElement, binding: DirectiveBinding) {
    updateLoading(el, binding)
  },
  unmounted(el: LoadingElement) {
    if (el.loadingInstance) {
      el.loadingInstance.close()
    }
  }
}

function updateLoading(el: LoadingElement, binding: DirectiveBinding) {
  const { value, modifiers } = binding
  
  if (value) {
    if (!el.loadingInstance) {
      el.loadingInstance = ElLoading.service({
        target: el,
        text: modifiers.text || '加载中...',
        spinner: modifiers.spinner,
        background: modifiers.background || 'rgba(0, 0, 0, 0.7)',
        customClass: modifiers.class
      })
    }
  } else {
    if (el.loadingInstance) {
      el.loadingInstance.close()
      el.loadingInstance = null
    }
  }
}

export function setupLoadingDirective(app: App) {
  app.directive('loading', loading)
}

export { loading }