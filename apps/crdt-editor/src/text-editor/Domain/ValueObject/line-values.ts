/**
 * Line-related Value Objects
 */

import { ok, err } from '../../utils/fp'
import type { Result } from '../../utils/fp'

// 行の順序
export type LineOrder = number & { readonly _brand: 'LineOrder' }

// 行のコンテンツ
export type LineContent = string & { readonly _brand: 'LineContent' }

// カーソルオフセット
export type CursorOffset = number & { readonly _brand: 'CursorOffset' }

// 定数
const MAX_LINE_LENGTH = 10000
const MAX_LINE_ORDER = Number.MAX_SAFE_INTEGER

// LineOrder ファクトリ
export const createLineOrder = (value: number): Result<LineOrder> => {
  if (!Number.isFinite(value)) {
    return err(new Error('Order must be a finite number'))
  }
  if (value < 0) {
    return err(new Error('Order must be non-negative'))
  }
  if (value > MAX_LINE_ORDER) {
    return err(new Error(`Order must be less than ${MAX_LINE_ORDER}`))
  }
  return ok(value as LineOrder)
}

// LineContent ファクトリ
export const createLineContent = (value: string): Result<LineContent> => {
  if (value.length > MAX_LINE_LENGTH) {
    return err(new Error(`Content too long (max ${MAX_LINE_LENGTH} characters)`))
  }
  return ok(value as LineContent)
}

// CursorOffset ファクトリ
export const createCursorOffset = (
  value: number,
  maxLength: number
): Result<CursorOffset> => {
  if (!Number.isInteger(value)) {
    return err(new Error('Offset must be an integer'))
  }
  if (value < 0) {
    return err(new Error('Offset must be non-negative'))
  }
  if (value > maxLength) {
    return err(new Error(`Offset ${value} exceeds max length ${maxLength}`))
  }
  return ok(value as CursorOffset)
}

// LineOrder 操作
export const incrementOrder = (order: LineOrder, delta: number = 1): Result<LineOrder> => {
  return createLineOrder(order + delta)
}

export const averageOrder = (order1: LineOrder, order2: LineOrder): Result<LineOrder> => {
  return createLineOrder((order1 + order2) / 2)
}

export const compareOrder = (a: LineOrder, b: LineOrder): number => {
  return a - b
}

// LineContent 操作
export const getContentLength = (content: LineContent): number => {
  return (content as string).length
}

export const isEmptyContent = (content: LineContent): boolean => {
  return (content as string).length === 0
}

export const insertTextToContent = (
  content: LineContent,
  offset: CursorOffset,
  text: string
): Result<LineContent> => {
  const str = content as string
  const pos = offset as number
  
  if (pos > str.length) {
    return err(new Error('Offset exceeds content length'))
  }
  
  const newContent = str.slice(0, pos) + text + str.slice(pos)
  return createLineContent(newContent)
}

export const deleteTextFromContent = (
  content: LineContent,
  offset: CursorOffset,
  length: number
): Result<LineContent> => {
  const str = content as string
  const pos = offset as number
  
  if (pos > str.length) {
    return err(new Error('Offset exceeds content length'))
  }
  if (pos + length > str.length) {
    return err(new Error('Delete range exceeds content length'))
  }
  
  const newContent = str.slice(0, pos) + str.slice(pos + length)
  return createLineContent(newContent)
}

export const sliceContent = (
  content: LineContent,
  start: CursorOffset,
  end?: CursorOffset
): Result<LineContent> => {
  const str = content as string
  const startPos = start as number
  const endPos = end !== undefined ? (end as number) : str.length
  
  if (startPos > str.length || endPos > str.length) {
    return err(new Error('Slice range exceeds content length'))
  }
  if (startPos > endPos) {
    return err(new Error('Invalid slice range'))
  }
  
  return createLineContent(str.slice(startPos, endPos))
}

// CursorOffset 操作
export const moveCursor = (
  offset: CursorOffset,
  delta: number,
  maxLength: number
): Result<CursorOffset> => {
  const newOffset = (offset as number) + delta
  return createCursorOffset(newOffset, maxLength)
}

export const clampCursor = (
  offset: CursorOffset,
  maxLength: number
): CursorOffset => {
  const value = offset as number
  if (value > maxLength) {
    return maxLength as CursorOffset
  }
  return offset
}