/**
 * Document Aggregate Root
 */

import { ok, err, generateUUID, timestamp, updateAt, removeAt } from '../../utils/fp'
import type { Result } from '../../utils/fp'
import {
  createDocumentId,
  isEqualLineId,
} from '../ValueObject'
import type {
  DocumentId,
  LineId,
} from '../ValueObject'
import {
  createLine,
  updateLineOrder,
  compareLineByOrder,
  isLineEmpty,
} from './line'
import type {
  Line,
} from './line'

// Document 集約ルート
export type Document = {
  readonly id: DocumentId
  readonly title: string
  readonly lines: readonly Line[]
  readonly version: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Document作成
export const createDocument = (title: string = 'Untitled'): Document => {
  const now = timestamp()
  return {
    id: createDocumentId(generateUUID()),
    title,
    lines: [],
    version: 0,
    createdAt: now,
    updatedAt: now,
  }
}

// 指定IDでDocument作成
export const createDocumentWithId = (
  id: string,
  title: string = 'Untitled'
): Document => {
  const now = timestamp()
  return {
    id: createDocumentId(id),
    title,
    lines: [],
    version: 0,
    createdAt: now,
    updatedAt: now,
  }
}

// Document基本操作
export const updateDocumentTitle = (
  document: Document,
  newTitle: string
): Result<Document> => {
  if (!newTitle || newTitle.length > 255) {
    return err(new Error('Invalid title'))
  }
  
  return ok({
    ...document,
    title: newTitle,
    version: document.version + 1,
    updatedAt: timestamp(),
  })
}

// 行の追加
export const addLineToDocument = (
  document: Document,
  content: string,
  afterLineId?: LineId
): Result<Document> => {
  // 最大行数チェック
  if (document.lines.length >= 10000) {
    return err(new Error('Document has reached maximum number of lines'))
  }
  
  const order = calculateNewLineOrder(document.lines, afterLineId)
  const lineResult = createLine(content, order)
  
  if (!lineResult.ok) {
    return lineResult
  }
  
  const newLines = [...document.lines, lineResult.value]
  const sortedLines = [...newLines].sort(compareLineByOrder)
  
  return ok({
    ...document,
    lines: sortedLines,
    version: document.version + 1,
    updatedAt: timestamp(),
  })
}

// 行の削除
export const removeLineFromDocument = (
  document: Document,
  lineId: LineId
): Result<Document> => {
  const lineIndex = document.lines.findIndex(l => isEqualLineId(l.id, lineId))
  
  if (lineIndex === -1) {
    return err(new Error('Line not found'))
  }
  
  const newLines = removeAt(document.lines, lineIndex)
  
  return ok({
    ...document,
    lines: newLines,
    version: document.version + 1,
    updatedAt: timestamp(),
  })
}

// 行の更新
export const updateLineInDocument = (
  document: Document,
  lineId: LineId,
  updater: (line: Line) => Result<Line>
): Result<Document> => {
  const lineIndex = document.lines.findIndex(l => isEqualLineId(l.id, lineId))
  
  if (lineIndex === -1) {
    return err(new Error('Line not found'))
  }
  
  const line = document.lines[lineIndex]
  const updatedLineResult = updater(line)
  
  if (!updatedLineResult.ok) {
    return updatedLineResult
  }
  
  const newLines = updateAt(document.lines, lineIndex, () => updatedLineResult.value)
  
  return ok({
    ...document,
    lines: newLines,
    version: document.version + 1,
    updatedAt: timestamp(),
  })
}

// 行の並び替え
export const reorderLineInDocument = (
  document: Document,
  lineId: LineId,
  targetIndex: number
): Result<Document> => {
  const lineIndex = document.lines.findIndex(l => isEqualLineId(l.id, lineId))
  
  if (lineIndex === -1) {
    return err(new Error('Line not found'))
  }
  
  if (targetIndex < 0 || targetIndex >= document.lines.length) {
    return err(new Error('Invalid target index'))
  }
  
  const reorderedLines = moveLineToIndex(document.lines, lineIndex, targetIndex)
  const normalizedLines = normalizeLinesOrder(reorderedLines)
  
  return ok({
    ...document,
    lines: normalizedLines,
    version: document.version + 1,
    updatedAt: timestamp(),
  })
}

// 複数行の一括更新
export const updateMultipleLinesInDocument = (
  document: Document,
  updates: Array<{ lineId: LineId; updater: (line: Line) => Result<Line> }>
): Result<Document> => {
  let lines = [...document.lines]
  
  for (const { lineId, updater } of updates) {
    const lineIndex = lines.findIndex(l => isEqualLineId(l.id, lineId))
    
    if (lineIndex === -1) {
      return err(new Error(`Line ${lineId} not found`))
    }
    
    const updateResult = updater(lines[lineIndex])
    if (!updateResult.ok) {
      return updateResult
    }
    
    lines[lineIndex] = updateResult.value
  }
  
  return ok({
    ...document,
    lines,
    version: document.version + 1,
    updatedAt: timestamp(),
  })
}

// Document情報取得
export const getDocumentLineCount = (document: Document): number => {
  return document.lines.length
}

export const getDocumentCharCount = (document: Document): number => {
  return document.lines.reduce((sum, line) => {
    return sum + (line.content as string).length
  }, 0)
}

export const findLineById = (
  document: Document,
  lineId: LineId
): Line | undefined => {
  return document.lines.find(l => isEqualLineId(l.id, lineId))
}

export const getLineByIndex = (
  document: Document,
  index: number
): Line | undefined => {
  return document.lines[index]
}

export const getFirstLine = (document: Document): Line | undefined => {
  return document.lines[0]
}

export const getLastLine = (document: Document): Line | undefined => {
  return document.lines[document.lines.length - 1]
}

// Document検証
export const isDocumentEmpty = (document: Document): boolean => {
  return document.lines.length === 0 || 
    (document.lines.length === 1 && isLineEmpty(document.lines[0]))
}

export const validateDocument = (document: unknown): document is Document => {
  if (!document || typeof document !== 'object') {
    return false
  }
  
  const obj = document as Record<string, unknown>
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.lines) &&
    typeof obj.version === 'number' &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  )
}

// ヘルパー関数
const calculateNewLineOrder = (
  lines: readonly Line[],
  afterLineId?: LineId
): number => {
  if (lines.length === 0) {
    return 1000 // 初期値
  }
  
  if (!afterLineId) {
    const lastLine = lines[lines.length - 1]
    return (lastLine.order as number) + 1000
  }
  
  const afterLineIndex = lines.findIndex(l => isEqualLineId(l.id, afterLineId))
  if (afterLineIndex === -1) {
    const lastLine = lines[lines.length - 1]
    return (lastLine.order as number) + 1000
  }
  
  const afterLine = lines[afterLineIndex]
  const nextLine = lines[afterLineIndex + 1]
  
  if (!nextLine) {
    return (afterLine.order as number) + 1000
  }
  
  // 2つの行の間の順序値を計算
  return ((afterLine.order as number) + (nextLine.order as number)) / 2
}

const moveLineToIndex = (
  lines: readonly Line[],
  fromIndex: number,
  toIndex: number
): readonly Line[] => {
  const result = [...lines]
  const [movedLine] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, movedLine)
  return result
}

const normalizeLinesOrder = (lines: readonly Line[]): readonly Line[] => {
  return lines.map((line, index) => {
    const orderResult = updateLineOrder(line, index * 1000)
    return orderResult.ok ? orderResult.value : line
  })
}