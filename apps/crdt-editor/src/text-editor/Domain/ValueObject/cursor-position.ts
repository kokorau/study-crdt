/**
 * Cursor and Selection Value Objects
 */

import { ok, err } from '../../utils/fp'
import type { Result } from '../../utils/fp'
import { isEqualLineId } from './ids'
import type { LineId } from './ids'
import { createCursorOffset } from './line-values'
import type { CursorOffset } from './line-values'

// カーソル位置
export type CursorPosition = {
  readonly lineId: LineId
  readonly offset: CursorOffset
}

// 選択範囲
export type SelectionRange = {
  readonly start: CursorPosition
  readonly end: CursorPosition
}

// CursorPosition ファクトリ
export const createCursorPosition = (
  lineId: LineId,
  offset: number,
  maxLength: number
): Result<CursorPosition> => {
  const offsetResult = createCursorOffset(offset, maxLength)
  if (!offsetResult.ok) {
    return offsetResult
  }
  return ok({
    lineId,
    offset: offsetResult.value,
  })
}

// SelectionRange ファクトリ
export const createSelectionRange = (
  start: CursorPosition,
  end: CursorPosition
): Result<SelectionRange> => {
  // Phase 1: 同一行内での選択のみ許可
  if (!isEqualLineId(start.lineId, end.lineId)) {
    return err(new Error('Cross-line selection not supported in Phase 1'))
  }
  
  // 開始位置と終了位置を正規化（開始が終了より後の場合は入れ替え）
  const normalizedRange = normalizeRange(start, end)
  
  return ok(normalizedRange)
}

// CursorPosition 比較
export const isEqualCursorPosition = (
  a: CursorPosition,
  b: CursorPosition
): boolean => {
  return isEqualLineId(a.lineId, b.lineId) && a.offset === b.offset
}

export const compareCursorPosition = (
  a: CursorPosition,
  b: CursorPosition
): number => {
  if (!isEqualLineId(a.lineId, b.lineId)) {
    // 異なる行の場合は行IDで比較（簡易実装）
    return (a.lineId as string).localeCompare(b.lineId as string)
  }
  return (a.offset as number) - (b.offset as number)
}

// SelectionRange 操作
export const isCollapsedSelection = (range: SelectionRange): boolean => {
  return isEqualCursorPosition(range.start, range.end)
}

export const getSelectionLength = (range: SelectionRange): number => {
  if (!isEqualLineId(range.start.lineId, range.end.lineId)) {
    return 0 // Cross-line selection not supported
  }
  return Math.abs((range.end.offset as number) - (range.start.offset as number))
}

export const normalizeRange = (
  start: CursorPosition,
  end: CursorPosition
): SelectionRange => {
  if (compareCursorPosition(start, end) > 0) {
    return { start: end, end: start }
  }
  return { start, end }
}

// 選択範囲の拡張・縮小
export const expandSelection = (
  range: SelectionRange,
  newEnd: CursorPosition
): Result<SelectionRange> => {
  return createSelectionRange(range.start, newEnd)
}

export const collapseSelection = (
  range: SelectionRange,
  toStart: boolean = true
): SelectionRange => {
  const position = toStart ? range.start : range.end
  return {
    start: position,
    end: position,
  }
}

// カーソル位置の調整
export const adjustCursorForInsertion = (
  cursor: CursorPosition,
  insertionPoint: CursorPosition,
  insertedLength: number
): CursorPosition => {
  // 異なる行の場合は調整不要
  if (!isEqualLineId(cursor.lineId, insertionPoint.lineId)) {
    return cursor
  }
  
  // 挿入位置より後ろのカーソルは移動
  if ((cursor.offset as number) >= (insertionPoint.offset as number)) {
    return {
      lineId: cursor.lineId,
      offset: ((cursor.offset as number) + insertedLength) as CursorOffset,
    }
  }
  
  return cursor
}

export const adjustCursorForDeletion = (
  cursor: CursorPosition,
  deletionStart: CursorPosition,
  deletionLength: number
): CursorPosition => {
  // 異なる行の場合は調整不要
  if (!isEqualLineId(cursor.lineId, deletionStart.lineId)) {
    return cursor
  }
  
  const cursorOffset = cursor.offset as number
  const deleteOffset = deletionStart.offset as number
  const deleteEnd = deleteOffset + deletionLength
  
  // 削除範囲より前のカーソルは移動不要
  if (cursorOffset < deleteOffset) {
    return cursor
  }
  
  // 削除範囲内のカーソルは削除開始位置に移動
  if (cursorOffset <= deleteEnd) {
    return {
      lineId: cursor.lineId,
      offset: deleteOffset as CursorOffset,
    }
  }
  
  // 削除範囲より後のカーソルは前に移動
  return {
    lineId: cursor.lineId,
    offset: (cursorOffset - deletionLength) as CursorOffset,
  }
}

// 選択範囲の調整
export const adjustSelectionForInsertion = (
  selection: SelectionRange,
  insertionPoint: CursorPosition,
  insertedLength: number
): SelectionRange => {
  return {
    start: adjustCursorForInsertion(selection.start, insertionPoint, insertedLength),
    end: adjustCursorForInsertion(selection.end, insertionPoint, insertedLength),
  }
}

export const adjustSelectionForDeletion = (
  selection: SelectionRange,
  deletionStart: CursorPosition,
  deletionLength: number
): SelectionRange => {
  return {
    start: adjustCursorForDeletion(selection.start, deletionStart, deletionLength),
    end: adjustCursorForDeletion(selection.end, deletionStart, deletionLength),
  }
}