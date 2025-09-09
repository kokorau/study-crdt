/**
 * ID Value Objects
 */

import { ok, err } from '../../utils/fp'
import type { Result } from '../../utils/fp'

// ブランド型による型安全な識別子
export type DocumentId = string & { readonly _brand: 'DocumentId' }
export type LineId = string & { readonly _brand: 'LineId' }
export type ActorId = string & { readonly _brand: 'ActorId' }

// ファクトリ関数（バリデーションなし）
export const createDocumentId = (value: string): DocumentId => value as DocumentId
export const createLineId = (value: string): LineId => value as LineId
export const createActorId = (value: string): ActorId => value as ActorId

// バリデーション付きファクトリ
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ID_REGEX = /^[a-zA-Z0-9-_]+$/

export const createValidDocumentId = (value: string): Result<DocumentId> => {
  if (!value) {
    return err(new Error('DocumentId cannot be empty'))
  }
  if (!ID_REGEX.test(value)) {
    return err(new Error('Invalid DocumentId format'))
  }
  return ok(value as DocumentId)
}

export const createValidLineId = (value: string): Result<LineId> => {
  if (!value) {
    return err(new Error('LineId cannot be empty'))
  }
  if (!ID_REGEX.test(value)) {
    return err(new Error('Invalid LineId format'))
  }
  return ok(value as LineId)
}

export const createValidActorId = (value: string): Result<ActorId> => {
  if (!value) {
    return err(new Error('ActorId cannot be empty'))
  }
  if (!ID_REGEX.test(value)) {
    return err(new Error('Invalid ActorId format'))
  }
  return ok(value as ActorId)
}

// UUID形式の厳密なバリデーション
export const createUUIDDocumentId = (value: string): Result<DocumentId> => {
  if (!UUID_REGEX.test(value)) {
    return err(new Error('Invalid UUID format for DocumentId'))
  }
  return ok(value as DocumentId)
}

export const createUUIDLineId = (value: string): Result<LineId> => {
  if (!UUID_REGEX.test(value)) {
    return err(new Error('Invalid UUID format for LineId'))
  }
  return ok(value as LineId)
}

export const createUUIDActorId = (value: string): Result<ActorId> => {
  if (!UUID_REGEX.test(value)) {
    return err(new Error('Invalid UUID format for ActorId'))
  }
  return ok(value as ActorId)
}

// ID比較用のヘルパー
export const isEqualDocumentId = (a: DocumentId, b: DocumentId): boolean => a === b
export const isEqualLineId = (a: LineId, b: LineId): boolean => a === b
export const isEqualActorId = (a: ActorId, b: ActorId): boolean => a === b