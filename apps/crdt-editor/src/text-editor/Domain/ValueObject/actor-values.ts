/**
 * Actor-related Value Objects
 */

import { ok, err } from '../../utils/fp'
import type { Result } from '../../utils/fp'

// アクターカラー（HEX形式）
export type ActorColor = string & { readonly _brand: 'ActorColor' }

// アクター名
export type ActorName = string & { readonly _brand: 'ActorName' }

// 定数
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const MAX_NAME_LENGTH = 50
const MIN_NAME_LENGTH = 1

// デフォルトカラーパレット
export const DEFAULT_ACTOR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FECA57', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#FFB6C1', // Pink
  '#87CEEB', // Sky Blue
  '#F7DC6F', // Light Yellow
] as const

// ActorColor ファクトリ
export const createActorColor = (value: string): Result<ActorColor> => {
  if (!HEX_COLOR_REGEX.test(value)) {
    return err(new Error('Invalid color format. Must be HEX format (#RRGGBB)'))
  }
  return ok(value.toUpperCase() as ActorColor)
}

// ActorName ファクトリ
export const createActorName = (value: string): Result<ActorName> => {
  const trimmed = value.trim()
  
  if (trimmed.length < MIN_NAME_LENGTH) {
    return err(new Error(`Name must be at least ${MIN_NAME_LENGTH} character`))
  }
  
  if (trimmed.length > MAX_NAME_LENGTH) {
    return err(new Error(`Name must be at most ${MAX_NAME_LENGTH} characters`))
  }
  
  // 特殊文字のチェック（基本的な文字のみ許可）
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmed)) {
    return err(new Error('Name contains invalid characters'))
  }
  
  return ok(trimmed as ActorName)
}

// カラー選択ヘルパー
export const selectRandomColor = (): ActorColor => {
  const index = Math.floor(Math.random() * DEFAULT_ACTOR_COLORS.length)
  return DEFAULT_ACTOR_COLORS[index] as ActorColor
}

export const selectColorByIndex = (index: number): ActorColor => {
  const colorIndex = index % DEFAULT_ACTOR_COLORS.length
  return DEFAULT_ACTOR_COLORS[colorIndex] as ActorColor
}

// カラー操作
export const lightenColor = (color: ActorColor, percent: number): Result<ActorColor> => {
  if (percent < 0 || percent > 100) {
    return err(new Error('Percent must be between 0 and 100'))
  }
  
  const hex = color.substring(1)
  const rgb = parseInt(hex, 16)
  
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = rgb & 0xff
  
  const lighten = (value: number) => {
    const amount = Math.round((255 - value) * (percent / 100))
    return Math.min(255, value + amount)
  }
  
  const newR = lighten(r)
  const newG = lighten(g)
  const newB = lighten(b)
  
  const newHex = `#${((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0')}`
  return createActorColor(newHex)
}

export const darkenColor = (color: ActorColor, percent: number): Result<ActorColor> => {
  if (percent < 0 || percent > 100) {
    return err(new Error('Percent must be between 0 and 100'))
  }
  
  const hex = color.substring(1)
  const rgb = parseInt(hex, 16)
  
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = rgb & 0xff
  
  const darken = (value: number) => {
    const amount = Math.round(value * (percent / 100))
    return Math.max(0, value - amount)
  }
  
  const newR = darken(r)
  const newG = darken(g)
  const newB = darken(b)
  
  const newHex = `#${((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0')}`
  return createActorColor(newHex)
}

// カラーのCSS変数名生成
export const getColorCSSVariable = (actorId: string): string => {
  return `--actor-color-${actorId}`
}

// カラーのアルファ値付きCSS生成
export const getColorWithAlpha = (color: ActorColor, alpha: number): string => {
  if (alpha < 0 || alpha > 1) {
    return color
  }
  
  const hex = color.substring(1)
  const rgb = parseInt(hex, 16)
  
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = rgb & 0xff
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// アクター名の短縮表示
export const getActorInitials = (name: ActorName): string => {
  const words = (name as string).split(/\s+/)
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  
  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
}

// アクター名の表示用フォーマット
export const formatActorName = (name: ActorName, maxLength: number = 20): string => {
  const str = name as string
  
  if (str.length <= maxLength) {
    return str
  }
  
  return str.substring(0, maxLength - 3) + '...'
}