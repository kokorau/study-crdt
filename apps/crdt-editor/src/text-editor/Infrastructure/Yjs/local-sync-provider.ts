/**
 * Local Sync Provider - BroadcastChannelを使用したローカル同期
 */

import * as Y from 'yjs'
import { ok, err } from '../../utils/fp'
import type { Result } from '../../utils/fp'

export type SyncProviderConfig = {
  readonly channelName: string
  readonly doc: Y.Doc
  readonly onSync?: () => void
  readonly onError?: (error: Error) => void
}

export type SyncProvider = {
  readonly connect: () => Result<void>
  readonly disconnect: () => Result<void>
  readonly isConnected: () => boolean
  readonly destroy: () => void
}

/**
 * BroadcastChannelを使用したローカル同期プロバイダー
 */
export const createLocalSyncProvider = (
  config: SyncProviderConfig
): SyncProvider => {
  let channel: BroadcastChannel | null = null
  let connected = false
  let updateHandler: ((update: Uint8Array, origin: any) => void) | null = null

  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'sync-update' && event.data.update) {
      try {
        const update = new Uint8Array(event.data.update)
        Y.applyUpdate(config.doc, update, 'broadcast')
        config.onSync?.()
      } catch (error) {
        config.onError?.(new Error(`Failed to apply update: ${error}`))
      }
    }
  }

  const handleUpdate = (update: Uint8Array, origin: any) => {
    // ブロードキャストから来た更新は送信しない
    if (origin === 'broadcast' || !channel || !connected) {
      return
    }

    try {
      channel.postMessage({
        type: 'sync-update',
        update: Array.from(update),
      })
    } catch (error) {
      config.onError?.(new Error(`Failed to broadcast update: ${error}`))
    }
  }

  const connect = (): Result<void> => {
    if (connected) {
      return ok(undefined)
    }

    try {
      // BroadcastChannelを作成
      channel = new BroadcastChannel(config.channelName)
      channel.addEventListener('message', handleMessage)

      // Y.Docの更新を監視
      updateHandler = handleUpdate
      config.doc.on('update', updateHandler)

      connected = true

      // 接続時に現在の状態をブロードキャスト
      const state = Y.encodeStateAsUpdate(config.doc)
      channel.postMessage({
        type: 'sync-update',
        update: Array.from(state),
      })

      config.onSync?.()
      return ok(undefined)
    } catch (error) {
      return err(new Error(`Failed to connect: ${error}`))
    }
  }

  const disconnect = (): Result<void> => {
    if (!connected) {
      return ok(undefined)
    }

    try {
      if (channel) {
        channel.removeEventListener('message', handleMessage)
        channel.close()
        channel = null
      }

      if (updateHandler) {
        config.doc.off('update', updateHandler)
        updateHandler = null
      }

      connected = false
      return ok(undefined)
    } catch (error) {
      return err(new Error(`Failed to disconnect: ${error}`))
    }
  }

  const isConnected = (): boolean => {
    return connected
  }

  const destroy = (): void => {
    disconnect()
  }

  return {
    connect,
    disconnect,
    isConnected,
    destroy,
  }
}

/**
 * 複数のタブ間でのアクターID管理
 */
export type ActorIdManager = {
  readonly getLocalActorId: () => string
  readonly setLocalActorId: (id: string) => void
  readonly onActorIdChange: (callback: (id: string) => void) => () => void
}

export const createActorIdManager = (
  storageKey: string = 'text-editor-actor-id'
): ActorIdManager => {
  const callbacks = new Set<(id: string) => void>()
  
  // ストレージイベントを監視
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === storageKey && event.newValue) {
      callbacks.forEach(cb => cb(event.newValue!))
    }
  }

  window.addEventListener('storage', handleStorageChange)

  const getLocalActorId = (): string => {
    let actorId = localStorage.getItem(storageKey)
    
    if (!actorId) {
      // 新しいアクターIDを生成
      actorId = `actor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(storageKey, actorId)
    }
    
    return actorId
  }

  const setLocalActorId = (id: string): void => {
    localStorage.setItem(storageKey, id)
    callbacks.forEach(cb => cb(id))
  }

  const onActorIdChange = (callback: (id: string) => void): (() => void) => {
    callbacks.add(callback)
    
    return () => {
      callbacks.delete(callback)
    }
  }

  return {
    getLocalActorId,
    setLocalActorId,
    onActorIdChange,
  }
}

/**
 * デバウンス付き同期プロバイダー
 */
export const createDebouncedSyncProvider = (
  baseProvider: SyncProvider
): SyncProvider => {
  
  const originalConnect = baseProvider.connect

  const connect = (): Result<void> => {
    const result = originalConnect()
    
    if (result.ok) {
      // デバウンス処理を追加
      // 実装の詳細は省略
    }
    
    return result
  }

  return {
    ...baseProvider,
    connect,
  }
}