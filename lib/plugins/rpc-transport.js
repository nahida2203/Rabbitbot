import { EventEmitter } from 'node:events'
import { createRpcError, createRpcEvent, createRpcResponse, isRpcEnvelope, RPC_ERROR_CODE, RPC_MESSAGE_KIND } from './rpc-protocol.js'

export class RpcTransport extends EventEmitter {
  constructor(port) {
    super()
    this.port = port
    this.disposed = false
    this._onMessage = this._onMessage.bind(this)
    this._onError = this._onError.bind(this)
    this._onExit = this._onExit.bind(this)
    this.bind()
  }

  bind() {
    this.port?.on?.('message', this._onMessage)
    this.port?.on?.('error', this._onError)
    this.port?.on?.('exit', this._onExit)
  }

  _onMessage(message) {
    if (isRpcEnvelope(message)) {
      this.emit('rpc', message)
      this.emit(message.kind, message)
      return
    }
    this.emit('legacy', message)
  }

  _onError(error) {
    this.emit('error', error)
  }

  _onExit(code) {
    this.emit('exit', code)
  }

  post(message) {
    if (this.disposed) throw new Error('RPC transport disposed')
    this.port?.postMessage?.(message)
  }

  reply(id, result, meta = {}) {
    this.post(createRpcResponse(id, result, meta))
  }

  fail(id, error, meta = {}) {
    this.post(createRpcError(id, error, meta))
  }

  emitEvent(event, payload = {}, meta = {}) {
    this.post(createRpcEvent(event, payload, meta))
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.port?.off?.('message', this._onMessage)
    this.port?.off?.('error', this._onError)
    this.port?.off?.('exit', this._onExit)
    this.removeAllListeners()
  }
}

export class RpcPeer extends EventEmitter {
  constructor(transport, options = {}) {
    super()
    this.transport = transport
    this.timeout = options.timeout || 30000
    this.requestSeq = 1
    this.pending = new Map()
    this.methods = new Map()
    this.transport.on('rpc', this._handleRpc.bind(this))
    this.transport.on('legacy', (message) => this.emit('legacy', message))
    this.transport.on('error', (error) => this.emit('error', error))
    this.transport.on('exit', (code) => this.emit('exit', code))
  }

  registerMethod(name, handler) {
    this.methods.set(name, handler)
  }

  unregisterMethod(name) {
    this.methods.delete(name)
  }

  async request(method, params = {}, meta = {}, timeoutMs = this.timeout) {
    const id = `${Date.now()}_${this.requestSeq++}`
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(Object.assign(new Error(`RPC timeout: ${method}`), { code: RPC_ERROR_CODE.TIMEOUT }))
      }, timeoutMs)

      this.pending.set(id, { resolve, reject, timer, method })
      this.transport.post({
        jsonrpc: '2.0',
        protocolVersion: '1.0.0',
        kind: RPC_MESSAGE_KIND.REQUEST,
        timestamp: Date.now(),
        id,
        method,
        params,
        meta
      })
    })
  }

  notify(event, payload = {}, meta = {}) {
    this.transport.emitEvent(event, payload, meta)
  }

  async _handleRpc(message) {
    if (message.kind === RPC_MESSAGE_KIND.REQUEST) {
      await this._handleRequest(message)
      return
    }

    if (message.kind === RPC_MESSAGE_KIND.RESPONSE || message.kind === RPC_MESSAGE_KIND.ERROR) {
      this._handlePending(message)
      return
    }

    if (message.kind === RPC_MESSAGE_KIND.EVENT) {
      this.emit('event', message)
    }
  }

  async _handleRequest(message) {
    const handler = this.methods.get(message.method)
    if (!handler) {
      this.transport.fail(message.id, {
        code: RPC_ERROR_CODE.METHOD_NOT_FOUND,
        message: `RPC method not found: ${message.method}`
      })
      return
    }

    try {
      const result = await handler(message.params || {}, message)
      this.transport.reply(message.id, result)
    } catch (error) {
      this.transport.fail(message.id, error)
    }
  }

  _handlePending(message) {
    const pending = this.pending.get(message.id)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pending.delete(message.id)

    if (message.kind === RPC_MESSAGE_KIND.ERROR) {
      const err = new Error(message.error?.message || 'RPC error')
      err.code = message.error?.code || RPC_ERROR_CODE.INTERNAL_ERROR
      err.data = message.error?.data
      pending.reject(err)
      return
    }

    pending.resolve(message.result)
  }
}
