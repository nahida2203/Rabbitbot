import type { App, Directive, DirectiveBinding } from 'vue'
import { ElMessage } from 'element-plus'





const copy: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    el.addEventListener('click', () => handleCopy(binding))
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    
  }
}

function handleCopy(binding: DirectiveBinding) {
  const { value } = binding
  
  let text: string
  let successMessage = '复制成功'
  let errorMessage = '复制失败'
  
  if (typeof value === 'string') {
    text = value
  } else if (typeof value === 'object' && value !== null) {
    text = value.text || ''
    successMessage = value.success || successMessage
    errorMessage = value.error || errorMessage
  } else {
    console.error('复制指令需要传入字符串或对象')
    return
  }
  
  if (!text) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  
  
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(
      () => {
        ElMessage.success(successMessage)
      },
      () => {
        fallbackCopy(text, successMessage, errorMessage)
      }
    )
  } else {
    
    fallbackCopy(text, successMessage, errorMessage)
  }
}




function fallbackCopy(text: string, successMessage: string, errorMessage: string) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  
  try {
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    
    if (successful) {
      ElMessage.success(successMessage)
    } else {
      ElMessage.error(errorMessage)
    }
  } catch (err) {
    console.error('复制失败:', err)
    ElMessage.error(errorMessage)
  } finally {
    document.body.removeChild(textArea)
  }
}

export function setupCopyDirective(app: App) {
  app.directive('copy', copy)
}

export { copy }