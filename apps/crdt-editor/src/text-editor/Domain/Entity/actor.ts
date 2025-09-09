/**
 * Actor Entity
 */

import { ok, generateUUID, timestamp } from '../../utils/fp'
import type { Result } from '../../utils/fp'
import {
  createActorId,
  createActorName,
  createActorColor,
  selectRandomColor,
  getActorInitials,
} from '../ValueObject'
import type {
  ActorId,
  ActorName,
  ActorColor,
} from '../ValueObject'

// Actor エンティティ
export type Actor = {
  readonly id: ActorId
  readonly name: ActorName
  readonly color: ActorColor
  readonly isLocal: boolean
  readonly joinedAt: Date
  readonly lastSeenAt: Date
}

// Actor状態
export type ActorStatus = 
  | 'active'
  | 'idle'
  | 'disconnected'

// Actorプレゼンス情報
export type ActorPresence = {
  readonly actor: Actor
  readonly status: ActorStatus
  readonly lastActivity: Date
}

// Actor作成
export const createActor = (
  name: string,
  color?: string,
  isLocal: boolean = false
): Result<Actor> => {
  const nameResult = createActorName(name)
  if (!nameResult.ok) {
    return nameResult
  }
  
  const colorValue = color || selectRandomColor()
  const colorResult = createActorColor(colorValue)
  if (!colorResult.ok) {
    return colorResult
  }
  
  const now = timestamp()
  return ok({
    id: createActorId(generateUUID()),
    name: nameResult.value,
    color: colorResult.value,
    isLocal,
    joinedAt: now,
    lastSeenAt: now,
  })
}

// 指定IDでActor作成
export const createActorWithId = (
  id: string,
  name: string,
  color?: string,
  isLocal: boolean = false
): Result<Actor> => {
  const nameResult = createActorName(name)
  if (!nameResult.ok) {
    return nameResult
  }
  
  const colorValue = color || selectRandomColor()
  const colorResult = createActorColor(colorValue)
  if (!colorResult.ok) {
    return colorResult
  }
  
  const now = timestamp()
  return ok({
    id: createActorId(id),
    name: nameResult.value,
    color: colorResult.value,
    isLocal,
    joinedAt: now,
    lastSeenAt: now,
  })
}

// Actor更新操作
export const updateActorName = (
  actor: Actor,
  newName: string
): Result<Actor> => {
  const nameResult = createActorName(newName)
  if (!nameResult.ok) {
    return nameResult
  }
  
  return ok({
    ...actor,
    name: nameResult.value,
    lastSeenAt: timestamp(),
  })
}

export const updateActorColor = (
  actor: Actor,
  newColor: string
): Result<Actor> => {
  const colorResult = createActorColor(newColor)
  if (!colorResult.ok) {
    return colorResult
  }
  
  return ok({
    ...actor,
    color: colorResult.value,
    lastSeenAt: timestamp(),
  })
}

export const updateActorLastSeen = (actor: Actor): Actor => {
  return {
    ...actor,
    lastSeenAt: timestamp(),
  }
}

// Actor情報取得
export const getActorDisplayName = (actor: Actor): string => {
  return actor.name as string
}

export const getActorInitialsFromEntity = (actor: Actor): string => {
  return getActorInitials(actor.name)
}

export const getActorColorValue = (actor: Actor): string => {
  return actor.color as string
}

// Actor状態判定
export const isLocalActor = (actor: Actor): boolean => {
  return actor.isLocal
}

export const isRemoteActor = (actor: Actor): boolean => {
  return !actor.isLocal
}

// Actorプレゼンス作成
export const createActorPresence = (
  actor: Actor,
  status: ActorStatus = 'active'
): ActorPresence => {
  return {
    actor,
    status,
    lastActivity: timestamp(),
  }
}

// Actorプレゼンス更新
export const updatePresenceStatus = (
  presence: ActorPresence,
  newStatus: ActorStatus
): ActorPresence => {
  return {
    ...presence,
    status: newStatus,
    lastActivity: timestamp(),
  }
}

export const updatePresenceActivity = (
  presence: ActorPresence
): ActorPresence => {
  return {
    ...presence,
    lastActivity: timestamp(),
  }
}

// Actor状態の計算
export const calculateActorStatus = (
  lastSeenAt: Date,
  thresholds: {
    idleMs: number
    disconnectedMs: number
  } = {
    idleMs: 30000, // 30秒
    disconnectedMs: 60000, // 1分
  }
): ActorStatus => {
  const now = Date.now()
  const lastSeen = lastSeenAt.getTime()
  const elapsed = now - lastSeen
  
  if (elapsed > thresholds.disconnectedMs) {
    return 'disconnected'
  }
  if (elapsed > thresholds.idleMs) {
    return 'idle'
  }
  return 'active'
}

// Actor比較
export const isEqualActor = (a: Actor, b: Actor): boolean => {
  return a.id === b.id
}

export const compareActorByName = (a: Actor, b: Actor): number => {
  return (a.name as string).localeCompare(b.name as string)
}

export const compareActorByJoinTime = (a: Actor, b: Actor): number => {
  return a.joinedAt.getTime() - b.joinedAt.getTime()
}

// Actorのグループ化
export const groupActorsByStatus = (
  actors: readonly Actor[]
): {
  active: readonly Actor[]
  idle: readonly Actor[]
  disconnected: readonly Actor[]
} => {
  const result = {
    active: [] as Actor[],
    idle: [] as Actor[],
    disconnected: [] as Actor[],
  }
  
  for (const actor of actors) {
    const status = calculateActorStatus(actor.lastSeenAt)
    result[status].push(actor)
  }
  
  return {
    active: result.active,
    idle: result.idle,
    disconnected: result.disconnected,
  }
}

// Actorの検証
export const validateActor = (actor: unknown): actor is Actor => {
  if (!actor || typeof actor !== 'object') {
    return false
  }
  
  const obj = actor as Record<string, unknown>
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.color === 'string' &&
    typeof obj.isLocal === 'boolean' &&
    obj.joinedAt instanceof Date &&
    obj.lastSeenAt instanceof Date
  )
}