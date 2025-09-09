/**
 * Line Entity
 */

import { ok, generateUUID, timestamp } from '../../utils/fp'
import type { Result } from '../../utils/fp'
import {
  createLineId,
  createLineContent,
  createLineOrder,
  createCursorOffset,
  insertTextToContent,
  deleteTextFromContent,
  getContentLength,
  isEmptyContent,
} from '../ValueObject'
import type {
  LineId,
  LineContent,
  LineOrder,
} from '../ValueObject'

// Line エンティティ
export type Line = {
  readonly id: LineId
  readonly content: LineContent
  readonly order: LineOrder
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Line作成
export const createLine = (
  content: string,
  order: number
): Result<Line> => {
  const contentResult = createLineContent(content)
  if (!contentResult.ok) {
    return contentResult
  }
  
  const orderResult = createLineOrder(order)
  if (!orderResult.ok) {
    return orderResult
  }
  
  const now = timestamp()
  return ok({
    id: createLineId(generateUUID()),
    content: contentResult.value,
    order: orderResult.value,
    createdAt: now,
    updatedAt: now,
  })
}

// 指定IDでLine作成
export const createLineWithId = (
  id: string,
  content: string,
  order: number
): Result<Line> => {
  const contentResult = createLineContent(content)
  if (!contentResult.ok) {
    return contentResult
  }
  
  const orderResult = createLineOrder(order)
  if (!orderResult.ok) {
    return orderResult
  }
  
  const now = timestamp()
  return ok({
    id: createLineId(id),
    content: contentResult.value,
    order: orderResult.value,
    createdAt: now,
    updatedAt: now,
  })
}

// Line更新操作
export const updateLineContent = (
  line: Line,
  newContent: string
): Result<Line> => {
  const contentResult = createLineContent(newContent)
  if (!contentResult.ok) {
    return contentResult
  }
  
  return ok({
    ...line,
    content: contentResult.value,
    updatedAt: timestamp(),
  })
}

export const updateLineOrder = (
  line: Line,
  newOrder: number
): Result<Line> => {
  const orderResult = createLineOrder(newOrder)
  if (!orderResult.ok) {
    return orderResult
  }
  
  return ok({
    ...line,
    order: orderResult.value,
    updatedAt: timestamp(),
  })
}

// テキスト操作
export const insertTextInLine = (
  line: Line,
  offset: number,
  text: string
): Result<Line> => {
  const offsetResult = createCursorOffset(
    offset,
    getContentLength(line.content)
  )
  if (!offsetResult.ok) {
    return offsetResult
  }
  
  const newContentResult = insertTextToContent(
    line.content,
    offsetResult.value,
    text
  )
  if (!newContentResult.ok) {
    return newContentResult
  }
  
  return ok({
    ...line,
    content: newContentResult.value,
    updatedAt: timestamp(),
  })
}

export const deleteTextFromLine = (
  line: Line,
  offset: number,
  length: number
): Result<Line> => {
  const offsetResult = createCursorOffset(
    offset,
    getContentLength(line.content)
  )
  if (!offsetResult.ok) {
    return offsetResult
  }
  
  const newContentResult = deleteTextFromContent(
    line.content,
    offsetResult.value,
    length
  )
  if (!newContentResult.ok) {
    return newContentResult
  }
  
  return ok({
    ...line,
    content: newContentResult.value,
    updatedAt: timestamp(),
  })
}

// Line分割
export const splitLine = (
  line: Line,
  offset: number
): Result<{ before: Line; after: Line }> => {
  const contentLength = getContentLength(line.content)
  const offsetResult = createCursorOffset(offset, contentLength)
  if (!offsetResult.ok) {
    return offsetResult
  }
  
  const contentStr = line.content as string
  const beforeContent = contentStr.slice(0, offset)
  const afterContent = contentStr.slice(offset)
  
  const beforeResult = updateLineContent(line, beforeContent)
  if (!beforeResult.ok) {
    return beforeResult
  }
  
  const afterResult = createLine(afterContent, line.order + 0.5)
  if (!afterResult.ok) {
    return afterResult
  }
  
  return ok({
    before: beforeResult.value,
    after: afterResult.value,
  })
}

// Line結合
export const mergeLine = (
  first: Line,
  second: Line
): Result<Line> => {
  const mergedContent = (first.content as string) + (second.content as string)
  return updateLineContent(first, mergedContent)
}

// Line情報取得
export const getLineLength = (line: Line): number => {
  return getContentLength(line.content)
}

export const isLineEmpty = (line: Line): boolean => {
  return isEmptyContent(line.content)
}

export const getLineText = (line: Line): string => {
  return line.content as string
}

// Line比較
export const isEqualLine = (a: Line, b: Line): boolean => {
  return a.id === b.id
}

export const compareLineByOrder = (a: Line, b: Line): number => {
  return (a.order as number) - (b.order as number)
}

// Lineコピー（新しいIDで）
export const copyLineWithNewId = (line: Line): Line => {
  return {
    ...line,
    id: createLineId(generateUUID()),
    createdAt: timestamp(),
    updatedAt: timestamp(),
  }
}

// Lineの検証
export const validateLine = (line: unknown): line is Line => {
  if (!line || typeof line !== 'object') {
    return false
  }
  
  const obj = line as Record<string, unknown>
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.order === 'number' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  )
}