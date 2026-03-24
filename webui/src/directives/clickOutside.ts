import type { App, Directive, DirectiveBinding } from 'vue'

interface ClickOutsideElement extends HTMLElement {
  clickOutsideHandler?: (event: Event) => void
}





const clickOutside: Directive = {
  mounted(el: ClickOutsideElement, binding: DirectiveBinding) {
    el.clickOutsideHandler = (event: Event) => {
      
      if (!(el === event.target || el.contains(event.target as Node))) {
        
        if (typeof binding.value === 'function') {
          binding.value(event)
        }
      }
    }
    
    
    document.addEventListener('click', el.clickOutsideHandler)
    document.addEventListener('touchstart', el.clickOutsideHandler)
  },
  
  unmounted(el: ClickOutsideElement) {
    
    if (el.clickOutsideHandler) {
      document.removeEventListener('click', el.clickOutsideHandler)
      document.removeEventListener('touchstart', el.clickOutsideHandler)
      delete el.clickOutsideHandler
    }
  }
}

export function setupClickOutsideDirective(app: App) {
  app.directive('click-outside', clickOutside)
}

export { clickOutside }