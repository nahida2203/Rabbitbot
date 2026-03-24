


let cachedPublicKey: string | null = null
let cacheExpiry: number = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 




export async function getPublicKey(): Promise<string> {
  const now = Date.now()
  
  
  if (cachedPublicKey && now < cacheExpiry) {
    return cachedPublicKey
  }
  
  try {
    const response = await fetch('/api/auth/public-key', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`获取公钥失败: ${response.status}`)
    }
    
    const result = await response.json()
    if (!result.success || !result.data?.publicKey) {
      throw new Error('公钥响应格式错误')
    }
    
    cachedPublicKey = result.data.publicKey
    cacheExpiry = now + CACHE_DURATION
    
    return cachedPublicKey
  } catch (error) {
    console.error('获取RSA公钥失败:', error)
    throw error
  }
}




export function generateAESKey(): Uint8Array {
  const key = new Uint8Array(32) 
  crypto.getRandomValues(key)
  return key
}




export function generateIV(): Uint8Array {
  const iv = new Uint8Array(12) 
  crypto.getRandomValues(iv)
  return iv
}




export async function encryptAESKeyWithRSA(aesKey: Uint8Array, publicKeyPem: string): Promise<string> {
  try {
    
    const pemContents = publicKeyPem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\n/g, '')
    const binaryDerString = atob(pemContents)
    const binaryDer = new Uint8Array(binaryDerString.length)
    
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i)
    }
    
    
    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryDer.buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      false,
      ['encrypt']
    )
    
    
    const encryptedKey = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      aesKey
    )
    
    
    return btoa(String.fromCharCode(...new Uint8Array(encryptedKey)))
  } catch (error) {
    console.error('RSA加密失败:', error)
    throw error
  }
}




export async function encryptWithAES(data: string, key: Uint8Array, iv: Uint8Array): Promise<{ ciphertext: string, authTag: string }> {
  try {
    
    const aesKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    
    const encoded = new TextEncoder().encode(data)
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      encoded
    )
    
    
    const encryptedArray = new Uint8Array(encrypted)
    const authTagLength = 16 
    const ciphertext = encryptedArray.slice(0, -authTagLength)
    const authTag = encryptedArray.slice(-authTagLength)
    
    return {
      ciphertext: btoa(String.fromCharCode(...ciphertext)),
      authTag: btoa(String.fromCharCode(...authTag))
    }
  } catch (error) {
    console.error('AES加密失败:', error)
    throw error
  }
}




export async function hybridEncrypt(data: string): Promise<{
  encryptedKey: string
  ciphertext: string
  authTag: string
  iv: string
}> {
  try {
    
    const publicKey = await getPublicKey()
    
    
    const aesKey = generateAESKey()
    const iv = generateIV()
    
    
    const encryptedKey = await encryptAESKeyWithRSA(aesKey, publicKey)
    
    
    const { ciphertext, authTag } = await encryptWithAES(data, aesKey, iv)
    
    return {
      encryptedKey,
      ciphertext,
      authTag,
      iv: btoa(String.fromCharCode(...iv))
    }
  } catch (error) {
    console.error('混合加密失败:', error)
    throw error
  }
}




export function shouldEncrypt(url: string, method: string): boolean {
  
  const sensitiveEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/reset-password',
    '/user/change-password',
    '/config',
    '/users'
  ]
  
  
  if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    return sensitiveEndpoints.some(endpoint => url.includes(endpoint))
  }
  
  return false
}




export function createEncryptionHeaders(encryptedData: {
  encryptedKey: string
  ciphertext: string 
  authTag: string
  iv: string
}): Record<string, string> {
  return {
    'X-Encryption-Type': 'hybrid-rsa-aes',
    'X-Encrypted-Key': encryptedData.encryptedKey,
    'X-Auth-Tag': encryptedData.authTag,
    'X-IV': encryptedData.iv
  }
}




export function clearKeyCache(): void {
  cachedPublicKey = null
  cacheExpiry = 0
}