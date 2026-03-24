import type { App, Directive, DirectiveBinding } from 'vue'

interface LazyElement extends HTMLElement {
  lazyObserver?: IntersectionObserver
}





const lazy: Directive = {
  mounted(el: LazyElement, binding: DirectiveBinding) {
    setupLazy(el, binding)
  },
  updated(el: LazyElement, binding: DirectiveBinding) {
    
    if (el.lazyObserver) {
      el.lazyObserver.disconnect()
    }
    setupLazy(el, binding)
  },
  unmounted(el: LazyElement) {
    if (el.lazyObserver) {
      el.lazyObserver.disconnect()
    }
  }
}

function setupLazy(el: LazyElement, binding: DirectiveBinding) {
  const { value } = binding
  
  let src: string
  let loadingSrc: string | undefined
  let errorSrc: string | undefined
  
  if (typeof value === 'string') {
    src = value
  } else if (typeof value === 'object' && value !== null) {
    src = value.src
    loadingSrc = value.loading
    errorSrc = value.error
  } else {
    console.error('懒加载指令需要传入图片地址或配置对象')
    return
  }
  
  
  if (loadingSrc && el.tagName === 'IMG') {
    (el as HTMLImageElement).src = loadingSrc
  }
  
  
  if (!window.IntersectionObserver) {
    
    loadImage(el, src, errorSrc)
    return
  }
  
  
  el.lazyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          
          loadImage(el, src, errorSrc)
          
          el.lazyObserver?.disconnect()
        }
      })
    },
    {
      
      rootMargin: '100px'
    }
  )
  
  
  el.lazyObserver.observe(el)
}

function loadImage(el: HTMLElement, src: string, errorSrc?: string) {
  if (el.tagName === 'IMG') {
    const img = el as HTMLImageElement
    
    
    const imageLoader = new Image()
    
    imageLoader.onload = () => {
      img.src = src
      img.classList.add('lazy-loaded')
    }
    
    imageLoader.onerror = () => {
      if (errorSrc) {
        img.src = errorSrc
      }
      img.classList.add('lazy-error')
    }
    
    imageLoader.src = src
  } else {
    
    el.style.backgroundImage = `url(${src})`
    el.classList.add('lazy-loaded')
  }
}

export function setupLazyDirective(app: App) {
  app.directive('lazy', lazy)
}

export { lazy }