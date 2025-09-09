/**
 * Sync Port - 同期処理のインターフェース
 */

import type { Result, AsyncResult } from '../../utils/fp'
import type { Document, Actor } from '../../Domain/Entity'
import type { ActorId, CursorPosition, SelectionRange } from '../../Domain/ValueObject'

// 同期イベント
export type SyncEvent =
  | { readonly type: 'connected' }
  | { readonly type: 'disconnected' }
  | { readonly type: 'synced'; readonly document: Document }
  | { readonly type: 'error'; readonly error: Error }
  | { readonly type: 'actor-joined'; readonly actor: Actor }
  | { readonly type: 'actor-left'; readonly actorId: ActorId }
  | { readonly type: 'cursor-updated'; readonly actorId: ActorId; readonly position: CursorPosition }
  | { readonly type: 'selection-updated'; readonly actorId: ActorId; readonly range: SelectionRange }

// 同期ポートインターフェース
export type SyncPort = {
  readonly connect: () => AsyncResult<void>
  readonly disconnect: () => AsyncResult<void>
  readonly isConnected: () => boolean
  readonly subscribe: (callback: (event: SyncEvent) => void) => () => void
  readonly updateCursor: (position: CursorPosition) => AsyncResult<void>
  readonly updateSelection: (range: SelectionRange) => AsyncResult<void>
  readonly getActiveActors: () => readonly Actor[]
}

// プレゼンス情報
export type PresenceInfo = {
  readonly actor: Actor
  readonly cursor?: CursorPosition
  readonly selection?: SelectionRange
  readonly lastActivity: Date
}

// プレゼンスポートインターフェース
export type PresencePort = {
  readonly setLocalPresence: (info: Partial<PresenceInfo>) => Result<void>
  readonly getPresence: (actorId: ActorId) => PresenceInfo | undefined
  readonly getAllPresence: () => readonly PresenceInfo[]
  readonly subscribeToPresence: (callback: (presence: readonly PresenceInfo[]) => void) => () => void
}