export const RPC_PROTOCOL_VERSION = '1.0.0'

export const RPC_MESSAGE_KIND = Object.freeze({
  REQUEST: 'rpc:request',
  RESPONSE: 'rpc:response',
  ERROR: 'rpc:error',
  EVENT: 'rpc:event'
})

export const RPC_ERROR_CODE = Object.freeze({
  TIMEOUT: 'RPC_TIMEOUT',
  METHOD_NOT_FOUND: 'RPC_METHOD_NOT_FOUND',
  INVALID_MESSAGE: 'RPC_INVALID_MESSAGE',
  PERMISSION_DENIED: 'RPC_PERMISSION_DENIED',
  INTERNAL_ERROR: 'RPC_INTERNAL_ERROR',
  CAPABILITY_NOT_FOUND: 'RPC_CAPABILITY_NOT_FOUND'
})

export function createRpcEnvelope(kind, payload = {}) {
  return {
    jsonrpc: '2.0',
    protocolVersion: RPC_PROTOCOL_VERSION,
    kind,
    timestamp: Date.now(),
    ...payload
  }
}

export function createRpcRequest(id, method, params = {}, meta = {}) {
  return createRpcEnvelope(RPC_MESSAGE_KIND.REQUEST, {
    id,
    method,
    params,
    meta
  })
}

export function createRpcResponse(id, result, meta = {}) {
  return createRpcEnvelope(RPC_MESSAGE_KIND.RESPONSE, {
    id,
    result,
    meta
  })
}

export function createRpcError(id, error, meta = {}) {
  const normalized = normalizeRpcError(error)
  return createRpcEnvelope(RPC_MESSAGE_KIND.ERROR, {
    id,
    error: normalized,
    meta
  })
}

export function createRpcEvent(event, payload = {}, meta = {}) {
  return createRpcEnvelope(RPC_MESSAGE_KIND.EVENT, {
    event,
    payload,
    meta
  })
}

export function normalizeRpcError(error, fallbackCode = RPC_ERROR_CODE.INTERNAL_ERROR) {
  if (!error) {
    return { code: fallbackCode, message: 'Unknown RPC error' }
  }

  if (typeof error === 'string') {
    return { code: fallbackCode, message: error }
  }

  return {
    code: error.code || fallbackCode,
    message: error.message || String(error),
    data: error.data
  }
}

export function isRpcEnvelope(message) {
  return !!message && message.jsonrpc === '2.0' && typeof message.kind === 'string'
}
